import { Stack } from "expo-router";

export default function DeviceLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add-device" />
      <Stack.Screen name="device-success" />
      <Stack.Screen name="[deviceId]" />
    </Stack>
  );
}
