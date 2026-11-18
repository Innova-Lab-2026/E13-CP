import { Stack } from "expo-router";
import { colors } from "../../../../src/theme";

/** Pestaña Navegación: "Navegá seguro" y sus cuatro pantallas de consejos. */
export default function ProtectedNavigationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.backgroundWarm },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[tema]" />
    </Stack>
  );
}
