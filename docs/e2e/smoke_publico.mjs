// Smoke test de las pantallas públicas con la API simulada.
// Uso: EXPO_PUBLIC_API_URL=http://localhost:3999 npx expo export -p web --output-dir <dist>/app
//      node smoke_publico.mjs <dist> <carpeta-de-capturas>  (desde una carpeta con playwright instalado)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DIST = path.resolve(process.argv[2]);
const SHOTS = process.argv[3];
fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = {
  ".js": "text/javascript",
  ".html": "text/html",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".css": "text/css",
  ".json": "application/json",
  ".ico": "image/x-icon",
};
const server = http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    let file = path.join(DIST, url);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(DIST, "app/index.html");
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(4877);

const API = "http://localhost:3999";
const BASE = "http://localhost:4877/app";
const profile = {
  id: "u1",
  email: "laura@example.com",
  name: "Laura",
  rol: "responsable",
  mode: "adulto",
  hasPin: true,
};
const devices = [
  { id: "d1", deviceName: "Paula", status: "active" },
  { id: "d2", deviceName: "Ramiro", status: "active" },
  { id: "d3", deviceName: "Lorena", status: "pending" },
  { id: "d4", deviceName: "Maximiliano Fernández", status: "inactive" },
];
let failures = 0;
const errors = [];
function check(cond, label) {
  console.log(`${cond ? "OK  " : "FAIL"} ${label}`);
  if (!cond) failures++;
}

const browser = await chromium.launch();
async function newPage({ session, googleDelay = 0 } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    locale: "es-AR",
  });
  if (session) {
    await ctx.addInitScript(
      (s) => localStorage.setItem("ba-protege:session", JSON.stringify(s)),
      session,
    );
  }
  await ctx.route(`${API}/**`, async (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
    if (req.method() === "OPTIONS") return json({});
    if (p === "/api/auth/google/config") {
      if (googleDelay) await new Promise((r) => setTimeout(r, googleDelay));
      return json({ enabled: true });
    }
    if (p === "/api/devices") return json({ devices });
    if (p === "/api/auth/me/mode") return json({ ...profile, mode: JSON.parse(req.postData()).mode });
    if (p === "/api/devices/confirm-link") {
      const { pin } = JSON.parse(req.postData());
      if (pin !== "4826") return json({ error: "Invalid PIN" }, 401);
      return json({ device: { ...devices[2], status: "active" } });
    }
    if (p === "/api/auth/pin/verify") {
      return json({}, JSON.parse(req.postData()).pin === "4826" ? 200 : 401);
    }
    if (p.startsWith("/api/devices/") && p.endsWith("/status")) {
      return json({ device: { ...devices[0], status: "active" } });
    }
    return json({});
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) {
      errors.push(`${page.url()} console: ${m.text()}`);
    }
  });
  return page;
}
const vis = (page, re) => page.getByText(re).filter({ visible: true }).first();
const btn = (page, name) =>
  page.getByRole("button", { name, exact: false }).filter({ visible: true }).first();
const shot = (page, name) =>
  page.waitForTimeout(600).then(() => page.screenshot({ path: `${SHOTS}/${name}.png` }));

async function fillPin(page, value) {
  await page.evaluate(() => {
    document.querySelectorAll("[data-pin]").forEach((e) => e.removeAttribute("data-pin"));
    const el = [...document.querySelectorAll("input")].find(
      (e) => e.offsetParent !== null && e.maxLength === 4,
    );
    el.setAttribute("data-pin", "1");
  });
  await page.locator("[data-pin]").fill(value, { force: true });
}

