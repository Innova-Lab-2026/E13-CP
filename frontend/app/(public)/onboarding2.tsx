import { StatusBar } from "expo-status-bar";
import AppButton from "../../src/components/AppButton";
import { router } from "expo-router";

import {
  ImageBackground,
  StyleSheet,
  Text,
  Image,
  View,
  Pressable,
} from "react-native";

export default function Onboarding() {
  return (
    <ImageBackground
      source={require("../../assets/onboarding-bg-01.png")} // ← Ruta de tu imagen
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar style="dark" />

      {/* Logo */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/protege-01.png")}
          style={styles.loteriaImage}
          resizeMode="contain"
        />

        {/* Indicadores del onboarding */}
        <View style={styles.pagination}>
          <View style={styles.activeDot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      {/* Tarjeta informativa */}
      <View style={styles.card}>
        <Text style={styles.title}>Las apuestas online no son un juego</Text>

        <Text style={styles.description}>
          Apostar por internet implica arriesgar dinero y puede generar
          pérdidas. BA Protege+ bloquea estas páginas para ayudarte a evitar
          esos riesgos.
        </Text>
      </View>

      {/* Botones */}
      <View style={styles.footer}>
        <Pressable>
          <AppButton
            variant="tertiary"
            title="Omitir"
            onPress={() => router.replace("/")}
          />
        </Pressable>

        <Pressable>
          <AppButton title="Continuar" onPress={() => router.push("/login")} />
        </Pressable>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 65,
    paddingBottom: 24,
    backgroundColor: "#F8F5E8",
  },
  header: {
    alignItems: "center",
  },
  logo: {
    backgroundColor: "#FFD500",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  loteriaImage: {
    width: 125,
    height: 55,
  },
  logoText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "800",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 22,
  },
  activeDot: {
    width: 24,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#FFD500",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFF",
  },
  card: {
    backgroundColor: "#FFFFF5",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
  },
  title: {
    color: "#171717",
    fontSize: 27,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 14,
  },
  description: {
    color: "#686868",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  footer: {
    gap: 12,
  },
  skipButton: {
    minHeight: 48,
    backgroundColor: "#FFFFF5",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  skipText: {
    color: "#171717",
    fontSize: 14,
    fontWeight: "700",
  },
  continueButton: {
    minHeight: 48,
    backgroundColor: "#FFD500",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  continueText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
  },
});
