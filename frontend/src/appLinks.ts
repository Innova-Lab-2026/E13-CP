/**
 * Enlaces para vincular el celular del menor con un código.
 * El esquema "baprotege" es el de app.json: abre la app instalada.
 */

/** Página web de "Vinculá este celular" (la app web vive en /app). */
export const LINK_WEB_URL = "https://baprotege.vercel.app/app/vincular";

/** APK de Android que publica la landing. */
export const APK_DOWNLOAD_URL = "https://baprotege.vercel.app/descargas/ba-protege.apk";

/** Enlace web con el código ya escrito. Nunca lleva el PIN. */
export function linkWebUrl(code: string): string {
  return `${LINK_WEB_URL}?code=${encodeURIComponent(code)}`;
}

/** Abre "Vinculá este celular" en la app instalada, con el código si lo hay. */
export function appLinkUrl(code?: string): string {
  return code
    ? `baprotege://vincular?code=${encodeURIComponent(code)}`
    : "baprotege://vincular";
}
