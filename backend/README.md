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
| `POST` | `/api/devices/link` | Registra un dispositivo protegido |
| `GET` | `/api/devices` | Lista los dispositivos del responsable |
| `PATCH` | `/api/devices/:id/status` | Activa/desactiva un dispositivo |
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
