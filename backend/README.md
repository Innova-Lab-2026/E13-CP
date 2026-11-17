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
| `JWT_SECRET` | Clave de firma de los JWT | clave por defecto solo en desarrollo y tests; **obligatoria en producción** |
| `ADMIN_SECRET` | Secreto de las operaciones administrativas (sincronización de la lista oficial de LOTBA y listado de sugerencias) | sin valor (la operación queda deshabilitada con `503`) |
| `LINK_CODE_TTL_MINUTES` | Vigencia, en minutos, del código para vincular el celular del menor | `1440` (24 h) |
| `TRUST_PROXY` | Proxies de confianza para `req.ip` (límite de intentos por IP de `POST /api/devices/claim`): saltos (`1`), `true`/`false` o IPs/subredes, como el `trust proxy` de Express | `1` en Vercel; `false` en los demás casos |

> Si `JWT_SECRET` no está definido y `NODE_ENV=production` o la app corre en Vercel (`VERCEL`), el
> servidor **no arranca** (lanza un error al cargar). En desarrollo y tests emite un warning y usa la
> clave por defecto.

> Con `npm start` en un servidor propio **detrás de un proxy** (nginx, Caddy) que reescribe
> `X-Forwarded-For`, definí `TRUST_PROXY=1`. Sin proxy, dejala vacía: si se confiara en
> `X-Forwarded-For`, cualquiera podría esquivar el límite por IP cambiando ese header.

> **Persistencia (Redis o Vercel Blob):** cada pedido lee el estado completo y lo guarda con una
> escritura condicional (versión en Redis con un script Lua, `ifMatch` con el ETag en Blob). Si otra
> instancia guardó en el medio, el pedido responde `503` y no pisa ese cambio.

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
| `authenticateToken` | Exige `Authorization: Bearer <token>`. Inyecta `responsibleId`, `userEmail` y `rol` en `req`. Token ausente o credencial de celular (`Device ...`) → `401`; token inválido/vencido → `403`. |
| `authenticateDevice` | Exige `Authorization: Device <credencial>` (la que entrega `POST /api/devices/claim`). Inyecta `deviceId` y `responsibleId`. Credencial ausente, revocada, de un dispositivo pendiente o un `Bearer` → `401` `"Este celular ya no está vinculado"` (`code: "DEVICE_UNLINKED"`). |
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
| `src/__tests__/devices.claim.test.ts` | Vinculación por código · credencial del celular y rutas `/me` · regenerar código · `JWT_SECRET` en producción |
| `src/__tests__/suggestions.test.ts` | Sugerir un sitio · límite diario · listado administrativo |

---

## Midestones 2 y 3

Ya implementados en el backend (aún sin pantallas conectadas en el cliente):

