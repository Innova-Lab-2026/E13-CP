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

- **Modo adulto responsable.** En tu celular o en la web app creás tu cuenta y un PIN de 4 dígitos, cargás el perfil de cada hijo o hija y recibís las alertas y el historial.
- **Modo dispositivo protegido.** En el celular del menor iniciás sesión con **tu** cuenta, elegís su perfil y confirmás con tu PIN. A partir de ahí, una VPN local de Android filtra por DNS los dominios del listado. La navegación no pasa por ningún servidor nuestro.

```mermaid
flowchart TD
    A[Bienvenida y onboarding] --> B{¿Tiene cuenta?}
    B -- No --> C[Crear cuenta]
    B -- Sí --> D[Iniciar sesión]
    C --> E[Selección de modo]
    D --> E
    E -- Adulto responsable --> F[Crear PIN de seguridad]
    F --> G[Inicio: dispositivos, alertas e historial]
    G --> H[Agregar dispositivo: nombre y fecha de nacimiento]
    H --> I[Perfil creado: pasos y código de vinculación]
    E -- Dispositivo protegido --> J[Elegir el perfil del menor]
    J --> K[Confirmar con el PIN del adulto]
    K -- PIN incorrecto --> K
    K -- PIN correcto --> L[Celular protegido: VPN local activa]
    L -- Intento de entrar a un sitio del listado --> M[Pantalla de sitio bloqueado]
    M -. evento ACCESS_ATTEMPT .-> N[(API)]
    L -. PIN incorrecto al salir: BYPASS_ATTEMPT .-> N
    N -. alerta .-> G
```

### Qué se registra y qué no

- **Se registra:** los intentos de entrar a un sitio bloqueado, los cambios en la protección y los PIN incorrectos al intentar salir del modo protegido.
- **No se registra:** el resto de la navegación, los mensajes, las fotos ni la ubicación. El detalle está en [Data Analytics/plan-de-datos-y-telemetria.md](Data%20Analytics/plan-de-datos-y-telemetria.md).

## Pantallas

Capturas de la web app, tomadas con el recorrido automático de [`docs/e2e`](docs/e2e/flujo.mjs) contra producción. La app de Android usa las mismas pantallas.

| Landing | Bienvenida | Onboarding | Login |
|---|---|---|---|
| <img src="docs/screenshots/02-landing-movil.png" width="190"> | <img src="docs/screenshots/03-bienvenida.png" width="190"> | <img src="docs/screenshots/04-onboarding-1.png" width="190"> | <img src="docs/screenshots/06-login.png" width="190"> |

| Crear cuenta | Selección de modo | PIN de seguridad | Inicio |
|---|---|---|---|
| <img src="docs/screenshots/07-crear-cuenta.png" width="190"> | <img src="docs/screenshots/08-seleccion-de-modo.png" width="190"> | <img src="docs/screenshots/09-crear-pin.png" width="190"> | <img src="docs/screenshots/10-home-sin-dispositivos.png" width="190"> |

| Agregar dispositivo | Perfil creado | Vinculación (celular del menor) |
|---|---|---|
| <img src="docs/screenshots/11-agregar-dispositivo.png" width="190"> | <img src="docs/screenshots/12-dispositivo-creado.png" width="190"> | <img src="docs/screenshots/13-vinculacion-elegir-perfil.png" width="190"> |

| PIN incorrecto | Vinculación exitosa | Celular protegido | Sitio bloqueado |
|---|---|---|---|
| <img src="docs/screenshots/14-vinculacion-pin-incorrecto.png" width="190"> | <img src="docs/screenshots/15-vinculacion-exito.png" width="190"> | <img src="docs/screenshots/16-home-protegido.png" width="190"> | <img src="docs/screenshots/17-sitio-bloqueado.png" width="190"> |

| Inicio con dispositivo | Alertas | Detalle de alerta | Historial |
|---|---|---|---|
| <img src="docs/screenshots/18-home-con-dispositivo.png" width="190"> | <img src="docs/screenshots/19-alertas.png" width="190"> | <img src="docs/screenshots/20-detalle-alerta.png" width="190"> | <img src="docs/screenshots/21-historial.png" width="190"> |

| Configuración | Ayuda |
|---|---|
| <img src="docs/screenshots/22-configuracion.png" width="190"> | <img src="docs/screenshots/23-ayuda.png" width="190"> |

