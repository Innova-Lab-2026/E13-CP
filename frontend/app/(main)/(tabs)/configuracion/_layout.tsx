import { Stack } from "expo-router";
import { colors } from "../../../../src/theme";

// Al recargar o entrar por un enlace a una pantalla interna, "index" queda
// debajo: Volver lleva a la pantalla padre y no al Inicio de las pestañas.
// La navegación dentro de la app no cambia (expo-router no agrega el ancla).
export const unstable_settings = { anchor: "index" };

export default function ConfiguracionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.backgroundWarm },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="mi-cuenta" />
      <Stack.Screen name="privacidad" />
      <Stack.Screen name="sitios" />
      <Stack.Screen name="sugerir-sitio" />
      <Stack.Screen name="ayuda" />
      <Stack.Screen name="terminos" />
      <Stack.Screen name="mejorar" />
      <Stack.Screen name="eliminar-cuenta" />
    </Stack>
  );
}
