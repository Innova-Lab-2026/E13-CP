# Catálogo de eventos

> Issue #7 · BA Protege+ · versión 1, 3/11/2026 · Contexto y reglas en [plan-de-datos-y-telemetria.md](plan-de-datos-y-telemetria.md)

## Convenciones

- **Origen:**
  - `DEVICE` es el celular protegido: VPN o app en modo dispositivo protegido.
  - `BACKEND` es el servidor.
  - `ADULT_APP` es una acción del adulto que el backend registra.
- **Local/sync:**
  - *Cola → sync*: se encola en el dispositivo y se manda en lote con `POST /api/events/batch`.
  - *Solo backend*: lo genera y lo guarda el servidor.
  - *Estado*: no se guarda como evento, solo actualiza un campo.
- **Alerta:** si genera un `AlertItem` para el adulto. Los eventos de integridad no tienen límite de alertas. `ACCESS_ATTEMPT` tiene un límite de una alerta por `(deviceId, eventType, domain)` cada 30 minutos y un tope de 20 por día.
- **Retención:** se cuenta desde `occurredAt`. Al desvincular un dispositivo, sus eventos se borran en 30 días. Al borrar la cuenta, todo se borra en 30 días. Los agregados anónimos se conservan sin límite.
- **Estado:**
  - **Implementado**: existe y se usa.
  - **Parcial**: el tipo o el modelo existe, pero falta el emisor real o parte del diseño.
  - **Propuesto**: no existe.
- Ningún evento lleva IP, ubicación, identificadores de hardware, URL completa ni consultas DNS permitidas. `domain` es siempre el dominio de la lista que coincidió.
- Hoy el único emisor de eventos es la pantalla protegida (`app/protected/index.tsx`), vía `recordDeviceEvent` (`blocklistService.ts:59-65`) y `POST /api/events`, que es público. El cliente manda `details` como texto libre. La propuesta es que lo arme el servidor.

## 1. Tabla de eventos

### 1.1 Eventos y alertas que ya existen en el código

