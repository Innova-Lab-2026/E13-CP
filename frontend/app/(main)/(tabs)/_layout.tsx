
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FFCC00",
        tabBarInactiveTintColor: "#686868",
        tabBarStyle: {
          backgroundColor: "#FFFEEF",
          borderTopColor: "#E5E5D8",
          height: 76,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="(dashboard)"
        options={{
          title: "Inicio",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name="home" color={focused ? "#FFCC00" : "#686868"} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="(dispositivos)"
        options={{
          title: "Dispositivos",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="phone-portrait-outline"
              color={focused ? "#FFCC00" : "#686868"}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="(historial)"
        options={{
          title: "Historial",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="time-outline"
              color={focused ? "#FFCC00" : "#686868"}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="configuracion"
        options={{
          title: "Configuración",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="settings-outline"
              color={focused ? "#FFCC00" : "#686868"}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
