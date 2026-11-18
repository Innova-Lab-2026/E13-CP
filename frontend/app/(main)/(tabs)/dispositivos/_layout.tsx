import { Stack } from "expo-router";
import { colors } from "../../../../src/theme";

// Al recargar o entrar por un enlace a una pantalla interna, "index" queda
// debajo: Volver lleva a la pantalla padre y no al Inicio de las pestañas.
// La navegación dentro de la app no cambia (expo-router no agrega el ancla).
export const unstable_settings = { anchor: "index" };

export default function DeviceLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add-device" />
      <Stack.Screen name="device-success" options={{ gestureEnabled: false }} />
      <Stack.Screen name="[deviceId]" />
      <Stack.Screen name="historial/[deviceId]" />
    </Stack>
  );
}