| eventType / alertType | Disparador | Origen | Payload | Local/sync | Alerta | Retención | Estado |
|---|---|---|---|---|---|---|---|
| `ACCESS_ATTEMPT` | La VPN responde NXDOMAIN a un dominio de la lista (`DNS_BLOCK`), o el menor prueba un sitio bloqueado a mano en "Probar un sitio" (`MANUAL_CHECK`) | DEVICE | `domain`, `count`, `windowStart`, `windowEnd`, `blocklistVersion`, `metadata.trigger` (`DNS_BLOCK`, `MANUAL_CHECK`) | Cola → sync | Sí, con límite | 90 días | **Parcial**: la VPN no lo emite. Hoy solo lo genera la prueba manual de `app/protected/index.tsx:270` (vía `POST /api/blocklist/check`), y cada uno genera una alerta sin límite (`event.controller.ts:31`). B3, B5, E1 y E3 cuentan solo `DNS_BLOCK` |
| `BYPASS_ATTEMPT` | DNS privado activo, consulta a un resolver DoH conocido, 5 o más PIN fallidos en 1 h | DEVICE / BACKEND | `metadata.method` (`PRIVATE_DNS`, `DOH_RESOLVER`, `PIN_BRUTE_FORCE`) | Cola → sync | Sí, sin límite | 90 días | **Parcial**: hoy lo emite la app protegida en cada PIN incorrecto al pausar o salir (`app/protected/index.tsx:197`), con `details` del cliente, y cada uno genera una alerta. **Migración:** ese caso pasa a `PIN_VERIFICATION_FAILED` (`context=DISABLE`), generado en el backend dentro de `/pin/verify`, y `BYPASS_ATTEMPT` queda para DNS privado, DoH y `PIN_BRUTE_FORCE` (5 o más fallos en 1 h) |
| `PROTECTION_MODIFIED` | Hoy: el menor pausa o sale del modo protegido con PIN válido. Propuesto: además, el adulto pausa o reactiva (`PATCH /api/devices/:id/status`), o agrega o quita un dominio personalizado | DEVICE / ADULT_APP | `metadata.action` (`PAUSED_ON_DEVICE`, `EXITED_PROTECTED_MODE`, `PAUSED`, `RESUMED`, `CUSTOM_ADDED`, `CUSTOM_REMOVED`), `domain` si corresponde | Cola → sync (DEVICE) / Solo backend (ADULT_APP) | No. Va al historial | 90 días | **Implementado parcialmente**: hoy lo emite el DEVICE al pausar o salir del modo protegido con PIN válido (`app/protected/index.tsx:221` y `:236`), sin alerta (`event.controller.ts:31`) y con `details` del cliente. Propuesto: que también lo emita el backend en `PATCH status` y en las altas o bajas de dominios personalizados, con `metadata.action` |
| `APP_INSTALL_ATTEMPT` | Instalación de una app de apuestas | DEVICE | `metadata.packageCategory` | Cola → sync | Sí | 90 días | **Parcial, fuera del MVP**: Android no deja ver intentos, solo instalaciones ya hechas, y `QUERY_ALL_PACKAGES` no está permitido para este caso en Play |
| `DEVICE_PENDING` (solo alerta) | El adulto crea un perfil de dispositivo (`POST /api/devices/link`) | BACKEND | `deviceId` | Solo backend | Sí | 90 días | **Implementado** (`device.controller.ts:52-55`) |
| `DEVICE_LINKED` (solo alerta) | El celular confirma el vínculo con PIN (`POST /api/devices/confirm-link`) | BACKEND | `deviceId` | Solo backend | Sí | 90 días | **Implementado** (`device.controller.ts:119-122`) |
| `BlocklistSyncLog` (registro, no evento) | Sincronización de la lista oficial (`POST /api/blocklist/sync/official`) | BACKEND | `version`, `source`, `added[]`, `removed[]`, `totalOfficial` | Solo backend | No | Sin límite (no tiene datos personales). Hace falta al menos 90 días para validar eventos contra la versión que informan | **Implementado** |

### 1.2 Eventos propuestos

