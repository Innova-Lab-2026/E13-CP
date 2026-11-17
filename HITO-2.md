# Hito 2 — Gestión de Dispositivos, PIN de Seguridad y Vinculación

**Estado:** Implementado en backend ✅  
**Rama:** `Hito-2---Gestion-de-Dispositivos,-PIN-de-Seguridad-y-Vinculacion`  
**Pruebas:** 97/97 pasando · build TypeScript sin errores  

---

## Decisiones confirmadas (mantenidas del Hito 1)

| Concepto | Valores | Dónde vive | Significado |
|----------|---------|------------|-------------|
| **Rol** | `responsable` \| `tutor` | Servidor (JWT + DB) | Tipo de cuenta del **adulto** |
| **Modo** | `adulto` \| `dispositivo_protegido` | Cliente (Storage local) + espejo en servidor | Contexto en el que opera la app ahora |
| **Dispositivo** | `pending` \| `active` \| `inactive` | Servidor | El menor **nunca se registra**: es una entidad, no un usuario |

- En el MVP `responsable` y `tutor` son **ambos adultos administradores**. La autorización crítica la resuelve el **PIN**.
- `authorizeRoles` **no se aplica** al flujo de dispositivo protegido (el dispositivo usa la cuenta del adulto; filtrar por rol bloquearía el celular del menor).
- Los estados de dispositivo se normalizan case-insensitivamente (`pending` | `active` | `inactive`), consistentes con el frontend `DeviceStatus`.

---

## Issue BK-2.1 — PIN de seguridad del responsable (`PATCH /api/auth/pin`)

**Qué hace:** Recibe un PIN de 4 dígitos, lo cifra con bcrypt y lo asocia al responsable autenticado.

**Contrato:**

| Campo | Valor |
|-------|-------|
| Request | `{ "pin": "1234" }` + `Authorization: Bearer <JWT>` |
| Respuesta éxito | `200 OK` + `{ message: "PIN creado con éxito" }` |
| Respuesta error | `400` PIN no 4 dígitos · `401` sin token · `403` token inválido · `404` responsable no encontrado |

**Criterios de aceptación:**
1. ✅ Valida que el PIN tenga exactamente 4 dígitos numéricos (3 o 5 dígitos → 400; con letras → 400).
2. ✅ Guarda `pinHash` (bcrypt), nunca texto plano. El hash no es `"1234"`.
3. ✅ Requiere autenticación (JWT).
4. ✅ Un solo PIN activo por responsable: el nuevo sobrescribe al anterior.

**Pruebas:** `src/__tests__/devices.test.ts` (bloque BK-2.1) + `src/__tests__/app.test.ts`.

---

## Issue BK-2.2 — Registro de dispositivo protegido (`POST /api/devices/link`)

**Qué hace:** El responsable registra el dispositivo del menor con `deviceName` y `fechaNacimiento`. El dispositivo queda en estado `pending` con un `linkCode` único de 8 caracteres alfanuméricos.

**Contrato:**

| Campo | Valor |
|-------|-------|
| Request | `{ "deviceName": "Tablet de Sofía", "fechaNacimiento": "2015-08-12" }` + JWT |
| Respuesta éxito | `201 Created` + `{ device: { id, deviceName, fechaNacimiento, status: "pending", linkCode, responsibleId, createdAt }, deviceId, linkCode }` |
| Respuesta error | `400` campos faltantes / formato inválido · `401` sin token · `403` token inválido |

**Criterios de aceptación:**
1. ✅ `status` inicial es `"pending"`.
2. ✅ `linkCode` único alfanumérico (8 caracteres; excluye I, O, 0, 1 ambiguos).
3. ✅ Crea alerta `DEVICE_PENDING` para el responsable.
4. ✅ Requiere autenticación.

**Pruebas:** `src/__tests__/devices.test.ts` (bloque BK-2.2) + `src/__tests__/app.test.ts`.

---

## Issue BK-2.3 — Confirmación de vínculo (`POST /api/devices/confirm-link`)

**Qué hace:** La app del dispositivo protegido envía `deviceId` (o `linkCode`) y `pin`. El backend valida el PIN contra el `pinHash` del responsable dueño y cambia el estado de `pending` a `active`.

**Contrato:**

| Campo | Valor |
|-------|-------|
| Request | `{ "deviceId": "uuid", "pin": "1234" }` o `{ "linkCode": "XK9M2P7R", "pin": "1234" }` + JWT |
| Respuesta éxito | `200 OK` + `{ message: "Vinculación confirmada", device: { id, status: "active" } }` |
| Respuesta error | `401` PIN inválido · `404` dispositivo no encontrado / no pertenece al responsable · `409` ya ACTIVE / responsable sin PIN |

