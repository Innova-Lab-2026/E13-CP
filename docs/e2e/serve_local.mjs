// Sirve la web exportada (frontend/dist) como en Vercel: la landing en / y la app en
// /app, con las rewrites de frontend/vercel.json (/app/* -> /app/index.html, porque
// app.json usa web.output "single").
// Uso: node docs/e2e/serve_local.mjs frontend/dist [8099]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] ?? "frontend/dist");
const PORT = Number(process.argv[3] ?? 8099);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
  ".apk": "application/vnd.android.package-archive",
};

function resolveFile(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  let file = path.join(ROOT, clean);
  if (!file.startsWith(ROOT)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (fs.existsSync(file)) return file;
  // Rewrite de vercel.json: cualquier ruta de la app la resuelve el router del cliente.
  if (clean === "/app" || clean.startsWith("/app/")) return path.join(ROOT, "app", "index.html");
  return null;
}

http
  .createServer((req, res) => {
    const file = resolveFile((req.url ?? "/").split("?")[0]);
    if (!file) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("No encontrado");
      return;
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, "0.0.0.0", () => console.log(`web local en http://localhost:${PORT}/app/ (raíz ${ROOT})`));
