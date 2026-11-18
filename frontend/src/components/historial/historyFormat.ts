// Fechas y textos del historial y de las alertas (Figma "Historial", "Alertas" y
// "Detalle del evento"). Sin dependencias de React para poder probarlo con node.

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

const DAY_MS = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function parse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Días calendario entre la fecha y hoy (0 = hoy, 1 = ayer). */
function daysAgo(date: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
}

/** Clave estable del día local (AAAA-MM-DD) para agrupar. */
export function dayKey(iso: string): string {
  const date = parse(iso);
  if (!date) return "sin-fecha";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Encabezado de un día: "Hoy - 17 de noviembre", "Ayer - 16 de noviembre" o
 * "14 de noviembre" (con el año si no es el actual).
 */
export function formatLongDayLabel(iso: string, now: Date = new Date()): string {
  const date = parse(iso);
  if (!date) return "Sin fecha";
  const dayMonth = `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
  const days = daysAgo(date, now);
  if (days === 0) return `Hoy - ${dayMonth}`;
  if (days === 1) return `Ayer - ${dayMonth}`;
  return date.getFullYear() === now.getFullYear()
    ? dayMonth
    : `${dayMonth} de ${date.getFullYear()}`;
}

/** Hora de una tarjeta: "14:25" si es de hoy, "Ayer - 20:30" o "14/11 - 20:30". */
export function formatCardTime(iso: string, now: Date = new Date()): string {
  const date = parse(iso);
  if (!date) return "";
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const days = daysAgo(date, now);
  if (days === 0) return time;
  if (days === 1) return `Ayer - ${time}`;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} - ${time}`;
}

/**
 * Tiempo relativo para listas cortas (Figma "Detalle por dispositivo"):
 * "Recién", "Hace 5 min", "Hace 2 h", "Ayer - 20:00" o "14/11 - 20:00".
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = parse(iso);
  if (!date) return "";
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes >= 0 && daysAgo(date, now) === 0) {
    if (minutes < 1) return "Recién";
    if (minutes < 60) return `Hace ${minutes} min`;
    return `Hace ${Math.floor(minutes / 60)} h`;
  }
  return formatCardTime(iso, now);
}

/** Fecha y hora del detalle: "Hoy - 14:25", "Ayer - 20:30" o "14/11/2026 - 20:30". */
export function formatDetailDateTime(iso: string, now: Date = new Date()): string {
  const date = parse(iso);
  if (!date) return "";
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const days = daysAgo(date, now);
  if (days === 0) return `Hoy - ${time}`;
  if (days === 1) return `Ayer - ${time}`;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} - ${time}`;
}

export type DayGroup<T> = { key: string; label: string; items: T[] };

/** Agrupa por día respetando el orden recibido (de lo más nuevo a lo más viejo). */
export function groupByDay<T>(
  items: T[],
  getIso: (item: T) => string,
  now: Date = new Date(),
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  const byKey = new Map<string, DayGroup<T>>();
  for (const item of items) {
    const iso = getIso(item);
    const key = dayKey(iso);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: formatLongDayLabel(iso, now), items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

/** Línea de la tarjeta: "Sofía - bplay.bet.ar", o solo el detalle si la pantalla ya es de ese perfil. */
export function cardLine(device: string, description: string, hideDeviceName = false): string {
  if (hideDeviceName || !device) return description;
  if (!description) return device;
  return `${device} - ${description}`;
}

/**
 * Tipos de evento que muestra el detalle. Son los `eventType` del historial y
 * los `alertType` de las alertas (los dos vienen del backend).
 */
export type EventKind =
  | "SITE_BLOCKED"
  | "ACCESS_ATTEMPT"
  | "UNINSTALL_ATTEMPT"
  | "BYPASS_ATTEMPT"
  | "APP_INSTALL_ATTEMPT"
  | "PROTECTION_MODIFIED"
  | "DEVICE_LINKED"
  | "DEVICE_PENDING"
  | "DEVICE_UNLINKED";

type EventCopy = {
  /** Frase debajo del título: "Sofía intentó acceder a un sitio restringido". */
  sentence: string;
  /** Texto del bloque "¿QUÉ SIGNIFICA ESTO?". */
  meaning: string;
  /** Sugerencia para la persona adulta ("Qué podés hacer"). */
  guidance?: string;
  /** Estado del detalle cuando el genérico de la variante no alcanza. */
  status?: string;
};

const LOTBA_LIST =
  "el listado oficial de sitios de apuestas de LOTBA (Lotería de la Ciudad), más los sitios que hayas agregado vos";

/** Textos del detalle según el tipo de evento. `name` es el nombre del perfil. */
export function eventCopy(kind: string | undefined, name: string, details?: string): EventCopy {
  switch (kind) {
    case "SITE_BLOCKED":
    case "ACCESS_ATTEMPT":
      return {
        sentence: `${name} intentó acceder a un sitio restringido`,
        meaning: `BA Protege+ bloqueó el acceso a este sitio porque forma parte de la lista de restricciones: ${LOTBA_LIST}.`,
        guidance:
          "Puede ser un buen momento para hablar sobre los riesgos de las apuestas online, sin retos y con escucha.",
      };
    case "UNINSTALL_ATTEMPT":
      return {
        sentence: `${name} intentó desinstalar BA Protege+`,
        meaning:
          "Detectamos un intento de quitar la aplicación del celular. Si se desinstala, los sitios de apuestas dejan de bloquearse en ese celular.",
        guidance:
          "Revisá que la protección siga activa y conversá con calma sobre por qué está instalada.",
      };
    case "BYPASS_ATTEMPT":
      return {
        sentence: `${name} intentó desactivar la protección`,
        meaning:
          "Alguien intentó pausar la protección o salir del modo protegido con un PIN incorrecto. Sin tu PIN, la protección sigue activa.",
        guidance:
          "Si no fuiste vos, conversá con calma sobre por qué la protección está activa. Tu PIN no se comparte.",
      };
    case "APP_INSTALL_ATTEMPT":
      return {
        sentence: `${name} intentó instalar una aplicación no autorizada`,
        meaning:
          "Se registró un intento de instalar una aplicación que podría saltear la protección. La configuración protegida no cambió.",
        guidance: "Mirá el historial del dispositivo para entender el contexto.",
      };
    case "PROTECTION_MODIFIED":
      return {
        sentence: protectionSentence(name, details),
        meaning:
          "Pausar, reactivar o desactivar la protección requiere tu PIN. Cada cambio queda registrado acá para que sepas cuándo pasó.",
        guidance:
          "Si no reconocés este cambio, revisá el celular y cambiá tu PIN desde Configuración.",
        status: protectionStatus(details),
      };
    case "DEVICE_LINKED":
      return {
        sentence: `El celular de ${name} quedó vinculado`,
        meaning: `Desde ahora BA Protege+ bloquea en ese celular los sitios de la lista de restricciones: ${LOTBA_LIST}.`,
      };
    case "DEVICE_PENDING":
      return {
        sentence: `Creaste el perfil de ${name}`,
        meaning:
          "El perfil está listo, pero falta vincular el celular. Hasta que lo vincules, la protección no está activa en ese celular.",
        status: "Pendiente de vinculación",
      };
    case "DEVICE_UNLINKED":
      return {
        sentence: `El celular de ${name} se desvinculó`,
        meaning:
          "Ese celular ya no está protegido. Para volver a protegerlo, generá un código nuevo y vinculalo otra vez.",
        status: "Sin protección",
      };
    default:
      return {
        sentence: details || `Actividad en el celular de ${name}`,
        meaning:
          "Es un aviso sobre el estado de la protección de este dispositivo. Cada evento queda registrado para que puedas revisarlo.",
      };
  }
}

function protectionSentence(name: string, details?: string): string {
  const text = (details ?? "").toLowerCase();
  if (text.includes("paus")) return `Se pausó la protección en el celular de ${name}`;
  if (text.includes("reactiv")) return `Se reactivó la protección en el celular de ${name}`;
  if (text.includes("desactiv")) return `Se desactivó el modo protegido en el celular de ${name}`;
  return `Se modificó la protección en el celular de ${name}`;
}

function protectionStatus(details?: string): string | undefined {
  const text = (details ?? "").toLowerCase();
  if (text.includes("paus")) return "Protección pausada";
  if (text.includes("reactiv")) return "Protección activa";
  if (text.includes("desactiv")) return "Sin protección";
  return undefined;
}

/** Saca el "en este celular" que agrega el celular protegido: desde el adulto se lee raro. */
export function shortDetails(details: string): string {
  return details.replace(/\s+en este celular\.?$/i, "").trim();
}
