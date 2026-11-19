# BA Protege+ · E13 Control Parental

Aplicación para que madres, padres y personas adultas a cargo **bloqueen los sitios de apuestas online en el celular de sus hijos e hijas**, con el listado oficial de LOTBA (Lotería de la Ciudad de Buenos Aires). Proyecto E13 de Innova Lab 2026.

| | |
|---|---|
| **Landing** | https://baprotege.vercel.app |
| **Web app** (panel del adulto) | https://baprotege.vercel.app/app/ |
| **App Android (APK)** | https://baprotege.vercel.app/descargas/ba-protege.apk |
| **API** | https://baprotege-api.vercel.app (`GET /health`) |
| **Diseño** | [Figma · Innova](https://www.figma.com/design/z8BKCDW9O2Pbj0uwclONnm/Innova) |

## Cómo funciona

La misma app tiene dos modos. Cada celular elige el suyo la primera vez que se usa:

- **Modo adulto responsable.** En tu celular o en la web app creás tu cuenta (con correo y contraseña o con **Continuar con Google**; el teléfono es opcional) y un PIN de 4 dígitos, que se escribe y se repite en la misma pantalla. Después cargás el perfil de cada hijo o hija y seguís desde el panel: el estado de la protección, tus dispositivos, las alertas y el historial.
- **Modo dispositivo protegido.** Se vincula el celular del menor de una de dos formas:
  - **Con un código (recomendado).** Al cargar el perfil, la app abre la pantalla **«Código de vinculación»** con un código de 8 caracteres que vale 24 horas y se usa una sola vez. Desde ahí se comparte, se pide otro con **«Generar nuevo código»** (el anterior deja de servir) o se sale con **«Cancelar vinculación»** (el perfil queda pendiente para vincularlo después). En el celular del menor se toca **«Vincular con un código»**, se escribe el código y el PIN del adulto, y listo. La cuenta del adulto no queda abierta en ese celular: el celular recibe una credencial propia, revocable, que solo sirve para su estado, la lista de bloqueo y sus eventos.
  - **Iniciando sesión con la cuenta del adulto.** En «¿Qué perfil vas a vincular?» se elige el perfil del menor y se confirma con el PIN.

  A partir de ahí, una VPN local de Android filtra por DNS los dominios del listado. La navegación no pasa por ningún servidor nuestro. El celular protegido tiene tres pestañas: **Inicio** (estado de la protección y el interruptor del bloqueo), **Navegación** (los consejos de «Navegá seguro») y **Configuración** (probar un sitio, preguntas frecuentes y salir del modo protegido). En el celular protegido, para pausar la protección, desvincularlo o salir del modo protegido siempre hace falta el PIN del adulto.

```mermaid
flowchart TD
    A[Bienvenida y onboarding] --> B{¿Qué celular es?}
    B -- El del adulto --> C[Crear cuenta o iniciar sesión]
    C --> F[Crear PIN de seguridad: PIN y Repetir PIN]
    F --> G[Inicio: estado, dispositivos, alertas e historial]
    G --> H[Agregar perfil: nombre y fecha de nacimiento]
    H --> I[Código de vinculación: compartir, generar uno nuevo o cancelar]
    B -- El del menor --> V[Vincular con un código]
    I -. el adulto le pasa el código .-> V
    V --> K[Código + PIN del adulto]
    K -- incorrecto: 5 intentos como máximo --> K
    K -- correcto --> L[Celular protegido: VPN local activa · Inicio, Navegación y Configuración]
    C -. alternativa: modo dispositivo protegido .-> J[¿Qué perfil vas a vincular? y PIN]
    J --> L
    L -- Intento de entrar a un sitio del listado --> M[Pantalla de sitio bloqueado]
    M -. evento SITE_BLOCKED .-> N[(API)]
    L -. PIN incorrecto al salir: BYPASS_ATTEMPT .-> N
    G -. pausar o reactivar: PROTECTION_MODIFIED .-> N
    N -. alerta y push .-> G
```

### Qué se registra y qué no

- **Se registra:** los eventos del catálogo del Hito 3: intento de entrar a un sitio bloqueado (`SITE_BLOCKED`), intento de desinstalar (`UNINSTALL_ATTEMPT`), intento de evasión o PIN incorrecto al salir (`BYPASS_ATTEMPT`), intento de instalar una app (`APP_INSTALL_ATTEMPT`) y cambios en la protección (`PROTECTION_MODIFIED`). Los de seguridad generan una alerta para el adulto, y los críticos además una notificación push (hoy simulada: falta conectar Firebase o Expo Push). `ACCESS_ATTEMPT`, el nombre anterior de `SITE_BLOCKED`, se sigue aceptando por los APK ya instalados. Pausar o reactivar la protección queda como `PROTECTION_MODIFIED` tanto si se hace desde el celular (con el PIN) como desde la cuenta del adulto.
- **Alertas e historial.** «Mis alertas» y el contador de la campana muestran solo lo que puede pedir una acción del adulto. Los avisos informativos (perfil creado, celular vinculado) no son alertas: se ven en el Historial como «Perfil creado» y «Protección activada».
- **No se registra:** el resto de la navegación, los mensajes, las fotos ni la ubicación. El detalle está en [Data Analytics/plan-de-datos-y-telemetria.md](Data%20Analytics/plan-de-datos-y-telemetria.md).

## Pantallas

Capturas de la web app, tomadas con el recorrido automático de [`docs/e2e`](docs/e2e/flujo.mjs) contra producción, con cuentas de prueba. La app de Android usa las mismas pantallas, con el diseño del [Figma](https://www.figma.com/design/z8BKCDW9O2Pbj0uwclONnm/Innova) y la tipografía Inter.

#### Inicio y cuenta

| Landing | Bienvenida | Onboarding | Onboarding (2) |
|---|---|---|---|
| <img src="docs/screenshots/02-landing-movil.png" width="190"> | <img src="docs/screenshots/03-bienvenida.png" width="190"> | <img src="docs/screenshots/04-onboarding-1.png" width="190"> | <img src="docs/screenshots/05-onboarding-2.png" width="190"> |

| Login (con Google) | Crear cuenta | Selección de modo | PIN de seguridad |
|---|---|---|---|
| <img src="docs/screenshots/06-login.png" width="190"> | <img src="docs/screenshots/07-crear-cuenta.png" width="190"> | <img src="docs/screenshots/08-seleccion-de-modo.png" width="190"> | <img src="docs/screenshots/09-crear-pin.png" width="190"> |

En la selección de modo se avanza tocando la tarjeta del modo. El PIN se crea en una sola pantalla, con «PIN» y «Repetir PIN».

#### Panel del adulto

| Inicio sin dispositivos | Agregar dispositivo | Código de vinculación | Código nuevo |
|---|---|---|---|
| <img src="docs/screenshots/10-home-sin-dispositivos.png" width="190"> | <img src="docs/screenshots/11-agregar-dispositivo.png" width="190"> | <img src="docs/screenshots/12-codigo-de-vinculacion.png" width="190"> | <img src="docs/screenshots/13-codigo-nuevo.png" width="190"> |

| Inicio | Mis Dispositivos | Detalle del dispositivo | Historial del dispositivo |
|---|---|---|---|
| <img src="docs/screenshots/32-dashboard.png" width="190"> | <img src="docs/screenshots/33-mis-dispositivos.png" width="190"> | <img src="docs/screenshots/34-detalle-dispositivo.png" width="190"> | <img src="docs/screenshots/35-historial-dispositivo.png" width="190"> |

El Inicio muestra una campana con la cantidad de alertas, una tarjeta con el estado general («Todos los dispositivos están protegidos») y filas compactas por dispositivo. El detalle de cada dispositivo muestra la edad, las webs bloqueadas esta semana (desde el lunes) y su historial reciente; ahí también se pausa o reactiva la protección y se desvincula el celular (esto último, con el PIN).

| Historial: Todos | Por categorías | Por dispositivo | Detalle del evento |
|---|---|---|---|
| <img src="docs/screenshots/36-historial-todos.png" width="190"> | <img src="docs/screenshots/37-historial-categorias.png" width="190"> | <img src="docs/screenshots/38-historial-por-dispositivo.png" width="190"> | <img src="docs/screenshots/39-detalle-evento.png" width="190"> |

| Pausa desde el adulto | Mis alertas | Detalle de alerta |
|---|---|---|
| <img src="docs/screenshots/40-historial-pausa-adulto.png" width="190"> | <img src="docs/screenshots/41-alertas.png" width="190"> | <img src="docs/screenshots/42-detalle-alerta.png" width="190"> |

El detalle del evento explica qué pasó en «¿QUÉ SIGNIFICA ESTO?» y lleva al historial de ese dispositivo. Pausar y reactivar desde el adulto queda en el Historial («Protección pausada», «Protección reactivada»).

#### Configuración del adulto

| Configuración | Privacidad y seguridad | PIN cambiado | Sugerir un sitio |
|---|---|---|---|
| <img src="docs/screenshots/43-configuracion.png" width="190"> | <img src="docs/screenshots/44-privacidad.png" width="190"> | <img src="docs/screenshots/45-privacidad-ok.png" width="190"> | <img src="docs/screenshots/46-sugerir-sitio.png" width="190"> |

| Sugerencia enviada | Ayudanos a mejorar | Opinión enviada | Ayuda |
|---|---|---|---|
| <img src="docs/screenshots/47-sugerir-sitio-exito.png" width="190"> | <img src="docs/screenshots/48-mejorar.png" width="190"> | <img src="docs/screenshots/49-mejorar-enviado.png" width="190"> | <img src="docs/screenshots/50-ayuda.png" width="190"> |

| Sitios bloqueados | Cuenta eliminada |
|---|---|
| <img src="docs/screenshots/51-sitios-bloqueados.png" width="190"> | <img src="docs/screenshots/52-cuenta-eliminada.png" width="190"> |

Todas las opciones están en una sola tarjeta. En «Privacidad y seguridad» se cambia el PIN (pide el actual). «¿Querés sugerir un sitio?» pide la dirección y el motivo con texto libre. «Ayudanos a mejorar» envía la opinión desde la app (`POST /api/feedback`).

#### Celular protegido (vinculado iniciando sesión)

| ¿Qué perfil vas a vincular? | PIN incorrecto | ¡Dispositivo vinculado! | Inicio |
|---|---|---|---|
| <img src="docs/screenshots/14-vinculacion-elegir-perfil.png" width="190"> | <img src="docs/screenshots/15-vinculacion-pin-incorrecto.png" width="190"> | <img src="docs/screenshots/16-vinculacion-exito.png" width="190"> | <img src="docs/screenshots/17-inicio-protegido.png" width="190"> |

| Navegá seguro | Protegé tus datos | Cuidado con los engaños | Hablá con alguien |
|---|---|---|---|
| <img src="docs/screenshots/18-navega-seguro.png" width="190"> | <img src="docs/screenshots/19-nav-protege-tus-datos.png" width="190"> | <img src="docs/screenshots/20-nav-enganos.png" width="190"> | <img src="docs/screenshots/22-nav-habla-con-alguien.png" width="190"> |

| ¿Qué hace BA Protege+? | Configuración | Preguntas frecuentes | Probar un sitio |
|---|---|---|---|
| <img src="docs/screenshots/21-nav-que-hace.png" width="190"> | <img src="docs/screenshots/23-configuracion-protegido.png" width="190"> | <img src="docs/screenshots/24-preguntas-frecuentes.png" width="190"> | <img src="docs/screenshots/25-probar-sitio.png" width="190"> |

| Sitio bloqueado | Salir pide el PIN |
|---|---|
| <img src="docs/screenshots/26-sitio-bloqueado.png" width="190"> | <img src="docs/screenshots/27-salir-pide-pin.png" width="190"> |

#### Vincular con un código

| Vincular este celular | Código o PIN incorrecto | Celular protegido | Sitio bloqueado |
|---|---|---|---|
| <img src="docs/screenshots/28-vincular-con-codigo.png" width="190"> | <img src="docs/screenshots/29-vincular-con-codigo-error.png" width="190"> | <img src="docs/screenshots/30-inicio-protegido-con-codigo.png" width="190"> | <img src="docs/screenshots/31-sitio-bloqueado-con-codigo.png" width="190"> |

En la web, la pantalla «Vinculá este celular» avisa que el navegador no bloquea sitios. Si se abre desde el navegador de un Android, ofrece abrir la app o descargarla, para que el código no se gaste en un navegador.

### En Android (APK, emulador con Android 15)

| Vincular con un código | Celular protegido (VPN activa) | Pausar pide el PIN |
|---|---|---|
| <img src="docs/screenshots/android/02-c-vincular-con-codigo.png" width="190"> | <img src="docs/screenshots/android/04-c-protegido-vpn-activa.png" width="190"> | <img src="docs/screenshots/android/05-c-pausar-con-pin.png" width="190"> |

| ¿Qué perfil vas a vincular? | PIN de la persona adulta | ¡Dispositivo vinculado! |
|---|---|---|
| <img src="docs/screenshots/android/04-vinculacion-elegir-perfil.png" width="190"> | <img src="docs/screenshots/android/05-vinculacion-pin.png" width="190"> | <img src="docs/screenshots/android/06-vinculacion-exito.png" width="190"> |

| Protección pausada | Protección activa (VPN) |
|---|---|
| <img src="docs/screenshots/android/07-protegido-vpn-apagada.png" width="190"> | <img src="docs/screenshots/android/08-protegido-vpn-activa.png" width="190"> |

Con la VPN activa, `bplay.bet.ar` (listado de LOTBA) deja de resolver en todo el celular y `google.com` sigue funcionando. Lo verifican con adb sobre el emulador [`docs/e2e/android_e2e.py`](docs/e2e/android_e2e.py) (vinculación iniciando sesión) y [`docs/e2e/android_codigo_e2e.py`](docs/e2e/android_codigo_e2e.py) (vinculación por código, VPN y pausa con PIN).

### Recorrido automático de la web

[`docs/e2e/flujo.mjs`](docs/e2e/flujo.mjs) recorre el flujo completo con tres navegadores: el del adulto, un celular vinculado iniciando sesión y otro vinculado con el código. Son 31 pasos y 52 capturas; cada paso espera textos concretos de la pantalla y, si uno falla, guarda `ERROR-<paso>.png` y corta. Crea una cuenta de prueba nueva (`e2e+<número>@example.com`) y al final la elimina.

Contra producción:

```bash
cd docs/e2e && npm i playwright && npx playwright install chromium
node flujo.mjs https://baprotege.vercel.app
```

En local, sin tocar producción: [`docs/e2e/local_stack.sh`](docs/e2e/local_stack.sh) levanta el backend en `http://localhost:4000` (estado en memoria) y sirve la web exportada en `http://localhost:8099/app/` con [`serve_local.mjs`](docs/e2e/serve_local.mjs), que reproduce las rewrites de Vercel. El login con Google queda deshabilitado, porque no hay `GOOGLE_CLIENT_ID`.

```bash
bash docs/e2e/local_stack.sh              # compila la web y levanta todo (--no-build reusa frontend/dist)
SHOTS=/tmp/capturas node docs/e2e/flujo.mjs http://localhost:8099
bash docs/e2e/local_stack.sh --stop       # baja los dos procesos
```

Variables de `flujo.mjs`:

| Variable | Para qué |
|---|---|
| `SHOTS` | Carpeta de las capturas. Por defecto, `docs/screenshots` |
| `API_URL` | Backend para sembrar eventos como el celular. Por defecto, `http://localhost:4000` si la URL base es local; contra producción no se siembra nada por API |
| `ADMIN_SECRET` | Opcional. Si está, verifica por la API de admin que la sugerencia y la opinión llegaron (el stack local usa `dev-admin-secret`) |

## Arquitectura

```text
E13-Control-Parental/
├── frontend/              App Expo (SDK 58, expo-router) para Android y web
│   ├── app/(public)/      Bienvenida, onboarding, login, registro, modo, PIN, vincular con código
│   ├── app/(main)/(tabs)/ Panel del adulto: inicio, dispositivos, historial, configuración
│   ├── app/protected/     Modo dispositivo protegido: vinculación, bloqueo y pestañas
│   │                      Inicio, Navegación (Navegá seguro) y Configuración
│   ├── modules/local-vpn/ Módulo nativo (Kotlin): VPN local que filtra por DNS
│   ├── src/               Tema del UI Kit, componentes, servicios de API y sesión
│   └── landing/           Landing estática que se publica en "/"
├── backend/               API Express + TypeScript (Vercel serverless)
│   └── src/config/lotbaDomains.ts  Listado oficial de LOTBA (generado)
├── Data Analytics/        Plan de datos (#7) y limpieza de la lista de LOTBA (#9)
├── Testing QA/            Estrategia, criterios, riesgos, trazabilidad y evidencias de QA (Hito 1)
└── docs/                  Capturas y recorridos automáticos (web y Android)
```

- **Frontend:** React Native con Expo Router. Las mismas pantallas se compilan a APK y a web (`expo export -p web`, servida en `/app`). Los colores, la tipografía y los radios salen del UI Kit del Figma (`frontend/src/theme.ts`). La fuente es Inter (`@expo-google-fonts/inter`, cargada en `app/_layout.tsx`) en web y Android; si tarda o falla, la app arranca igual con la fuente del sistema. La sesión del adulto vive en AsyncStorage; la credencial del celular vinculado por código, en SecureStore (en la web, en localStorage).
- **Backend:** Express con JWT y bcrypt para la contraseña y el PIN. En Vercel corre como función serverless. Como cada pedido puede caer en una instancia distinta, el estado se guarda en un blob privado de Vercel Blob (`BLOB_READ_WRITE_TOKEN`), o en Upstash Redis si están `KV_REST_API_URL` y `KV_REST_API_TOKEN`. La escritura es condicional (ETag de Blob o versión en Redis): si otra instancia guardó en el medio, el pedido responde 503 en lugar de pisar ese cambio. En desarrollo usa la memoria. Ver `backend/src/config/persistence.ts`.
- **Bloqueo:** el celular protegido baja el listado (`GET /api/blocklist`, o `GET /api/devices/me/blocklist` si se vinculó con código, que suma los sitios personalizados del adulto) y se lo pasa a la VPN local, que responde NXDOMAIN a esos dominios y a sus subdominios.

### API del celular vinculado con código

| Endpoint | Autenticación | Para qué |
|---|---|---|
| `POST /api/devices/claim` | Pública (código + PIN) | Vincula y devuelve la credencial del celular, una sola vez |
| `GET /api/devices/me` | `Authorization: Device …` | Estado del celular (también sirve como señal de vida) |
| `GET /api/devices/me/blocklist` | `Device` | Listado oficial más los sitios personalizados del adulto |
| `POST /api/devices/me/events` | `Device` | Registra un evento del catálogo |
| `POST /api/devices/me/verify-pin` · `PATCH /api/devices/me/status` · `POST /api/devices/me/unlink` | `Device` + PIN del adulto | Verificar el PIN, pausar o reanudar, desvincular |
| `POST /api/devices/:id/link-code` | JWT del adulto | Código nuevo; si el celular estaba vinculado, pide el PIN y revoca la credencial |
| `POST /api/blocklist/suggestions` · `GET` (admin) | JWT del adulto · `ADMIN_SECRET` | Sugerir un sitio y revisar las sugerencias para enviarlas a LOTBA |
| `POST /api/feedback` · `GET` (admin) | JWT del adulto · `ADMIN_SECRET` | «Ayudanos a mejorar» y el listado de opiniones para el equipo |

El detalle de todas las rutas está en [`backend/README.md`](backend/README.md).

**Seguridad de la vinculación.** El código se genera con `crypto.randomInt` (32⁸ combinaciones), vence a las 24 horas (`LINK_CODE_TTL_MINUTES`) y se invalida después de 5 intentos fallidos. Además, hay límites por PIN del adulto (5 intentos y 15 minutos de bloqueo) y por IP (10 intentos cada 15 minutos). El intento se cuenta antes de comparar, para que los pedidos en paralelo no salteen el límite. La credencial del celular se guarda solo como hash, se compara en tiempo constante y no sirve en las rutas del adulto, ni el JWT del adulto en las del celular. `trust proxy` se activa solo en Vercel o con `TRUST_PROXY`. En producción, el backend no arranca sin `JWT_SECRET`.

**PIN del adulto.** Cambiar el PIN siempre pide el actual (`PATCH /api/auth/pin` con `currentPin`), aunque haya sesión abierta: un celular vinculado iniciando sesión tiene la sesión del adulto y no puede pisar el PIN para pausar la protección o salir del modo protegido. Por eso **no hay recuperación de PIN olvidado**: hoy la alternativa es eliminar la cuenta (se confirma con la contraseña) y crearla de nuevo. Ojo: una cuenta creada con Google no tiene contraseña y confirma la eliminación con el PIN, así que si se olvida el PIN tampoco puede eliminarse desde la app.

## Desarrollo local

Requisitos: Node.js compatible con Expo SDK 58, npm y Git. Para Android, un emulador de Android Studio o un celular con depuración USB.

```bash
git clone https://github.com/Innova-Lab-2026/E13-CP.git
cd E13-CP
git switch development
```

**Backend** (terminal 1):

```bash
cd backend
cp .env.example .env   # completá JWT_SECRET y ADMIN_SECRET
npm install
npm run dev            # http://localhost:3000
npm test               # tests de integración
```

**Frontend** (terminal 2):

```bash
cd frontend
npm install
npm run web            # http://localhost:8081
npm run android        # emulador o celular con depuración USB
```

En el emulador de Android la app llega al backend por `10.0.2.2:3000`. En un celular físico, definí `EXPO_PUBLIC_API_URL` en `frontend/.env` con la IP local de tu computadora (por ejemplo, `http://192.168.1.20:3000`). Los dos dispositivos tienen que estar en la misma red.

> La VPN local es código nativo: **no funciona en Expo Go**. Para probar el bloqueo hace falta un build de desarrollo (`npm run android`) o el APK.

### Iniciar sesión con Google

"Continuar con Google" usa OAuth 2.0 con código de autorización y PKCE. El backend es el cliente confidencial de un único cliente OAuth tipo **Aplicación web**: no hay SDK de Google en la app ni cliente de Android.

1. La app genera el `code_verifier`, su `code_challenge` (S256) y un `state`, y abre `GET /api/auth/google/start?return_to=…&code_challenge=…&state=…`.
2. El backend valida `return_to` contra una lista de prefijos permitidos, firma su propio `state` (JWT de 10 minutos) y redirige a Google.
3. Google vuelve a `GET /api/auth/google/callback`. El backend verifica el `state` y reenvía el código a la app: `https://baprotege.vercel.app/app/auth/google` en la web y `baprotege://auth/google` en Android.
4. La app manda `POST /api/auth/google { code, codeVerifier }`. El backend canjea el código, verifica el `id_token` y exige el correo verificado. Entra a la cuenta vinculada a ese usuario de Google o crea una nueva sin contraseña. Devuelve el mismo JWT que el login con contraseña. Si ya hay una cuenta con contraseña con ese correo, responde 409 y pide entrar con la contraseña: el registro no verifica el correo, así que esa cuenta no se vincula sola (alguien pudo crearla antes que la persona dueña del correo).

Las cuentas creadas con Google no tienen contraseña: para eliminarlas se confirma con el PIN de seguridad. Como en cualquier cuenta, para cambiar el PIN hay que ingresar el actual. Después de 5 PIN incorrectos seguidos, el PIN queda bloqueado 15 minutos en todas las pantallas que lo piden.

Variables del backend (detalle en `backend/.env.example`):

| Variable | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ID y secreto del cliente OAuth web |
| `GOOGLE_REDIRECT_URI` | `https://baprotege-api.vercel.app/api/auth/google/callback` (en local, `http://localhost:3000/api/auth/google/callback`) |
| `GOOGLE_RETURN_URL_PREFIXES` | Opcional. Por defecto `baprotege://auth/google,https://baprotege.vercel.app/app/auth/google`; fuera de producción también `http://localhost:8081/` |

Para crear el cliente: en Google Cloud Console configurá la pantalla de consentimiento (scopes `openid`, `email` y `profile`). Después, en **Credenciales → Crear credenciales → ID de cliente de OAuth**, elegí el tipo **Aplicación web** y registrá las dos URIs de redireccionamiento de la tabla. Sin estas variables, `GET /api/auth/google/config` responde `{ "enabled": false }` y la app oculta el botón.

### Compilar el APK

```bash
cd frontend
EXPO_PUBLIC_API_URL=https://baprotege-api.vercel.app npx expo prebuild -p android --clean
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a \
  -Dorg.gradle.jvmargs="-Xmx3g" -Dorg.gradle.workers.max=2
# app/build/outputs/apk/release/app-release.apk
```

Con 8 GB de RAM, no compiles el APK mientras corre otro proceso pesado (otro build o un render), porque WSL se puede quedar sin memoria. `expo-secure-store` y `expo-clipboard` son módulos nativos: después de agregarlos o actualizarlos hay que volver a compilar el APK.

El APK de prueba se firma con la clave de debug. Para publicarlo en Google Play hace falta una clave de release propia (o `eas build`).

### Publicar la landing y la web app

```bash
cd frontend
EXPO_PUBLIC_API_URL=https://baprotege-api.vercel.app npm run build:web
# dist/ = landing en "/" + web app en "/app"; vercel.json define los rewrites
```

## Integración de las ramas del equipo

La rama `feat/figma-landing-webapp` (PR #48) incluyó lo de todas las ramas del repo. Después, el PR #50 (`figma/integracion`) acercó las pantallas al diseño del Figma. Al 16/11/2026, solo tres traían cambios nuevos:

| Rama | Qué se tomó | Cómo |
|---|---|---|
| `main` | Documentación de QA del Hito 1 (`Testing QA/`) | Merge. `frontend/src/services/auth.ts` quedó con la versión de esta rama, que ya incluía lo del Hito 1. |
| `Hito3-FiltradoDNS-VPN-Eventos-Alertas-Auditoria` | Servicio de push, `POST /api/devices/push-token`, catálogo de eventos, historial ordenado y filtrable por categoría, tests | Merge con ajustes: se sigue aceptando `PROTECTION_MODIFIED` (lo envía la app) y los tipos anteriores siguen generando alerta. El test de dominio personalizado ahora consulta con el token de la cuenta, porque los sitios personalizados de un adulto no se bloquean para todos. |
| `13-front-vinculación-entre-dispositivos-y-estado-de-protección` (PR #30) | Vincular el celular sin la cuenta del adulto, «Sugerir un sitio», onboarding con scroll y validación del nombre | Reimplementado, sin merge. La rama confirmaba la vinculación con un endpoint público y un PIN de 4 dígitos, sin límite de intentos. Además, sus pantallas eran anteriores al diseño del Figma y tenía commiteado un JWT firmado con la clave por defecto. |

Las demás ramas (`development`, `12-front-navegación-onboarding`, `Hito-1…`, `Hito-2…`, `backend-semana1`, `feat/vpn-local-android`) ya estaban incluidas.

**Pruebas:** `backend` tiene 273 tests (`npm test`). Se suman el recorrido web con Playwright (31 pasos, contra producción o el stack local) y los dos recorridos de Android con adb.

## Datos

- [Plan de datos, eventos y telemetría (#7)](Data%20Analytics/README.md): qué datos necesita el MVP, el catálogo de eventos, qué queda en el dispositivo y qué se sincroniza, privacidad y KPIs.
- [Lista de sitios LOTBA (#9)](Data%20Analytics/lista-lotba/README.md): 2.115 filas del archivo de agosto → 2.090 dominios únicos, el script reproducible de limpieza y las decisiones pendientes con LOTBA.

## Flujo de trabajo con Git

Seguimos [Conventional Commits](convencion_de_commit.md). Antes de empezar, `git pull origin development`. Trabajá en una rama propia y abrí un pull request hacia `development`. Antes de `git add`, revisá `git status` para no subir `.env`, `node_modules` ni archivos locales.

---

**Proyecto:** E13 Control Parental · Innova Lab 2026 · en colaboración con LOTBA
