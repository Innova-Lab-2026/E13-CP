// app/tutor/settings/suggest-site.tsx
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

export default function SuggestSiteScreen() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState("configuracion");

  // Estados del formulario
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manejo del envío de la sugerencia con validaciones básicas
  const handleSubmitSuggestion = () => {
    setErrorMessage(null);

    if (!url.trim()) {
      setErrorMessage("Por favor, ingresá la URL del sitio.");
      return;
    }

    if (!reason.trim()) {
      setErrorMessage("Por favor, seleccioná o indicá el motivo de la denuncia.");
      return;
    }

    // Si todo es correcto, navegamos a la pantalla de éxito
    router.push("/tutor/settings/suggest-success");
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
          title="¿Querés sugerir un sitio?" 
          onBackPress={() => router.back()}
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Compartinos la dirección y la evaluaremos</Text>

          {/* Campo URL del sitio */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>URL del sitio</Text>
            <TextInput
              style={styles.textInput}
              placeholder="http://"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              value={url}
              onChangeText={(text) => {
                setUrl(text);
                if (errorMessage) setErrorMessage(null);
              }}
            />
          </View>

          {/* Campo ¿Por qué querés denunciarlo? */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>¿Por qué querés denunciarlo?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Elegí una opción"
              placeholderTextColor="#9CA3AF"
              value={reason}
              onChangeText={(text) => {
                setReason(text);
                if (errorMessage) setErrorMessage(null);
              }}
            />
          </View>

          {/* Campo Información adicional */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Información adicional</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Cóntanos algo más sobre el sitio"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={additionalInfo}
              onChangeText={setAdditionalInfo}
            />
          </View>

          {/* Mensaje de error visual si falta algún dato */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Botón Enviar sugerencia */}
          <View style={styles.buttonContainer}>
            <AppButton
              title="Enviar sugerencia"
              onPress={handleSubmitSuggestion}
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
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
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
  textArea: {
    height: 90,
    textAlignVertical: "top",
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