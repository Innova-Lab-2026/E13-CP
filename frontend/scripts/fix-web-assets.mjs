// expo export deja las fuentes de @expo/vector-icons en dist/app/assets/node_modules/...
// El CLI de Vercel no sube carpetas llamadas node_modules, así que los íconos llegaban
// rotos. Este paso mueve esa carpeta a assets/vendor y actualiza las referencias.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "dist/app");
const from = path.join(root, "assets", "node_modules");
const to = path.join(root, "assets", "vendor");

if (!fs.existsSync(from)) {
  console.log("fix-web-assets: no hay assets/node_modules, nada que hacer");
  process.exit(0);
}

fs.rmSync(to, { recursive: true, force: true });
fs.renameSync(from, to);

let patched = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(js|html|json|css|map)$/.test(entry.name)) {
      const text = fs.readFileSync(full, "utf8");
      if (text.includes("/assets/node_modules/")) {
        fs.writeFileSync(full, text.replaceAll("/assets/node_modules/", "/assets/vendor/"));
        patched += 1;
      }
    }
  }
}
walk(root);
console.log(`fix-web-assets: assets movidos a assets/vendor, ${patched} archivos actualizados`);
