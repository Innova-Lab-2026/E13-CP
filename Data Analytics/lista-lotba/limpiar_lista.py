"""Limpieza reproducible del listado de sitios provisto por LOTBA (issue #9).

Uso (desde la raíz del repo):
    python3 "Data Analytics/lista-lotba/limpiar_lista.py" \
        --blacklist "ruta/Sitios bloqueados - Agosto(Hoja1).csv" \
        --legales "ruta/Lista de sitios legales.odt" \
        --periodo 2026-08

Genera, en la carpeta de este script:
    - blocklist-<periodo>.csv   lista limpia (dominio, categoria, licenciado, original)
    - blocklist-<periodo>.json  mismo contenido, formato que consume el backend
    - reporte-<periodo>.json    métricas y problemas detectados (para el README)
y actualiza backend/src/config/lotbaDomains.ts con el listado vigente.

No requiere dependencias externas (solo la biblioteca estándar de Python 3.9+).
"""

from __future__ import annotations

import argparse
import collections
import csv
import datetime
import json
import pathlib
import re
import unicodedata
import zipfile
from urllib.parse import urlsplit

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
BACKEND_DOMAINS = REPO / "backend" / "src" / "config" / "lotbaDomains.ts"

# Etiqueta DNS: letras, números y guiones, sin empezar ni terminar con guion.
LABEL = re.compile(r"^(?!-)[a-z0-9-]{1,63}(?<!-)$")
TLD = re.compile(r"^(xn--[a-z0-9-]{2,59}|[a-z]{2,63})$")

CATEGORIA_ILEGAL = "Apuestas ilegales"
CATEGORIA_LICENCIADO = "Apuestas con licencia (+18)"
SIN_CONFIRMAR = "(.bet.ar sin confirmar en el listado de sitios legales)"

# Plataformas de uso general: la VPN filtra por DNS (no ve rutas), así que bloquear una
# URL puntual de estos servicios bloquearía el servicio entero. Se excluyen del listado
# y se reportan aparte para tratarlas con otra medida (por ejemplo, bloqueo de la app).
PLATAFORMAS_GENERALES = {
    "play.google.com", "google.com", "apps.apple.com", "facebook.com", "instagram.com",
    "t.me", "telegram.me", "wa.me", "whatsapp.com", "youtube.com", "youtu.be", "tiktok.com",
    "twitter.com", "x.com", "linktr.ee", "discord.gg", "discord.com", "kick.com", "twitch.tv",
}


def leer_texto(path: pathlib.Path) -> str:
    raw = path.read_bytes()
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError(f"No se pudo decodificar {path}")


def leer_legales(path: pathlib.Path) -> list[str]:
    """Nombres de los operadores con licencia según el .odt de LOTBA."""
    xml = zipfile.ZipFile(path).read("content.xml").decode("utf-8")
    parrafos = [
        re.sub(r"<[^>]+>", "", p).strip()
        for p in re.findall(r"<text:(?:p|h)[^>]*>(.*?)</text:(?:p|h)>", xml, re.S)
    ]
    parrafos = [p for p in parrafos if p]
    # El documento alterna: nombre del operador, "Licencia en N provincias", provincias.
    return [
        parrafos[i]
        for i in range(len(parrafos))
        if i + 1 < len(parrafos) and "licencia" in parrafos[i + 1].lower()
    ]


def clave_operador(nombre: str) -> str:
    sin_tildes = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", sin_tildes.lower())


