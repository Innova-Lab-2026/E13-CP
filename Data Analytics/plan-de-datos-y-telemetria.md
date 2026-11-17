# Plan de recopilación de datos, eventos y telemetría

> Issue #7 · BA Protege+ · versión 1, 3/11/2026
> Catálogo completo: [catalogo-de-eventos.md](catalogo-de-eventos.md) · Métricas: [kpis.md](kpis.md)

## Resumen

1. Para funcionar, el MVP necesita pocos datos: la cuenta del adulto, el perfil del dispositivo, la lista de bloqueo y los intentos de entrar a dominios de esa lista. La navegación permitida no se registra nunca.
2. Hoy el backend define 4 tipos de evento. La VPN no emite ninguno. El único emisor es la pantalla protegida (`app/protected/index.tsx`), que manda 3: `ACCESS_ATTEMPT` cuando el menor prueba un sitio a mano en "Probar un sitio", `BYPASS_ATTEMPT` con cada PIN incorrecto y `PROTECTION_MODIFIED` al pausar o salir del modo protegido. Los manda por `POST /api/events`, que es público. La VPN bloquea por DNS sin reportar nada.
3. Proponemos 15 eventos nuevos (uno opcional), centrados en la integridad de la protección: VPN apagada o revocada, permisos perdidos, PIN fallido y silencio del dispositivo como señal de una posible desinstalación.
4. El dispositivo decide, agrupa y encola. El backend guarda, deduplica, alerta y calcula los estados derivados y los KPIs. Lo que no coincide con la lista no sale del celular.
5. Antes de medir cualquier cosa hacen falta tres cambios: una base persistente, una credencial propia del dispositivo y que la VPN reporte lo que bloquea.

## Alcance y convenciones

- Base del análisis: rama `feat/figma-landing-webapp`, HEAD `5aa003c`, más los cambios sin commitear al 3/11/2026. El frontend está a mitad de una migración (servicios async nuevos, flujo `app/protected/` recién agregado y `app/(main)/(tabs)/configuracion.tsx` borrado), así que algunas referencias pueden moverse.
- **Implementado** quiere decir que ya está en el código. **Propuesto** es diseño de este documento y todavía no existe.
- **[verificar]** marca un punto que tiene que confirmar legales, LOTBA o una prueba en un dispositivo real.

---

## 1. Identificar qué datos será necesario recopilar para la operación básica del MVP

### 1.1 Datos necesarios

