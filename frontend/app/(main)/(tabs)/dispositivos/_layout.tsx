import { Stack } from "expo-router";
import { colors } from "../../../../src/theme";

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
    </Stack>
  );
}