def normalizar(entrada: str) -> tuple[str | None, str | None]:
    """Devuelve (dominio, motivo_de_rechazo). Quita esquema, ruta, puerto y "www."."""
    valor = entrada.strip().strip('"').strip()
    if not valor:
        return None, "vacío"

    con_esquema = valor if re.match(r"^[a-z][a-z0-9+.-]*://", valor, re.I) else f"http://{valor}"
    try:
        host = urlsplit(con_esquema).hostname
    except ValueError:
        return None, "URL mal formada"
    if not host:
        return None, "sin dominio"

    host = host.strip(".").lower()
    if host.startswith("www."):
        host = host[4:]

    try:
        host = host.encode("idna").decode("ascii")
    except UnicodeError:
        return None, "dominio internacional inválido"

    if re.fullmatch(r"[0-9.]+", host):
        return None, "dirección IP (no es un dominio)"

    etiquetas = host.split(".")
    if len(etiquetas) < 2:
        return None, "sin dominio de nivel superior"
    if not all(LABEL.match(e) for e in etiquetas) or not TLD.match(etiquetas[-1]):
        return None, "caracteres o formato inválidos"
    if len(host) > 253:
        return None, "dominio demasiado largo"
    return host, None


def fin_de_mes(periodo: str) -> str:
    """Último día del período AAAA-MM, en ISO 8601 (UTC)."""
    anio, mes = (int(p) for p in periodo.split("-"))
    siguiente = datetime.date(anio + mes // 12, mes % 12 + 1, 1)
    return f"{siguiente - datetime.timedelta(days=1)}T00:00:00.000Z"


def dominio_padre_listado(dominio: str, listado: set[str]) -> str | None:
    """Si un dominio ya está cubierto por otro del listado (la VPN bloquea subdominios)."""
    partes = dominio.split(".")
    for i in range(1, len(partes) - 1):
        padre = ".".join(partes[i:])
        if padre in listado:
            return padre
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--blacklist", required=True, type=pathlib.Path)
    parser.add_argument("--legales", required=True, type=pathlib.Path)
    parser.add_argument("--periodo", required=True, help="Período del listado, AAAA-MM")
    args = parser.parse_args()

    if not re.fullmatch(r"\d{4}-\d{2}", args.periodo):
        parser.error("--periodo debe tener el formato AAAA-MM")

    lineas = leer_texto(args.blacklist).splitlines()
    encabezado = lineas[0].strip() if lineas else ""
    filas = lineas[1:] if encabezado.upper() == "LINK" else lineas

    operadores = leer_legales(args.legales)
    claves_operadores = {clave_operador(o): o for o in operadores}

    vistos_crudos: collections.Counter[str] = collections.Counter()
    por_dominio: dict[str, dict] = {}
    duplicados_normalizados: list[dict] = []
    rechazados: list[dict] = []
    formatos = collections.Counter()

    for numero, original in enumerate(filas, start=2 if filas is not lineas else 1):
        limpio = original.strip()
        if not limpio:
            rechazados.append({"linea": numero, "original": original, "motivo": "vacío"})
            continue
        vistos_crudos[limpio] += 1
        formatos["con esquema (http/https)" if "://" in limpio else "sin esquema"] += 1
        if re.match(r"^(https?://)?www\.", limpio, re.I):
            formatos["con www."] += 1
        if re.search(r"://[^/]+/.+", limpio):
            formatos["con ruta después del dominio"] += 1

        dominio, motivo = normalizar(limpio)
        if motivo:
            rechazados.append({"linea": numero, "original": original, "motivo": motivo})
            continue
        if dominio in PLATAFORMAS_GENERALES:
            rechazados.append(
                {
                    "linea": numero,
                    "original": original,
                    "motivo": "plataforma de uso general: bloquearla por DNS cortaría todo el servicio",
                }
            )
            continue
        if dominio in por_dominio:
            duplicados_normalizados.append(
                {"linea": numero, "original": limpio, "dominio": dominio, "primera_linea": por_dominio[dominio]["linea"]}
            )
            continue

        # .bet.ar es el dominio reservado a operadores habilitados en Argentina. Si no figura
        # en el .odt de sitios legales, se trata igual como licenciado pero queda para confirmar.
        licenciado = None
        if dominio.endswith(".bet.ar"):
            licenciado = claves_operadores.get(
                clave_operador(dominio[: -len(".bet.ar")]), SIN_CONFIRMAR
            )
        por_dominio[dominio] = {
            "linea": numero,
            "original": limpio,
            "dominio": dominio,
            "licenciado": licenciado,
        }

    listado = set(por_dominio)
    cubiertos = {
        d: padre for d in sorted(listado) if (padre := dominio_padre_listado(d, listado))
    }

    bet_ar_sin_licencia = sorted(
        d for d, info in por_dominio.items() if info["licenciado"] == SIN_CONFIRMAR
    )
    operadores_sin_dominio = sorted(
        o for clave, o in claves_operadores.items()
        if not any(clave_operador(d[: -len(".bet.ar")]) == clave for d in listado if d.endswith(".bet.ar"))
    )

    final = []
    for dominio in sorted(listado):
        info = por_dominio[dominio]
        final.append(
            {
                "domain": dominio,
                "categoria": CATEGORIA_LICENCIADO if info["licenciado"] else CATEGORIA_ILEGAL,
                "licenciado": bool(info["licenciado"]),
                "operador": info["licenciado"] or "",
                "original": info["original"],
            }
        )

    tlds = collections.Counter(d["domain"].rsplit(".", 1)[-1] for d in final)

    reporte = {
        "periodo": args.periodo,
        "archivo_blacklist": args.blacklist.name,
        "archivo_legales": args.legales.name,
        "encabezado": encabezado,
        "filas_leidas": len(filas),
        "formatos": dict(formatos),
        "duplicados_exactos": sum(n - 1 for n in vistos_crudos.values() if n > 1),
        "duplicados_tras_normalizar": len(duplicados_normalizados),
        "rechazados": len(rechazados),
        "dominios_unicos": len(final),
        "ilegales": sum(1 for d in final if not d["licenciado"]),
        "licenciados": sum(1 for d in final if d["licenciado"]),
        "subdominios_ya_cubiertos": len(cubiertos),
        "tlds_top": tlds.most_common(15),
        "operadores_legales": operadores,
        "operadores_legales_sin_dominio_en_blacklist": operadores_sin_dominio,
        "bet_ar_sin_licencia_en_odt": bet_ar_sin_licencia,
        "detalle_rechazados": rechazados,
        "detalle_duplicados": duplicados_normalizados,
        "detalle_cubiertos": cubiertos,
    }

    csv_path = HERE / f"blocklist-{args.periodo}.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=["domain", "categoria", "licenciado", "operador", "original"])
        writer.writeheader()
        writer.writerows(final)

    json_path = HERE / f"blocklist-{args.periodo}.json"
    json_path.write_text(
        json.dumps(
            {
                "version": args.periodo,
                "source": f"LOTBA - {args.blacklist.name}",
                "domains": [{"domain": d["domain"], "categoria": d["categoria"]} for d in final],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    (HERE / f"reporte-{args.periodo}.json").write_text(
        json.dumps(reporte, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    lineas_ts = [
        "/**",
        " * Listado oficial de LOTBA generado automáticamente. NO editar a mano.",
        f" * Fuente: {args.blacklist.name} (período {args.periodo}).",
        ' * Regenerar con: python3 "Data Analytics/lista-lotba/limpiar_lista.py" (ver README de esa carpeta).',
        " */",
        "import type { OfficialDomain } from './blocklistSource';",
        "",
        f"export const LOTBA_PERIOD = '{args.periodo}';",
        f"export const LOTBA_SOURCE = 'LOTBA - {args.blacklist.name}';",
        "/** El listado cubre el período completo: se publica al cierre del mes. */",
        f"export const LOTBA_UPDATED_AT = '{fin_de_mes(args.periodo)}';",
        "",
        "export const LOTBA_DOMAINS: OfficialDomain[] = [",
        *[f"  {{ domain: '{d['domain']}', categoria: '{d['categoria']}' }}," for d in final],
        "];",
        "",
    ]
    BACKEND_DOMAINS.write_text("\n".join(lineas_ts), encoding="utf-8")

    resumen = {k: v for k, v in reporte.items() if not k.startswith("detalle_")}
    print(json.dumps(resumen, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
