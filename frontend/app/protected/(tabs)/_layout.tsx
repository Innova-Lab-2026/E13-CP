import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ProtectedDeviceProvider from "../../../src/components/protected/ProtectedDeviceProvider";
import { colors, radius, spacing } from "../../../src/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Ícono de pestaña, igual que en la app de la persona adulta: la pestaña activa
 * se marca con una píldora amarilla detrás del ícono negro (el amarillo de marca
 * sobre fondo claro no tiene contraste suficiente como color de ícono).
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

/**
 * Pestañas del celular protegido (Figma "Dasboard dispositivo protegido"):
 * Inicio (/protected), Navegación y Configuración. La vinculación
 * (/protected/link), el aviso de sitio bloqueado y las preguntas frecuentes
 * quedan fuera de las pestañas, en el stack de app/protected/_layout.tsx.
 */
export default function ProtectedTabsLayout() {
  // La altura suma el inset inferior (indicador de inicio o barra de gestos).
  const insets = useSafeAreaInsets();
  return (
    <ProtectedDeviceProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            // Ícono en píldora (30) + etiqueta + paddings, como en la app del adulto.
            height: 74 + insets.bottom,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            lineHeight: 14,
          },
          sceneStyle: { backgroundColor: colors.backgroundWarm },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Inicio",
            tabBarAccessibilityLabel: "Inicio",
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} active="home" inactive="home-outline" />
            ),
          }}
        />

        <Tabs.Screen
          name="navegacion"
          options={{
            title: "Navegación",
            tabBarAccessibilityLabel: "Navegación",
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} active="globe" inactive="globe-outline" />
            ),
          }}
        />

        <Tabs.Screen
          name="configuracion"
          options={{
            title: "Configuración",
            tabBarAccessibilityLabel: "Configuración",
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} active="settings" inactive="settings-outline" />
            ),
          }}
        />
      </Tabs>
    </ProtectedDeviceProvider>
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
