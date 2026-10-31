// app/tutor/settings/pin-success-setting.tsx (o el nombre que estés usando para esta vista)
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

// Componentes reutilizables reales del proyecto
import BottomNavigation from "../../../src/components/BottomNavigation";

export default function PinSuccessScreen() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState("configuracion");

  // Manejo de la navegación inferior
  const handleTabPress = (tabId: string) => {
    setCurrentTab(tabId);
    if (tabId === "home") router.push("/tutor/dashboard");
    if (tabId === "dispositivos") router.push("/tutor/devices");
    if (tabId === "historial") router.push("/tutor/history");
    if (tabId === "configuracion") router.push("/tutor/settings/indexSettings");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        {/* Botón de cierre superior (X) */}
        <View style={styles.headerClose}>
          <Pressable onPress={() => router.push("/tutor/settings/indexSettings")}>
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        </View>

        {/* Contenido central de éxito */}
        <View style={styles.content}>
          <View style={styles.successIconCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.title}>¡PIN creado con éxito!</Text>
        </View>
      </View>

      <BottomNavigation activeTab={currentTab} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerClose: {
    alignItems: "flex-end",
    paddingVertical: 10,
  },
  closeIcon: {
    fontSize: 22,
    color: "#1F2937",
    fontWeight: "600",
    padding: 4,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60, // Espacio para que no lo tape la barra inferior
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#DCFCE7", // Verde claro institucional del UI Kit
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#22C55E", // Borde verde de éxito
  },
  checkMark: {
    fontSize: 42,
    color: "#166534", // Verde oscuro institucional
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
  },
});