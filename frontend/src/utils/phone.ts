/**
 * Teléfono válido: solo dígitos, +, espacios, paréntesis y guiones (hasta 20
 * caracteres) y entre 7 y 15 dígitos. Es la misma regla que aplica el backend,
 * así "+54 9 11 1234-5678" pasa en los dos lados.
 */
export function isValidPhone(value: string): boolean {
  const phone = value.trim();
  if (!/^[0-9+\s()-]{7,20}$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}