| Método | Ruta | Descripción |
|--------|------|-------------|
| `PATCH` | `/api/auth/pin` | Configura el PIN de seguridad del responsable (Hito 2) 🔒 |
| `POST` | `/api/devices/link` | Registra un dispositivo protegido (estado PENDING + linkCode) 🔒 |
| `POST` | `/api/devices/confirm-link` | Confirma el vínculo validando el PIN (estado ACTIVE) 🔒 |
| `GET` | `/api/devices` | Lista los dispositivos del responsable 🔒 |
| `PATCH` | `/api/devices/:id/status` | Activa/desactiva un dispositivo; con `pending` lo desvincula 🔒 |
| `POST` | `/api/devices/:id/link-code` | Genera un código de vinculación nuevo (si está vinculado, pide PIN y lo desvincula) 🔒 |
| `POST` | `/api/devices/claim` | Vincula el celular del menor con código + PIN (público) |
| `GET` | `/api/devices/me` | Estado del celular vinculado 📱 |
| `GET` | `/api/devices/me/blocklist` | Lista de bloqueo del celular (oficial + personalizada del adulto) 📱 |
| `POST` | `/api/devices/me/events` | Registra un evento del celular 📱 |
| `POST` | `/api/devices/me/verify-pin` | Verifica el PIN del adulto desde el celular 📱 |
| `PATCH` | `/api/devices/me/status` | Pausa o reactiva la protección con el PIN 📱 |
| `POST` | `/api/devices/me/unlink` | Desvincula el celular con el PIN 📱 |
| `POST` | `/api/blocklist/check` | Verifica si un dominio está bloqueado (público; con credencial suma los personalizados) |
| `POST` | `/api/blocklist/suggestions` | Sugiere un sitio para revisar con LOTBA 🔒 |
| `GET` | `/api/blocklist/suggestions` | Lista las sugerencias para revisarlas ⚙️ |
| `GET` | `/api/blocklist` | Lista de bloqueo oficial + personalizada 🔒 |
| `GET` | `/api/blocklist/status` | Estado de actualización de la lista de bloqueo 🔒 |
| `POST` | `/api/blocklist/sync/official` | Sincroniza el listado oficial de LOTBA ⚙️ |
| `POST` | `/api/blocklist/custom` | Agrega un dominio personalizado 🔒 |
| `DELETE` | `/api/blocklist/custom/:id` | Elimina un dominio personalizado 🔒 |
| `POST` | `/api/events` | Registra un evento de seguridad (público, legado: lo usan los APK ya instalados) |
| `GET` | `/api/events` | Eventos del responsable (filtro por `deviceId`) 🔒 |
| `GET` | `/api/events/alerts` | Alertas del responsable 🔒 |
| `PATCH` | `/api/events/alerts/:id/read` | Marca una alerta como leída 🔒 |

🔒 = requiere `Authorization: Bearer <JWT>` · 📱 = requiere `Authorization: Device <credencial>` · ⚙️ = requiere `x-admin-secret`.

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
| `linkCode` | `string` | Código de vinculación alfanumérico (8 chars, sin I, O, 0 ni 1) |
| `linkCodeExpiresAt` | `string?` (ISO 8601) | Vencimiento del código (`LINK_CODE_TTL_MINUTES`) |
| `linkCodeUsedAt` | `string?` (ISO 8601) | Cuándo se usó o se invalidó el código |
| `linkFailedAttempts` | `number?` | PIN incorrectos con el código vigente (**nunca se devuelve**) |
| `linkedAt` | `string?` (ISO 8601) | Cuándo quedó vinculado el celular |
| `deviceSecretHash` | `string?` | SHA-256 de la credencial del celular (**nunca se devuelve**) |
| `deviceSecretIssuedAt` | `string?` (ISO 8601) | Cuándo se emitió la credencial vigente |
| `deviceToken` | `string?` | Token FCM para notificaciones push (**nunca se devuelve**) |
| `status` | `'pending' \| 'active' \| 'inactive'` | Estado del dispositivo |
| `lastSeen` | `string` (ISO 8601) | Última actividad |
| `createdAt` | `string` (ISO 8601) | Fecha de alta |

