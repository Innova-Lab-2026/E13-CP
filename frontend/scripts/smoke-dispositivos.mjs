// Pruebas rápidas de los cálculos de las pantallas de dispositivos.
// Uso: node --test scripts/smoke-dispositivos.mjs  (Node 23.6+ lee el .ts sin compilar)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageFromBirthDate,
  countBlockedLastWeek,
  formatCardTime,
  formatDayHeader,
  formatRelativeTime,
  formatValidity,
  groupByDay,
  statusSummary,
} from "../src/utils/dispositivos.ts";

// 27/09/2026 14:30 hora local.
const NOW = new Date(2026, 8, 27, 14, 30);
const at = (day, hour, minute = 0) => new Date(2026, 8, day, hour, minute).toISOString();

test("edad en años cumplidos", () => {
  assert.equal(ageFromBirthDate("2012-01-15", NOW), 14);
  assert.equal(ageFromBirthDate("2012-09-27", NOW), 14);
  assert.equal(ageFromBirthDate("2012-09-28", NOW), 13);
  assert.equal(ageFromBirthDate(undefined, NOW), null);
  assert.equal(ageFromBirthDate("basura", NOW), null);
  assert.equal(ageFromBirthDate("2030-01-01", NOW), null);
});

test("webs bloqueadas en los últimos 7 días, solo del dispositivo", () => {
  const events = [
    { deviceId: "a", category: "blocked", timestamp: at(27, 14) },
    { deviceId: "a", category: "blocked", timestamp: at(21, 15) },
    { deviceId: "a", category: "blocked", timestamp: at(19, 10) }, // hace más de 7 días
    { deviceId: "a", category: "security", timestamp: at(26, 10) },
    { deviceId: "b", category: "blocked", timestamp: at(27, 10) },
    { deviceId: "a", category: "blocked", timestamp: "no es fecha" },
  ];
  assert.equal(countBlockedLastWeek(events, "a", NOW), 2);
  assert.equal(countBlockedLastWeek(events, "b", NOW), 1);
  assert.equal(countBlockedLastWeek([], "a", NOW), 0);
});

test("tiempo relativo como en Figma", () => {
  assert.equal(formatRelativeTime(at(27, 14, 30), NOW), "Recién");
  assert.equal(formatRelativeTime(at(27, 14, 25), NOW), "Hace 5 min");
  assert.equal(formatRelativeTime(at(27, 12, 30), NOW), "Hace 2 h");
  assert.equal(formatRelativeTime(at(26, 20), NOW), "Ayer - 20:00");
  assert.equal(formatRelativeTime(at(22, 9, 5), NOW), "22/09 - 09:05");
  assert.equal(formatRelativeTime("x", NOW), "");
});

test("encabezados de día largos", () => {
  assert.equal(formatDayHeader(at(27, 10), NOW), "Hoy - 27 de septiembre");
  assert.equal(formatDayHeader(at(26, 10), NOW), "Ayer - 26 de septiembre");
  assert.equal(formatDayHeader(at(22, 10), NOW), "Martes - 22 de septiembre");
  assert.equal(
    formatDayHeader(new Date(2025, 11, 31, 10).toISOString(), NOW),
    "Miércoles - 31 de diciembre de 2025",
  );
  assert.equal(formatCardTime(at(27, 14, 25), NOW), "14:25");
  assert.equal(formatCardTime(at(26, 20), NOW), "Ayer - 20:00");
});

test("agrupa por día manteniendo el orden", () => {
  const groups = groupByDay(
    [
      { id: 1, timestamp: at(27, 14) },
      { id: 2, timestamp: at(27, 11) },
      { id: 3, timestamp: at(26, 20) },
    ],
    NOW,
  );
  assert.deepEqual(
    groups.map((group) => [group.title, group.items.map((item) => item.id)]),
    [
      ["Hoy - 27 de septiembre", [1, 2]],
      ["Ayer - 26 de septiembre", [3]],
    ],
  );
});

test("vigencia del código: 24 h reales, no 10 minutos", () => {
  const plus = (minutes) => new Date(NOW.getTime() + minutes * 60_000).toISOString();
  assert.equal(formatValidity(plus(1440), NOW), "24 horas");
  assert.equal(formatValidity(plus(1439), NOW), "24 horas");
  assert.equal(formatValidity(plus(150), NOW), "3 horas");
  assert.equal(formatValidity(plus(90), NOW), "1 hora y 30 minutos");
  assert.equal(formatValidity(plus(60), NOW), "1 hora");
  assert.equal(formatValidity(plus(45), NOW), "45 minutos");
  assert.equal(formatValidity(plus(1), NOW), "1 minuto");
  assert.equal(formatValidity(plus(-5), NOW), null);
  assert.equal(formatValidity(undefined, NOW), null);
});

test("tarjeta de estado del inicio", () => {
  assert.deepEqual(statusSummary([{ status: "active" }, { status: "active" }]), {
    tone: "success",
    title: "Todos los dispositivos están protegidos",
    subtitle: "2 de 2 dispositivos activos",
  });
  assert.equal(statusSummary([{ status: "active" }]).subtitle, "1 de 1 dispositivo activo");
  assert.equal(
    statusSummary([{ status: "active" }, { status: "pending" }]).title,
    "Falta vincular un dispositivo",
  );
  assert.equal(statusSummary([{ status: "disabled" }, { status: "pending" }]).tone, "danger");
});
