// Smoke test del historial, las alertas y el detalle del evento sobre la web
// exportada, con la API simulada (no hace falta backend ni base de datos).
//
// Uso (como flujo.mjs, desde una carpeta con playwright en node_modules):
//   cd frontend && EXPO_PUBLIC_API_URL=http://localhost:3999 \
//     npx expo export -p web --output-dir /tmp/historial-smoke/dist/app
//   cp docs/e2e/historial_smoke.mjs <carpeta con playwright>/ && cd <esa carpeta>
//   SMOKE_DIST=/tmp/historial-smoke/dist node historial_smoke.mjs
// Si Metro reutiliza una caché vieja, exportá con TMPDIR propio o con --clear.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.SMOKE_DIST ?? "/root/innova/fg-historial-smoke/dist";
const SHOTS = process.env.SMOKE_SHOTS ?? path.join(path.dirname(ROOT), "shots");
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const PORT = 8771;
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".ttf": "font/ttf", ".json": "application/json", ".ico": "image/x-icon" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  let file = path.join(ROOT, url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, "app", "index.html");
  res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));
const BASE = `http://localhost:${PORT}/app`;

const now = Date.now();
const ago = (min) => new Date(now - min * 60_000).toISOString();
const devices = [
  { id: "dev1", deviceName: "Sofía", status: "active", fechaNacimiento: "2012-03-01" },
  { id: "dev2", deviceName: "Ramiro", status: "active", fechaNacimiento: "2011-05-01" },
  { id: "dev3", deviceName: "Paula", status: "pending" },
];
const events = [
  { id: "e1", deviceId: "dev2", eventType: "SITE_BLOCKED", domain: "apostando-sitio.com", details: "Se bloqueó el acceso", timestamp: ago(5) },
  { id: "e2", deviceId: "dev1", eventType: "BYPASS_ATTEMPT", details: "PIN incorrecto al pausar la protección en este celular", timestamp: ago(30) },
  { id: "e3", deviceId: "dev1", eventType: "PROTECTION_MODIFIED", details: "Se pausó la protección en este celular", timestamp: ago(50) },
  { id: "e4", deviceId: "dev2", eventType: "APP_INSTALL_ATTEMPT", details: "Intento de instalar una VPN", timestamp: ago(70) },
  { id: "e5", deviceId: "dev1", eventType: "SITE_BLOCKED", domain: "bplay.bet.ar", details: "Se bloqueó el acceso", timestamp: ago(60 * 26) },
];
const alerts = [
  { id: "a1", deviceId: "dev2", alertType: "SITE_BLOCKED", message: "Intento de acceso al sitio apostando-sitio.com desde Ramiro", read: false, createdAt: ago(5) },
  { id: "a2", deviceId: "dev1", alertType: "UNINSTALL_ATTEMPT", message: "Intento de desinstalar", read: true, createdAt: ago(40) },
  { id: "a3", deviceId: "dev1", alertType: "PROTECTION_MODIFIED", message: "Cambio", read: true, createdAt: ago(80) },
  { id: "a4", deviceId: "dev2", alertType: "DEVICE_LINKED", message: "Dispositivo vinculado", read: true, createdAt: ago(60 * 27) },
  { id: "a5", deviceId: "dev3", alertType: "DEVICE_PENDING", message: "Perfil creado", read: true, createdAt: ago(60 * 28) },
];
const profile = { id: "r1", email: "laura@example.com", name: "Laura", rol: "responsable", mode: "adulto", hasPin: true };

async function mockApi(route) {
  const req = route.request();
  const p = new URL(req.url()).pathname;
  const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" } });
  if (req.method() === "OPTIONS") return json(204, {});
  if (p === "/api/devices") return json(200, { devices });
  if (p === "/api/events") return json(200, { events });
  if (p === "/api/events/alerts") return json(200, { alerts });
  if (/^\/api\/events\/alerts\/[^/]+\/read$/.test(p)) return json(200, {});
  if (p === "/api/auth/me") return json(200, profile);
  return json(404, { error: "not mocked " + p });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: "es-AR" });
await ctx.route("http://localhost:3999/**", mockApi);
await ctx.addInitScript((profile) => {
  localStorage.setItem("ba-protege:session", JSON.stringify({ token: "tok", profile, mode: "adulto", authMethod: "password" }));
}, profile);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !/404|not mocked/.test(m.text())) errors.push("console: " + m.text()); });

