// Cálculos de las pantallas de dispositivos (inicio, detalle, historial por
// dispositivo y código de vinculación). Son funciones puras, sin React Native,
// para poder probarlas con `node scripts/smoke-dispositivos.mjs`.

const MINUTE = 60_000;
const DAY = 86_400_000;

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function parse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Días de calendario entre la fecha y hoy (0 = hoy, 1 = ayer). */
function daysAgo(date: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY);
}

function hhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Edad en años cumplidos a partir de la fecha de nacimiento (AAAA-MM-DD).
 * Devuelve null si la fecha no es válida o está en el futuro.
 */
export function ageFromBirthDate(birthDate: string | undefined, now: Date = new Date()): number | null {
  if (!birthDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  let age = now.getFullYear() - year;
  const beforeBirthday =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

/** Evento mínimo para las cuentas: lo que trae `HistoryEvent`. */
export type CountableEvent = {
  deviceId: string;
  category: string;
  timestamp: string;
};

/**
 * Webs bloqueadas en los últimos 7 días para un dispositivo: los eventos de la
 * categoría "blocked" (SITE_BLOCKED y ACCESS_ATTEMPT en el backend).
 */
export function countBlockedLastWeek(
  events: CountableEvent[],
  deviceId: string,
  now: Date = new Date(),
): number {
  const from = now.getTime() - 7 * DAY;
  return events.filter((event) => {
    if (event.deviceId !== deviceId || event.category !== "blocked") return false;
    const date = parse(event.timestamp);
    return !!date && date.getTime() >= from && date.getTime() <= now.getTime() + MINUTE;
  }).length;
}

/**
 * Tiempo relativo corto como en Figma: "Recién", "Hace 5 min", "Hace 2 h",
 * "Ayer - 20:00" y, más atrás, "dd/mm - HH:MM".
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = parse(iso);
  if (!date) return "";
  const minutes = Math.floor((now.getTime() - date.getTime()) / MINUTE);
  const days = daysAgo(date, now);

  if (minutes < 1) return "Recién";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (days === 0) return `Hace ${Math.floor(minutes / 60)} h`;
  if (days === 1) return `Ayer - ${hhmm(date)}`;
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")} - ${hhmm(date)}`;
}

/** Encabezado de día largo: "Hoy - 27 de septiembre", "Ayer - 26 de septiembre", "Martes - 22 de septiembre". */
export function formatDayHeader(iso: string, now: Date = new Date()): string {
  const date = parse(iso);
  if (!date) return "";
  const days = daysAgo(date, now);
  const prefix = days === 0 ? "Hoy" : days === 1 ? "Ayer" : WEEKDAYS[date.getDay()];
  const yearSuffix = date.getFullYear() !== now.getFullYear() ? ` de ${date.getFullYear()}` : "";
  return `${prefix} - ${date.getDate()} de ${MONTHS[date.getMonth()]}${yearSuffix}`;
}

/** Hora de una tarjeta bajo el encabezado del día: "14:25" o "Ayer - 20:00". */
export function formatCardTime(iso: string, now: Date = new Date()): string {
  const date = parse(iso);
  if (!date) return "";
  return daysAgo(date, now) === 1 ? `Ayer - ${hhmm(date)}` : hhmm(date);
}

/** Agrupa eventos (ya ordenados del más nuevo al más viejo) por día de calendario. */
export function groupByDay<T extends { timestamp: string }>(
  events: T[],
  now: Date = new Date(),
): { key: string; title: string; items: T[] }[] {
  const groups: { key: string; title: string; items: T[] }[] = [];
  for (const event of events) {
    const date = parse(event.timestamp);
    const key = date ? String(startOfDay(date)) : "sin-fecha";
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, title: date ? formatDayHeader(event.timestamp, now) : "Sin fecha", items: [] };
      groups.push(group);
    }
    group.items.push(event);
  }
  return groups;
}

/**
 * Vigencia que le queda al código de vinculación: "24 horas", "1 hora y 30 minutos",
 * "45 minutos". Null si la fecha no es válida o ya venció.
 */
export function formatValidity(iso: string | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const date = parse(iso);
  if (!date) return null;
  const minutes = Math.ceil((date.getTime() - now.getTime()) / MINUTE);
  if (minutes <= 0) return null;
  if (minutes < 60) return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
  if (minutes >= 120) {
    // Con varias horas por delante se redondea: un código recién creado dice "24 horas".
    const hours = Math.round(minutes / 60);
    return `${hours} horas`;
  }
  const rest = minutes - 60;
  return rest === 0 ? "1 hora" : `1 hora y ${rest} ${rest === 1 ? "minuto" : "minutos"}`;
}

/**
 * Texto de la tarjeta de estado del inicio según cómo están los dispositivos
 * ("active", "pending" o "disabled", como en deviceService).
 */
export function statusSummary(devices: { status: string }[]): {
  tone: "success" | "warning" | "danger";
  title: string;
  subtitle: string;
} {
  const total = devices.length;
  const active = devices.filter((device) => device.status === "active").length;
  const paused = devices.filter((device) => device.status === "disabled").length;
  const pending = devices.filter((device) => device.status === "pending").length;
  const subtitle = `${active} de ${total} ${plural(total, "dispositivo activo", "dispositivos activos")}`;

  if (total > 0 && active === total) {
    return {
      tone: "success",
      title: total === 1 ? "El dispositivo está protegido" : "Todos los dispositivos están protegidos",
      subtitle,
    };
  }
  if (paused > 0) {
    return {
      tone: "danger",
      title:
        paused === 1
          ? "Hay un dispositivo con la protección pausada"
          : `Hay ${paused} dispositivos con la protección pausada`,
      subtitle,
    };
  }
  return {
    tone: "warning",
    title: pending === 1 ? "Falta vincular un dispositivo" : `Falta vincular ${pending} dispositivos`,
    subtitle,
  };
}

/** Palabra en singular o plural según la cantidad: plural(1, "año", "años") = "año". */
export function plural(count: number, singular: string, pluralWord: string): string {
  return count === 1 ? singular : pluralWord;
}