| eventType | Disparador | Origen | Payload | Local/sync | Alerta | Retención | Estado |
|---|---|---|---|---|---|---|---|
| `PROTECTION_ENABLED` | La VPN arranca (`onStartCommand` establece la interfaz) | DEVICE | `blocklistVersion`, `appVersion`, `metadata.trigger` (`USER`, `LINK`) | Cola → sync | No, solo historial | 90 días | Propuesto |
| `PROTECTION_DISABLED` | La VPN se detiene (`onDestroy`) o un heartbeat llega con `vpnRunning: false` | DEVICE / BACKEND | `metadata.authorized` (true si hubo PIN), `metadata.reason` | Cola → sync | Sí, si `authorized: false` | 90 días | Propuesto. Hoy el apagado con PIN deja solo un `PROTECTION_MODIFIED`, y `onDestroy` no registra nada |
| `VPN_REVOKED` | `onRevoke()`: cortada desde Ajustes o reemplazada por otra VPN | DEVICE | `metadata.vpnRunning: false` | Cola → sync, sin descarte | Sí, sin límite | 90 días | Propuesto |
| `VPN_PERMISSION_DENIED` | El menor rechaza el diálogo de permiso de VPN (`startVpn` devuelve false) | DEVICE | `metadata.attempt` | Cola → sync | Sí | 90 días | Propuesto |
| `PROTECTION_RESTORED` | La VPN vuelve a levantar sola después de reiniciar el celular (receiver de `BOOT_COMPLETED`) | DEVICE | `metadata.downtimeSec` | Cola → sync | No | 90 días | Propuesto |
| `PERMISSION_CHANGED` | Cambia el estado de un permiso del que depende la protección | DEVICE | `metadata.permission` (`VPN`, `POST_NOTIFICATIONS`, `BATTERY_OPTIMIZATION`, `DEVICE_ADMIN`), `metadata.granted` | Cola → sync | Sí, si `granted: false` | 90 días | Propuesto. Punto de enganche: el listener `AppState` de `app/protected/index.tsx:110-116` |
| `PIN_VERIFICATION_FAILED` | PIN incorrecto en `confirm-link`, `/api/auth/pin/verify` o al apagar la protección | BACKEND | `metadata.context` (`LINK`, `DISABLE`, `VERIFY`), `metadata.failuresLast15m` | Solo backend | Sí, a partir del 3.er fallo en 15 minutos | 90 días | Propuesto. Hoy el backend devuelve 401 sin registrar. El dispositivo lo reporta como `BYPASS_ATTEMPT`. `confirm-link` no registra nada |
| `PIN_CHANGED` | El adulto cambia el PIN | ADULT_APP | ninguno | Solo backend | Sí (aviso de seguridad) | 90 días | Propuesto. Hoy solo actualiza `pinUpdatedAt` |
| `BLOCKLIST_UPDATED` | El dispositivo aplica una versión nueva de la lista | DEVICE | `blocklistVersion`, `metadata.previousVersion`, `metadata.totalDomains` | Cola → sync | No | 90 días | Propuesto |
| `DEVICE_OFFLINE` | `lastSeen` lleva más de 6 h sin actualizarse (se emite una sola vez por período) | BACKEND | `metadata.lastSeen`, `metadata.hoursSilent` | Solo backend | Sí | 90 días | Propuesto (requiere heartbeat) |
| `DEVICE_BACK_ONLINE` | Llega un heartbeat después de un `DEVICE_OFFLINE` | BACKEND | `metadata.offlineSec` | Solo backend | No | 90 días | Propuesto |
| `APP_UNINSTALL_SUSPECTED` | Más de 72 h sin heartbeat, o FCM responde `UNREGISTERED` para `Device.deviceToken` | BACKEND | `metadata.signal` (`NO_HEARTBEAT`, `FCM_UNREGISTERED`), `metadata.lastSeen` | Solo backend | Sí, prioridad alta | 90 días | Propuesto. Es una inferencia: Android no avisa la desinstalación de la propia app |
| `DEVICE_UNLINKED` | El adulto da de baja el vínculo, o se borra el dispositivo | ADULT_APP | ninguno | Solo backend | Sí | Hasta el borrado del dispositivo (30 días) | Propuesto |
| `FALSE_POSITIVE_REPORTED` | Alguien toca "esto no es apuestas" en la pantalla de bloqueo o en una notificación local de bloqueo | DEVICE | `domain`, `blocklistVersion` | Cola → sync | No. Va a la cola de revisión del equipo | 90 días | Propuesto. `app/protected/blocked.tsx` existe, pero solo se muestra en la prueba manual y no tiene botón de reporte. Un bloqueo por DNS no abre ninguna pantalla: el reporte saldría desde ahí o desde una notificación local que la VPN dispare al bloquear (Propuesto) |
| `DEVICE_ADMIN_DISABLE_REQUESTED` (opcional) | `DeviceAdminReceiver.onDisableRequested`: el paso previo a desinstalar si la app es administradora | DEVICE | ninguno | Envío inmediato y cola | Sí, prioridad alta | 90 días | Propuesto, P2. Evaluar contra las políticas de Play **[verificar]** |

### 1.3 Señales que no se guardan como evento

