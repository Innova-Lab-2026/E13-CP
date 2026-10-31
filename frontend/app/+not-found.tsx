import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Image
          source={require("../assets/protege-01.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="BA Protege+"
        />

        <View style={styles.errorBadge}>
          <Text style={styles.errorCode}>404</Text>
        </View>

        <Text style={styles.title}>¡Ups! Esta página se perdió en el camino.</Text>
        <Text style={styles.message}>
          La dirección que buscás no existe o fue movida. En BA Protege+
          estamos para acompañarte y cuidar a tu familia en el mundo digital.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/")}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </Pressable>
      </View>
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  logo: {
    width: 150,
    height: 66,
    marginBottom: 44,
  },
  errorBadge: {
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 66,
    backgroundColor: "#FFF7CC",
    marginBottom: 28,
  },
  errorCode: {
    color: "#1C1C1C",
    fontSize: 40,
    fontWeight: "800",
  },
  title: {
    color: "#1C1C1C",
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 32,
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    maxWidth: 360,
    color: "#777777",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 30,
  },
  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    maxWidth: 360,
    borderRadius: 11,
    backgroundColor: "#FFD900",
    paddingHorizontal: 24,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: "#1C1C1C",
    fontSize: 15,
    fontWeight: "700",
  },
});
