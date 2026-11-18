import { Stack } from "expo-router";

export default function PublicLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="onboarding2" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="mode" />
      <Stack.Screen name="pin-setup" />
      {/* Celular del menor: vincular con un código y aviso de desvinculado. */}
      <Stack.Screen name="vincular" />
      <Stack.Screen name="desvinculado" />
      {/* Confirmación después de eliminar la cuenta (cierra la sesión local). */}
      <Stack.Screen name="cuenta-eliminada" />
      {/* Vuelta del ingreso con Google. */}
      <Stack.Screen name="auth/google" />
    </Stack>
  );
}
