import { Stack } from "expo-router";

// Al recargar o entrar por un enlace a una pantalla interna, "index" queda
// debajo: Volver lleva a la pantalla padre y no al Inicio de las pestañas.
// La navegación dentro de la app no cambia (expo-router no agrega el ancla).
export const unstable_settings = { anchor: "index" };

export default function DashboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="alerts" />
      <Stack.Screen name="[alertId]" />
    </Stack>
  );
}
