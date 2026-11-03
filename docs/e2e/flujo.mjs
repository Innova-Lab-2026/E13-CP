// Recorrido de punta a punta de BA Protege+ contra el despliegue, con capturas para el README.
// Uso: node flujo.mjs [https://baprotege.vercel.app]
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "https://baprotege.vercel.app";
const SHOTS = "/root/innova/E13-Control-Parental/docs/screenshots";
fs.mkdirSync(SHOTS, { recursive: true });

const stamp = Date.now();
const ADULT = {
  nombre: "Laura",
  apellido: "Gómez",
  email: `e2e+${stamp}@example.com`,
  telefono: "11 5555 1234",
  password: `Prueba-${stamp}`,
  pin: "4826",
};
const CHILD = { nombre: "Sofía", nacimiento: "12082013" };

const browser = await chromium.launch();
const viewport = { width: 390, height: 844 };
const adult = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: "es-AR" });
const child = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: "es-AR" });

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
    await page.screenshot({ path: `${SHOTS}/ERROR-${label.replace(/\W+/g, "_")}.png` });
    console.log((await page.locator("body").innerText()).slice(0, 1500));
    await browser.close();
    process.exit(1);
  }
}
// En web el Stack deja montadas (ocultas) las pantallas anteriores: se apunta solo a lo visible.
const btn = (page, name) =>
  page.getByRole("button", { name, exact: false }).filter({ visible: true }).first();
const field = (page, label) =>
  page
    .locator(`input[aria-label="${label}"], textarea[aria-label="${label}"]`)
    .filter({ visible: true })
    .first();
const visibleText = (page, re) => page.getByText(re).filter({ visible: true }).first();
// El PinInput usa un input transparente: se elige el que pertenece a la pantalla visible.
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

const a = await adult.newPage();
a.on("pageerror", (e) => console.log("  [pageerror]", e.message));

await run("landing", a, async () => {
  await a.goto(BASE + "/");
  await a.getByRole("heading", { name: /Protegé a tu familia/ }).waitFor();
  await a.setViewportSize({ width: 1280, height: 800 });
  await shot(a, "landing");
  await a.setViewportSize(viewport);
  await shot(a, "landing-movil");
});

await run("bienvenida y onboarding", a, async () => {
  await a.goto(BASE + "/app/");
  await btn(a, "Comenzar").waitFor({ timeout: 20000 });
  await shot(a, "bienvenida");
  await btn(a, "Comenzar").click();
  await btn(a, "Continuar").waitFor();
  await shot(a, "onboarding-1");
  await btn(a, "Continuar").click();
  await a.waitForTimeout(500);
  await shot(a, "onboarding-2");
  await btn(a, "Continuar").click();
  await btn(a, "Iniciar sesión").waitFor();
  await shot(a, "login");
});

await run("crear cuenta", a, async () => {
  await btn(a, "Crear cuenta").click();
  await field(a, "Nombre").fill(ADULT.nombre);
  await field(a, "Apellido").fill(ADULT.apellido);
  await field(a, "Correo electrónico").fill(ADULT.email);
  await field(a, "Teléfono").fill(ADULT.telefono);
  await field(a, "Contraseña").fill(ADULT.password);
  await field(a, "Confirmar contraseña").fill(ADULT.password);
  await shot(a, "crear-cuenta");
  await btn(a, "Crear cuenta").last().click();
  await visibleText(a, /adulta responsable|adulto responsable/i).waitFor({ timeout: 20000 });
  await shot(a, "seleccion-de-modo");
});

await run("modo adulto y PIN", a, async () => {
  await visibleText(a, /adulta responsable|adulto responsable/i).click();
  await btn(a, "Continuar").click();
  await visibleText(a, /PIN/).waitFor();
  await fillPin(a, ADULT.pin);
  await shot(a, "crear-pin");
  await btn(a, /Continuar|Siguiente|Guardar|Crear/).click();
  await a.waitForTimeout(500);
  await fillPin(a, ADULT.pin);
  await btn(a, /Guardar|Confirmar|Crear|Continuar/).click();
  await visibleText(a, /Hola, Laura/).waitFor({ timeout: 20000 });
  await shot(a, "home-sin-dispositivos");
});

