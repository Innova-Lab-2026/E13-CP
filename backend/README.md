# BA Protege+ — Backend

API REST del proyecto **Control Parental (E13)**, developed in **Express + TypeScript**.

- **Base URL local:** `http://localhost:3000`
- **Variables de entorno:** copiá `.env.example` a `.env` (ver [Configuración](#configuración)).
- **Health check:** `GET /health`

---

## Configuración

```bash
cd backend
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run dev            # desarrollo con recarga
npm run build && npm start   # producción
npm test               # pruebas de integración (jest + supertest)
```

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | `development` \| `production` \| `test` | — |
| `JWT_SECRET` | Clave de firma de los JWT | clave por defecto (**cambiar en despliegue**) |
| `ADMIN_SECRET` | Secreto de las operaciones administrativas (sincronización de la lista oficial de LOTBA) | sin valor (la operación queda deshabilitada con `503`) |

> Si `JWT_SECRET` no está definido, el servidor emite un warning al arrancar y usa la clave por defecto. **Nunca despliegues así.**

### Colección Postman

`postman/BA-Protege.postman_collection.json` cubre el flujo completo del MVP, con tests
automáticos en cada request y variables que se encadenan (`token`, `deviceId`, `customDomainId`).

Para importarla: Postman → **Import** → seleccionar el archivo. Configurá `baseUrl` y `adminSecret`
en las variables de la colección.

---

## Hito 1 — Onboarding, Autenticación y Selección de Rol

### Modelo de datos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `string` (uuid) | Identificador del usuario |
| `email` | `string` | Normalizado a minúsculas |
| `passwordHash` | `string` | Hash bcrypt — **nunca se devuelve en la API** |
| `name` | `string` | Nombre completo |
| `telefono` | `string?` | Teléfono de contacto |
| `rol` | `'responsable' \| 'tutor'` | Perfil del usuario, derivado de `esResponsable` |
| `mode` | `'adulto' \| 'dispositivo_protegido'` | Modo de uso, actualizado vía `PATCH /api/auth/me/mode` |
| `createdAt` | `string` (ISO 8601) | Fecha de alta |

### `POST /api/auth/register`

Registra un responsable/tutor, hashea la contraseña con **bcryptjs** y emite un JWT con el **rol**.

**Request**

```json
{
  "nombre": "Ana Pérez",
  "email": "ana@mail.com",
  "password": "Str0ng!Pass",
  "telefono": "+5491122334455",
  "esResponsable": true
}
```

- `nombre`: obligatorio. También se acepta `name` como alias (compatibilidad).
- `email`: obligatorio, formato válido y único.
- `password`: obligatorio, mínimo 6 caracteres.
- `telefono`: opcional; si se envía, se valida el formato.
- `esResponsable`: opcional (default `true`). `true` → `rol: "responsable"`, `false` → `rol: "tutor"`.

**Response `201 Created`**

```json
{
  "message": "Responsible registered successfully",
  "token": "<JWT>",
  "responsible": {
    "id": "uuid",
    "email": "ana@mail.com",
    "name": "Ana Pérez",
    "rol": "responsable",
    "mode": "adulto",
    "telefono": "+5491122334455",
    "createdAt": "2026-..."
  }
}
```

**Errores:** `400` email repetido / datos incompletos / formato inválido · `500` error del servidor.

---

### `POST /api/auth/login`

Valida las credenciales comparando el hash con **bcrypt** y emite un JWT con el rol.

**Request**

```json
{ "email": "ana@mail.com", "password": "Str0ng!Pass" }
```

**Response `200 OK`**

```json
{
  "message": "Login successful",
  "token": "<JWT>",
  "responsible": {
    "id": "uuid",
    "email": "ana@mail.com",
    "name": "Ana Pérez",
    "rol": "responsable",
    "mode": "adulto",
    "telefono": "+5491122334455",
    "createdAt": "2026-..."
  }
}
```

**Errores:** `400` datos incompletos · `401` credenciales inválidas.

---

### `GET /api/auth/me` 🔒

Devuelve el perfil vigente del usuario autenticado.

**Headers:** `Authorization: Bearer <JWT>`

**Response `200 OK`**

```json
{
  "id": "uuid",
  "email": "ana@mail.com",
  "name": "Ana Pérez",
  "rol": "responsable",
  "mode": "adulto",
  "telefono": "+5491122334455",
  "createdAt": "2026-..."
}
```

**Errores:** `401` sin token · `403` token inválido o vencido · `404` usuario inexistente.

---

### `PATCH /api/auth/me/mode` 🔒

Actualiza el modo de uso elegido en la pantalla **"Selección de Modo"**.

**Headers:** `Authorization: Bearer <JWT>`

**Request**

```json
{ "mode": "dispositivo_protegido" }
```

**Response `200 OK`** → mismo cuerpo que `GET /api/auth/me`.

**Errores:** `400` mode ausente o fuera del catálogo · `401` sin token · `403` token inválido.

---

### `PATCH /api/auth/pin` 🔒 (Hito 2 — BK-2.1)

Configura el PIN de seguridad de 4 dígitos con el que el adulto autoriza la
vinculación de dispositivos y los cambios críticos. El PIN se cifra con
**bcrypt** y nunca se almacena ni se devuelve en texto plano.

**Headers:** `Authorization: Bearer <JWT>`

**Request**

```json
{ "pin": "4829" }
```

- `pin`: obligatorio, exactamente 4 dígitos numéricos.

**Response `200 OK`**

```json
{ "message": "PIN creado con éxito" }
```

**Errores:** `400` PIN no válido (no son 4 dígitos) · `401` sin token · `403` token inválido · `404` responsable inexistente.

> Solo puede existir un PIN activo por responsable: el nuevo sobrescribe al anterior.

---

### Claims del JWT

```json
{
  "id": "uuid",
  "email": "ana@mail.com",
  "rol": "responsable",
  "iat": 1767225600,
  "exp": 1767830400
}
```

La vigencia es de **7 días**. El claim `rol` es el que usa el cliente para decidir el direccionamiento post-login (Dashboard del responsable vs. flujo de dispositivo protegido).

---

## Middlewares

| Middleware | Comportamiento |
|------------|----------------|
| `authenticateToken` | Exige `Authorization: Bearer <token>`. Inyecta `responsibleId`, `userEmail` y `rol` en `req`. Token ausente → `401`; token inválido/vencido → `403`. |
| `authorizeRoles(['responsable'])` | Restringe el acceso a los perfiles indicados. Se ejecuta siempre **después** de `authenticateToken`. Rol no autorizado → `403`. |

---

## Pruebas

```bash
npm test
```

| Suite | Cubre |
|-------|--------|
| `src/__tests__/auth.test.ts` | BK-1.1 registro · BK-1.2 login · BK-1.3 modo de usuario · BK-1.4 middleware y roles |
| `src/__tests__/blocklist.test.ts` | Consulta de dominios · dominios personalizados · estado de actualización · sincronización de la lista oficial |
| `src/__tests__/app.test.ts` | Integración de health, auth, dispositivos, blocklist y eventos |

---

## Midestones 2 y 3

Ya implementados en el backend (aún sin pantallas conectadas en el cliente):

| Método | Ruta | Descripción |
|--------|------|-------------|
| `PATCH` | `/api/auth/pin` | Configura el PIN de seguridad del responsable (Hito 2) 🔒 |
| `POST` | `/api/devices/link` | Registra un dispositivo protegido (estado PENDING + linkCode) 🔒 |
| `POST` | `/api/devices/confirm-link` | Confirma el vínculo validando el PIN (estado ACTIVE) 🔒 |
| `GET` | `/api/devices` | Lista los dispositivos del responsable 🔒 |
| `PATCH` | `/api/devices/:id/status` | Activa/desactiva un dispositivo 🔒 |
| `POST` | `/api/blocklist/check` | Verifica si un dominio está bloqueado (público) |
| `GET` | `/api/blocklist` | Lista de bloqueo oficial + personalizada 🔒 |
| `GET` | `/api/blocklist/status` | Estado de actualización de la lista de bloqueo 🔒 |
| `POST` | `/api/blocklist/sync/official` | Sincroniza el listado oficial de LOTBA ⚙️ |
| `POST` | `/api/blocklist/custom` | Agrega un dominio personalizado 🔒 |
| `DELETE` | `/api/blocklist/custom/:id` | Elimina un dominio personalizado 🔒 |
| `POST` | `/api/events` | Registra un evento de seguridad |
| `GET` | `/api/events` | Eventos del responsable (filtro por `deviceId`) 🔒 |
| `GET` | `/api/events/alerts` | Alertas del responsable 🔒 |
| `PATCH` | `/api/events/alerts/:id/read` | Marca una alerta como leída 🔒 |

🔒 = requiere `Authorization: Bearer <JWT>` · ⚙️ = requiere `x-admin-secret`.

---

### `POST /api/blocklist/check` (público)

Es la ruta que consume el **servicio local de VPN/DNS** del dispositivo protegido, por lo que no
requiere JWT. Acepta el dominio pelado o una URL completa: la comparación es por subcadena y
case-insensitive.

**Request**

```json
{ "domain": "https://www.apuestasilegalesba.com/juego" }
```

**Response `200 OK`**

```json
{
  "domain": "https://www.apuestasilegalesba.com/juego",
  "isBlocked": true,
  "blocked": true,
  "matchType": "LOTBA_OFFICIAL",
  "categoria": "Apuestas",
  "matchedDomain": "apuestasilegalesba.com"
}
```

| Campo | Descripción |
|-------|-------------|
| `isBlocked` | Indica si el dominio está bloqueado. |
| `blocked` | Alias de `isBlocked`, en línea con el contrato del diagrama de secuencia. |
| `matchType` | `LOTBA_OFFICIAL` \| `CUSTOM` \| `null`. |
| `categoria` | Categoría del bloqueo (ej. `"Apuestas"`, `"Personalizado"`) o `null`. |
| `matchedDomain` | Dominio exacto de la regla que coincidió, o `null`. |

---

## Lista oficial de LOTBA

No existe API externa de actualización automática: el listado oficial se recibe como
**listado estático mensual** y lo mantiene el equipo.

### Fuente versionada

`src/config/blocklistSource.ts` es la fuente de verdad. Contiene el período (`version`),
el origen (`source`), la fecha de publicación (`updatedAt`) y los dominios con su categoría.
Para cargar un período nuevo alcanza con actualizar ese módulo **o** con llamar al endpoint
de sincronización.

> ⚠️ Los dominios actuales son **ficticios** (simulan el listado real de LOTBA) y deben
> reemplazarse por los oficiales cuando el equipo reciba el primer listado.

### `POST /api/blocklist/sync/official` ⚙️

Sincroniza el listado oficial. Reemplaza por completo los dominios oficiales, **conserva
intactos los personalizados** de cada adulto responsable y registra la operación en el log
de auditoría (`db.blocklistSyncLog`), cubriendo el requisito del MVP de registrar la
actualización de la lista de bloqueo.

**Headers:** `x-admin-secret: <ADMIN_SECRET>` · `x-admin-requested-by: <quien>`

**Request (opcional — sin cuerpo recarga la fuente versionada vigente)**

```json
{
  "version": "2026-11",
  "source": "LOTBA - listado oficial mensual",
  "updatedAt": "2026-11-01T00:00:00.000Z",
  "domains": [
    { "domain": "apuestasilegalesba.com", "categoria": "Apuestas" }
  ]
}
```

**Response `200 OK`**

```json
{
  "message": "Official LOTBA blocklist synchronized successfully",
  "status": { "version": "2026-11", "source": "...", "lastUpdated": "...", "totalOfficial": 1, "totalCustom": 0 },
  "sync": {
    "version": "2026-11",
    "source": "...",
    "updatedAt": "...",
    "totalOfficial": 1,
    "added": ["apuestasilegalesba.com"],
    "removed": ["ruletasin18.com"]
  }
}
```

**Errores:** `401` sin secreto o secreto incorrecto · `503` si `ADMIN_SECRET` no está configurado.

> Es una **operación administrativa interna**, no una función del perfil del adulto responsable:
> el listado oficial no puede modificarse desde la app.

### `GET /api/blocklist/status` 🔒

```json
{
  "version": "2026-10",
  "source": "LOTBA - listado oficial mensual (simulado)",
  "lastUpdated": "2026-10-01T00:00:00.000Z",
  "totalOfficial": 4,
  "totalCustom": 2
}
```

Permite mostrar en la app el estado de actualización de la lista de bloqueo.

---

## Roles y modos

| Concepto | Valores | Dónde vive | Significado |
|----------|---------|------------|-------------|
| **Rol** | `responsable` \| `tutor` | Servidor (JWT + DB) | Tipo de cuenta del **adulto**. En el MVP **no hay diferencias de permisos** entre ambos: los dos administran la protección. La autorización de las operaciones críticas la resuelve el **PIN**. |
| **Modo** | `adulto` \| `dispositivo_protegido` | Cliente (Storage local) + espejo en servidor | Contexto en el que está operando la app ahora. El dispositivo protegido opera **con la cuenta del adulto**. |
| **Dispositivo** | registro con `status` | Servidor | El menor **nunca se registra**: es una entidad `device`, no un usuario. |

> ⚠️ `authorizeRoles` **no debe aplicarse** al flujo de "Modo Dispositivo Protegido": como el
> dispositivo usa la cuenta del adulto, filtrar por rol bloquearía también el celular del menor.

---

## Hito 2 — Gestión de Dispositivos, PIN de Seguridad y Vinculación

### Modelo de datos extendido

**Responsable** (campos nuevos):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `pinHash` | `string?` | Hash bcrypt del PIN de 4 dígitos. Nunca en texto plano. |
| `pinUpdatedAt` | `string?` | Fecha en que se configuró el PIN vigente. |

**Dispositivo**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `string` (uuid) | Identificador del dispositivo |
| `responsibleId` | `string` | UUID del responsable dueño |
| `deviceName` | `string` | Nombre del dispositivo (ej. "Tablet de Sofía") |
| `fechaNacimiento` | `string` | Fecha de nacimiento del menor (YYYY-MM-DD) |
| `linkCode` | `string` | Código de vinculación alfanumérico (8 chars) |
| `deviceToken` | `string?` | Token FCM para notificaciones push |
| `status` | `'pending' \| 'active' \| 'inactive'` | Estado del dispositivo |
| `lastSeen` | `string` (ISO 8601) | Última actividad |
| `createdAt` | `string` (ISO 8601) | Fecha de alta |

Valores de `status` normalizados case-insensitivamente: `active`/`activo`, `inactive`/`disabled`/`inactivo`, `pending`/`pendiente`.

---

### `POST /api/devices/link` 🔒 (BK-2.2)

El adulto responsable registra el dispositivo del menor con `deviceName` y `fechaNacimiento`.
El dispositivo queda en estado `pending` con un `linkCode` único que la app del dispositivo
protegido usará para identificar el perfil.

**Headers:** `Authorization: Bearer <JWT>`

**Request**

```json
{
  "deviceName": "Tablet de Sofía",
  "fechaNacimiento": "2015-08-12",
  "deviceToken": "fcm-token-opcional"
}
```

**Response `201 Created`**

```json
{
  "message": "Device registered successfully. Pending confirmation.",
  "device": {
    "id": "uuid",
    "deviceName": "Tablet de Sofía",
    "fechaNacimiento": "2015-08-12",
    "status": "pending",
    "linkCode": "XK9M2P7R",
    "responsibleId": "uuid",
    "createdAt": "2026-..."
  },
  "deviceId": "uuid",
  "linkCode": "XK9M2P7R"
}
```

También crea una alerta `DEVICE_PENDING` para el responsable.

**Errores:** `400` deviceName o fechaNacimiento ausentes / formato inválido · `401` sin token · `403` token inválido.

---

### `POST /api/devices/confirm-link` 🔒 (BK-2.3)

La app del dispositivo protegido confirma el vínculo enviando `deviceId` (o `linkCode`)
y el `pin` de 4 dígitos del responsable. El backend valida el PIN contra el `pinHash`
almacenado y cambia el estado de `pending` a `active`.

**Headers:** `Authorization: Bearer <JWT>`

**Request**

```json
{ "deviceId": "uuid-device", "pin": "4829" }
```

O usando `linkCode`:

```json
{ "linkCode": "XK9M2P7R", "pin": "4829" }
```

**Response `200 OK`**

```json
{
  "message": "Vinculación confirmada",
  "device": {
    "id": "uuid",
    "status": "active"
  }
}
```

También crea una alerta `DEVICE_LINKED` para el responsable.

**Errores:**
- `400` deviceId/linkCode o pin ausentes
- `401` PIN inválido
- `404` dispositivo no encontrado o no pertenece al responsable
- `409` dispositivo ya ACTIVE / responsable sin PIN configurado

---

### `GET /api/devices` 🔒 (BK-2.4)

Lista los dispositivos vinculados del responsable autenticado, filtrados por `responsibleId`.

**Headers:** `Authorization: Bearer <JWT>`

**Response `200 OK`**

```json
{ "devices": [ { "id": "...", "deviceName": "...", "status": "pending", ... } ] }
```

---

### `PATCH /api/devices/:id/status` 🔒 (BK-2.4)

Activa o desactiva la protección del dispositivo.

**Headers:** `Authorization: Bearer <JWT>`

**Request**

```json
{ "status": "inactive" }
```

Valores admitidos: `active` | `inactive` (case-insensitive).

**Response `200 OK`**

```json
{ "message": "Device status updated successfully", "device": { ... } }
```

**Errores:** `400` status inválido · `401` sin token · `403` token inválido · `404` dispositivo no encontrado o no pertenece al responsable.

---

### Pruebas

```bash
npm test
```

| Suite | Cubre |
|-------|--------|
| `src/__tests__/auth.test.ts` | BK-1.1 registro · BK-1.2 login · BK-1.3 modo de usuario · BK-1.4 middleware y roles |
| `src/__tests__/blocklist.test.ts` | Consulta de dominios · dominios personalizados · estado de actualización · sincronización de la lista oficial |
| `src/__tests__/devices.test.ts` | BK-2.1 PIN · BK-2.2 link device · BK-2.3 confirm-link · BK-2.4 list y status |
| `src/__tests__/app.test.ts` | Integración de health, auth, dispositivos, blocklist y eventos |
