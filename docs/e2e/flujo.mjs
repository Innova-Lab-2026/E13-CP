// Recorrido de punta a punta de BA Protege+ con capturas (README y comparación con Figma).
// Uso:
//   node flujo.mjs [URL base]                     (por defecto https://baprotege.vercel.app)
//   SHOTS=/carpeta node flujo.mjs http://localhost:8099
// Variables opcionales:
//   SHOTS         carpeta de capturas (por defecto docs/screenshots del repo principal)
//   API_URL       backend para sembrar eventos como el celular (por defecto, http://localhost:4000
//                 si la URL base es local; contra producción no se siembra nada por API)
//   ADMIN_SECRET  si está, se verifica por la API de admin que la sugerencia y la opinión llegaron
// Cada paso espera textos concretos de la pantalla; si uno falla, se guarda ERROR-<paso>.png.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = (process.argv[2] ?? "https://baprotege.vercel.app").replace(/\/$/, "");
const SHOTS = process.env.SHOTS ?? "/root/innova/E13-Control-Parental/docs/screenshots";
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(BASE);
const API = process.env.API_URL ?? (IS_LOCAL ? "http://localhost:4000" : null);
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? null;
fs.mkdirSync(SHOTS, { recursive: true });

const stamp = Date.now();
const ADULT = {
  nombre: "Laura",
  apellido: "Gómez",
  email: `e2e+${stamp}@example.com`,
  password: `Prueba-${stamp}`,
  pin: "4826",
};
const NEW_PIN = "2468";
const CHILD = { nombre: "Sofía", nacimiento: "12082013" };
const CHILD2 = { nombre: "Tomás", nacimiento: "03052015" };
const T = { timeout: 20000 };

const browser = await chromium.launch();
const viewport = { width: 390, height: 844 };
const newContext = () => browser.newContext({ viewport, deviceScaleFactor: 2, locale: "es-AR" });

