function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "Hoy", "Ayer" o la fecha en formato dd/mm/aaaa. */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return formatDate(date);
}

/** Hora en formato HH:MM. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** dd/mm/aaaa a partir de una fecha. */
export function formatDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

/**
 * Tiempo que falta hasta una fecha: "24 h", "1 h 30 min", "45 min".
 * Devuelve null si la fecha no es válida o ya pasó.
 */
export function formatTimeLeft(iso: string, now: Date = new Date()): string | null {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;

  const minutes = Math.ceil((target.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  // Con varias horas por delante, los minutos no aportan.
  return hours >= 3 || rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Convierte AAAA-MM-DD (formato del backend) a dd/mm/aaaa. */
export function formatIsoDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day.slice(0, 2)}/${month}/${year}`;
}
