import { Stack } from "expo-router";
import { colors } from "../../../../src/theme";

/** Pestaña Configuración del celular protegido. */
export default function ProtectedSettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.backgroundWarm },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="probar-sitio" />
    </Stack>
  );
}