### En Android (APK, emulador con Android 15)

| Vinculación con PIN | Permiso de VPN del sistema | Celular protegido |
|---|---|---|
| <img src="docs/screenshots/android/04-vinculacion-pin.png" width="190"> | <img src="docs/screenshots/android/07-permiso-vpn.png" width="190"> | <img src="docs/screenshots/android/08-protegido-vpn-activa.png" width="190"> |

Con la VPN activa, `bplay.bet.ar` (listado de LOTBA) deja de resolver en todo el celular y `google.com` sigue funcionando. Lo verifica [`docs/e2e/android_e2e.py`](docs/e2e/android_e2e.py) con adb sobre el emulador.

El recorrido automático de la web cubre el flujo completo con dos navegadores, uno para el adulto y otro para el celular del menor:

```bash
cd docs/e2e && npm i playwright && npx playwright install chromium
node flujo.mjs https://baprotege.vercel.app
```

## Arquitectura

```text
E13-Control-Parental/
├── frontend/              App Expo (SDK 58, expo-router) para Android y web
│   ├── app/(public)/      Bienvenida, onboarding, login, registro, modo, PIN
│   ├── app/(main)/(tabs)/ Panel del adulto: inicio, dispositivos, historial, configuración
│   ├── app/protected/     Modo dispositivo protegido: vinculación, estado, bloqueo
│   ├── modules/local-vpn/ Módulo nativo (Kotlin): VPN local que filtra por DNS
│   ├── src/               Tema del UI Kit, componentes, servicios de API y sesión
│   └── landing/           Landing estática que se publica en "/"
├── backend/               API Express + TypeScript (Vercel serverless)
│   └── src/config/lotbaDomains.ts  Listado oficial de LOTBA (generado)
├── Data Analytics/        Plan de datos (#7) y limpieza de la lista de LOTBA (#9)
└── docs/                  Capturas y recorrido automático
```

- **Frontend:** React Native con Expo Router. Las mismas pantallas se compilan a APK y a web (`expo export -p web`, servida en `/app`). Los colores, la tipografía y los radios salen del UI Kit del Figma (`frontend/src/theme.ts`).
- **Backend:** Express con JWT y bcrypt para la contraseña y el PIN. En Vercel corre como función serverless. Como cada pedido puede caer en una instancia distinta, el estado se guarda en un blob privado de Vercel Blob (`BLOB_READ_WRITE_TOKEN`), o en Upstash Redis si están `KV_REST_API_URL` y `KV_REST_API_TOKEN`. En desarrollo usa la memoria. Ver `backend/src/config/persistence.ts`.
- **Bloqueo:** el celular protegido baja el listado (`GET /api/blocklist`) y se lo pasa a la VPN local, que responde NXDOMAIN a esos dominios y a sus subdominios.

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

### Compilar el APK

```bash
cd frontend
EXPO_PUBLIC_API_URL=https://baprotege-api.vercel.app npx expo prebuild -p android --clean
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
# app/build/outputs/apk/release/app-release.apk
```

El APK de prueba se firma con la clave de debug. Para publicarlo en Google Play hace falta una clave de release propia (o `eas build`).

### Publicar la landing y la web app

```bash
cd frontend
EXPO_PUBLIC_API_URL=https://baprotege-api.vercel.app npm run build:web
# dist/ = landing en "/" + web app en "/app"; vercel.json define los rewrites
```

## Datos

- [Plan de datos, eventos y telemetría (#7)](Data%20Analytics/README.md): qué datos necesita el MVP, el catálogo de eventos, qué queda en el dispositivo y qué se sincroniza, privacidad y KPIs.
- [Lista de sitios LOTBA (#9)](Data%20Analytics/lista-lotba/README.md): 2.115 filas del archivo de agosto → 2.090 dominios únicos, el script reproducible de limpieza y las decisiones pendientes con LOTBA.

## Flujo de trabajo con Git

Seguimos [Conventional Commits](convencion_de_commit.md). Antes de empezar, `git pull origin development`. Trabajá en una rama propia y abrí un pull request hacia `development`. Antes de `git add`, revisá `git status` para no subir `.env`, `node_modules` ni archivos locales.

---

**Proyecto:** E13 Control Parental · Innova Lab 2026 · en colaboración con LOTBA
