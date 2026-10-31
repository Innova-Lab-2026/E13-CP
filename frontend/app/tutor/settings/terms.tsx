// app/tutor/settings/terms.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../../src/components/AppHeader";
import BottomNavigation from "../../../src/components/BottomNavigation";

export default function TermsScreen() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState("configuracion");

  const handleTabPress = (tabId: string) => {
    setCurrentTab(tabId);
    if (tabId === "home") router.push("/tutor/dashboard");
    if (tabId === "dispositivos") router.push("/tutor/devices");
    if (tabId === "historial") router.push("/tutor/history");
    if (tabId === "configuracion") router.push("/tutor/settings/indexSettings");
  };

  const menuOptions = [
    "Términos y condiciones",
    "Política de privacidad",
    "Política de protección de datos",
    "Información sobre BA Protege+",
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <AppHeader title="Términos y políticas" onBackPress={() => router.back()} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {menuOptions.map((title, index) => (
              <React.Fragment key={index}>
                <Pressable style={styles.rowItem} onPress={() => console.log(title)}>
                  <Text style={styles.rowText}>{title}</Text>
                  <Text style={styles.arrow}>›</Text>
                </Pressable>
                {index < menuOptions.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>

          <Text style={styles.footerDate}>Última actualización: Septiembre 2026</Text>
        </ScrollView>
      </View>
      <BottomNavigation activeTab={currentTab} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  scrollContent: { paddingVertical: 10, alignItems: "center" },
  card: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  rowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  rowText: { fontSize: 14, fontWeight: "500", color: "#1F2937" },
  arrow: { fontSize: 18, color: "#9CA3AF", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#E5E7EB" },
  footerDate: { fontSize: 12, color: "#9CA3AF", marginTop: 8 },
});