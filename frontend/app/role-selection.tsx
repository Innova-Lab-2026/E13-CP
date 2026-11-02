// app/role-selection.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "../src/components/AppButton"; 

export function RoleSelectionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        {/* Logotipos */}
        <View style={styles.logosContainer}>
          <Image
            source={require("../assets/protege-01.png")}
            style={styles.loteriaImage}
            resizeMode="contain"
          />

          <Image
            source={require("../assets/logo-loteria-01.png")}
            style={styles.loteriaImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.instruction}>
            Elegí cómo querés usar este dispositivo en esta sesión:
          </Text>

          {/* Tarjeta Tutor */}
          <Pressable 
            style={[styles.roleCard, styles.tutorCard]} 
            onPress={() => router.push("(main)/(tabs)/(dispositivos)/add-device")}//antes habia puesto /tutor/add-device
          >
            <Text style={styles.cardIcon}>🛡️</Text>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Modo Tutor</Text>
              <Text style={styles.cardDescription}>
                Gestioná dispositivos y generá PINs de vinculación.
              </Text>
            </View>
          </Pressable>

          {/* Tarjeta Menor */}
          <Pressable 
            style={[styles.roleCard, styles.menorCard]} 
            //onPress={() => router.push("(main)/(tabs)/(dispositivos)/link-device")}
            onPress={() => router.push("/menor/link")}

          >
            <Text style={styles.cardIcon}>📱</Text>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Modo Menor</Text>
              <Text style={styles.cardDescription}>
                Ingresá el PIN provisto por tu tutor para vincular el teléfono.
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Botón de salida reutilizando AppButton con variante tertiary */}
        <AppButton
          title="Volver a Inicio"
          variant="tertiary"
          onPress={() => router.push("(main)/(tabs)/(dashboard)")}
        />
      </View>
    </SafeAreaView>
  );
}

export default RoleSelectionScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  instruction: {
    fontSize: 15,
    color: "#4B5563",
    marginBottom: 24,
    textAlign: "center",
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  tutorCard: {
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF",
  },
  menorCard: {
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  logosContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    marginTop: 15,
    marginBottom: 30,
  },
  loteriaImage: {
    width: 125,
    height: 55,
  },
});