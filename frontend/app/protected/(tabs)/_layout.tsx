import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ProtectedDeviceProvider from "../../../src/components/protected/ProtectedDeviceProvider";
import { TabIcon, TabLabel, tabBarStyle } from "../../../src/components/TabBarParts";
import { colors } from "../../../src/theme";

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
          tabBarStyle: tabBarStyle(insets),
          tabBarLabel: ({ focused, children }) => <TabLabel focused={focused}>{children}</TabLabel>,
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
