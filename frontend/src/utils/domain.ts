/** "https://www.Sitio.com/ruta" -> "www.sitio.com". Devuelve null si no parece un dominio. */
export function normalizeDomain(value: string): string | null {
  const domain = value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .split(/[/?#]/)[0]
    .split(":")[0]
    .replace(/^\*\./, "")
    .replace(/\.+$/, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) ? domain : null;
}
