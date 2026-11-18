"""Prueba del APK en el emulador con la vinculación por código (sin la cuenta del adulto).

El adulto crea el perfil por API y recibe el código; en el celular se toca
«Vincular con un código», se escribe el código y el PIN, se activa la VPN y se
verifica el bloqueo por DNS. Reutiliza los helpers de android_e2e.py.
Requiere el emulador ya iniciado.
"""
import os
import re
import sys
import time

sys.argv = sys.argv[:1]
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# Importar android_e2e ejecutaría su recorrido: se cargan solo las definiciones.
source = open(os.path.join(HERE, "android_e2e.py"), encoding="utf-8").read()
helpers = source.split("\nrun(", 1)[0]
exec(compile(helpers, "android_e2e_helpers", "exec"))  # noqa: S102

PREFIX = "c"
state = {}


def shot_c(name):
    shot(f"{PREFIX}-{name}")  # noqa: F821


def prepare():
    reg = api("/api/auth/register", {"name": "Laura Gómez", "email": email, "password": password})  # noqa: F821
    token = reg["token"]
    api("/api/auth/pin", {"pin": pin}, token, method="PATCH")  # noqa: F821
    created = api("/api/devices/link", {"deviceName": "Sofía", "fechaNacimiento": "2013-08-12"}, token)  # noqa: F821
    state["code"] = created["linkCode"]
    state["token"] = token
    print(f"  código: {state['code']}")


def dismiss_anr():
    """En el emulador por software, Android a veces avisa que la interfaz no responde."""
    hit = find(r"^(Wait|Esperar)$")  # noqa: F821
    if hit:
        adb("shell", "input", "tap", str(hit[0]), str(hit[1]))  # noqa: F821
        time.sleep(2)
    return hit


def open_app():
    adb("install", "-r", APK, timeout=300)  # noqa: F821
    adb("shell", "pm", "clear", PKG, check=False)  # noqa: F821
    end = time.time() + 180
    while time.time() < end:
        dismiss_anr()
        adb("shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1", check=False)  # noqa: F821
        try:
            wait_for(r"Comenzar|Bienvenid|Vincular con un código", 30)  # noqa: F821
            break
        except TimeoutError:
            continue
    dismiss_anr()
    wait_for(r"Comenzar|Bienvenid|Vincular con un código", 30)  # noqa: F821
    shot_c("bienvenida")


# Inicio del protegido (pestaña Inicio): "Hola, <nombre>" y la tarjeta grande con
# "Protección pausada" (VPN apagada) o "Protección activa".
PROTECTED_HOME = r"^Protección pausada$|^Protección activa$|^Este es tu dispositivo protegido$"


def text_fields():
    """Centros de los EditText en pantalla, de arriba hacia abajo."""
    fields = []
    for node in screen().iter("node"):  # noqa: F821
        if "EditText" in (node.get("class") or ""):
            x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds")))
            fields.append(((x1 + x2) // 2, (y1 + y2) // 2))
    return sorted(fields, key=lambda p: p[1])


def link_with_code():
    tap(r"Vincular con un código")  # noqa: F821
    wait_for(r"Vinculá este celular", 60)  # noqa: F821
    fields = text_fields()
    assert fields, "no encontré el campo del código"
    adb("shell", "input", "tap", str(fields[0][0]), str(fields[0][1]))  # noqa: F821
    type_text(state["code"])  # noqa: F821
    # El PinInput es un TextInput transparente (fuera del árbol de accesibilidad)
    # encima de las cajas: se toca la zona de las cajas, debajo de su etiqueta.
    label = None
    for node in screen().iter("node"):  # noqa: F821
        if re.search(r"PIN de seguridad", node.get("text") or "", re.I):
            label = list(map(int, re.findall(r"\d+", node.get("bounds"))))
    assert label, "no encontré la etiqueta del PIN"
    adb("shell", "input", "tap", "540", str(label[3] + 110))  # noqa: F821
    time.sleep(0.8)
    type_text(pin)  # noqa: F821
    adb("shell", "input", "keyevent", "4")  # noqa: F821
    time.sleep(1)
    shot_c("vincular-con-codigo")
    tap(r"^Vincular$")  # noqa: F821
    wait_for(PROTECTED_HOME, 60)  # noqa: F821
    time.sleep(1.5)
    shot_c("protegido-recien-vinculado")


def vpn_on():
    switch = None
    for node in screen().iter("node"):  # noqa: F821
        if "Switch" in (node.get("class") or "") or node.get("checkable") == "true":
            x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds")))
            switch = ((x1 + x2) // 2, (y1 + y2) // 2)
    assert switch, "no encontré el interruptor de la VPN"
    adb("shell", "input", "tap", str(switch[0]), str(switch[1]))  # noqa: F821
    time.sleep(1.5)
    for _ in range(15):
        consent = find(r"^(OK|Aceptar|Allow|Permitir)$")  # noqa: F821
        if consent:
            adb("shell", "input", "tap", str(consent[0]), str(consent[1]))  # noqa: F821
            break
        time.sleep(1)
    wait_for(r"^Protección activa$", 30)  # noqa: F821
    time.sleep(2.5)
    shot_c("protegido-vpn-activa")
    blocked = not resolves("bplay.bet.ar")  # noqa: F821
    allowed = resolves("google.com")  # noqa: F821
    print(f"  bplay.bet.ar bloqueado: {blocked} · google.com resuelve: {allowed}")
    assert blocked and allowed, "la VPN no filtra como se espera"


def visible_texts():
    return {n.get("text") for n in screen().iter("node") if n.get("text")}  # noqa: F821


def pause_needs_pin():
    """Apagar el interruptor tiene que abrir un pedido de PIN, no pausar directamente."""
    before = visible_texts()
    switch = None
    for node in screen().iter("node"):  # noqa: F821
        if "Switch" in (node.get("class") or "") or node.get("checkable") == "true":
            x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds")))
            switch = ((x1 + x2) // 2, (y1 + y2) // 2)
    assert switch, "no encontré el interruptor"
    adb("shell", "input", "tap", str(switch[0]), str(switch[1]))  # noqa: F821
    new = set()
    for _ in range(12):
        time.sleep(1)
        new = visible_texts() - before
        if any(re.search(r"PIN|Cancelar|Confirmar|Pausar", t, re.I) for t in new):
            break
    assert any(re.search(r"PIN", t, re.I) for t in new), f"no apareció un pedido de PIN; textos nuevos: {sorted(new)}"
    print(f"  diálogo: {sorted(new)[:6]}")
    shot_c("pausar-con-pin")
    hit = find(r"^Cancelar$|^Volver$")  # noqa: F821
    if hit:
        adb("shell", "input", "tap", str(hit[0]), str(hit[1]))  # noqa: F821
        time.sleep(1.5)
    assert not resolves("bplay.bet.ar"), "sin el PIN la protección no debería pausarse"  # noqa: F821
    print("  sin PIN la protección sigue activa")


run("perfil y código por API", prepare)  # noqa: F821
run("instalar y abrir el APK", open_app)  # noqa: F821
run("vincular con el código y el PIN", link_with_code)  # noqa: F821
run("activar la VPN y bloquear por DNS", vpn_on)  # noqa: F821
run("pausar pide el PIN del adulto", pause_needs_pin)  # noqa: F821
print("OK: vinculación por código verificada en el emulador")
