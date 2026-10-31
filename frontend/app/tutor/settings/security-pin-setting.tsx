// app/tutor/settings/security-pin-setting.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

// Componentes reutilizables reales del proyecto
import AppHeader from "../../../src/components/AppHeader";
import AppButton from "../../../src/components/AppButton";
import BottomNavigation from "../../../src/components/BottomNavigation";

export default function SecurityPinScreen() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState("configuracion");

  // Estados del formulario de PIN
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manejo de la creación del PIN con validaciones
  const handleCreatePin = () => {
    setErrorMessage(null);

    // 1. Validar campos vacíos
    if (!pin || !confirmPin) {
      setErrorMessage("Por favor, completa ambos campos.");
      return;
    }

    // 2. Validar longitud de 4 dígitos
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setErrorMessage("El PIN debe tener exactamente 4 dígitos.");
      return;
    }

    // 3. Validar que coincidan
    if (pin !== confirmPin) {
      setErrorMessage("Los PINs ingresados no coinciden.");
      return;
    }

    // Si todo está bien, navegamos a la pantalla de éxito
    router.push("/tutor/settings/pin-success");
  };

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
        <AppHeader 
          title="Privacidad y seguridad" 
          onBackPress={() => router.back()}
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Creá tu PIN de seguridad</Text>
          <Text style={styles.description}>
            Este PIN protege el acceso a las funciones de vinculación, configuración y control del dispositivo protegido.
          </Text>

          {/* Campo PIN */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>PIN</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ingresá un PIN de 4 dígitos"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={pin}
              onChangeText={(text) => {
                setPin(text);
                if (errorMessage) setErrorMessage(null);
              }}
            />
          </View>

          {/* Campo Repetir PIN */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Repetir PIN</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Reingresá el PIN de 4 dígitos"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={confirmPin}
              onChangeText={(text) => {
                setConfirmPin(text);
                if (errorMessage) setErrorMessage(null);
              }}
            />
          </View>

          {/* Mensaje de error visual si falla alguna validación */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Botón de Creación */}
          <View style={styles.buttonContainer}>
            <AppButton
              title="Crear"
              onPress={handleCreatePin}
            />
          </View>
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
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
  buttonContainer: {
    marginTop: 10,
  },
});