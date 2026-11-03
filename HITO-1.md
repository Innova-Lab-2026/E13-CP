# Hito 1 — Onboarding, Autenticación y Selección de Rol

**Estado:** Issues 1, 2, 3 y 4 cerrados en backend ✅
**Rama:** `Hito-1---Onboarding,-Autenticacion-y-Seleccion-de-Rol`
**Pruebas:** 59/59 pasando · build TypeScript sin errores

---

## Decisiones confirmadas por el equipo

### 1. Tres conceptos, no dos

| Concepto | Valores | Dónde vive | Significado |
|----------|---------|------------|-------------|
| **Rol** | `responsable` \| `tutor` | Servidor (JWT + DB) | Tipo de cuenta del **adulto** |
| **Modo** | `adulto` \| `dispositivo_protegido` | Cliente (Storage local) + espejo en servidor | Contexto en el que opera la app ahora |
| **Dispositivo** | registro con `status` | Servidor | El menor **nunca se registra**: es una entidad, no un usuario |

El dispositivo protegido opera **con la cuenta del adulto responsable**, por eso el rol y el modo
son ejes independientes.

### 2. Sin diferencias de permisos en el MVP

En el alcance del MVP `responsable` y `tutor` son **ambos adultos administradores** de la
protección. La autorización de las operaciones críticas la resuelve el **PIN** del adulto
(`PATCH /api/auth/pin` + `POST /api/devices/confirm-link`).

`authorizeRoles` queda implementado y testeado como **infraestructura para el escalamiento
institucional del Future Scope**, pero **no se aplica a ninguna ruta del MVP**.

> ⚠️ **No aplicar `authorizeRoles` al flujo de "Modo Dispositivo Protegido"**: como el dispositivo
> usa la cuenta del adulto, filtrar por rol bloquearía también el celular del menor.

### 3. La lista oficial de LOTBA es un listado estático mensual

No existe API externa de actualización automática, así que el listado oficial se mantiene como un
**listado estático versionado** en el backend (`src/config/blocklistSource.ts`), con período,
origen y fecha de publicación. El endpoint de sincronización queda preparado para cargar cada
período nuevo cuando el equipo reciba el listado.

---

## Issue 1 — Registro de responsable con rol/tipo de usuario (`BK-1.1`)

**Qué se hizo**

`POST /api/auth/register` ahora recibe `nombre`, `email`, `password`, `telefono` y `esResponsable`.
La contraseña se guarda hasheada con **bcryptjs** (nunca en texto plano) y el JWT emitido incluye
el claim **`rol`**, que se deriva de `esResponsable`: `true` → `"responsable"`, `false` → `"tutor"`.
El token tiene vigencia de **7 días** y el payload lleva `id`, `email` y `rol`.

Se agregaron validaciones que devuelven `400` ante email repetido, datos incompletos, email con
formato inválido, contraseña de menos de 6 caracteres, teléfono con formato inválido o
`esResponsable` que no sea booleano.

**Detalle de compatibilidad:** se sigue admitiendo `name` como alias de `nombre`, para no romper
los clientes que ya lo estaban enviando.

**Cómo lo consume el frontend**

```ts
const { token, responsible } = await registerResponsible({
  name: "Ana Pérez",
  email: "ana@mail.com",
  password: "Str0ng!Pass",
  telefono: "+5491122334455",   // opcional
  esResponsable: true,          // opcional, default true
});
// responsible.rol -> "responsable" | "tutor"
```

---

## Issue 2 — Inicio de sesión y emisión de JWT con rol (`BK-1.2`)

**Qué se hizo**

`POST /api/auth/login` valida las credenciales comparando el hash con `bcrypt.compare` y emite un
JWT que **incluye el rol**. La respuesta expone `id`, `email`, `name`, `rol` y `mode`, y **nunca**
incluye el `passwordHash`. Credenciales incorrectas devuelven `401`.

El login es **case-insensitive** respecto del email (se normaliza a minúsculas), de modo que el
mismo usuario puede escribir el correo en cualquier casing.

