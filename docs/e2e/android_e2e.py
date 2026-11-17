"""Prueba del APK en el emulador: vinculación real y bloqueo por la VPN local.

Usa adb + uiautomator (sin dependencias externas). Requiere el emulador ya iniciado.
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET

SDK = "/root/Android/Sdk"
ADB = f"{SDK}/platform-tools/adb"
APK = "/root/innova/apk/ba-protege.apk"
API = "https://baprotege-api.vercel.app"
PKG = "com.anonymous.frontend"
SHOTS = "/root/innova/E13-Control-Parental/docs/screenshots/android"
os.makedirs(SHOTS, exist_ok=True)


def adb(*args, check=True, timeout=120):
    out = subprocess.run([ADB, *args], capture_output=True, text=True, timeout=timeout)
    if check and out.returncode != 0:
        raise RuntimeError(f"adb {' '.join(args)}: {out.stderr.strip()}")
    return out.stdout


def api(path, body=None, token=None, method=None):
    req = urllib.request.Request(API + path, method=method or ("POST" if body is not None else "GET"))
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(req, data, timeout=30) as resp:
        return json.loads(resp.read())


def screen():
    adb("shell", "uiautomator", "dump", "/sdcard/ui.xml")
    xml = adb("shell", "cat", "/sdcard/ui.xml")
    return ET.fromstring(xml[xml.index("<?xml"):] if "<?xml" in xml else xml)


def find(pattern, root=None):
    root = root if root is not None else screen()
    rx = re.compile(pattern, re.I)
    for node in root.iter("node"):
        label = node.get("text") or node.get("content-desc") or ""
        if label and rx.search(label):
            x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds")))
            return (x1 + x2) // 2, (y1 + y2) // 2
    return None


def wait_for(pattern, timeout=60):
    end = time.time() + timeout
    while time.time() < end:
        try:
            hit = find(pattern)
            if hit:
                return hit
        except Exception:
            pass
        time.sleep(1.5)
    texts = [n.get("text") for n in screen().iter("node") if n.get("text")]
    raise TimeoutError(f"no apareció /{pattern}/. En pantalla: {texts[:30]}")


def tap(pattern, timeout=60):
    x, y = wait_for(pattern, timeout)
    adb("shell", "input", "tap", str(x), str(y))
    time.sleep(1.2)


def type_text(value):
    adb("shell", "input", "text", value.replace(" ", "%s"))
    time.sleep(0.6)


step = 0


def shot(name):
    global step
    step += 1
    path = f"{SHOTS}/{step:02d}-{name}.png"
    with open(path, "wb") as fh:
        fh.write(subprocess.run([ADB, "exec-out", "screencap", "-p"], capture_output=True).stdout)
    print(f"  📸 {name}")


def resolves(host):
    out = adb("shell", "ping", "-c", "1", "-W", "3", host, check=False, timeout=30)
    return "unknown host" not in out.lower() and "bad address" not in out.lower() and bool(out.strip())


def run(label, fn):
    try:
        fn()
        print(f"✔ {label}")
    except Exception as error:  # noqa: BLE001
        print(f"✘ {label}: {error}")
        shot("ERROR-" + re.sub(r"\W+", "_", label))
        sys.exit(1)


stamp = int(time.time())
email = f"android+{stamp}@example.com"
password = f"Prueba-{stamp}"
pin = "4826"


def prepare_account():
    reg = api("/api/auth/register", {"name": "Laura Gómez", "email": email, "password": password})
    token = reg["token"]
    api("/api/auth/pin", {"pin": pin}, token, method="PATCH")
    api("/api/devices/link", {"deviceName": "Sofía", "fechaNacimiento": "2013-08-12"}, token)


def install():
    adb("install", "-r", APK, timeout=300)
    adb("shell", "pm", "clear", PKG, check=False)
    adb("shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1")
    wait_for(r"Comenzar|Bienvenid", 120)
    shot("bienvenida")


def login():
    tap(r"Ya tengo una cuenta")
    wait_for(r"Te damos la bienvenida")
    tap(r"Ingresá tu correo")
    type_text(email)
    tap(r"Ingresá tu contraseña")
    type_text(password)
    adb("shell", "input", "keyevent", "4")  # cierra el teclado
    shot("login")
    tap(r"^Iniciar sesión$")
    wait_for(r"Cómo vas a usar este celular", 60)
    shot("seleccion-de-modo")


def link():
    tap(r"Este es un dispositivo protegido")
    tap(r"^Continuar$")
    wait_for(r"De quién es este celular", 60)
    tap(r"Sofía")
    tap(r"^Continuar$")
    wait_for(r"Confirmá la vinculación", 30)
    tap(r"PIN de la persona adulta|PIN")
    type_text(pin)
    shot("vinculacion-pin")
    tap(r"Vincular celular")
    wait_for(r"vinculado|Listo|protegido", 60)
    shot("vinculacion-exito")
    hit = find(r"^(Ir a|Continuar|Empezar)")
    if hit:
        adb("shell", "input", "tap", str(hit[0]), str(hit[1]))
        time.sleep(1.5)


def vpn():
    wait_for(r"Protección en este celular", 60)
    assert resolves("bplay.bet.ar"), "sin VPN el dominio debería resolver (control)"
    shot("protegido-vpn-apagada")
    switch = None
    for node in screen().iter("node"):
        if "Switch" in (node.get("class") or "") or node.get("checkable") == "true":
            x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds")))
            switch = ((x1 + x2) // 2, (y1 + y2) // 2)
    assert switch, "no encontré el interruptor de la VPN"
    adb("shell", "input", "tap", str(switch[0]), str(switch[1]))
    time.sleep(1.5)
    # Diálogo del sistema para autorizar la VPN.
    consent = None
    for _ in range(15):
        consent = find(r"^(OK|Aceptar|Allow|Permitir)$")
        if consent:
            break
        time.sleep(1)
    if consent:
        shot("permiso-vpn")
        adb("shell", "input", "tap", str(consent[0]), str(consent[1]))
    wait_for(r"Este celular está protegido", 30)
    time.sleep(2)
    shot("protegido-vpn-activa")
    dumpsys = adb("shell", "dumpsys", "connectivity", check=False)
    assert "VPN" in dumpsys.upper(), "no se ve una red VPN activa"
    blocked = not resolves("bplay.bet.ar")
    allowed = resolves("google.com")
    print(f"  bplay.bet.ar bloqueado: {blocked} · google.com resuelve: {allowed}")
    assert blocked and allowed, "la VPN no filtra como se espera"


run("cuenta del adulto por API", prepare_account)
run("instalar y abrir el APK", install)
run("login con la cuenta del adulto", login)
run("vincular el celular con el PIN", link)
run("activar la VPN y bloquear por DNS", vpn)
print("OK: APK verificado en el emulador")
