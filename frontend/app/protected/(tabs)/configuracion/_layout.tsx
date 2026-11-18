import { Stack } from "expo-router";
import { colors } from "../../../../src/theme";

// Al recargar o entrar por un enlace a una pantalla interna, "index" queda
// debajo: Volver lleva a la pantalla padre y no al Inicio de las pestañas.
// La navegación dentro de la app no cambia (expo-router no agrega el ancla).
export const unstable_settings = { anchor: "index" };

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
