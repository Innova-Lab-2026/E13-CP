import { formatDate, formatTime } from "../../utils/date";

const DAY_MS = 86_400_000;

function startOfDay(year: number, month: number, day: number): number {
  return new Date(year, month, day).getTime();
}

/**
 * Texto de "Última actualización" del listado: "Hoy 9:40", "Ayer 20:15" o
 * "31/08/2026 14:00".
 *
 * El listado oficial que viene con la app tiene solo fecha (se guarda como la
 * medianoche UTC de ese día): en ese caso se muestra el día sin hora, leído en
 * UTC, para que no aparezca como el día anterior a las 21:00 en Argentina.
 */
export function formatListUpdate(iso: string | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}(T00:00(:00(\.0+)?)?Z)?$/.test(iso);
  const dayStart = dateOnly
    ? startOfDay(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    : startOfDay(date.getFullYear(), date.getMonth(), date.getDate());
  const today = startOfDay(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today - dayStart) / DAY_MS);

  const dayLabel =
    days === 0 ? "Hoy" : days === 1 ? "Ayer" : formatDate(new Date(dayStart));
  if (dateOnly) return dayLabel;

  // "09:40" -> "9:40", como en el Figma.
  return `${dayLabel} ${formatTime(iso).replace(/^0(\d)/, "$1")}`;
}
