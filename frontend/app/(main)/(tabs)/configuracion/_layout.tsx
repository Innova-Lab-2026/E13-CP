import { Stack } from "expo-router";
import { colors } from "../../../../src/theme";

export default function ConfiguracionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="mi-cuenta" />
      <Stack.Screen name="sitios" />
      <Stack.Screen name="ayuda" />
      <Stack.Screen name="terminos" />
      <Stack.Screen name="mejorar" />
      <Stack.Screen name="eliminar-cuenta" />
    </Stack>
  );
}