**Cómo lo consume el frontend**

El `rol` del login es lo que permite decidir el direccionamiento post-login: Dashboard del
responsable vs. flujo de dispositivo protegido.

---

## Issue 3 — Configuración y consulta del modo de usuario (`BK-1.3`)

**Qué se hizo**

Se agregaron dos endpoints autenticados:

- `GET /api/auth/me` → devuelve el perfil vigente (`id`, `email`, `name`, `rol`, `mode`, `telefono`, `createdAt`).
- `PATCH /api/auth/me/mode` → actualiza el modo y lo persiste en el registro del usuario.

El catálogo de modos es cerrado: `"adulto"` y `"dispositivo_protegido"`. Cualquier otro valor
devuelve `400`. Sin token válido devuelve `401`.

**Por qué hace falta para el diagrama**

El diagrama indica *"Guarda estado/modo en Storage local persistente"*. El backend ofrece ahora el
respaldo autoritativo de esa preferencia: el cliente lo guarda en su Storage local para responder
de inmediato al abrir la app, y el backend lo persiste para que el modo sobreviva reinstalaciones
y para poder consultarlo desde cualquier sesión.

**Cómo lo consume el frontend**

```ts
import { updateMyMode, getMyProfile } from "../src/services/auth";

await updateMyMode(token, "dispositivo_protegido");
const perfil = await getMyProfile(token); // perfil.mode
```

---

## Issue 4 — Middleware de autenticación y autorización por rol (`BK-1.4`)

**Qué se hizo**

`authenticateToken` ahora inyecta **`responsibleId`, `userEmail` y `rol`** en el `request`.
Se agregó el middleware **`authorizeRoles([...])`** para restringir rutas a los perfiles indicados
(debe ejecutarse siempre después de `authenticateToken`).

Comportamiento verificado:

| Situación | Respuesta |
|-----------|-----------|
| Token ausente | `401` |
| Token inválido o vencido | `403` |
| Token válido | `200` con `req.rol` poblado |
| Rol no autorizado por `authorizeRoles` | `403` |

Además, el servidor emite un **warning al arrancar** si `JWT_SECRET` no está definido, para que
nadie despliegue con la clave por defecto.

---

## Cambios de contrato en el cliente

`frontend/src/services/auth.ts` se actualizó para acompañar al backend (cambio **aditivo**, sin
tocar las pantallas para no interferir con el trabajo en curso del equipo de frontend):

- Nuevos tipos `UserRole`, `UserMode` y `ResponsibleProfile`.
- `responsible` ahora incluye `rol` y `mode`, y la validación exige que el backend los devuelva.
- `registerResponsible` acepta `telefono` y `esResponsable`.
- Nuevas funciones `getMyProfile(token)` y `updateMyMode(token, mode)`.

---

## Verificación

```bash
cd backend
npm test        # 59/59 pruebas: auth, blocklist e integración general
npm run build   # compilación TypeScript sin errores
```

Además se validó el flujo completo contra un servidor HTTP real, simulando las llamadas que hace
la app: registro → login → perfil → cambio de modo → perfil. Todas las comprobaciones respondieron
según lo esperado.

Documentación de la API: `backend/README.md`.
Colección de pruebas de API: `backend/postman/BA-Protege.postman_collection.json`.

---

## Lo que queda para cerrar el Hito 1 (frontend)

1. **Pantalla de Selección de Modo** (T1.4) — elegir *"Soy Adulto"* o *"Este es un dispositivo protegido"*.
2. **Persistencia local del modo** (T1.5) — guardar la selección en el Storage local de la app.
3. **Redirección según rol** (T1.6) — modo adulto → Dashboard del responsable; modo dispositivo
   protegido → flujo de vinculación y solicitud de permisos nativos.

> Recordatorio: el rol también viaja en el claim `rol` del JWT, así que la app puede decidir la
> redirección sin una llamada extra, incluso antes de haber guardado la preferencia en local.
