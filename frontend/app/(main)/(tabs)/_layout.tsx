import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabIcon, TabLabel, tabBarStyle } from "../../../src/components/TabBarParts";
import { colors } from "../../../src/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: tabBarStyle(insets),
        tabBarLabel: ({ focused, children }) => <TabLabel focused={focused}>{children}</TabLabel>,
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: "Inicio",
          tabBarAccessibilityLabel: "Inicio",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="home" inactive="home-outline" />
          ),
        }}
      />

      <Tabs.Screen
        name="dispositivos"
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
        name="historial"
        options={{
          title: "Historial",
          tabBarAccessibilityLabel: "Historial",
          // Figma: reloj con flecha de "historial".
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} family="material" active="history" inactive="history" />
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
  );
}
