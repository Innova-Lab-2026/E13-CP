import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSession } from "../src/services/session";
import { colors } from "../src/theme";

/** Áreas que necesitan una sesión iniciada. */
const PRIVATE_AREAS = new Set(["(main)", "protected"]);

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading } = useSession();
  const area = (segments as string[])[0];

  // Si la sesión se cierra (logout, cuenta eliminada o token vencido) estando en
  // una pantalla privada, o si se llega sin sesión, se vuelve al login.
  useEffect(() => {
    if (loading) return;
    if (!session && area && PRIVATE_AREAS.has(area)) {
      router.replace("/login");
    }
  }, [loading, session, area, router]);

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

const IS_WEB = Platform.OS === "web";

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
