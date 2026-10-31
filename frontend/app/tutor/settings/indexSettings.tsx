// app/tutor/settings/indexSettings.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

// Componentes reutilizables reales del proyecto
import AppHeader from "../../../src/components/AppHeader";
import BottomNavigation from "../../../src/components/BottomNavigation";

export default function SettingsScreen() {
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
        <AppHeader title="Configuración" />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Opción 1: Mi cuenta */}
          <Pressable 
            style={styles.menuItem} 
            onPress={() => router.push("/tutor/settings/my-account")}
          >
            <View style={styles.leftContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>👤</Text>
              </View>
              <Text style={styles.menuText}>Mi cuenta</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          {/* Opción 2: Privacidad y seguridad (Lleva a la segunda pantalla que armaremos) */}
          <Pressable 
            style={styles.menuItem} 
            onPress={() => router.push("/tutor/settings/security-pin")}
          >
            <View style={styles.leftContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🔒</Text>
              </View>
              <Text style={styles.menuText}>Privacidad y seguridad</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          {/* Opción 3: ¿Querés sugerir un sitio? */}
          <Pressable 
            style={[styles.menuItem, styles.highlightItem]} 
            onPress={() => router.push("/tutor/settings/suggest-site")}
          >
            <View style={styles.leftContent}>
              <View style={[styles.iconContainer, styles.highlightIconContainer]}>
                <Text style={styles.icon}>💡</Text>
              </View>
              <Text style={[styles.menuText, styles.highlightText]}>¿Querés sugerir un sitio?</Text>
            </View>
            <Text style={[styles.arrow, styles.highlightArrow]}>›</Text>
          </Pressable>

          {/* Opción 4: Ayúdanos a mejorar */}
          <Pressable 
            style={styles.menuItem} 
            onPress={() => router.push("/tutor/settings/feedback")}
          >
            <View style={styles.leftContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>⭐</Text>
              </View>
              <Text style={styles.menuText}>Ayúdanos a mejorar</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          {/* Opción 5: Términos y políticas */}
          <Pressable 
            style={styles.menuItem} 
            onPress={() => router.push("/tutor/settings/terms")}
          >
            <View style={styles.leftContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>📄</Text>
              </View>
              <Text style={styles.menuText}>Términos y políticas</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          {/* Opción 6: Eliminar cuenta */}
          <Pressable 
            style={styles.menuItem} 
            onPress={() => router.push("/tutor/settings/delete-account")}
          >
            <View style={styles.leftContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>❌</Text>
              </View>
              <Text style={[styles.menuText, styles.dangerText]}>Eliminar cuenta</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </ScrollView>
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
  scrollContent: {
    paddingVertical: 10,
    paddingBottom: 30,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
  },
  menuText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  arrow: {
    fontSize: 20,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  highlightItem: {
    backgroundColor: "#FEF2F2", // Fondo sutil rosado acorde al diseño
    borderColor: "#FECACA",
  },
  highlightIconContainer: {
    backgroundColor: "#FEE2E2",
  },
  highlightText: {
    color: "#B91C1C",
  },
  highlightArrow: {
    color: "#EF4444",
    fontSize: 20,
    fontWeight: "600",
  },
  dangerText: {
    color: "#EF4444",
  },
});