try {
  // Onboarding
  let page = await newPage();
  await page.goto(`${BASE}/onboarding`);
  await vis(page, /Protegé a tu familia de las apuestas online/).waitFor({ timeout: 30000 });
  check(await vis(page, /En esta aplicación podés bloquear/).isVisible(), "onboarding 1: texto de Figma");
  await shot(page, "onboarding-1");
  await btn(page, "Continuar").click();
  await vis(page, /Las apuestas online no son un juego/).waitFor();
  check(
    await vis(page, /conversalo con tu adulto responsable/).isVisible(),
    "onboarding 2: segundo párrafo",
  );
  await shot(page, "onboarding-2");
  await btn(page, "Continuar").click();
  await btn(page, "Iniciar sesión").waitFor();
  check(true, "onboarding 2 -> login");
  await page.context().close();

  // Login con Google demorado: el botón aparece deshabilitado, sin hueco.
  page = await newPage({ googleDelay: 4000 });
  await page.goto(`${BASE}/login`);
  await btn(page, "Iniciar sesión").waitFor({ timeout: 30000 });
  const g = btn(page, "Continuar con Google");
  check(await g.isVisible(), "login: botón de Google visible mientras consulta");
  check(
    (await g.getAttribute("aria-disabled")) === "true",
    "login: botón de Google deshabilitado mientras consulta",
  );
  await shot(page, "login-google-consultando");
  await page.waitForTimeout(4500);
  check(
    (await g.getAttribute("aria-disabled")) !== "true",
    "login: botón de Google habilitado después",
  );
  check(await btn(page, "Crear cuenta").isVisible(), "login: acceso Crear cuenta");
  check(await btn(page, "Vincular con un código").isVisible(), "login: acceso Vincular con un código");
  await shot(page, "login");
  await btn(page, "Crear cuenta").click();
  await page.waitForURL(/register/, { timeout: 10000 });
  check(true, "login -> crear cuenta");
  await page.goto(`${BASE}/login`);
  await btn(page, "Vincular con un código").click();
  await page.waitForURL(/vincular/, { timeout: 10000 });
  await vis(page, /Vinculá este celular/).waitFor();
  await shot(page, "vincular");
  check(true, "login -> vincular con código");
  await page.context().close();

  // Selección de modo: tocar la tarjeta avanza.
  const session = { token: "t", profile, authMethod: "password" };
  page = await newPage({ session });
  await page.goto(`${BASE}/mode`);
  await vis(page, /¿Cómo vas a utilizar BA Protege\+\?/).waitFor({ timeout: 30000 });
  check(
    (await page.locator('[aria-label*="Lotería"]').filter({ visible: true }).count()) > 0,
    "modo: logo de Lotería",
  );
  check(await btn(page, "Usar otra cuenta").isVisible(), "modo: Usar otra cuenta");
  check(
    !(await btn(page, /^Continuar$/).isVisible().catch(() => false)),
    "modo: sin botón Continuar",
  );
  await shot(page, "modo");
  await btn(page, /Este es un dispositivo protegido/).click();
  await vis(page, /¿Qué perfil vas a vincular\?/).waitFor({ timeout: 15000 });
  check(true, "modo protegido -> elegir perfil");
  await vis(page, "Lorena").waitFor();
  check(await vis(page, "Pendiente de vinculación").isVisible(), "perfil: estado pendiente");
  check(await vis(page, "Protección activa").isVisible(), "perfil: estado activo");
  check(await vis(page, "Protección pausada").isVisible(), "perfil: estado pausado");
  await shot(page, "vincular-elegir-perfil");
  await btn(page, /Perfil de Lorena/).click();
  await vis(page, /Confirmá la vinculación/).waitFor();
  await fillPin(page, "1111");
  await btn(page, "Vincular celular").click();
  await vis(page, /El PIN no es correcto/).waitFor({ timeout: 10000 });
  check(true, "PIN incorrecto muestra el aviso");
  await btn(page, "Intentar de nuevo").click();
  await fillPin(page, "4826");
  await btn(page, "Vincular celular").click();
  await vis(page, /¡Dispositivo vinculado!/).waitFor({ timeout: 10000 });
  check(await vis(page, "BA Protege+ Activo").isVisible(), "éxito: píldora activa");
  check(await btn(page, "Ir al Inicio").isVisible(), "éxito: botón Ir al Inicio");
  await shot(page, "vincular-exito");
  await page.context().close();

  // Perfil ya vinculado: también pide PIN y usa la verificación del PIN.
  page = await newPage({ session: { ...session, mode: "dispositivo_protegido" } });
  await page.goto(`${BASE}/protected/link`);
  await btn(page, /Perfil de Paula/).click();
  await vis(page, /Confirmá la vinculación/).waitFor();
  await fillPin(page, "4826");
  await btn(page, "Vincular celular").click();
  await vis(page, /¡Dispositivo vinculado!/).waitFor({ timeout: 10000 });
  check(true, "perfil ya vinculado: revincula con PIN");
  await page.context().close();

  // Modo adulto con PIN va al inicio.
  page = await newPage({ session });
  await page.goto(`${BASE}/mode`);
  await btn(page, /Soy Responsable/).click();
  await page.waitForURL(/inicio/, { timeout: 15000 });
  check(true, "modo responsable -> inicio");
  await page.context().close();
} catch (e) {
  failures++;
  console.log("FAIL excepción:", e.message.split("\n")[0]);
}
console.log("errores de página:", errors.length ? "\n  " + errors.join("\n  ") : "ninguno");
await browser.close();
server.close();
process.exit(failures ? 1 : 0);
