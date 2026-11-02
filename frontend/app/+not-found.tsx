import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "../src/components/AppButton";
import { colors, radius, spacing, typography } from "../src/theme";

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

        <Text style={styles.title} accessibilityRole="header">
          No encontramos esta pantalla.
        </Text>
        <Text style={styles.message}>Volvé al inicio para seguir.</Text>

        <View style={styles.button}>
          <AppButton title="Volver al inicio" onPress={() => router.replace("/")} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
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
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    marginBottom: 28,
  },
  errorCode: {
    ...typography.display,
    fontSize: 40,
  },
  title: {
    ...typography.display,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  message: {
    ...typography.body,
    maxWidth: 360,
    textAlign: "center",
    marginBottom: 30,
  },
  button: {
    alignSelf: "center",
    maxWidth: 360,
    width: "100%",
  },
});
