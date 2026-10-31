# E13 Control Parental — Frontend

Aplicación móvil del proyecto **Control Parental**, desarrollada con React Native y Expo.

## Requisitos previos

Antes de comenzar, necesitás tener instalado:

- [Node.js](https://nodejs.org/) (versión compatible con Expo SDK 57).
- npm, incluido con Node.js.
- [Git](https://git-scm.com/).
- Un celular Android con [Expo Go](https://expo.dev/go), o Google Chrome para ejecutar la versión web.

## 1. Clonar el repositorio

Si todavía no tenés el repositorio en tu computadora, ejecutá:

```bash
git clone https://github.com/Innova-Lab-2026/E13-Control-Parental.git
cd E13-Control-Parental
```

Para trabajar con la rama de desarrollo:

```bash
git switch development
git pull origin development
```

Si ya tenés el repositorio clonado, no necesitás repetir el primer paso.

## 2. Ingresar a la carpeta del frontend

Desde la raíz del repositorio, ejecutá:

```bash
cd frontend
```

## 3. Instalar las dependencias

Ejecutá:

```bash
npm install
```

Este comando instala las dependencias definidas en `package.json` y utiliza `package-lock.json` para reproducir las versiones registradas.

No es necesario instalar Expo globalmente.

## 4. Iniciar el proyecto

Para iniciar el servidor de desarrollo, ejecutá:

```bash
npm run start
```

Expo mostrará un código QR y opciones para ejecutar la aplicación.

### Ejecutar en Android

1. Instalá Expo Go en tu celular Android.
2. Conectá la computadora y el celular a la misma red Wi-Fi.
3. Ejecutá `npm run start`.
4. Escaneá el código QR con Expo Go.

Si no se conecta, revisá la conexión de red y las opciones de conexión de Expo.

### Ejecutar en Google Chrome

Para abrir la aplicación en el navegador, ejecutá:

```bash
npm run web
```

Se abrirá una dirección local, normalmente `http://localhost:8081`.

Dejá abierta la terminal mientras trabajás. Para detener el servidor, presioná `Ctrl + C`.

## Backend local en Android

El backend y Expo deben ejecutarse en terminales separadas. Desde la raíz del
repositorio, iniciá el backend con:

```bash
cd backend
npm run dev
```

Dejá esa terminal abierta y, desde otra, iniciá la aplicación:

```bash
cd frontend
npm run android
```

En el emulador de Android Studio, la aplicación usa `10.0.2.2:3000` para
conectarse al backend de la computadora. En un teléfono físico, configurá
`EXPO_PUBLIC_API_URL` en `frontend/.env` con la IP local de la computadora
(por ejemplo, `http://192.168.1.20:3000`); ambos dispositivos deben estar en
la misma red Wi-Fi y el firewall debe permitir conexiones al puerto `3000`.
Después de cambiar la URL, reiniciá Expo para que cargue la configuración.

El backend de desarrollo guarda los usuarios en memoria: mantenelo en ejecución
entre el registro y el inicio de sesión. Si se reinicia, las cuentas creadas se
pierden y hay que registrarlas de nuevo.

## 5. Comandos disponibles

| Comando | Función |
|---|---|
| `npm run start` | Inicia Expo y muestra las opciones de ejecución. |
| `npm run android` | Inicia Expo con la opción de Android. |
| `npm run ios` | Inicia Expo con la opción de iOS. |
| `npm run web` | Ejecuta la aplicación en el navegador. |
| `npx expo install --check` | Comprueba la compatibilidad de las dependencias con Expo. |

**Nota:** ejecutar `npm run ios` no significa que puedas iniciar un simulador de iOS nativamente desde Windows; para ello se necesita un entorno compatible.

## 6. Tecnologías utilizadas

- React Native
- React
- Expo
- TypeScript
- React Native Web

## 7. Estructura inicial

```text
E13-Control-Parental/
├── README.md
└── frontend/
    ├── assets/
    ├── App.tsx
    ├── app.json
    ├── index.ts
    ├── package.json
    ├── package-lock.json
    └── tsconfig.json
```

La estructura puede cambiar a medida que se incorporen pantallas, componentes y módulos.

## 8. Flujo de trabajo con Git

Antes de empezar a trabajar:

```bash
git pull origin development
```

Cuando termines tus cambios:

```bash
git status
git add frontend/
git commit -m "feat(frontend): describe your changes"
git push origin development
```

Antes de hacer `git add`, revisá `git status` para evitar subir archivos sensibles, archivos locales o carpetas de dependencias como `node_modules`.

Si el equipo utiliza ramas de trabajo o pull requests, seguí el flujo acordado por el equipo antes de integrar cambios en `development`.

## 9. Estado del proyecto

El frontend cuenta con la configuración inicial de Expo y puede ejecutarse en Android mediante Expo Go y en un navegador mediante Expo Web.

Las siguientes etapas incluyen la implementación de las pantallas de bienvenida y onboarding diseñadas en Figma, la organización de componentes y la incorporación de navegación.

---

**Proyecto:** E13-Control-Parental  
**Rama de desarrollo:** `development`  
**Directorio de la aplicación:** `frontend/`