let linkCode = "";
await run("agregar dispositivo", a, async () => {
  await btn(a, /Agregar/).click();
  await field(a, "Nombre").fill(CHILD.nombre);
  await a.getByPlaceholder("dd/mm/aaaa").filter({ visible: true }).first().fill(CHILD.nacimiento);
  await shot(a, "agregar-dispositivo");
  await btn(a, "Agregar dispositivo").click();
  await visibleText(a, /Perfil creado|creado/i).waitFor({ timeout: 20000 });
  const text = await a.locator("body").innerText();
  linkCode = (text.match(/\b[A-HJ-NP-Z2-9]{8}\b/) ?? [""])[0];
  await shot(a, "dispositivo-creado");
  console.log("  código de vinculación:", linkCode || "(no visible)");
});

const c = await child.newPage();
c.on("pageerror", (e) => console.log("  [pageerror hijo]", e.message));
await run("celular del menor: login y modo protegido", c, async () => {
  await c.goto(BASE + "/app/login");
  await field(c, "Correo electrónico").fill(ADULT.email);
  await field(c, "Contraseña").fill(ADULT.password);
  await btn(c, "Iniciar sesión").click();
  await visibleText(c, /dispositivo protegido/i).waitFor({ timeout: 20000 });
  await visibleText(c, /dispositivo protegido/i).click();
  await btn(c, "Continuar").click();
  await visibleText(c, CHILD.nombre).waitFor({ timeout: 20000 });
  await shot(c, "vinculacion-elegir-perfil");
});

await run("vincular con PIN incorrecto y correcto", c, async () => {
  await visibleText(c, CHILD.nombre).click();
  await btn(c, "Continuar").click();
  await fillPin(c, "1357");
  await btn(c, /Vincular|Confirmar/).click();
  await visibleText(c, /PIN no es correcto|PIN es incorrecto/i).waitFor({ timeout: 15000 });
  await shot(c, "vinculacion-pin-incorrecto");
  await btn(c, /Reintentar|Volver a intentar|Entendido|Cerrar|Aceptar/).click().catch(() => c.keyboard.press("Escape"));
  await c.waitForTimeout(400);
  await fillPin(c, ADULT.pin);
  await btn(c, /Vincular|Confirmar/).click();
  await visibleText(c, /vinculado|Listo|protegido/i).waitFor({ timeout: 20000 });
  await shot(c, "vinculacion-exito");
});

await run("home protegido y prueba de bloqueo", c, async () => {
  const go = btn(c, /Ir a|Continuar|Empezar/);
  if (await go.isVisible().catch(() => false)) await go.click();
  await visibleText(c, /Probar un sitio/i).waitFor({ timeout: 20000 });
  await shot(c, "home-protegido");
  await c.getByLabel(/sitio|dominio/i).filter({ visible: true }).first().fill("www.bplay.bet.ar");
  await btn(c, /Probar/).click();
  await visibleText(c, /está bloqueado/i).waitFor({ timeout: 20000 });
  await shot(c, "sitio-bloqueado");
});

await run("adulto: alertas, historial y configuración", a, async () => {
  await a.goto(BASE + "/app/");
  await visibleText(a, /Hola, Laura/).waitFor({ timeout: 20000 });
  await shot(a, "home-con-dispositivo");
  await a.getByLabel(/alertas/i).filter({ visible: true }).first().click();
  await visibleText(a, /Sitio bloqueado/i).waitFor({ timeout: 20000 });
  await shot(a, "alertas");
  await visibleText(a, /Sitio bloqueado/i).click();
  await a.waitForTimeout(800);
  await shot(a, "detalle-alerta");
  await a.goto(BASE + "/app/historial");
  await visibleText(a, /Historial/).waitFor({ timeout: 20000 });
  await a.waitForTimeout(1500);
  await shot(a, "historial");
  await a.goto(BASE + "/app/configuracion");
  await visibleText(a, /Mi cuenta/).waitFor({ timeout: 20000 });
  await shot(a, "configuracion");
  await visibleText(a, /Ayuda/).click();
  await a.waitForTimeout(800);
  await shot(a, "ayuda");
});

console.log("OK: flujo completo");
await browser.close();