let step = 0;
async function shot(page, name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/${String(++step).padStart(2, "0")}-${name}.png` });
  console.log(`  📸 ${name}`);
}
async function run(label, page, fn) {
  try {
    await fn();
    console.log(`✔ ${label}`);
  } catch (error) {
    console.log(`✘ ${label}: ${error.message.split("\n")[0]}`);
    await page.screenshot({ path: `${SHOTS}/ERROR-${label.replace(/\W+/g, "_")}.png` }).catch(() => {});
    console.log((await page.locator("body").innerText().catch(() => "")).slice(0, 1500));
    await browser.close();
    process.exit(1);
  }
}
function expect(condition, message) {
  if (!condition) throw new Error(message);
}
// En web el Stack deja montadas (ocultas) las pantallas anteriores: se apunta solo a lo visible.
const btn = (page, name) =>
  page.getByRole("button", { name, exact: false }).filter({ visible: true }).first();
const tab = (page, name) =>
  page.getByRole("tab", { name }).or(page.getByRole("link", { name })).filter({ visible: true }).first();
const field = (page, label) =>
  page
    .locator(`input[aria-label="${label}"], textarea[aria-label="${label}"]`)
    .filter({ visible: true })
    .first();
const visibleText = (page, re) => page.getByText(re).filter({ visible: true }).first();
const countText = (page, re) => page.getByText(re).filter({ visible: true }).count();
const heading = (page, name) => page.getByRole("heading", { name }).filter({ visible: true }).first();
// El PinInput de cajitas usa un input transparente: se elige el de la pantalla visible.
async function fillPin(page, value) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll('input[inputmode="numeric"], input[type="password"]')].some(
      (el) => el.offsetParent !== null && el.maxLength === 4));
  await page.evaluate(() => {
    document.querySelectorAll("[data-e2e-pin]").forEach((el) => el.removeAttribute("data-e2e-pin"));
    const el = [...document.querySelectorAll('input[inputmode="numeric"], input[type="password"]')].find(
      (e) => e.offsetParent !== null && e.maxLength === 4);
    el.setAttribute("data-e2e-pin", "1");
  });
  await page.locator("[data-e2e-pin]").fill(value, { force: true });
}
async function api(method, path, body, headers = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
function watchErrors(page, who) {
  page.on("pageerror", (e) => console.log(`  [pageerror ${who}]`, e.message));
}
// Código de vinculación: 8 caracteres sin 0/O/1/I.
const LINK_CODE = /^[A-HJ-NP-Z2-9]{8}$/;

// ───────────────────────── Adulto: alta ─────────────────────────
const adult = await newContext();
const a = await adult.newPage();
watchErrors(a, "adulto");

await run("landing", a, async () => {
  await a.goto(BASE + "/");
  await a.getByRole("heading", { name: /Protegé a tu familia/ }).waitFor(T);
  await a.setViewportSize({ width: 1280, height: 800 });
  await shot(a, "landing");
  await a.setViewportSize(viewport);
  await shot(a, "landing-movil");
});

await run("bienvenida, onboarding 1 y 2, login", a, async () => {
  await a.goto(BASE + "/app/");
  await btn(a, "Comenzar").waitFor(T);
  await shot(a, "bienvenida");
  await btn(a, "Comenzar").click();
  await visibleText(a, /Protegé a tu familia de las apuestas online/).waitFor(T);
  await visibleText(a, /En esta aplicación podés bloquear/).waitFor();
  await shot(a, "onboarding-1");
  await btn(a, "Continuar").click();
  await visibleText(a, /Las apuestas online no son un juego/).waitFor(T);
  await visibleText(a, /conversalo con tu adulto responsable/).waitFor();
  await shot(a, "onboarding-2");
  await btn(a, "Continuar").click();
  await btn(a, "Iniciar sesión").waitFor(T);
  // En local no hay GOOGLE_CLIENT_ID: el backend lo informa y el botón no se muestra.
  if (!IS_LOCAL) await btn(a, "Continuar con Google").waitFor();
  await btn(a, "Vincular con un código").waitFor();
  await shot(a, "login");
});

await run("crear cuenta sin teléfono", a, async () => {
  await btn(a, "Crear cuenta").click();
  await field(a, "Nombre").fill(ADULT.nombre);
  await field(a, "Apellido").fill(ADULT.apellido);
  await field(a, "Correo electrónico").fill(ADULT.email);
  // El teléfono es opcional: queda vacío.
  expect((await field(a, "Teléfono").inputValue()) === "", "el teléfono debería estar vacío");
  await field(a, "Contraseña").fill(ADULT.password);
  await field(a, "Confirmar contraseña").fill(ADULT.password);
  await shot(a, "crear-cuenta");
  await btn(a, "Crear cuenta").last().click();
  await visibleText(a, /¿Cómo vas a utilizar BA Protege\+\?/).waitFor(T);
  await btn(a, /Soy Responsable/).waitFor();
  await btn(a, /Este es un dispositivo protegido/).waitFor();
  expect(!(await btn(a, /^Continuar$/).isVisible().catch(() => false)), "la selección de modo no lleva Continuar");
  await shot(a, "seleccion-de-modo");
});

await run("modo adulto y PIN en una pantalla", a, async () => {
  await btn(a, /Soy Responsable/).click();
  await visibleText(a, /^Creá tu PIN de seguridad$/).waitFor(T);
  expect(
    (await field(a, "PIN").getAttribute("placeholder")) === "Ingresá un PIN de 4 dígitos",
    "placeholder del PIN",
  );
  await field(a, "Repetir PIN").waitFor();
  await field(a, "PIN").fill(ADULT.pin);
  await field(a, "Repetir PIN").fill(ADULT.pin);
  await shot(a, "crear-pin");
  await btn(a, /^Crear PIN$/).click();
  await visibleText(a, /Hola, Laura/).waitFor(T);
  await visibleText(a, /¡Qué bueno tenerte de vuelta!/).waitFor();
  await visibleText(a, /Agregá el primer dispositivo/).waitFor();
  await shot(a, "home-sin-dispositivos");
});

let linkCode = "";
await run("agregar dispositivo y código de vinculación", a, async () => {
  await btn(a, "Agregar dispositivo").click();
  await field(a, "Nombre").fill(CHILD.nombre);
  await a.getByPlaceholder("dd/mm/aaaa").filter({ visible: true }).first().fill(CHILD.nacimiento);
  await shot(a, "agregar-dispositivo");
  await btn(a, "Agregar dispositivo").click();
  await heading(a, /^Código de vinculación$/).waitFor(T);
  await visibleText(a, /Válido durante/).waitFor();
  await visibleText(a, /Este código solo puede utilizarse una vez/).waitFor();
  const code = a.getByTestId("link-code").filter({ visible: true }).first();
  const first = (await code.innerText()).trim();
  expect(LINK_CODE.test(first), `código inválido: "${first}"`);
  await shot(a, "codigo-de-vinculacion");
  await btn(a, /^Generar nuevo código/).click();
  await a.waitForFunction(
    (prev) => [...document.querySelectorAll('[data-testid="link-code"]')].some(
      (el) => el.offsetParent !== null && el.textContent.trim() !== prev && el.textContent.trim().length === 8),
    first,
    T,
  );
  linkCode = (await code.innerText()).trim();
  expect(LINK_CODE.test(linkCode) && linkCode !== first, "el código nuevo debería ser distinto");
  await btn(a, /^Cancelar vinculación/).waitFor();
  await shot(a, "codigo-nuevo");
  console.log("  código de vinculación:", linkCode);
});

// ───────────── Celular de Sofía: camino clásico (login del adulto) ─────────────
const child = await newContext();
const c = await child.newPage();
watchErrors(c, "Sofía");

await run("celular de Sofía: login y elegir perfil", c, async () => {
  await c.goto(BASE + "/app/login");
  await field(c, "Correo electrónico").fill(ADULT.email);
  await field(c, "Contraseña").fill(ADULT.password);
  await btn(c, "Iniciar sesión").click();
  await btn(c, /Este es un dispositivo protegido/).waitFor(T);
  await btn(c, /Este es un dispositivo protegido/).click();
  await visibleText(c, /¿Qué perfil vas a vincular\?/).waitFor(T);
  await btn(c, new RegExp(`Perfil de ${CHILD.nombre}`)).waitFor(T);
  await visibleText(c, /Pendiente de vinculación/).waitFor();
  await shot(c, "vinculacion-elegir-perfil");
});

await run("celular de Sofía: PIN incorrecto y correcto", c, async () => {
  await btn(c, new RegExp(`Perfil de ${CHILD.nombre}`)).click();
  await visibleText(c, /Confirmá la vinculación/).waitFor(T);
  await fillPin(c, "1357");
  await btn(c, "Vincular celular").click();
  await visibleText(c, /El PIN no es correcto/).waitFor(T);
  await shot(c, "vinculacion-pin-incorrecto");
  await btn(c, "Intentar de nuevo").click();
  await fillPin(c, ADULT.pin);
  await btn(c, "Vincular celular").click();
  await visibleText(c, /¡Dispositivo vinculado!/).waitFor(T);
  await visibleText(c, /BA Protege\+ Activo/).waitFor();
  await shot(c, "vinculacion-exito");
  await btn(c, "Ir al Inicio").click();
});

await run("inicio protegido", c, async () => {
  await visibleText(c, new RegExp(`^Hola, ${CHILD.nombre}$`)).waitFor(T);
  await visibleText(c, /^Este es tu dispositivo protegido$/).waitFor();
  await visibleText(c, /^Protección activa$/).waitFor();
  await visibleText(c, /^Todo actualizado$/).waitFor();
  await visibleText(c, /Última actualización - /).waitFor();
  await btn(c, /Consejos para navegar seguro/).waitFor();
  await btn(c, /^Preguntas frecuentes/).waitFor();
  for (const name of ["Inicio", "Navegación", "Configuración"]) await tab(c, name).waitFor();
  await shot(c, "inicio-protegido");
});

await run("navegación y sus 4 pantallas", c, async () => {
  await btn(c, /Consejos para navegar seguro/).click();
  await visibleText(c, /^Navegá seguro$/).waitFor(T);
  await shot(c, "navega-seguro");
  const temas = [
    ["Protegé tus datos", /^Usá contraseñas seguras$/, "nav-protege-tus-datos"],
    ["Cuidado con los engaños", /^Desconfiá de ofertas increíbles$/, "nav-enganos"],
    ["¿Qué hace BA Protege\\+\\?", /listado oficial de apuestas online de LOTBA/, "nav-que-hace"],
    ["Hablá con alguien", /^No estás solo ni sola$/, "nav-habla-con-alguien"],
  ];
  for (const [name, text, shotName] of temas) {
    await btn(c, new RegExp(name)).click();
    await visibleText(c, text).waitFor(T);
    await visibleText(c, /^Recordá$/).waitFor();
    expect((await countText(c, /ilegal/i)) === 0, `${name}: no debe decir "ilegal"`);
    await shot(c, shotName);
    await btn(c, /^Volver$/).click();
    await visibleText(c, /^Navegá seguro$/).waitFor(T);
  }
});

await run("configuración del protegido, preguntas frecuentes y probar un sitio", c, async () => {
  await tab(c, "Configuración").click();
  await visibleText(c, new RegExp(`^Perfil de ${CHILD.nombre}$`)).waitFor(T);
  await btn(c, /^Probar un sitio/).waitFor();
  await btn(c, /^Salir del modo protegido/).waitFor();
  await shot(c, "configuracion-protegido");
  await btn(c, /^Preguntas frecuentes/).click();
  await visibleText(c, /¿Qué bloquea BA Protege\+\?/).waitFor(T);
  await shot(c, "preguntas-frecuentes");
  await btn(c, /^Volver$/).click();
  await visibleText(c, new RegExp(`^Perfil de ${CHILD.nombre}$`)).waitFor(T);
  await btn(c, /^Probar un sitio/).click();
  await c.locator('input[aria-label="Sitio web"]').filter({ visible: true }).first().fill("www.bplay.bet.ar");
  await shot(c, "probar-sitio");
  await btn(c, /^Probar$/).click();
  await visibleText(c, /Este sitio está bloqueado/).waitFor(T);
  await shot(c, "sitio-bloqueado");
});

await run("salir del modo protegido pide el PIN del adulto", c, async () => {
  await c.goto(BASE + "/app/protected/configuracion");
  await btn(c, /^Salir del modo protegido/).click();
  await visibleText(c, /^PIN de la persona adulta$/).waitFor(T);
  await shot(c, "salir-pide-pin");
  await btn(c, /^Cancelar$/).click();
  await c.waitForTimeout(400);
  await visibleText(c, new RegExp(`^Perfil de ${CHILD.nombre}$`)).waitFor(T);
});

// ───────────── Segundo perfil: vinculación con código (sin la cuenta del adulto) ─────────────
let linkCode2 = "";
await run("adulto: segundo perfil y código", a, async () => {
  await a.goto(BASE + "/app/dispositivos");
  await btn(a, "Agregar dispositivo").waitFor(T);
  await btn(a, "Agregar dispositivo").click();
  await field(a, "Nombre").fill(CHILD2.nombre);
  await a.getByPlaceholder("dd/mm/aaaa").filter({ visible: true }).first().fill(CHILD2.nacimiento);
  await btn(a, "Agregar dispositivo").click();
  await heading(a, /^Código de vinculación$/).waitFor(T);
  await visibleText(a, /Válido durante/).waitFor();
  linkCode2 = (await a.getByTestId("link-code").filter({ visible: true }).first().innerText()).trim();
  expect(LINK_CODE.test(linkCode2), `código inválido: "${linkCode2}"`);
  console.log("  código de vinculación:", linkCode2);
});

const child2 = await newContext();
const d = await child2.newPage();
watchErrors(d, "Tomás");
let tomasToken = "";
await run("celular de Tomás: vincular con un código", d, async () => {
  await d.goto(BASE + "/app/");
  await btn(d, "Vincular con un código").waitFor(T);
  await btn(d, "Vincular con un código").click();
  await visibleText(d, /Vinculá este celular/).waitFor(T);
  await field(d, "Código de vinculación").fill(linkCode2.toLowerCase());
  await fillPin(d, "1357");
  await shot(d, "vincular-con-codigo");
  await btn(d, /^Vincular$/).click();
  await visibleText(d, /no son correctos|venció/i).waitFor({ timeout: 15000 });
  await shot(d, "vincular-con-codigo-error");
  await fillPin(d, ADULT.pin);
  await btn(d, /^Vincular$/).click();
  await visibleText(d, new RegExp(`^Hola, ${CHILD2.nombre}$`)).waitFor(T);
  await visibleText(d, /^Este es tu dispositivo protegido$/).waitFor();
  await shot(d, "inicio-protegido-con-codigo");
  tomasToken = await d.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("ba-protege.device-session") ?? "{}").deviceAccessToken ?? "";
    } catch {
      return "";
    }
  });
});

await run("celular de Tomás: probar un sitio bloqueado", d, async () => {
  await tab(d, "Configuración").click();
  await visibleText(d, new RegExp(`^Perfil de ${CHILD2.nombre}$`)).waitFor(T);
  await btn(d, /^Probar un sitio/).click();
  // Un sitio que no está en el listado queda permitido.
  await d.locator('input[aria-label="Sitio web"]').filter({ visible: true }).first().fill("google.com");
  await btn(d, /^Probar$/).click();
  await visibleText(d, /Este sitio está permitido/).waitFor(T);
  await d.locator('input[aria-label="Sitio web"]').filter({ visible: true }).first().fill("www.bplay.bet.ar");
  await btn(d, /^Probar$/).click();
  await visibleText(d, /Este sitio está bloqueado/).waitFor(T);
  await shot(d, "sitio-bloqueado-con-codigo");
});

await run("eventos del celular de Tomás por la API", d, async () => {
  if (!API || !tomasToken) {
    console.log("  (sin API local o sin credencial del celular: no se siembran eventos)");
    return;
  }
  const auth = { Authorization: `Device ${tomasToken}` };
  for (const body of [
    { eventType: "APP_INSTALL_ATTEMPT", details: "Intento de instalar una VPN" },
    { eventType: "SITE_BLOCKED", domain: "apostando-sitio.com", details: "Bloqueado por BA Protege+" },
    { eventType: "UNINSTALL_ATTEMPT", details: "Intento de desinstalar BA Protege+" },
  ]) {
    const res = await api("POST", "/api/devices/me/events", body, auth);
    expect(res.status === 201, `${body.eventType}: ${res.status} ${JSON.stringify(res.body)}`);
  }
});

// ───────────────────────── Adulto: dashboard, dispositivos, historial ─────────────────────────
await run("dashboard con dispositivos", a, async () => {
  await a.goto(BASE + "/app/");
  await visibleText(a, /Hola, Laura/).waitFor(T);
  await visibleText(a, /^Todos los dispositivos están protegidos$/).waitFor(T);
  await visibleText(a, /^2 de 2 dispositivos activos$/).waitFor();
  await a.getByLabel(/^Alertas, \d+ sin leer$/).filter({ visible: true }).first().waitFor();
  await btn(a, new RegExp(`^${CHILD.nombre}`)).waitFor();
  if (API && tomasToken) await visibleText(a, /^¡Requiere tu atención!$/).waitFor();
  await shot(a, "dashboard");
});

await run("mis dispositivos", a, async () => {
  await a.goto(BASE + "/app/dispositivos");
  await visibleText(a, /^Mis Dispositivos$/).waitFor(T);
  await btn(a, new RegExp(`^${CHILD.nombre}`)).waitFor(T);
  await btn(a, new RegExp(`^${CHILD2.nombre}`)).waitFor();
  expect((await countText(a, /Protección activa/)) >= 2, "los dos perfiles deberían estar activos");
  await shot(a, "mis-dispositivos");
});

await run("detalle por dispositivo e historial del dispositivo", a, async () => {
  await btn(a, new RegExp(`^${CHILD2.nombre}`)).click();
  await visibleText(a, new RegExp(`^Dispositivo de ${CHILD2.nombre}$`)).waitFor(T);
  await visibleText(a, /^Protección activa$/).waitFor();
  await a.getByLabel(/^\d+ años$/).filter({ visible: true }).first().waitFor();
  await a.getByLabel(/^Esta semana, \d+ webs? bloqueadas?$/).filter({ visible: true }).first().waitFor(T);
  await visibleText(a, new RegExp(`^Historial de ${CHILD2.nombre}$`)).waitFor();
  await visibleText(a, /^(Recién|Hace \d+ min)$/).waitFor(T);
  await shot(a, "detalle-dispositivo");
  await btn(a, `Ver todo el historial de ${CHILD2.nombre}`).click();
  await heading(a, new RegExp(`^Historial de ${CHILD2.nombre}$`)).waitFor(T);
  await visibleText(a, /^Hoy - \d{1,2} de [a-z]+$/).waitFor(T);
  expect((await countText(a, new RegExp(`^${CHILD2.nombre} - `))) === 0, "no debería repetir el nombre");
  expect((await page_tabs(a)) === 0, "el historial del dispositivo no lleva filtros");
  await shot(a, "historial-dispositivo");
});
async function page_tabs(page) {
  return page.getByRole("tab", { name: "Por categorías" }).filter({ visible: true }).count();
}

await run("historial con las 3 pestañas", a, async () => {
  await a.goto(BASE + "/app/historial");
  await heading(a, /^Historial$/).waitFor(T);
  for (const name of ["Todos", "Por categorías", "Por dispositivo"]) {
    await a.getByRole("tab", { name }).filter({ visible: true }).first().waitFor(T);
  }
  await visibleText(a, /^Hoy - \d{1,2} de [a-z]+$/).waitFor(T);
  await visibleText(a, new RegExp(`^${CHILD.nombre} - (www\\.)?bplay\\.bet\\.ar$`)).waitFor(T);
  await shot(a, "historial-todos");
  await a.getByRole("tab", { name: "Por categorías" }).filter({ visible: true }).first().click();
  await visibleText(a, /^Sitio bloqueado$/).waitFor(T);
  await shot(a, "historial-categorias");
  await a.getByRole("tab", { name: "Por dispositivo" }).filter({ visible: true }).first().click();
  await a.getByRole("radio", { name: new RegExp(CHILD.nombre) }).filter({ visible: true }).first().click();
  await visibleText(a, /^(www\.)?bplay\.bet\.ar$/).waitFor(T);
  expect((await countText(a, /apostando-sitio/)) === 0, "por dispositivo: solo los eventos de Sofía");
  await shot(a, "historial-por-dispositivo");
});

await run("detalle del evento", a, async () => {
  await a.getByRole("button", { name: /^Sitio bloqueado\. (www\.)?bplay\.bet\.ar/ }).filter({ visible: true }).first().click();
  await heading(a, "Detalle del evento").waitFor(T);
  await visibleText(a, new RegExp(`^${CHILD.nombre} intentó acceder a un sitio restringido$`)).waitFor();
  await visibleText(a, /^¿QUÉ SIGNIFICA ESTO\?$/).waitFor();
  await btn(a, `Dispositivo de ${CHILD.nombre}`).waitFor();
  expect((await countText(a, /ilegal/i)) === 0, 'el detalle no debe decir "ilegal"');
  await shot(a, "detalle-evento");
});

await run("alertas y detalle de alerta", a, async () => {
  await a.goto(BASE + "/app/");
  await visibleText(a, /Hola, Laura/).waitFor(T);
  await a.getByLabel(/alertas/i).filter({ visible: true }).first().click();
  await heading(a, "Mis alertas").waitFor(T);
  await visibleText(a, /^Hoy - \d{1,2} de [a-z]+$/).waitFor(T);
  await visibleText(a, /^Sitio bloqueado$/).waitFor();
  await visibleText(a, new RegExp(`^${CHILD2.nombre} - `)).waitFor();
  await visibleText(a, /^Dispositivo vinculado$/).waitFor();
  if (API && tomasToken) {
    await visibleText(a, new RegExp(`^${CHILD2.nombre} intentó desinstalar la aplicación$`)).waitFor();
    await visibleText(a, /^Intento de modificación$/).waitFor();
  }
  await shot(a, "alertas");
  const target = API && tomasToken ? /^¡Requiere tu atención!$/ : /^Sitio bloqueado$/;
  await visibleText(a, target).click();
  await heading(a, "Detalle del evento").waitFor(T);
  await visibleText(a, /^¿QUÉ SIGNIFICA ESTO\?$/).waitFor();
  await shot(a, "detalle-alerta");
});

// ───────────────────────── Adulto: configuración ─────────────────────────
await run("configuración", a, async () => {
  await a.goto(BASE + "/app/configuracion");
  for (const row of [
    "Mi cuenta",
    "Privacidad y seguridad",
    "¿Querés sugerir un sitio?",
    "Ayudanos a mejorar",
    "Términos y políticas",
    "Cerrar sesión",
    "Eliminar cuenta",
  ]) {
    await a.getByRole("button", { name: row, exact: true }).filter({ visible: true }).first().waitFor(T);
  }
  await shot(a, "configuracion");
});

await run("privacidad y seguridad: cambiar el PIN", a, async () => {
  await btn(a, /^Privacidad y seguridad$/).click();
  await visibleText(a, /^Cambiá tu PIN de seguridad$/).waitFor(T);
  await field(a, "PIN actual").fill(ADULT.pin);
  await field(a, "PIN nuevo").fill(NEW_PIN);
  await field(a, "Repetir PIN").fill(NEW_PIN);
  await shot(a, "privacidad");
  await btn(a, /^Guardar PIN$/).click();
  await visibleText(a, /Tu PIN de seguridad se actualizó/).waitFor(T);
  await shot(a, "privacidad-ok");
  ADULT.pin = NEW_PIN;
  await btn(a, /^Volver$/).click();
  await btn(a, /^Mi cuenta$/).waitFor(T);
});

await run("sugerir un sitio con motivo libre", a, async () => {
  await btn(a, /^¿Querés sugerir un sitio\?$/).click();
  await visibleText(a, /^Compartinos la dirección y la evaluaremos$/).waitFor(T);
  expect((await field(a, "URL del sitio").getAttribute("placeholder")) === "http://", "placeholder de la URL");
  await field(a, "URL del sitio").fill(`https://apuestas-e2e-${stamp}.example.com/promo`);
  await field(a, "¿Por qué querés denunciarlo?").fill("Le ofrece bonos de bienvenida a mi hijo");
  await field(a, "Información adicional").fill("Apareció en un video de una red social");
  await shot(a, "sugerir-sitio");
  await btn(a, /^Enviar sugerencia$/).click();
  await visibleText(a, /^¡Sugerencia enviada!$/).waitFor(T);
  await visibleText(a, /LOTBA evaluará la información proporcionada/).waitFor();
  expect(!(await btn(a, /^Volver$/).isVisible().catch(() => false)), "el éxito no lleva botón Volver");
  await shot(a, "sugerir-sitio-exito");
  if (API && ADMIN_SECRET) {
    const list = await api("GET", "/api/blocklist/suggestions", null, { "x-admin-secret": ADMIN_SECRET });
    const saved = (list.body.suggestions ?? []).find((s) => s.domain === `apuestas-e2e-${stamp}.example.com`);
    expect(saved?.motivoTexto === "Le ofrece bonos de bienvenida a mi hijo", "la sugerencia no llegó a la API");
  }
  await btn(a, /^Cerrar$/).click();
  await btn(a, /^Mi cuenta$/).waitFor(T);
});