| Dato | Para qué se usa | Dónde vive | Estado |
|---|---|---|---|
| Cuenta del adulto: `email`, `passwordHash`, `name`, `rol`, `mode`, `createdAt` | Login, dueño de los dispositivos y receptor de las alertas | `Responsible` (`backend/src/config/db.ts`) | Implementado |
| `telefono` | No hace falta para el MVP | `Responsible.telefono?` | Implementado (opcional). Propuesta: no pedirlo |
| PIN: `pinHash` (bcrypt), `pinUpdatedAt` | Confirmar el vínculo y autorizar el apagado de la protección | `Responsible` | Implementado |
| Perfil del dispositivo: `deviceName`, `status`, `linkCode`, `createdAt` | Identificar el celular protegido y vincularlo | `Device` | Implementado |
| Edad del menor | Adaptar los textos de transparencia y segmentar métricas por franja | `Device.fechaNacimiento` (fecha completa en formato YYYY-MM-DD, obligatoria en `device.controller.ts:29-35`) | Implementado. Propuesta: guardar solo el año (o mes y año) de nacimiento y calcular la franja en el backend en cada consulta (ver §Privacidad, regla 3) |
| Lista de bloqueo: `domain`, `type` (oficial o personalizada), `categoria`, `period`, `addedBy` | Filtrar en el dispositivo | `BlocklistItem` | Implementado. La lista oficial sale de `backend/src/config/lotbaDomains.ts` (issue #9, 2090 dominios, período 2026-08), cargada en `blocklistSource.ts` |
| Auditoría de sincronización de la lista | Saber qué versión rige y qué cambió | `BlocklistSyncLog` | Implementado |
| Eventos | Historial, alertas y KPIs | `EventItem` | Parcial: el modelo y el endpoint existen. Los emite solo la pantalla protegida (`app/protected/index.tsx`), no la VPN. Los `ACCESS_ATTEMPT` de la prueba manual se tienen que marcar aparte (`metadata.trigger: MANUAL_CHECK`) y quedar fuera de B3, B5, E1 y E3 |
| Alertas y estado `read` | Avisarle al adulto | `AlertItem` | Implementado. Falta `readAt` |
| Último contacto del dispositivo | Detectar un dispositivo apagado o desinstalado | `Device.lastSeen` | Parcial: se fija al crear el perfil (`device.service.ts:98`) y se actualiza en `confirm-link` (`device.controller.ts:117`) y en `PATCH status` (`:170`), que es una acción del adulto. Hoy no mide actividad real del dispositivo |
| Estado de la protección: `vpnRunning`, `blocklistVersion`, `appVersion`, permisos | Mostrar el estado real en el panel del adulto | `Device.protectionState` | Propuesto |
| Agregado diario por dispositivo | Calcular WAD, retención, cobertura y dispositivos al día | `DeviceDailyStat` | Propuesto (ver §3.3) |
| Credencial del dispositivo | Que el celular reporte sin usar el JWT del adulto | Se emite en `confirm-link` | Propuesto |
| Token de push (FCM) | Notificar al adulto y detectar `UNREGISTERED` | `Device.deviceToken` | El campo existe, pero el front no lo envía |
| Registro de consentimiento: versión del texto, fecha, `responsibleId`, `role` | Probar el consentimiento informado del adulto y el aviso al menor | Registro nuevo en el backend | Propuesto |

### 1.2 Datos que no se recopilan (decisión de diseño)

- Las consultas DNS permitidas. No se guardan, no se envían y tampoco se escriben en `Log.*`.
- La URL completa. Solo se guarda el dominio de la lista que coincidió.
- IP, ubicación, IMEI, AAID, MAC, SSID y la lista de apps instaladas.
- La fecha de nacimiento dentro del dispositivo.
- Texto libre armado por el cliente. El mensaje (`details`) lo tiene que armar el servidor. Hoy lo manda el cliente desde `app/protected/index.tsx`.

---

## 2. Definir el listado de eventos y acciones a registrar

El detalle de cada evento (disparador, origen, payload, alerta y retención) está en [catalogo-de-eventos.md](catalogo-de-eventos.md). Esta sección resume la cobertura de lo que pide la issue.

### 2.1 Cobertura del checklist

| Pide la issue | Eventos | Cómo se detecta | Estado |
|---|---|---|---|
| Intentos de acceso a sitios bloqueados | `ACCESS_ATTEMPT` | La VPN responde NXDOMAIN a un dominio de la lista (`LocalVpnService.kt`, rama `isBlockedDomain`) | Parcial: hoy solo lo emite la prueba manual "Probar un sitio" (`app/protected/index.tsx:270`). Engancharlo en el servicio de la VPN, con `metadata.trigger: DNS_BLOCK`, es Propuesto |
| Cambios de permisos | `VPN_PERMISSION_DENIED`, `PERMISSION_CHANGED`, `VPN_REVOKED` | Al abrir la app y en cada heartbeat se comparan `VpnService.prepare()`, `POST_NOTIFICATIONS` y la exclusión de optimización de batería. `onRevoke()` cubre la revocación | Propuesto |
| Apagado de la protección | `PROTECTION_ENABLED`, `PROTECTION_DISABLED`, `PROTECTION_RESTORED`, `PIN_VERIFICATION_FAILED` | `onStartCommand`, `onDestroy`, receiver de `BOOT_COMPLETED`, verificación del PIN en el backend | Parcial. Hoy la app pide el PIN, lo valida en el backend (`/pin/verify`) antes de llamar a `stopVpn` y registra `PROTECTION_MODIFIED` (`app/protected/index.tsx:185-240`). La función nativa `stopVpn` (`LocalVpnModule.kt:38-41`) no tiene guarda, y un corte desde Ajustes (`onRevoke`) o por el sistema (`onDestroy`) no deja registro |
| Desinstalación | `DEVICE_OFFLINE`, `APP_UNINSTALL_SUSPECTED` (más `DEVICE_ADMIN_DISABLE_REQUESTED`, opcional) | Android no le avisa a una app que la están desinstalando. Se **infiere** en el backend: 72 h sin heartbeat o FCM `UNREGISTERED` | Propuesto |
| Intentos de evasión | `BYPASS_ATTEMPT` | DNS privado activo (API 28+), consultas a resolvers DoH conocidos, 5 o más PIN fallidos en 1 h | Parcial: hoy la app protegida lo emite con cada PIN incorrecto al pausar o salir (`app/protected/index.tsx:197`). Ese caso migra a `PIN_VERIFICATION_FAILED` (ver catálogo) |
| Acciones del adulto | `PROTECTION_MODIFIED`, `PIN_CHANGED`, `DEVICE_UNLINKED` | Las emite el backend al pausar o reactivar, editar la lista personalizada, cambiar el PIN o desvincular | `PROTECTION_MODIFIED` existe y hoy lo emite solo el dispositivo al pausar o salir. Falta generarlo en el backend para las acciones del adulto |
| Lista de bloqueo | `BLOCKLIST_UPDATED` (dispositivo) y `BlocklistSyncLog` (backend) | El dispositivo aplica una versión nueva de la lista | `BlocklistSyncLog` está implementado. `BLOCKLIST_UPDATED` es Propuesto |
| Falsos positivos | `FALSE_POSITIVE_REPORTED` | El menor o el adulto reporta "esto no es apuestas" | Propuesto. `app/protected/blocked.tsx` existe, pero solo se muestra en la prueba manual y no tiene botón de reporte. Un bloqueo por DNS no abre ninguna pantalla: el reporte saldría desde ahí o desde una notificación local que la VPN dispare al bloquear (Propuesto) |

`APP_INSTALL_ATTEMPT` (existe) queda **fuera del MVP**. Android deja ver una instalación ya hecha, no un intento, y para eso hace falta `QUERY_ALL_PACKAGES`, que Google Play no permite para control parental.

### 2.2 Esquema común (extiende `EventItem` sin romperlo)

```ts
interface EventItem {
  id: string;            // existente: UUID del servidor
  deviceId: string;      // existente
  eventType: EventType;  // existente: unión cerrada, se amplía (ver catálogo)
  domain?: string;       // existente: SOLO el dominio de la lista que coincidió
  details: string;       // existente: texto legible (propuesta: lo arma el servidor)
  timestamp: string;     // existente: hora de recepción (servidor, ISO 8601)
  // propuestos, todos opcionales
  clientEventId?: string;      // UUID generado en el dispositivo (idempotencia)
  occurredAt?: string;         // hora del hecho, corregida por desfase de reloj
  source?: 'DEVICE' | 'BACKEND' | 'ADULT_APP';
  count?: number;              // intentos agrupados (default 1)
  windowStart?: string;
  windowEnd?: string;
  blocklistVersion?: string;
  appVersion?: string;
  metadata?: Record<string, string | number | boolean>; // sin datos personales
}
```

`AlertItem` suma `domain?`, `eventId?`, `readAt?` y una unión cerrada de `alertType`. Hoy `alertType` es un `string` libre y el front saca el dominio del texto con una regex.

### 2.3 Reglas de registro

- **Validación.** El backend rechaza cualquier `eventType` que no esté en la unión. Hoy solo chequea que venga presente.
- **Validación del dominio.** Se valida `domain` contra la lista de la `blocklistVersion` que informa el evento. Para eso el backend conserva los `BlocklistSyncLog` y los dominios personalizados de los últimos 90 días. Si la versión no se reconoce, el evento se guarda marcado `metadata.unverifiedDomain=true` y no alimenta los KPIs E1 y E3. Así no se pierden bloqueos legítimos de un celular con una versión anterior ni eventos encolados sin conexión.
- **Origen del intento.** `ACCESS_ATTEMPT` lleva `metadata.trigger: 'DNS_BLOCK' | 'MANUAL_CHECK'`. B3, B5, E1 y E3 cuentan solo `DNS_BLOCK`.
- **Agrupación en el dispositivo.** Un solo acceso dispara varias consultas DNS (A y AAAA, reintentos, prefetch). Por eso:
  - La clave de agrupación es el dominio de la lista que coincidió.
  - La primera consulta de una ventana de 10 minutos genera un `ACCESS_ATTEMPT` con `count: 1`.
  - Las siguientes de esa ventana solo suman al contador. Al cerrar la ventana, si `count > 1`, sale un evento agregado con `windowStart` y `windowEnd`.
- **Límite de alertas en el backend:**
  - Una alerta por `(deviceId, eventType, domain)` cada 30 minutos. Si llega otro evento dentro de esa ventana, se actualiza la alerta abierta en vez de crear otra. Hoy cada `ACCESS_ATTEMPT` y cada `BYPASS_ATTEMPT` genera una alerta sin límite (`event.controller.ts:31`).
  - Tope de 20 alertas por dispositivo y por día. Pasado el tope, se arma un resumen diario.
  - Los eventos de integridad (`VPN_REVOKED`, `PROTECTION_DISABLED`, `PIN_VERIFICATION_FAILED`, `BYPASS_ATTEMPT`, `APP_UNINSTALL_SUSPECTED`) no tienen límite.
- **Idempotencia.** Se deduplica por `clientEventId`.
- **Reloj.** El lote viaja con `sentAt`. El backend calcula `offset = serverNow - sentAt` y guarda `occurredAt + offset`. Hoy `recordEvent` pisa la hora con la del servidor (`event.controller.ts:25`), así que un evento encolado sin conexión perdería su hora real.

Todos los umbrales (10 min, 30 min, 20 por día) son supuestos que hay que calibrar en el piloto.

---

## 3. Diferenciar la información almacenada localmente en el dispositivo protegido de la sincronizada en Backend

### 3.1 Qué guarda hoy cada lado (Implementado)

**En el dispositivo protegido:**
- AsyncStorage, clave `ba-protege:session` (`frontend/src/services/session.ts:21`), **en texto plano**: `token` (el JWT **del adulto**, que vence a los 7 días según `auth.controller.ts:133`), `profile`, `mode`, `linkedDeviceId` y `linkedDeviceName`.
- SharedPreferences `local_vpn`: `running` y `blocked_domains`. La app protegida pasa la lista completa de `GET /api/blocklist` (oficial de 2090 dominios más los personalizados del adulto) a `startVpn(domains)` (`app/protected/index.tsx:139`) y la reenvía cuando cambia (`:120-128`), pero solo mientras la app está abierta. Si la lista no cargó (`domains=[]`), el servicio usa los 4 dominios de respaldo fijos (`LocalVpnService.kt:40-45`: `bplay.bet.ar`, `bpplay.bet.ar`, `gambeta.ia`, `marval.com`).
- No hay cola de eventos, contadores ni caché versionada de la lista.

**En el backend:** todos los modelos de `db.ts`, **en memoria**. Se pierden al reiniciar el proceso y, en Vercel serverless, en cada arranque en frío.

### 3.2 Reparto propuesto

| Dato | Dispositivo protegido | Backend | Sincronización |
|---|---|---|---|
| Consultas DNS permitidas | No se guardan | No | Nunca |
| Consultas DNS bloqueadas | Contador por dominio y cola hasta recibir el ACK | Historial | Dispositivo → backend, agrupadas |
| Lista de bloqueo (oficial + personalizada) + versión | Archivo en `filesDir` con lista embebida en el APK como respaldo. **Nunca vacía** | Fuente de verdad | Backend → dispositivo (`GET /api/blocklist/device` con `ETag`), en segundo plano |
| Credencial del dispositivo | `EncryptedSharedPreferences` | Hash de la credencial | Se emite en `confirm-link` |
| JWT del adulto | **No debe estar** en el celular del menor | Sí | — |
| Estado de protección (`running`, versión aplicada, permisos) | Sí | `Device.protectionState`, `lastSeen` | Por heartbeat |
| Agregado diario (`DeviceDailyStat`) | No | Sí, 90 días | Derivado del heartbeat y de los eventos `PROTECTION_*` y `VPN_REVOKED` |
| Cola de eventos | Room/SQLite o JSONL, tope de 500 eventos o 7 días | — | Dispositivo → backend (`POST /api/events/batch`) |
| Edad del menor | No | Solo el año (o mes y año) de nacimiento. La franja se calcula en cada consulta | — |
| `pinHash`, `passwordHash`, email | No, tampoco un hash del PIN en caché | Sí | — |
| Alertas y `read`/`readAt` | No | Sí | Solo las ve el adulto |
| Estados derivados (offline, posible desinstalación) y KPIs | No | Sí, calculados contra el reloj del servidor | — |
| Registro de consentimiento (adulto y aviso al menor) | No | Sí | — |

### 3.3 Decisiones

- **Fail-closed.** Apagar la protección desde la app pide PIN, y el PIN se valida en el backend. Sin red no se puede apagar desde la app. La única salida es Ajustes del sistema, que dispara `onRevoke` y deja un `VPN_REVOKED` en la cola. La señal no se pierde.
  - Implementado en parte: la pausa y la salida del modo protegido ya piden el PIN validado en el backend (`app/protected/index.tsx:195`, `src/services/auth.ts:134`), y sin red `verifySecurityPin` falla y no se puede pausar. Falta registrar `onRevoke` y `onDestroy`, y proteger la función nativa `stopVpn`.
- **Cola con prioridades.** Si la cola se llena, se descartan primero los `ACCESS_ATTEMPT` más viejos, después de fusionarlos por dominio. Los eventos de integridad no se descartan nunca.
- **Envío.** Un WorkManager con restricción de red y backoff exponencial (de 30 s hasta 1 h como máximo) manda los eventos. Corre al encolar un evento de integridad, cuando vuelve la red y en cada heartbeat. El dispositivo borra de la cola lo que el backend devuelve como `accepted` o `duplicates`.
- **El heartbeat es un canal de control, no un evento.**
  - `POST /api/devices/:id/heartbeat` llega cada 15 minutos (el mínimo de WorkManager) y además en cada arranque o parada de la VPN.
  - Actualiza `lastSeen` y `protectionState`, y no genera un `EventItem`.
  - La respuesta devuelve `status` y `latestBlocklistVersion`. Así le llega al celular una pausa del adulto (`inactive`), cosa que hoy no pasa.
- **Agregado diario.** Como el heartbeat solo pisa un valor por dispositivo, no alcanza para saber si hubo actividad el día N ni cuánto tiempo estuvo activa la VPN. Por eso el backend mantiene `DeviceDailyStat { deviceId, date, heartbeats, vpnActiveMinutes, lastBlocklistVersion }`:
  - Se actualiza en cada heartbeat y en los eventos `PROTECTION_*` y `VPN_REVOKED`.
  - No guarda horas exactas.
  - Se retiene 90 días, igual que los eventos.
  - Es la fuente de A7, A8, B1, B2, D4 y E4.
- **Una sola regla de coincidencia** en los dos lados: el dominio exacto o un subdominio por etiqueta (`d == b || d.endsWith("." + b)`). Kotlin ya lo hace así (`LocalVpnService.kt:295`). El backend usa `includes`, una búsqueda por subcadena que da falsos positivos (`blocklist.service.ts:89`).

### 3.4 Qué ve cada perfil

- **Adulto:** alertas, historial (solo dominios bloqueados), estado de cada dispositivo (activo, sin señal, offline, lista desactualizada), versión de la lista aplicada contra la vigente, `lastSeen`.
- **Menor:** si la protección está activa y un texto claro de qué se bloquea y qué le llega al adulto. No ve alertas, historial, datos del adulto ni la lista completa.
  - Hoy `app/protected/blocked.tsx` muestra un texto y "Volver", y solo aparece en la prueba manual. Un bloqueo por DNS no abre ninguna pantalla.
  - Propuesto: notificación local al bloquear, recurso de ayuda en la pantalla de bloqueo y opción de reportar un falso positivo.
- Para que esto se cumpla de verdad hace falta la credencial del dispositivo con alcance limitado: eventos, heartbeat y lista. Hoy, con el JWT del adulto, el celular del menor puede leer `GET /api/events/alerts` y llamar a `PATCH /api/devices/:id/status`.

---

## 4. Proponer KPIs y métricas futuras para evaluar la efectividad de la protección

La tabla completa, con definición, fórmula, evento fuente, frecuencia, meta y si hoy se puede medir, está en [kpis.md](kpis.md). Hay cinco grupos:

- **A. Activación:** del registro a la protección activa.
- **B. Protección:** cobertura de la VPN y bloqueos.
- **C. Integridad y evasión:** interrupciones, silencio del dispositivo, PIN fallido.
- **D. Calidad de la lista:** latencia de propagación y falsos positivos.
- **E. Impacto:** agregados anónimos para LOTBA y resultado percibido por el adulto.

**Set mínimo del MVP:** A1-A4, A7, B1, B3, C1, C3, D1-D3.

Cómo leerlos:
- Contar bloqueos no mide impacto. La investigación sobre filtros parentales no encontró que reduzcan las experiencias negativas en línea (Przybylski y Nash, 2017).
- Una baja en los bloqueos (B3) puede ser un éxito o una evasión. Siempre hay que leerla junto con la cobertura (B1) y las interrupciones (C1).
- Los bloqueos cuentan solo los de la VPN (`trigger: DNS_BLOCK`). La prueba manual de un sitio no es un intento real.
- Hace falta al menos una medida de resultado: una encuesta al adulto a los 30 y 90 días (E5).

Hoy solo se calculan A1, A2, A3, la tasa de A9, D1, D2 y D6, y únicamente mientras el proceso del backend no se reinicie.

---

## Privacidad y cumplimiento

No es asesoramiento legal. Los puntos marcados **[verificar]** tiene que confirmarlos legales.

**Marco**
- Ley 25.326:
  - Art. 4: datos adecuados, pertinentes y no excesivos.
  - Arts. 5 y 6: consentimiento informado.
  - Art. 9: seguridad.
  - Art. 11: cesión.
  - Art. 12: transferencia internacional.
  - Arts. 14 y 16: acceso, rectificación y supresión.
  - Art. 21: registro de la base.
  - Art. 28: datos disociados.
- Res. AAIP 4/2019, criterios 3 (anonimización) y 5 (consentimiento de menores) **[verificar texto vigente]**.
- CCyC arts. 25 y 26: umbrales de 13 y 16 años.
- Ley 26.061 y CDN.
- Observación General 25 del Comité de los Derechos del Niño, párrs. 14, 55, 69, 75 y 76: minimización, el medio menos intrusivo, nada encubierto y control proporcional a la edad.
- Políticas de Google Play: VpnService, apps de monitoreo, Data safety, eliminación de cuenta y Families.

**Reglas que adopta este plan**
1. **Minimización en el dispositivo.** La VPN decide en el celular. Solo una coincidencia con la lista sale como evento. Nunca se loguea un dominio en `Log.*`.
2. **Eventos cerrados.** `eventType` es un enum, `domain` tiene que pertenecer a la lista de la versión informada y `details` lo arma el servidor. No se guardan IP, ubicación, identificadores de hardware ni lista de apps.
3. **Edad.** Se reemplaza `fechaNacimiento` por el año de nacimiento (o mes y año) y la franja se calcula en el backend en cada consulta, así no queda desactualizada cuando el menor cumple años. Nunca se exporta el año.
   - Franjas internas: 10-12, 13-14, 15-16, 17.
   - Cubren los umbrales del CCyC (13 y 16) y se agregan sin pérdida a los cortes de SEDRONAR (≤14, 15-16, ≥17).
   - Para `deviceName` se recomienda un alias ("Celu 1"), no el nombre completo.
4. **Retención** (propuesta de producto; la ley no fija un plazo):
   - Eventos, alertas y `DeviceDailyStat`: 90 días.
   - Dispositivo desvinculado: se borran sus eventos en 30 días.
   - Cuenta borrada: se borra todo, backups incluidos, en 30 días.
   - Agregados anónimos: sin límite.
   - Hoy `DELETE /api/auth/me` borra eventos y alertas (`auth.controller.ts:380-381`) sin conservar agregados. Hay que anonimizar antes de borrar.
5. **Consentimiento del adulto.** Una pantalla de divulgación destacada y separada de las demás, con acción afirmativa, antes de crear el perfil y antes de activar la VPN. La exige Google Play para VpnService. Incluye una declaración de ser madre, padre o tutor, y se guarda la versión del texto con su fecha.
6. **Transparencia y aviso al menor.** Los datos de los eventos son del menor, que es el titular, así que no alcanza con informar de forma pasiva.
   - Al confirmar el vínculo en el celular del menor, una pantalla le explica qué se registra y qué ve el adulto, con lenguaje según la franja de edad.
   - Para 13 años o más pide un "Entendí" explícito y se guarda `textVersion` y `acknowledgedAt` en el registro de consentimiento, con `role: MINOR`.
   - Para 16-17 años, legales tiene que definir si alcanza con el consentimiento del adulto **[verificar CCyC art. 26 y Res. AAIP 4/2019, criterio 5]**.
   - Notificación persistente de la VPN (ya existe el canal "Protección VPN").
   - Pantalla de bloqueo sin culpa, con la opción de pedir una revisión (Propuesto: hoy `blocked.tsx` solo aparece en la prueba manual).
   - Las alertas describen hechos, no diagnósticos: nunca "adicto" ni "riesgo de ludopatía".
7. **No bloquear ayuda.** Mantener una lista de dominios que no se pueden bloquear ni con la lista personalizada: líneas de ayuda de niñez y de juego problemático **[relevar URLs]**.
8. **Sin terceros.** Sin publicidad, perfilado ni venta. Sin SDKs de analítica de terceros en el modo dispositivo protegido.
9. **Seguridad.** HTTPS en producción, credencial propia del dispositivo, separación entre el acceso del adulto y el del dispositivo, y secretos en `EncryptedSharedPreferences` o SecureStore, no en AsyncStorage en texto plano.
10. **DNS externo.** Las consultas permitidas salen a `1.1.1.1` por UDP/53 sin cifrar (`LocalVpnService.kt:33`). Hay que evaluar DoH o DoT y declarar el resolver en la política de privacidad, por el art. 12 y por el requisito de cifrado de la política de VpnService **[verificar]**.
11. **Métricas para LOTBA.** Solo agregados disociados (art. 28), con un mínimo de 10 dispositivos por celda; las celdas más chicas se suprimen. Nunca `deviceId`, email, año o fecha de nacimiento, hora exacta ni ubicación. Si no se puede garantizar el anonimato, es una cesión (art. 11) y necesita consentimiento específico y un convenio.
12. **Derechos ARCO.** Exportar y borrar desde la app y desde la web. Responder el acceso en 10 días corridos y la rectificación o supresión en 5 días hábiles.
13. **Registro.** Inscribir la base en la AAIP antes de salir a producción, con la finalidad, los datos y los plazos de este documento. Primero hay que definir quién es el responsable **[verificar]**.
14. **Checklist de Google Play:**
    - Declaración de VpnService con video.
    - `isMonitoringTool=child_monitoring` en el manifiesto.
    - Formulario de Data safety con estas categorías: datos personales (nombre, email), otros (edad), historial web (dominios bloqueados enviados), actividad en la app e identificadores del dispositivo (FCM).
    - Eliminación de la cuenta en la app y en la web.
    - Ningún dominio de apuestas como enlace clickeable.
15. **Dato de prueba.** `marval.com` en la lista de respaldo parece un dominio ajeno a las apuestas. Hay que confirmarlo y sacarlo antes de distribuir.

Por la regla de privacidad del equipo, no se mandan eventos ni datos de menores a servicios externos de clasificación.

---

## Próximos pasos técnicos

Prioridades: **P0** para que haya datos reales; **P1** para que los datos sean confiables y completos; **P2** como mejora.

### P0: base mínima
- [ ] **Persistencia.** Reemplazar la `Database` en memoria por una base real (Postgres o similar). Tocar `backend/src/config/db.ts`, los servicios y controladores que leen `db.*`, y `backend/src/index.ts` (Vercel).
- [ ] **Credencial del dispositivo.** Emitirla en `confirm-link` (`backend/src/controllers/device.controller.ts`) y crear un middleware `authenticateDevice` en `backend/src/middleware/`. Exigirla en `POST /api/events` (`backend/src/routes/event.routes.ts:13`). Los endpoints de dispositivo van en un router separado, porque `device.routes.ts:7` aplica `authenticateToken` a todo. El nombre tiene que ser distinto de `deviceToken`, que hoy es el token de FCM.
- [ ] **Validar `eventType`** contra la unión y ampliarla (`db.ts:129`, `event.controller.ts`).
- [ ] **Lista versionada en la VPN.**
  - Hecho: la lista oficial sale de `lotbaDomains.ts` (issue #9) vía `blocklistSource.ts`, y el flujo protegido se la pasa a `startVpn(domains)` (`app/protected/index.tsx:139`, `:120-128`).
  - Crear `GET /api/blocklist/device` con `ETag` en `blocklist.controller.ts` y `blocklist.routes.ts`.
  - Actualizar la lista en segundo plano desde el lado nativo, sin depender de que se abra la app (worker en `frontend/modules/local-vpn/`).
  - Sacar `marval.com` de la lista de respaldo.
- [ ] **Emitir `ACCESS_ATTEMPT` desde Kotlin** con `metadata.trigger: DNS_BLOCK`. Agregar agregador, cola y worker en `LocalVpnService.kt` (rama `isBlockedDomain`) y archivos nuevos (`EventQueue.kt`, `FlushWorker.kt`). Sumar a `LocalVpnModule.kt` una función que reciba `deviceId`, la credencial y la URL de la API. Marcar `MANUAL_CHECK` en la llamada de `app/protected/index.tsx:270`.
- [ ] **Heartbeat.** Crear `POST /api/devices/:id/heartbeat` en `device.controller.ts` y `device.routes.ts`, agregar `Device.protectionState` y el agregado `DeviceDailyStat` en `db.ts`, y un `HeartbeatWorker.kt` (WorkManager, 15 min).

### P1: integridad y alertas
- [ ] `onRevoke` → `VPN_REVOKED` y `onDestroy` → `PROTECTION_DISABLED` (`LocalVpnService.kt:121-133`), con `authorized` según si el apagado pasó por el PIN (`LocalVpnModule.kt`, `app/protected/index.tsx:214`).
- [ ] `PIN_VERIFICATION_FAILED` en `confirm-link` y en `/pin/verify`, generado en el backend, con alerta a partir del 3.er fallo en 15 minutos (`device.controller.ts`, `auth.controller.ts`). Sacar el `BYPASS_ATTEMPT` por PIN incorrecto de `app/protected/index.tsx:197`.
- [ ] Generar `PROTECTION_MODIFIED`, `PIN_CHANGED` y `DEVICE_UNLINKED` en el backend: `device.controller.ts` (`PATCH status`), `blocklist.controller.ts` (alta y baja de dominios personalizados) y `auth.controller.ts` (cambio de PIN). Sumar `metadata.action` (`PAUSED_ON_DEVICE`, `EXITED_PROTECTED_MODE`) al que ya emite el dispositivo.
- [ ] Receiver de `BOOT_COMPLETED` que relance la VPN → `PROTECTION_RESTORED` (`frontend/modules/local-vpn/android/src/main/AndroidManifest.xml` y un receiver nuevo).
- [ ] Chequeo de permisos en el heartbeat y extender el listener `AppState` que ya existe en `app/protected/index.tsx:110-116` (hoy solo vuelve a leer `isVpnRunning`) para comparar los permisos y emitir `PERMISSION_CHANGED`.
- [ ] Cálculo de `DEVICE_OFFLINE`, `DEVICE_BACK_ONLINE` y `APP_UNINSTALL_SUSPECTED` con Vercel Cron, o de forma perezosa en `GET /api/devices` (`device.service.ts`).
- [ ] Rate limit y deduplicación de alertas en `event.controller.ts`, más `POST /api/events/batch`.
- [ ] Armar `details` en el servidor y dejar de aceptarlo del cliente (`event.controller.ts`, `blocklistService.ts`).
- [ ] Agregar `AlertItem.domain`, `eventId` y `readAt` (`db.ts`, `markAlertRead` en `event.controller.ts`) y sacar la regex de `frontend/src/services/alertService.ts`.
- [ ] Mapeos de presentación para los tipos nuevos en `frontend/src/services/historyService.ts` (`EVENT_PRESENTATION`) y `alertService.ts` (`ALERT_PRESENTATION`), y uniones de tipos en `blocklistService.ts`.
- [ ] Unificar la regla de coincidencia (sufijo por etiqueta) en `backend/src/services/blocklist.service.ts:89`.
- [ ] Sacar el JWT del adulto del celular del menor y guardar la credencial en un almacenamiento seguro (`frontend/src/services/session.ts`, `api.ts`). Hoy un 403 borra la sesión (`api.ts:105-108`) y el dispositivo deja de reportar sin que nadie se entere.
- [ ] Reducir `fechaNacimiento` al año (o mes y año) de nacimiento y calcular la franja en el backend (`device.controller.ts:29-35`, `deviceService.ts`, el formulario de alta).
- [ ] Pantalla de consentimiento del adulto y registro de la versión aceptada.
- [ ] Pantalla de aviso al menor al confirmar el vínculo (`app/protected/link.tsx`), con "Entendí" para 13 años o más y registro con `role: MINOR`.
- [ ] Purga por retención: un job que borre eventos y `DeviceDailyStat` de más de 90 días y anonimice antes de `DELETE /api/auth/me`.

### P2: mejoras
- [ ] `BYPASS_ATTEMPT` por DNS privado (`LinkProperties.isPrivateDnsActive`) y bloqueo de resolvers DoH conocidos.
- [ ] Probar en un dispositivo real DoH en Chrome, DNS privado en modo estricto, DNS fijo en apps e IPv6 **[verificar]**.
- [ ] Notificación local al bloquear y `FALSE_POSITIVE_REPORTED` desde esa notificación o desde `frontend/app/protected/blocked.tsx` (hoy sin botón de reporte ni recurso de ayuda).
- [ ] Enviar el token de FCM (`deviceService.ts`) para tener push y la señal `UNREGISTERED`.
- [ ] Evaluar `DeviceAdminReceiver` (`DEVICE_ADMIN_DISABLE_REQUESTED`) contra las políticas de Play **[verificar]**.
- [ ] Encuesta in-app a los 30 y 90 días (KPI E5).
- [ ] Abrir una issue aparte de seguridad por `POST /api/events` y `POST /api/blocklist/check`, que son públicos.

---

## Preguntas abiertas

- ¿Quién es legalmente el responsable de la base: Innova Lab, el equipo E13 o LOTBA? Sin eso no hay registro en la AAIP ni política de privacidad.
- ¿Qué público objetivo se declara en Play Console? Si incluye niños, se aplica la política Families completa.
- ¿Dónde se aloja el backend? Afecta el art. 12, igual que FCM y el resolver `1.1.1.1`.
- ¿Cómo ejerce un adolescente sus propios derechos ARCO frente al adulto?
- Para 16-17 años, ¿alcanza el consentimiento del adulto o hace falta el del adolescente?
- ¿El umbral de 10 dispositivos por celda es viable con el volumen del piloto?

## Fuentes

**Normativa**
- Ley 25.326: https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/norma.htm
- Res. AAIP 4/2019: https://servicios.infoleg.gob.ar/infolegInternet/anexos/315000-319999/318874/res4AAIP.pdf, https://www.boletinoficial.gob.ar/detalleAviso/primera/200224/20190116
- Res. AAIP 47/2018: https://www.argentina.gob.ar/normativa/nacional/resolución-47-2018-312662/texto
- Registro de bases de datos (AAIP): https://www.argentina.gob.ar/aaip/datospersonales/tramites, https://www.argentina.gob.ar/node/53779
- Código Civil y Comercial: https://servicios.infoleg.gob.ar/infolegInternet/anexos/235000-239999/235975/norma.htm
- Ley 26.061: https://servicios.infoleg.gob.ar/infolegInternet/anexos/110000-114999/110778/norma.htm
- Convención sobre los Derechos del Niño: https://www.unicef.org/es/convencion-derechos-nino/texto-convencion
- Observación General 25 (CRC/C/GC/25): https://www.pensamientopenal.com.ar/system/files/2021/06/legislacion89184.pdf
- Proyecto de reforma 3397-D-2026: https://allende.com/privacidad-y-ciberseguridad/se-reintroduce-en-el-congreso-el-proyecto-de-reforma-integral-del-regimen-argentino-de-proteccion-de-datos-personales-08-12-2026/ **[verificar estado]**

**Google Play**
- VpnService: https://support.google.com/googleplay/android-developer/answer/12564964
- Stalkerware y apps de monitoreo: https://support.google.com/googleplay/android-developer/answer/9888380, https://support.google.com/googleplay/android-developer/answer/12955211
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Eliminación de cuenta: https://support.google.com/googleplay/android-developer/answer/13327111
- Families: https://support.google.com/googleplay/android-developer/answer/9893335
- Juegos de azar: https://support.google.com/googleplay/android-developer/answer/9877032
- QUERY_ALL_PACKAGES: https://support.google.com/googleplay/android-developer/answer/10158779

**Efectividad de filtros** (detalle en [kpis.md](kpis.md))
- GambleAware, evaluación de software de bloqueo (2018): https://www.gambleaware.org/media/2yljgspz/blocking-software-evaluation-findings-reportt.pdf
- Przybylski y Nash (2017): https://www.oii.ox.ac.uk/?p=10810
- Ghosh, Wisniewski y otros, *A Matter of Control or Safety? Examining Parental Use of Technical Monitoring Apps on Teens' Mobile Devices* (CHI 2018): https://pure.psu.edu/en/publications/a-matter-of-control-or-safety-examining-parental-use-of-technical/
- Ghosh, Badillo-Urquiola, Guha y otros, *Safety vs. Surveillance: What Children Have to Say about Mobile Apps for Parental Control* (CHI 2018): https://www.eecs.ucf.edu/~jjl/pubs/pn1838-ghoshA.pdf
- Fugas de DNS en Android con VPN: https://www.bleepingcomputer.com/news/security/android-bug-leaks-dns-queries-even-when-vpn-kill-switch-is-enabled/
- DNS seguro en Chrome para Android: https://9to5google.com/2020/09/02/chrome-secure-dns-android/
