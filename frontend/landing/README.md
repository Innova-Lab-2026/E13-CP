# Landing y despliegue web de BA Protege+

Un solo despliegue en Vercel sirve dos cosas:

| Ruta | Qué es | De dónde sale |
| --- | --- | --- |
| `/` | Landing para madres y padres (HTML y CSS, sin frameworks) | `landing/index.html` y `landing/assets/` |
| `/app/` | Web app de Expo (panel de la persona adulta) | `expo export -p web` con `experiments.baseUrl: "/app"` |
| `/descargas/ba-protege.apk` | APK de Android para el celular protegido | `landing/descargas/ba-protege.apk` (no está en el repo, ver abajo) |

Este archivo no se publica: el build lo borra de `dist/`.

## Cómo se arma el build

```sh
npm run build:web
```

El script hace, en orden:

1. Borra `dist/`.
2. Exporta la web app con `expo export -p web --output-dir dist/app`.
   - `app.json` define `web.output: "single"`, así que la salida es una SPA con un único `dist/app/index.html`.
   - `experiments.baseUrl: "/app"` hace que todos los recursos (`/app/_expo/static/...`, `/app/assets/...`) y los `Link` / `router` de expo-router lleven el prefijo `/app`. El prefijo solo aplica al export de producción; `npm run web` en desarrollo sigue sirviendo en la raíz.
3. Copia `landing/` a `dist/` (queda `dist/index.html`, `dist/assets/`, y `dist/descargas/` si existe).

Para probarlo localmente con las mismas rutas que Vercel, el servidor tiene que reescribir `/app/*` a `/app/index.html`.

## Configuración de Vercel (`vercel.json`)

- `framework: null`, `buildCommand: "npm run build:web"`, `outputDirectory: "dist"`.
- Rewrite `/app/:path*` → `/app/index.html`: como la app es una SPA, cualquier ruta profunda (por ejemplo `/app/protected/link` o `/app/alerts`) carga el mismo `index.html` y expo-router resuelve la pantalla en el navegador. Vercel sirve primero los archivos que existen, así que los JS y las imágenes de `/app/_expo/` no pasan por el rewrite.
- Los bundles de `/app/_expo/static/` tienen hash en el nombre y se cachean como inmutables.
- `/descargas/*` se sirve con `Content-Type: application/vnd.android.package-archive`.

En el proyecto de Vercel, el **Root Directory** tiene que ser `frontend`.

## Variables de entorno

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Vercel → Project → Settings → Environment Variables (Production y Preview) | URL del backend, sin barra final. Por ejemplo `https://tu-backend.vercel.app`. |

Las variables `EXPO_PUBLIC_*` se incrustan en el bundle **al momento del build**: si cambiás el valor en Vercel, tenés que volver a desplegar. No pongas secretos en una variable `EXPO_PUBLIC_*`, porque queda visible en el JavaScript público.

Sin la variable, la web app apunta a `http://localhost:3000` (ver `src/services/api.ts`).

Para verificar el build localmente:

```sh
EXPO_PUBLIC_API_URL=https://example.invalid npm run build:web
ls dist/index.html dist/app/index.html
```

## APK para "Descargar para Android"

El botón de la landing apunta a `/descargas/ba-protege.apk`. Para publicarla, generá la APK (con EAS Build configurado para salida `apk`, o con `npx expo run:android --variant release`) y dejala en `landing/descargas/ba-protege.apk` antes del despliegue, o subila como archivo en otro hosting y cambiá el enlace en `landing/index.html`. Mientras no exista, ese enlace devuelve 404.

## Cómo funciona la app (resumen para la landing)

1. La persona adulta crea su cuenta (web app o Android), elige el modo **adulto** y define un PIN de 4 dígitos.
2. Agrega el perfil de su hijo o hija (nombre y fecha de nacimiento) y recibe un código de vinculación.
3. En el celular del chico o la chica se instala la app de Android, se elige el modo **dispositivo protegido** y se ingresa el código con el PIN.
4. La app activa una VPN local que filtra por DNS los dominios del listado oficial de LOTBA y los sitios que agregue la persona adulta. El filtrado ocurre en el mismo celular.
5. Cada intento de entrar a un sitio bloqueado, o de modificar la protección, se registra como evento y genera una alerta en el panel (Alertas e Historial). No se registra el resto de la navegación.

El bloqueo solo funciona en Android: en la web el módulo `local-vpn` no hace nada (`modules/local-vpn/index.web.ts`), por eso la web app es solo el panel de la persona adulta.
