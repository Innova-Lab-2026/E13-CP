// app/menor/_layout.tsx
import { Stack } from "expo-router";

export default function MenorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}