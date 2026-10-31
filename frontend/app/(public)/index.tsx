import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function WelcomeScreen() {
  const router = useRouter();

  const handleContinue = () => {
    router.push("/onboarding");
  };

  return (
    <View style={styles.container}>
      {/* Logotipos */}
      <View style={styles.logosContainer}>
        <Image
          source={require("../../assets/protege-01.png")}
          style={styles.loteriaImage}
          resizeMode="contain"
        />

        <Image
          source={require("../../assets/logo-loteria-01.png")}
          style={styles.loteriaImage}
          resizeMode="contain"
        />
      </View>

      {/* Área interactiva de bienvenida */}
      <Pressable
        onPress={handleContinue}
        accessibilityRole="button"
        accessibilityLabel="Continuar al primer onboarding"
        style={({ pressed }) => [
          styles.welcomeContainer,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.title}>¡Bienvenido/a!</Text>

        <Text style={styles.description}>
          Acompañá y protegé a tu familia{"\n"}
          en el mundo digital.
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  logosContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    marginBottom: 68,
  },

  baLogo: {
    backgroundColor: "#FFD900",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  baLogoText: {
    color: "#000000",
    fontSize: 17,
    fontWeight: "800",
  },

  loteriaImage: {
  width: 125,
  height: 55,
},

  loteriaLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  pin: {
    color: "#292929",
    fontSize: 28,
  },

  loteriaTitle: {
    color: "#292929",
    fontSize: 18,
    fontWeight: "800",
  },

  loteriaSubtitle: {
    color: "#292929",
    fontSize: 10,
  },

  welcomeContainer: {
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
  },

  pressed: {
    opacity: 0.65,
  },

  title: {
    color: "#1C1C1C",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },

  description: {
    color: "#888888",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
