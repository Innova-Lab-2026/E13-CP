// app/tutor/settings/feedback.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../../src/components/AppHeader";
import AppButton from "../../../src/components/AppButton";
import BottomNavigation from "../../../src/components/BottomNavigation";

export default function FeedbackScreen() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState("configuracion");
  const [opinion, setOpinion] = useState("");

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
        <AppHeader title="Ayúdanos a mejorar" onBackPress={() => router.back()} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Tu opinión nos ayuda a mejorar BA Protege+</Text>
          <Text style={styles.label}>¿Cómo podríamos mejorar?</Text>
          
          <TextInput
            style={styles.textArea}
            placeholder="Escribe tu opinión"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={5}
            value={opinion}
            onChangeText={setOpinion}
          />

          <View style={styles.buttonContainer}>
            <AppButton title="Enviar opinión" onPress={() => router.push("/tutor/settings/indexSettings")} />
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
  title: { fontSize: 18, fontWeight: "bold", color: "#1F2937", textAlign: "center", marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  textArea: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
    height: 120,
    textAlignVertical: "top",
    marginBottom: 24,
  },
  buttonContainer: { marginTop: 10 },
});