| Señal | Disparador | Origen | Qué actualiza | Estado |
|---|---|---|---|---|
| Heartbeat | WorkManager cada 15 min, más cada arranque o parada de la VPN | DEVICE | `Device.lastSeen` y `Device.protectionState` (`vpnRunning`, `blocklistVersion`, `appVersion`, `queuedEvents`, `permissions`). Suma al `DeviceDailyStat` del día. La respuesta devuelve `status` y `latestBlocklistVersion` | Propuesto |
| Agregado diario | Cada heartbeat y cada evento `PROTECTION_*` o `VPN_REVOKED` | BACKEND | `DeviceDailyStat { deviceId, date, heartbeats, vpnActiveMinutes, lastBlocklistVersion }`, sin horas exactas, 90 días | Propuesto |
| Lectura de alerta | El adulto abre la alerta (`PATCH /api/events/alerts/:id/read`) | ADULT_APP | `AlertItem.read` (implementado) y `AlertItem.readAt` (propuesto) | Parcial |
| Consentimiento del adulto | El adulto acepta la divulgación antes de crear el perfil o activar la VPN | ADULT_APP | Registro de consentimiento: `responsibleId`, `textVersion`, `acceptedAt`, `role: ADULT` | Propuesto |
| Aviso al menor | El menor toca "Entendí" al confirmar el vínculo (13 años o más) | DEVICE | Registro de consentimiento: `deviceId`, `textVersion`, `acknowledgedAt`, `role: MINOR` | Propuesto |

**Lo que no se registra a propósito:** consultas DNS permitidas, logins, cambios de modo de cuenta, `POST /api/blocklist/check` cuando el sitio no está bloqueado, lista de apps instaladas. O no aportan a la protección o son datos de más.

## 2. Ejemplos JSON

### 2.1 Sobre del lote (dispositivo → backend)

```json
{
  "deviceId": "5b1e2c3a-0000-4000-8000-000000000001",
  "sentAt": "2026-11-03T14:31:05Z",
  "events": [ { "...": "uno o más eventos como los de abajo" } ]
}
```

Respuesta: `{"accepted": ["<clientEventId>"], "duplicates": []}`. El dispositivo borra de la cola los ids que vuelven en cualquiera de las dos listas.

### 2.2 `ACCESS_ATTEMPT` (existente, con los campos nuevos)

```json
{
  "clientEventId": "0f6c1d2e-0000-4000-8000-000000000010",
  "eventType": "ACCESS_ATTEMPT",
  "domain": "bplay.bet.ar",
  "occurredAt": "2026-11-03T14:02:11Z",
  "count": 7,
  "windowStart": "2026-11-03T14:02:11Z",
  "windowEnd": "2026-11-03T14:12:11Z",
  "blocklistVersion": "2026-08+c7f3a1",
  "appVersion": "1.0.0",
  "source": "DEVICE",
  "metadata": { "trigger": "DNS_BLOCK" }
}
```

La versión de la lista combina `{períodoOficial}+{hashCustom}`. El período sale de `BlocklistSnapshot.version` y el hash cubre los dominios personalizados. Los ejemplos usan el período `2026-08`, el del listado LOTBA que generó la issue #9. Si el backend no reconoce la versión, guarda el evento con `metadata.unverifiedDomain: true` y no lo cuenta en E1 ni E3.

### 2.3 `PROTECTION_ENABLED`

```json
{
  "clientEventId": "1a2b3c4d-0000-4000-8000-000000000011",
  "eventType": "PROTECTION_ENABLED",
  "occurredAt": "2026-11-03T13:58:40Z",
  "blocklistVersion": "2026-08+c7f3a1",
  "appVersion": "1.0.0",
  "source": "DEVICE",
  "metadata": { "trigger": "LINK" }
}
```

### 2.4 `PROTECTION_DISABLED`

```json
{
  "clientEventId": "2b3c4d5e-0000-4000-8000-000000000012",
  "eventType": "PROTECTION_DISABLED",
  "occurredAt": "2026-11-03T18:10:00Z",
  "source": "DEVICE",
  "metadata": { "authorized": false, "reason": "SERVICE_DESTROYED" }
}
```

### 2.5 `VPN_REVOKED`