await run("ayudanos a mejorar: enviar opinión", a, async () => {
  await btn(a, /^Ayudanos a mejorar$/).click();
  await visibleText(a, /^Tu opinión nos ayuda a mejorar BA Protege\+$/).waitFor(T);
  await field(a, "¿Cómo podríamos mejorar?").fill(`Un resumen semanal por correo (${stamp})`);
  await shot(a, "mejorar");
  await btn(a, /^Enviar opinión$/).click();
  await visibleText(a, /Recibimos tu opinión/).waitFor(T);
  await shot(a, "mejorar-enviado");
  if (API && ADMIN_SECRET) {
    const list = await api("GET", "/api/feedback", null, { "x-admin-secret": ADMIN_SECRET });
    expect(
      (list.body.feedback ?? []).some((f) => f.text === `Un resumen semanal por correo (${stamp})`),
      "la opinión no llegó a la API",
    );
  }
  await btn(a, /^Volver$/).click();
  await btn(a, /^Mi cuenta$/).waitFor(T);
});

await run("ayuda y sitios bloqueados", a, async () => {
  await btn(a, /^Ayuda y preguntas frecuentes$/).click();
  await a.waitForTimeout(600);
  await btn(a, /^Volver$/).waitFor(T);
  await shot(a, "ayuda");
  await btn(a, /^Volver$/).click();
  await btn(a, /^Sitios bloqueados$/).click();
  await visibleText(a, /LOTBA/).waitFor(T);
  await shot(a, "sitios-bloqueados");
});

// El PIN nuevo es el que vale en el celular protegido.
await run("celular de Sofía: pausar pide el PIN nuevo", c, async () => {
  await c.goto(BASE + "/app/protected");
  await visibleText(c, new RegExp(`^Hola, ${CHILD.nombre}$`)).waitFor(T);
  const toggle = c.getByRole("switch").filter({ visible: true }).first();
  if (!(await toggle.isVisible().catch(() => false))) {
    console.log("  (en la web el Inicio no muestra el interruptor de la VPN: se omite)");
    return;
  }
  await toggle.click();
  await visibleText(c, /^PIN de la persona adulta$/).waitFor(T);
  await btn(c, /^Cancelar$/).click();
});

console.log("OK: flujo completo");
await browser.close();
