// app/menor/link.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

// Importamos nuestros componentes reutilizables del UI Kit
import AppHeader from "../../src/components/AppHeader";
import AppInput from "../../src/components/AppInput";
import AppButton from "../../src/components/AppButton";
import AppAlert from "../../src/components/AppAlert";

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000")
).replace(/\/+$/, "");

export default function LinkDeviceScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleConfirmLink = async () => {
    const cleanPin = pin.trim();
    if (!cleanPin || cleanPin.length < 4) {
      setErrorMessage("Por favor, ingresa un PIN válido de 4 dígitos.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(`${API_BASE_URL}/api/devices/confirm-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin: cleanPin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "PIN inválido o expirado.");
      }

      // ¡Vinculación exitosa! Redirigimos a la pantalla de modo protegido
      router.replace("/menor/protected");
    } catch (error: any) {
      setErrorMessage(
        error.message || "Ocurrió un error al conectar con el servidor."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.card}>
          <AppHeader title="Vinculación de Dispositivo" />

          <Text style={styles.instructions}>
            Ingresá el PIN de 4 dígitos que generó el tutor desde su panel para
            proteger este dispositivo.
          </Text>

          <AppInput
            label="PIN de Vinculación"
            placeholder="Ej: 4829"
            keyboardType="numeric"
            maxLength={4}
            value={pin}
            onChangeText={(text) => {
              setPin(text);
              setErrorMessage("");
            }}
          />

          {errorMessage ? (
            <AppAlert message={errorMessage} variant="error" />
          ) : null}

          <AppButton
            title={loading ? "Vinculando..." : "Vincular Dispositivo"}
            variant="primary"
            onPress={handleConfirmLink}
            disabled={loading}
          />
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    width: "100%",
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  instructions: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
});