```json
{
  "clientEventId": "9a2d3e4f-0000-4000-8000-000000000013",
  "eventType": "VPN_REVOKED",
  "occurredAt": "2026-11-03T14:20:40Z",
  "source": "DEVICE",
  "metadata": { "vpnRunning": false }
}
```

### 2.6 `VPN_PERMISSION_DENIED`

```json
{
  "clientEventId": "3c4d5e6f-0000-4000-8000-000000000014",
  "eventType": "VPN_PERMISSION_DENIED",
  "occurredAt": "2026-11-03T13:57:02Z",
  "source": "DEVICE",
  "metadata": { "attempt": 2 }
}
```

### 2.7 `PROTECTION_RESTORED`

```json
{
  "clientEventId": "4d5e6f70-0000-4000-8000-000000000015",
  "eventType": "PROTECTION_RESTORED",
  "occurredAt": "2026-11-04T07:01:15Z",
  "blocklistVersion": "2026-08+c7f3a1",
  "source": "DEVICE",
  "metadata": { "downtimeSec": 95 }
}
```

### 2.8 `PERMISSION_CHANGED`

```json
{
  "clientEventId": "5e6f7081-0000-4000-8000-000000000016",
  "eventType": "PERMISSION_CHANGED",
  "occurredAt": "2026-11-03T20:45:00Z",
  "source": "DEVICE",
  "metadata": { "permission": "POST_NOTIFICATIONS", "granted": false }
}
```

### 2.9 `PIN_VERIFICATION_FAILED` (lo guarda el backend)

```json
{
  "id": "c3e1a2b4-0000-4000-8000-000000000017",
  "deviceId": "5b1e2c3a-0000-4000-8000-000000000001",
  "eventType": "PIN_VERIFICATION_FAILED",
  "details": "PIN incorrecto al intentar desactivar la protección (3.er intento en 15 minutos)",
  "timestamp": "2026-11-03T18:09:12Z",
  "source": "BACKEND",
  "metadata": { "context": "DISABLE", "failuresLast15m": 3 }
}
```

### 2.10 `PIN_CHANGED`

```json
{
  "id": "d4f2b3c5-0000-4000-8000-000000000018",
  "deviceId": "5b1e2c3a-0000-4000-8000-000000000001",
  "eventType": "PIN_CHANGED",
  "details": "Se cambió el PIN de la cuenta",
  "timestamp": "2026-11-03T21:00:00Z",
  "source": "ADULT_APP"
}
```

Se registra un evento por cada dispositivo de la cuenta, para que aparezca en el historial de cada uno.

### 2.11 `BLOCKLIST_UPDATED`

```json
{
  "clientEventId": "6f708192-0000-4000-8000-000000000019",
  "eventType": "BLOCKLIST_UPDATED",
  "occurredAt": "2026-11-03T15:00:30Z",
  "blocklistVersion": "2026-09+c7f3a1",
  "source": "DEVICE",
  "metadata": { "previousVersion": "2026-08+c7f3a1", "totalDomains": 2101 }
}
```

### 2.12 `DEVICE_OFFLINE`

```json
{
  "id": "e5a3c4d6-0000-4000-8000-000000000020",
  "deviceId": "5b1e2c3a-0000-4000-8000-000000000001",
  "eventType": "DEVICE_OFFLINE",
  "details": "El dispositivo no reporta hace más de 6 horas",
  "timestamp": "2026-11-03T20:31:05Z",
  "source": "BACKEND",
  "metadata": { "lastSeen": "2026-11-03T14:31:05Z", "hoursSilent": 6 }
}
```

### 2.13 `DEVICE_BACK_ONLINE`

```json
{
  "id": "f6b4d5e7-0000-4000-8000-000000000021",
  "deviceId": "5b1e2c3a-0000-4000-8000-000000000001",
  "eventType": "DEVICE_BACK_ONLINE",
  "details": "El dispositivo volvió a reportar",
  "timestamp": "2026-11-04T08:15:00Z",
  "source": "BACKEND",
  "metadata": { "offlineSec": 63835 }
}
```