const vis = (re) => page.getByText(re).filter({ visible: true }).first();
const role = (r, name) => page.getByRole(r, { name }).filter({ visible: true }).first();
const count = async (re) => page.getByText(re).filter({ visible: true }).count();
let n = 0;
const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, "0")}-${name}.png` }); };
let failed = 0;
async function step(label, fn) {
  try { await fn(); console.log("OK   " + label); }
  catch (e) { failed++; console.log("FAIL " + label + ": " + e.message.split("\n")[0]); await shot("ERROR-" + label.replace(/\W+/g, "_")); console.log((await page.locator("body").innerText()).slice(0, 900)); }
}
const T = { timeout: 15000 };
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

await step("historial: pestañas y fechas largas", async () => {
  await page.goto(BASE + "/historial");
  await vis(/^Historial$/).waitFor(T);
  for (const t of ["Todos", "Por categorías", "Por dispositivo"]) await role("tab", t).waitFor(T);
  await vis(/^Hoy - \d{1,2} de [a-z]+$/).waitFor(T);
  await vis(/^Ayer - \d{1,2} de [a-z]+$/).waitFor(T);
  await vis(/^Ramiro - apostando-sitio\.com$/).waitFor(T);
  await vis(/^¡Requiere tu atención!$/).waitFor(T);
  await vis(/^Protección pausada$/).waitFor(T);
  await vis(/^Intento de modificación$/).waitFor(T);
  await vis(/^Protección activada$/).waitFor(T);
  await shot("historial-todos");
});
await step("historial: por categorías", async () => {
  await role("tab", "Por categorías").click();
  await role("radio", /Sitios bloqueados/).waitFor(T);
  expect((await count(/^Sitio bloqueado$/)) === 2, "esperaba 2 sitios bloqueados");
  expect((await count(/^Intento de modificación$/)) === 0, "no debería verse seguridad");
  await shot("historial-categorias");
  await role("radio", /Seguridad/).click();
  await vis(/^¡Requiere tu atención!$/).waitFor(T);
  expect((await count(/^Sitio bloqueado$/)) === 0, "no debería verse sitio bloqueado en seguridad");
});
await step("historial: por dispositivo", async () => {
  await role("tab", "Por dispositivo").click();
  // Paula va primera por orden alfabético; se arranca en el perfil con la actividad más reciente.
  await vis(/^apostando-sitio\.com$/).waitFor(T);
  expect((await count(/bplay/)) === 0, "debería arrancar en Ramiro");
  await role("radio", /Sofía/).click();
  await vis(/^bplay\.bet\.ar$/).waitFor(T);
  await role("radio", /Ramiro/).click();
  await vis(/^apostando-sitio\.com$/).waitFor(T);
  expect((await count(/^Ramiro - /)) === 0, "no debería repetir el nombre");
  await shot("historial-dispositivo");
});
await step("detalle desde historial", async () => {
  await role("button", /Sitio bloqueado\. apostando-sitio\.com/).click();
  await role("heading", "Detalle del evento").waitFor(T);
  await vis(/^Ramiro intentó acceder a un sitio restringido$/).waitFor(T);
  await vis(/^¿QUÉ SIGNIFICA ESTO\?$/).waitFor(T);
  await vis(/LOTBA/).waitFor(T);
  await vis(/^Acceso bloqueado$/).waitFor(T);
  // Figma: un solo bloque; el consejo es un segundo párrafo sin título propio.
  expect((await count(/QUÉ PODÉS HACER/)) === 0, "un solo bloque ¿QUÉ SIGNIFICA ESTO?");
  await vis(/hablar sobre los riesgos de las apuestas online/).waitFor(T);
  expect((await count(/^Ver dispositivo$/)) === 0, "Figma tiene un solo botón");
  expect((await count(/ilegal/i)) === 0, "no debe decir ilegal");
  await shot("detalle-historial");
});
await step("ver historial de Ramiro", async () => {
  await role("button", "Ver historial de Ramiro").click();
  await role("heading", "Historial de Ramiro").waitFor(T);
  expect((await page.getByRole("tab", { name: "Por categorías" }).filter({ visible: true }).count()) === 0, "sin filtros");
  expect((await count(/^Ramiro - /)) === 0, "no debería repetir el nombre");
  await shot("historial-de-ramiro");
});
await step("historial ?device=dev1 (como navega Dispositivos)", async () => {
  await page.goto(BASE + "/historial?device=dev1");
  await role("heading", "Historial de Sofía").waitFor(T);
  await vis(/^bplay\.bet\.ar$/).waitFor(T);
  expect((await count(/apostando-sitio/)) === 0, "solo Sofía");
});
await step("alertas", async () => {
  await page.goto(BASE + "/inicio/alerts");
  await role("heading", "Mis alertas").waitFor(T);
  await vis(/^Hoy - \d{1,2} de [a-z]+$/).waitFor(T);
  await vis(/^¡Requiere tu atención!$/).waitFor(T);
  await vis(/^Sofía intentó desinstalar la aplicación$/).waitFor(T);
  await vis(/^Intento de modificación$/).waitFor(T);
  await vis(/^Sofía - Configuración protegida$/).waitFor(T);
  await vis(/^Ramiro - apostando-sitio\.com$/).waitFor(T);
  // Los avisos informativos (vinculado, pendiente) van al Historial, no a Mis alertas.
  expect((await count(/^Dispositivo vinculado$/)) === 0, "sin avisos informativos en Mis alertas");
  await shot("alertas");
});
await step("detalle de alerta", async () => {
  await vis(/^Sitio bloqueado$/).click();
  await role("heading", "Detalle del evento").waitFor(T);
  await vis(/^Sitio web$/).waitFor(T);
  await vis(/^Hoy - \d{2}:\d{2}$/).waitFor(T);
  await shot("detalle-alerta");
  await role("button", "Dispositivo de Ramiro").click();
  await page.waitForURL(/dispositivos\/dev2/, T);
});
await step("detalle de alerta de atención", async () => {
  await page.goto(BASE + "/inicio/a2");
  await role("heading", "Detalle del evento").waitFor(T);
  await vis(/^Sofía intentó desinstalar BA Protege\+$/).waitFor(T);
  await vis(/^Requiere tu atención$/).waitFor(T);
  await shot("detalle-atencion");
});

console.log(errors.length ? "ERRORES:\n" + errors.join("\n") : "sin errores de consola");
console.log(failed ? `${failed} pasos fallaron` : "todo OK");
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
