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
    </Stack>
  );
}