Todas las respuestas que devuelven dispositivos pasan por `toPublicDevice`
(`services/device.service.ts`): `linkCode` y `linkCodeExpiresAt` aparecen **solo** si el
dispositivo está `pending` y el código sigue vigente y sin usar. Los dispositivos creados antes
de que existiera el vencimiento no tienen `linkCodeExpiresAt`: se toman como vencidos y el adulto
genera uno nuevo con `POST /api/devices/:id/link-code`.

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
    "linkCodeExpiresAt": "2026-...",
    "responsibleId": "uuid",
    "createdAt": "2026-..."
  },
  "deviceId": "uuid",
  "linkCode": "XK9M2P7R",
  "linkCodeExpiresAt": "2026-..."
}
```

También crea una alerta `DEVICE_PENDING` para el responsable.

**Errores:** `400` deviceName o fechaNacimiento ausentes / formato inválido / nombre de menos de 2 o
más de 40 caracteres (`"El nombre tiene que tener entre 2 y 40 caracteres"`) · `401` sin token · `403` token inválido.

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

Valores admitidos: `active` | `inactive` | `pending` (case-insensitive). `pending` **desvincula**
el celular (lo usa `unlinkDevice` en la app): revoca su credencial y genera un código nuevo.

**Response `200 OK`**

```json
{ "message": "Device status updated successfully", "device": { ... } }
```

**Errores:** `400` status inválido · `401` sin token · `403` token inválido · `404` dispositivo no encontrado o no pertenece al responsable.

---

## Vinculación por código (celular del menor)

Camino recomendado para proteger el celular del menor **sin que el adulto inicie sesión ahí**.
El flujo anterior (`POST /api/devices/confirm-link` con la sesión del adulto) sigue funcionando igual.

1. El adulto crea el dispositivo (`POST /api/devices/link`) y recibe un `linkCode` de 8 caracteres
   que vence a las `LINK_CODE_TTL_MINUTES` (24 h por defecto).
2. En el celular del menor se ingresa el código y el PIN del adulto (`POST /api/devices/claim`).
3. El backend devuelve una **credencial opaca** (`deviceAccessToken`) que el celular guarda y
   manda en cada pedido como `Authorization: Device <credencial>`. Solo se guarda su SHA-256.
4. El celular usa las rutas `/api/devices/me/*`. Esa credencial no sirve en las rutas del adulto,
   y el JWT del adulto no sirve en `/me`.

### `POST /api/devices/claim` (público)

**Request**

```json
{ "linkCode": "xk9m-2p7r", "pin": "4829" }
```

El código se normaliza a mayúsculas, sin espacios ni guiones.

**Response `200 OK`**

```json
{
  "message": "Vinculación confirmada",
  "device": { "id": "uuid", "deviceName": "Celular de Sofi", "status": "active", "linkedAt": "2026-..." },
  "deviceAccessToken": "credencial-opaca-base64url"
}
```

Nunca devuelve `responsibleId`, `linkCode` ni `fechaNacimiento`. El dispositivo pasa a `active`, el
código queda usado y el adulto recibe una alerta `DEVICE_LINKED` (y un push si tiene token).

**Errores:**
- `400` `"Revisá el código: tiene 8 letras y números"` · PIN que no tiene 4 dígitos
- `401` `"El código o el PIN no son correctos, o el código venció."`: mismo mensaje para código
  inexistente, vencido, usado, PIN incorrecto o responsable sin PIN (no da pistas)
- `429` `"Demasiados intentos. Probá de nuevo en unos minutos."`: más de 10 intentos fallidos en
  15 minutos desde la misma IP (se guarda el SHA-256 de la IP, no la IP)
- `429` PIN del adulto bloqueado (mismo bloqueo de 5 intentos / 15 minutos que el resto de la app)

A los **5 PIN incorrectos** con un mismo código, el código se invalida y el adulto tiene que
generar uno nuevo.

### Rutas del celular (`Authorization: Device <credencial>`) 📱

| Método | Ruta | Request | Response |
|--------|------|---------|----------|
| `GET` | `/api/devices/me` | | `{ device: { id, deviceName, status, lastSeen, linkedAt } }`. Actualiza `lastSeen` (latido). |
| `GET` | `/api/devices/me/blocklist` | | Misma forma que `GET /api/blocklist`: lista oficial + personalizados del adulto dueño. |
| `POST` | `/api/devices/me/events` | `{ eventType, domain?, details }` | `201 { event }`. El dispositivo sale de la credencial; genera alertas igual que `POST /api/events`. |
| `POST` | `/api/devices/me/verify-pin` | `{ pin }` | `200 { valid: true }` · `401` · `429` |
| `PATCH` | `/api/devices/me/status` | `{ status: "active" \| "inactive", pin }` | `{ device }`. Registra `PROTECTION_MODIFIED`. |
| `POST` | `/api/devices/me/unlink` | `{ pin }` | `200`. Revoca la credencial, el dispositivo vuelve a `pending` con código nuevo y el adulto recibe una alerta `DEVICE_UNLINKED`. |

Credencial ausente, revocada o de un dispositivo pendiente → `401`
`{ "error": "Este celular ya no está vinculado", "code": "DEVICE_UNLINKED" }`: la app borra la
sesión del celular. Un PIN incorrecto también responde `401`, pero con `"code": "INVALID_PIN"`,
para que la app no lo confunda con la desvinculación.

`POST /api/blocklist/check` acepta la misma credencial: con ella suma los sitios personalizados
del adulto dueño. `POST /api/events` (público, con `deviceId` en el cuerpo) se mantiene por
compatibilidad con los APK ya instalados.

### `POST /api/devices/:id/link-code` 🔒

Genera un código nuevo con vigencia completa.

- Dispositivo `pending`: no pide nada más.
- Dispositivo vinculado (`active` o `inactive`): exige `{ "pin": "4829" }`, **revoca la credencial**
  del celular y lo deja `pending` (es la forma de desvincularlo desde la app del adulto).

**Response `200 OK`**

```json
{ "message": "Código de vinculación generado", "linkCode": "Q7MZ3KXP", "linkCodeExpiresAt": "2026-...", "device": { ... } }
```

**Errores:** `400` falta el PIN (dispositivo vinculado) · `401` PIN incorrecto · `404` dispositivo
de otra cuenta · `409` el adulto no configuró PIN · `429` PIN bloqueado.

---

## Sugerir un sitio

### `POST /api/blocklist/suggestions` 🔒

El adulto propone un sitio para sumar a la lista. No bloquea nada por sí sola: queda `pendiente`
hasta que el equipo la revise y la envíe a LOTBA.

**Request**

```json
{ "url": "https://www.sitio-de-apuestas.com/ruleta", "motivo": "apuestas_ilegales", "info": "Lo vi en una publicidad" }
```

| Campo | Reglas |
|-------|--------|
| `url` | Obligatoria. Se guarda el dominio pelado (`sitio-de-apuestas.com`): sin protocolo, ruta, puerto ni `www.`. |
| `motivo` | `apuestas_ilegales` \| `publicidad_apuestas` \| `contenido_inapropiado` \| `otro` |
| `info` | Opcional, hasta 500 caracteres. |

**Response `201 Created`**

```json
{
  "message": "Sugerencia enviada",
  "suggestion": {
    "id": "uuid",
    "responsibleId": "uuid",
    "domain": "sitio-de-apuestas.com",
    "motivo": "apuestas_ilegales",
    "info": "Lo vi en una publicidad",
    "createdAt": "2026-...",
    "status": "pendiente"
  }
}
```

**Errores:** `400` `"Por favor, ingresá la URL del sitio."` · dirección que no es un sitio ·
`"Por favor, seleccioná el motivo."` · `info` de más de 500 caracteres · `401` sin sesión ·
`429` más de 20 sugerencias en 24 horas.

### `GET /api/blocklist/suggestions` ⚙️

Listado para revisar las sugerencias (más nuevas primero). Acepta `?status=pendiente`.
Requiere `x-admin-secret`, como la sincronización de la lista oficial.

```json
{ "total": 1, "suggestions": [ { "id": "uuid", "domain": "sitio-de-apuestas.com", "motivo": "apuestas_ilegales", "status": "pendiente", ... } ] }
```

**Errores:** `401` sin secreto o secreto incorrecto · `503` si `ADMIN_SECRET` no está configurado.

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
| `src/__tests__/devices.claim.test.ts` | Vinculación por código · credencial del celular y rutas `/me` · regenerar código · `JWT_SECRET` en producción |
| `src/__tests__/suggestions.test.ts` | Sugerir un sitio · límite diario · listado administrativo |
| `src/__tests__/app.test.ts` | Integración de health, auth, dispositivos, blocklist y eventos |