**Criterios de aceptación:**
1. ✅ Valida PIN contra `pinHash` del responsable.
2. ✅ Solo el `responsibleId` dueño puede confirmar.
3. ✅ Cambia status de `"pending"` a `"active"`.
4. ✅ Crea alerta `DEVICE_LINKED`.

**Pruebas:** `src/__tests__/devices.test.ts` (bloque BK-2.3) + `src/__tests__/app.test.ts`.

---

## Issue BK-2.4 — Consulta y actualización de estado (`GET /api/devices`, `PATCH /api/devices/:id/status`)

**Qué hace:** Lista los dispositivos del responsable y cambia su estado entre `active` e `inactive`.

**Contrato:**

| Endpoint | Valor |
|----------|-------|
| `GET /api/devices` + JWT | `200 OK` + `{ devices: [...] }` filtrados por `responsibleId` |
| `PATCH /api/devices/:id/status` + `{ "status": "inactive" }` + JWT | `200 OK` + `{ device: { ..., status: "inactive" } }` |
| Errores | `400` status inválido · `401` sin token · `403` token inválido · `404` dispositivo no encontrado / no pertenece |

**Criterios de aceptación:**
1. ✅ GET filtra por `responsibleId` del JWT (solo dispositivos del usuario logueado).
2. ✅ PATCH acepta solo `active` e `inactive` (case-insensitive).
3. ✅ Cambiar a `inactive` → `200` y `status === "inactive"`.

**Pruebas:** `src/__tests__/devices.test.ts` (bloque BK-2.4) + `src/__tests__/app.test.ts`.

---

## Archivos cambiados (backend)

| Archivo | Cambio |
|---------|--------|
| `src/config/db.ts` | `Responsable.pinHash`/`pinUpdatedAt`; `Device.fechaNacimiento`/`linkCode`/`deviceToken`; `DeviceStatus` tipo (`pending\|active\|inactive`) |
| `src/services/device.service.ts` | Nuevo: `isValidPin`, `generateLinkCode`, `setResponsiblePin`, `verifyResponsiblePin`, `normalizeDeviceStatus`, `buildPendingDevice`, `findResponsibleDevice`, `createDeviceAlert` |
| `src/controllers/auth.controller.ts` | `updateMyPin` (BK-2.1) |
| `src/controllers/device.controller.ts` | `linkDevice`, `confirmDeviceLink`, `getDevices`, `updateDeviceStatus` |
| `src/routes/auth.routes.ts` | Ruta `PATCH /pin` |
| `src/routes/device.routes.ts` | Ruta `POST /confirm-link` |
| `src/__tests__/devices.test.ts` | Nuevo: 35 pruebas BK-2.1 a BK-2.4 |
| `src/__tests__/app.test.ts` | Actualizado: contrato link (fechaNacimiento, pending, DEVICE_PENDING) + pruebas PIN/confirm-link/status |

---

## Verificación

```bash
cd backend
npm test        # 97/97 pruebas: auth, blocklist, devices e integración
npm run build   # compilación TypeScript sin errores
```

---

## Lo que sigue (pendiente de decisión del equipo)

| Tarea | Notas |
|-------|-------|
| **Persistencia (Neon/PostgreSQL)** | Se definirá más adelante. La BD actual es en memoria (se pierde al reiniciar). |
| **Push notifications (BK-3.3)** | Requisito MVP: notificar al responsable. Pendiente. |
| **Frontend: conectar endpoints reales** | `frontend/src/services/deviceService.ts` sigue siendo mock esperando `POST /api/devices/link`. |

---

## Texto para comunicar al equipo (copiar-pegar en cards de GitHub)

> **Hito 2 — Backend (BK-2.1 a BK-2.4) ✅**
>
> Implementadas las 4 historias de backend del Hito 2:
> - **BK-2.1 PIN:** `PATCH /api/auth/pin` — guarda PIN de 4 dígitos cifrado con bcrypt, requiere JWT, un PIN por responsable.
> - **BK-2.2 Link dispositivo:** `POST /api/devices/link` — registra dispositivo del menor (nombre + fecha nacimiento) en estado `pending` con `linkCode` único y alerta `DEVICE_PENDING`.
> - **BK-2.3 Confirmar vínculo:** `POST /api/devices/confirm-link` — valida PIN vs `pinHash`, pasa dispositivo a `active`, alerta `DEVICE_LINKED`. Responde 200/401/404/409.
> - **BK-2.4 Gestión de estado:** `GET /api/devices` (filtra por responsable) + `PATCH /api/devices/:id/status` (active/inactive).
>
> **Pruebas:** 97/97 pasando · build OK · sin persistencia aún (en memoria).
>
> **Nota para frontend:** `deviceService.ts` en `main` sigue siendo mock. Cuando estén listos, el endpoint real es `POST /api/devices/link` (devuelve `device`, `deviceId`, `linkCode`) y `POST /api/devices/confirm-link` (recibe `deviceId` + `pin`).
