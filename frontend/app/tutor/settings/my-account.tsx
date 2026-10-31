// app/tutor/settings/my-account.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../../src/components/AppHeader";
import BottomNavigation from "../../../src/components/BottomNavigation";

export default function MyAccountScreen() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState("configuracion");

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
        <AppHeader title="Mi cuenta" onBackPress={() => router.back()} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Información personal</Text>
            <Pressable onPress={() => console.log("Editar cuenta")}>
              <Text style={styles.editText}>Editar ›</Text>
            </Pressable>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Nombre:</Text>
              <Text style={styles.value}>Claudia González</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.label}>Mail:</Text>
              <Text style={styles.value}>Claudia@gmail.com</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.label}>Celular:</Text>
              <Text style={styles.value}>11 2547 9860</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.label}>Contraseña:</Text>
              <Text style={styles.value}>********</Text>
            </View>
          </View>
        </ScrollView>
      </View>
      <BottomNavigation activeTab={currentTab} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  scrollContent: { paddingVertical: 10 },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#1F2937" },
  editText: { fontSize: 14, fontWeight: "600", color: "#CA8A04" },
  infoCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
  },
  infoRow: { marginBottom: 12 },
  label: { fontSize: 13, color: "#6B7280", marginBottom: 2, fontWeight: "500" },
  value: { fontSize: 15, color: "#1F2937", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 8 },
});