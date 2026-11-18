// Piezas del historial que pueden usar otras pantallas (inicio, detalle del dispositivo).
export { default as HistoryCard } from "./HistoryCard";
export { default as HistoryEventList } from "./HistoryEventList";
export { default as EventDetail } from "./EventDetail";
export { HISTORY_LOOKS, alertVariant, historyLook } from "./historyLook";
export type { HistoryLook, HistoryVariant } from "./historyLook";
export {
  cardLine,
  eventCopy,
  formatCardTime,
  formatDetailDateTime,
  formatLongDayLabel,
  formatRelativeTime,
  groupByDay,
} from "./historyFormat";
