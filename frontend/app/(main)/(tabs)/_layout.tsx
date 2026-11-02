import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../../../src/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Ícono de pestaña. La pestaña activa se marca con una píldora amarilla detrás
 * del ícono negro: el amarillo de marca sobre fondo claro no tiene contraste
 * suficiente para usarse como color de texto o de ícono.
 */
function TabIcon({
  focused,
  active,
  inactive,
}: {
  focused: boolean;
  active: IconName;
  inactive: IconName;
}) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <Ionicons
        name={focused ? active : inactive}
        size={22}
        color={focused ? colors.text : colors.textMuted}
      />
    </View>
  );
}

export default function TabsLayout() {
  // La altura suma el inset inferior (indicador de inicio o barra de gestos).
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
          paddingTop: spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="(dashboard)"
        options={{
          title: "Inicio",
          tabBarAccessibilityLabel: "Inicio",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="home" inactive="home-outline" />
          ),
        }}
      />

      <Tabs.Screen
        name="(dispositivos)"
        options={{
          title: "Dispositivos",
          tabBarAccessibilityLabel: "Dispositivos",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              active="phone-portrait"
              inactive="phone-portrait-outline"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="(historial)"
        options={{
          title: "Historial",
          tabBarAccessibilityLabel: "Historial",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="time" inactive="time-outline" />
          ),
        }}
      />

      <Tabs.Screen
        name="(configuracion)"
        options={{
          title: "Configuración",
          tabBarAccessibilityLabel: "Configuración",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="settings" inactive="settings-outline" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    minWidth: 52,
    height: 30,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: {
    backgroundColor: colors.brand,
  },
});
