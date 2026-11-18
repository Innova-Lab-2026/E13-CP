import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { useSession } from "../src/services/session";
import { deviceSessionEndRoute, useDeviceSession } from "../src/services/deviceSession";
import { INTER_FONTS } from "../src/fonts";
import { colors } from "../src/theme";

/** Áreas que necesitan una sesión iniciada. */
const PRIVATE_AREAS = new Set(["(main)", "protected"]);

const IS_WEB = Platform.OS === "web";

/** Si Inter tarda más que esto, la app arranca igual con la fuente del sistema. */
const FONT_TIMEOUT_MS = 3000;

// En el celular, la pantalla de inicio queda visible hasta que carga la tipografía.
if (!IS_WEB) {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading } = useSession();
  const { deviceSession, loading: deviceLoading } = useDeviceSession();
  const area = (segments as string[])[0];

  const [fontsLoaded, fontError] = useFonts(INTER_FONTS);
  const [fontTimedOut, setFontTimedOut] = useState(false);
  // En la web se dibuja enseguida: el texto usa la fuente del sistema hasta que
  // llega Inter (font-display: swap), así nunca queda la pantalla en blanco.
  const ready = IS_WEB || fontsLoaded || !!fontError || fontTimedOut;

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (ready && !IS_WEB) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Si la sesión se cierra (logout, cuenta eliminada o token vencido) estando en
  // una pantalla privada, o si se llega sin sesión, se vuelve al login.
  // Un celular vinculado con un código entra al área protegida con su propia
  // credencial; si la pierde, va a la pantalla que corresponde a cómo terminó.
  useEffect(() => {
    if (!ready || loading || deviceLoading) return;
    if (!area || !PRIVATE_AREAS.has(area)) return;
    if (area === "protected" && deviceSession) return;
    if (!session) {
      router.replace(deviceSessionEndRoute() ?? "/login");
    }
  }, [ready, loading, deviceLoading, session, deviceSession, area, router]);

  if (!ready) return null;

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      {/* En la web la app se muestra como una columna de celular centrada. */}
      <View style={styles.column}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(public)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="protected" />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: IS_WEB ? colors.backgroundWarm : colors.background,
  },
  column: {
    flex: 1,
    width: "100%",
    maxWidth: IS_WEB ? 480 : undefined,
    alignSelf: "center",
    backgroundColor: colors.background,
    ...(IS_WEB ? { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border } : null),
  },
});
