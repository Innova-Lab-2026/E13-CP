// app/tutor/settings/delete-account.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Modal, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../../src/components/AppHeader";
import AppButton from "../../../src/components/AppButton";
import BottomNavigation from "../../../src/components/BottomNavigation";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState("configuracion");
  const [modalVisible, setModalVisible] = useState(false);
  const [deletePin, setDeletePin] = useState("");

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
        <AppHeader title="Eliminar cuenta" onBackPress={() => router.back()} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>¿Querés eliminar tu cuenta?</Text>
          <Text style={styles.description}>
            Al eliminar tu cuenta se eliminarán tus datos y dejarás de administrar los dispositivos vinculados.
          </Text>
          <Text style={styles.warning}>Esta acción no se puede deshacer</Text>

          <View style={styles.buttonContainer}>
            <AppButton title="Eliminar cuenta" onPress={() => setModalVisible(true)} />
          </View>
        </ScrollView>

        {/* Modal de confirmación con PIN */}
        <Modal animationType="fade" transparent={true} visible={modalVisible}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>¿Estás seguro que querés eliminar tu cuenta?</Text>
              <Text style={styles.modalLabel}>Ingresá tu PIN para confirmar</Text>

              <TextInput
                style={styles.textInput}
                placeholder="Escribí tu PIN de 4 dígitos"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                value={deletePin}
                onChangeText={setDeletePin}
              />

              <View style={styles.modalButtons}>
                <View style={styles.modalBtnWrapper}>
                  <AppButton title="Eliminar" onPress={() => { setModalVisible(false); router.push("/"); }} />
                </View>
                <View style={styles.modalBtnWrapper}>
                  <AppButton title="Cancelar" onPress={() => setModalVisible(false)} />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
      <BottomNavigation activeTab={currentTab} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  scrollContent: { paddingVertical: 10, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold", color: "#1F2937", marginBottom: 12, textAlign: "center" },
  description: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20, marginBottom: 16 },
  warning: { fontSize: 14, fontWeight: "600", color: "#EF4444", marginBottom: 30, textAlign: "center" },
  buttonContainer: { width: "100%", marginTop: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: { fontSize: 16, fontWeight: "bold", color: "#1F2937", textAlign: "center", marginBottom: 12 },
  modalLabel: { fontSize: 13, color: "#6B7280", alignSelf: "flex-start", marginBottom: 6, fontWeight: "500" },
  textInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
    marginBottom: 16,
  },
  modalButtons: { width: "100%", gap: 10 },
  modalBtnWrapper: { width: "100%" },
});