### 2.14 `APP_UNINSTALL_SUSPECTED`

```json
{
  "id": "a7c5e6f8-0000-4000-8000-000000000022",
  "deviceId": "5b1e2c3a-0000-4000-8000-000000000001",
  "eventType": "APP_UNINSTALL_SUSPECTED",
  "details": "Posible desinstalación: el dispositivo no reporta hace más de 72 horas",
  "timestamp": "2026-11-06T14:31:05Z",
  "source": "BACKEND",
  "metadata": { "signal": "NO_HEARTBEAT", "lastSeen": "2026-11-03T14:31:05Z" }
}
```

### 2.15 `DEVICE_UNLINKED`

```json
{
  "id": "b8d6f709-0000-4000-8000-000000000023",
  "deviceId": "5b1e2c3a-0000-4000-8000-000000000001",
  "eventType": "DEVICE_UNLINKED",
  "details": "Se desvinculó el dispositivo",
  "timestamp": "2026-11-10T10:00:00Z",
  "source": "ADULT_APP"
}
```

### 2.16 `FALSE_POSITIVE_REPORTED`

```json
{
  "clientEventId": "708192a3-0000-4000-8000-000000000024",
  "eventType": "FALSE_POSITIVE_REPORTED",
  "domain": "ejemplo-no-apuestas.com.ar",
  "occurredAt": "2026-11-03T16:40:00Z",
  "blocklistVersion": "2026-08+c7f3a1",
  "source": "DEVICE"
}
```

### 2.17 `DEVICE_ADMIN_DISABLE_REQUESTED` (opcional)

```json
{
  "clientEventId": "8192a3b4-0000-4000-8000-000000000025",
  "eventType": "DEVICE_ADMIN_DISABLE_REQUESTED",
  "occurredAt": "2026-11-03T22:05:00Z",
  "source": "DEVICE"
}
```

### 2.18 `BYPASS_ATTEMPT` (existente, con `metadata`)

```json
{
  "clientEventId": "92a3b4c5-0000-4000-8000-000000000026",
  "eventType": "BYPASS_ATTEMPT",
  "occurredAt": "2026-11-03T19:12:00Z",
  "source": "DEVICE",
  "metadata": { "method": "PRIVATE_DNS" }
}
```

### 2.19 `PROTECTION_MODIFIED` (existente, emitido por el dispositivo)

```json
{
  "clientEventId": "a3b4c5d6-0000-4000-8000-000000000027",
  "eventType": "PROTECTION_MODIFIED",
  "occurredAt": "2026-11-03T18:12:00Z",
  "source": "DEVICE",
  "metadata": { "action": "PAUSED_ON_DEVICE" }
}
```

### 2.20 Heartbeat (señal, no evento)

```json
{
  "sentAt": "2026-11-03T14:31:05Z",
  "vpnRunning": true,
  "blocklistVersion": "2026-08+c7f3a1",
  "appVersion": "1.0.0",
  "queuedEvents": 0,
  "permissions": { "vpn": true, "notifications": true, "batteryOptimizationIgnored": false }
}
```

Respuesta: `{"status": "active", "latestBlocklistVersion": "2026-08+c7f3a1"}`.

## 3. Cómo agregar un `eventType`

1. Sumarlo a la unión en `backend/src/config/db.ts` y a la validación de `event.controller.ts`.
2. Definir si alerta y con qué límite, en `event.controller.ts`.
3. Agregar su presentación en `frontend/src/services/historyService.ts` (`EVENT_PRESENTATION`) y, si alerta, en `alertService.ts` (`ALERT_PRESENTATION`). Hoy un tipo desconocido se muestra como "Protección modificada".
4. Actualizar este catálogo y, si alimenta un KPI, [kpis.md](kpis.md).
