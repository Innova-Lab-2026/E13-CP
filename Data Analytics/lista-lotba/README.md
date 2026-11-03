# Lista de sitios LOTBA (issue #9)

Limpieza del listado de sitios bloqueados que entregó LOTBA, para cargarlo en el backend y en la VPN local de Android.

## Archivos de origen

| Archivo | Contenido | Formato |
|---|---|---|
| `Sitios bloqueados - Agosto(Hoja1).csv` | Sitios bloqueados, actualizados hasta agosto inclusive | CSV de una columna (`LINK`), UTF-8, fin de línea CRLF |
| `Lista de sitios legales.odt` | 12 operadores con licencia y las provincias donde operan | Documento de texto (OpenDocument) |

Los originales no se suben al repo. Están en el Drive del equipo, enlazados en la issue.

## Resultado

| Métrica | Valor |
|---|---|
| Filas leídas (sin el encabezado) | 2.115 |
| Duplicados exactos | 7 |
| Duplicados después de normalizar (incluye los exactos) | 24 |
| Excluidos | 1 (ver abajo) |
| **Dominios únicos en el listado final** | **2.090** |
| Apuestas ilegales | 2.076 |
| Operadores con licencia (+18) | 14 |
| Subdominios ya cubiertos por otro dominio del listado | 42 |

Los TLD más frecuentes son `.com` (1.127), `.net` (79), `.ar` (66), `.bet` (66) e `.io` (55).

## Qué encontramos en el archivo

1. **Formatos mezclados.** 2.099 filas son URLs completas (`https://…`) y 16 son dominios sueltos. 764 tienen `www.`, 284 tienen una ruta después del dominio (`/es/sports`, `/login.php`, `?id=…`) y hay entradas en mayúsculas (`HTTPS://WWW.10BET.COM/`).
2. **Duplicados ocultos.** Hay 7 filas repetidas tal cual y otras 17 que son el mismo sitio escrito distinto, por ejemplo `https://www.celuapuestas.ink/` y `https://celuapuestas.ink/`, o `HTTPS://WWW.CASINOBETCAVE.COM/` repetido como `HTTPS://CASINOBETCAVE.COM/?ID=4149683`. El detalle está en `reporte-2026-08.json` → `detalle_duplicados`.
3. **La "blacklist" incluye operadores legales.** Las primeras filas son los 12 operadores con licencia del `.odt` (`bplay.bet.ar`, `codere.bet.ar`, `bet365.bet.ar`…), más `betway.bet.ar` y `tuagencialotba.bet.ar`, que tienen dominio `.bet.ar` pero no figuran en el `.odt`. Como la app protege a menores de 18 y las apuestas están prohibidas para ellos aunque el sitio sea legal, **se mantienen bloqueados** con una categoría propia: `Apuestas con licencia (+18)`. Así el adulto ve en las alertas si se intentó entrar a un sitio legal o a uno ilegal.
4. **Una entrada bloquearía toda la Play Store.** `https://play.google.com/store/apps/details?id=com.nsus.clubgg` (la app de póker ClubGG) se convierte en el dominio `play.google.com`. La VPN filtra por DNS, ve el dominio pero no la ruta, así que bloquearlo cortaría la tienda entera en el celular del chico. **Se excluye** y queda registrada como app para bloquear con otra medida (ver "Decisiones pendientes").
5. **Bloqueos por página en sitios no exclusivos de apuestas.** `https://beltway.tur.ar/travel/casino-online-practica/` (un sitio de turismo) y `https://www.casino.org/argentina/` (reseñas de casinos) terminan bloqueando el dominio completo por una sola página. Se mantienen porque están en el listado oficial, pero hay que confirmarlo con LOTBA.
6. **Subdominios redundantes.** 42 entradas, como `ar.1xbet.com` o `es.888casino.com`, ya quedan cubiertas por su dominio padre, porque la VPN bloquea también los subdominios. Se conservan para que el listado coincida con el oficial.
7. **Sitios alojados en plataformas compartidas.** `aria-group-2.vercel.app`, `sfcoturf.netlify.app` y `casino-zeus.ola.click` se bloquean solo en ese subdominio, sin afectar al resto de la plataforma.

## Reglas de normalización

El script `limpiar_lista.py` aplica, en este orden:

1. Saca espacios y comillas, y omite el encabezado `LINK`.
2. Extrae solo el dominio: saca el esquema (`http://`, `https://`), la ruta, la consulta, el fragmento y el puerto.
3. Pasa todo a minúsculas, saca el punto final y el prefijo `www.`.
4. Convierte los dominios internacionales a punycode (`xn--…`).
5. Valida el formato DNS: etiquetas de 1 a 63 caracteres, sin guiones en los extremos y con un TLD válido. Rechaza direcciones IP.
6. Excluye las plataformas de uso general (Play Store, redes sociales, mensajería), que no se pueden bloquear por DNS sin cortar el servicio.
7. Deduplica, conservando la primera aparición.
8. Clasifica: `.bet.ar` → `Apuestas con licencia (+18)`, el resto → `Apuestas ilegales`.

## Formato acordado con Back

El backend consume `{ domain, categoria }`, el mismo contrato que `OfficialDomain` en `backend/src/config/blocklistSource.ts`. El script genera:

| Archivo | Uso |
|---|---|
| `blocklist-2026-08.csv` | Revisión humana y QA: `domain, categoria, licenciado, operador, original` |
| `blocklist-2026-08.json` | Mismo contenido en el formato del endpoint `POST /api/blocklist/sync/official` |
| `reporte-2026-08.json` | Métricas y el detalle de cada duplicado, exclusión y subdominio cubierto |
| `backend/src/config/lotbaDomains.ts` | Listado vigente que el backend carga al iniciar (generado, no editar a mano) |

El endpoint `GET /api/blocklist` devuelve el listado. La app del dispositivo protegido se lo pasa a la VPN local al activarla.

## Cómo actualizar el listado cada mes

1. Bajar el CSV y el `.odt` nuevos del Drive.
2. Desde la raíz del repo, correr:
   ```bash
   python3 "Data Analytics/lista-lotba/limpiar_lista.py" \
     --blacklist "ruta/Sitios bloqueados - <Mes>.csv" \
     --legales "ruta/Lista de sitios legales.odt" \
     --periodo AAAA-MM
   ```
3. Revisar en el resumen los duplicados, las exclusiones y los `.bet.ar` sin confirmar.
4. `cd backend && npm test`. Los tests verifican que el listado no tenga duplicados ni rutas y que la Play Store no quede bloqueada.
5. Commitear los archivos generados. Para cargar el período sin redeployar, se puede enviar el `.json` a `POST /api/blocklist/sync/official` con el header `x-admin-secret`.

## Decisiones pendientes (para LOTBA y el equipo)

- [ ] Confirmar que los operadores con licencia deben bloquearse en el celular de menores. Es la decisión que tomamos por defecto.
- [ ] Confirmar `betway.bet.ar` y `tuagencialotba.bet.ar`: tienen dominio `.bet.ar` pero no están en la lista de sitios legales.
- [ ] Confirmar si `beltway.tur.ar` y `casino.org` se bloquean completos o se quitan.
- [ ] Definir cómo bloquear apps como ClubGG (`com.nsus.clubgg`), que se instalan desde la Play Store. El DNS no alcanza: hace falta un listado de paquetes y detectarlos en el dispositivo (ver el plan de datos de la issue #7).
- [ ] Pedirle a LOTBA el listado en el mismo formato todos los meses: CSV de una columna, dominios sin ruta, una fila por sitio.
