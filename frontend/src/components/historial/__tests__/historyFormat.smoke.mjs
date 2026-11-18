// Prueba rápida (smoke test) de las fechas y textos del historial y las alertas.
// Uso (Node 22.18+ o 24, sin dependencias):
//   node --test src/components/historial/__tests__/historyFormat.smoke.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cardLine,
  dayKey,
  eventCopy,
  formatCardTime,
  formatDetailDateTime,
  formatLongDayLabel,
  formatRelativeTime,
  groupByDay,
  shortDetails,
} from "../historyFormat.ts";

// Martes 17 de noviembre de 2026, 15:00 hora local.
const now = new Date(2026, 10, 17, 15, 0);
const at = (day, hour, minute = 0, month = 10, year = 2026) =>
  new Date(year, month, day, hour, minute).toISOString();

test("encabezados de día largos", () => {
  assert.equal(formatLongDayLabel(at(17, 9), now), "Hoy - 17 de noviembre");
  assert.equal(formatLongDayLabel(at(16, 23, 59), now), "Ayer - 16 de noviembre");
  assert.equal(formatLongDayLabel(at(3, 10), now), "3 de noviembre");
  assert.equal(formatLongDayLabel(at(27, 10, 0, 8), now), "27 de septiembre");
  assert.equal(formatLongDayLabel(at(30, 10, 0, 11, 2025), now), "30 de diciembre de 2025");
  assert.equal(formatLongDayLabel("no es una fecha", now), "Sin fecha");
});

test("hora de la tarjeta y del detalle", () => {
  assert.equal(formatCardTime(at(17, 14, 25), now), "14:25");
  assert.equal(formatCardTime(at(16, 20, 30), now), "Ayer - 20:30");
  assert.equal(formatCardTime(at(9, 8, 5), now), "09/11 - 08:05");
  assert.equal(formatCardTime("", now), "");
  assert.equal(formatDetailDateTime(at(17, 14, 25), now), "Hoy - 14:25");
  assert.equal(formatDetailDateTime(at(16, 20, 0), now), "Ayer - 20:00");
  assert.equal(formatDetailDateTime(at(9, 8, 5), now), "09/11/2026 - 08:05");
});

test("tiempo relativo", () => {
  assert.equal(formatRelativeTime(at(17, 15, 0), now), "Recién");
  assert.equal(formatRelativeTime(at(17, 14, 55), now), "Hace 5 min");
  assert.equal(formatRelativeTime(at(17, 13, 0), now), "Hace 2 h");
  assert.equal(formatRelativeTime(at(16, 20, 0), now), "Ayer - 20:00");
});

test("agrupa por día respetando el orden", () => {
  const items = [
    { id: "a", ts: at(17, 14) },
    { id: "b", ts: at(17, 9) },
    { id: "c", ts: at(16, 20) },
    { id: "d", ts: at(10, 8) },
  ];
  const groups = groupByDay(items, (item) => item.ts, now);
  assert.deepEqual(
    groups.map((group) => [group.label, group.items.map((item) => item.id)]),
    [
      ["Hoy - 17 de noviembre", ["a", "b"]],
      ["Ayer - 16 de noviembre", ["c"]],
      ["10 de noviembre", ["d"]],
    ],
  );
  assert.equal(groups[0].key, dayKey(at(17, 0)));
});

test("línea de la tarjeta", () => {
  assert.equal(cardLine("Sofía", "bplay.bet.ar"), "Sofía - bplay.bet.ar");
  assert.equal(cardLine("Sofía", "bplay.bet.ar", true), "bplay.bet.ar");
  assert.equal(cardLine("", "Sofía intentó desinstalar la aplicación"), "Sofía intentó desinstalar la aplicación");
  assert.equal(cardLine("Sofía", ""), "Sofía");
  assert.equal(shortDetails("Se pausó la protección en este celular"), "Se pausó la protección");
});

test("textos del detalle según el tipo", () => {
  const blocked = eventCopy("SITE_BLOCKED", "Sofía");
  assert.equal(blocked.sentence, "Sofía intentó acceder a un sitio restringido");
  assert.match(blocked.meaning, /LOTBA/);
  // La lista oficial incluye sitios con licencia: no se habla de "sitios ilegales".
  for (const kind of ["SITE_BLOCKED", "DEVICE_LINKED", "UNINSTALL_ATTEMPT", "BYPASS_ATTEMPT"]) {
    assert.doesNotMatch(eventCopy(kind, "Sofía").meaning, /ilegal/i);
  }
  assert.equal(
    eventCopy("PROTECTION_MODIFIED", "Sofía", "Se pausó la protección en este celular").sentence,
    "Se pausó la protección en el celular de Sofía",
  );
  assert.equal(
    eventCopy("PROTECTION_MODIFIED", "Sofía", "Se pausó la protección en este celular").status,
    "Protección pausada",
  );
  assert.equal(eventCopy("DEVICE_PENDING", "Sofía").status, "Pendiente de vinculación");
  assert.equal(eventCopy("OTRO", "Sofía", "Algo pasó").sentence, "Algo pasó");
});
