import { useEffect } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { Text } from "../../src/components/ThemedText";
import { Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "../../src/components/AppButton";
import LinkWithCodeEntry from "../../src/components/LinkWithCodeEntry";
import { useSession } from "../../src/services/session";
import {
  acknowledgeDeviceSessionEnd,
  useDeviceSession,
} from "../../src/services/deviceSession";
import { homeRouteFor } from "../../src/navigation";
import { colors, spacing, typography } from "../../src/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const { session, loading } = useSession();
  const { deviceSession, loading: deviceLoading } = useDeviceSession();
  const ready = !loading && !deviceLoading;

  // Si se llegó acá al salir del modo protegido, las guardias ya cumplieron.
  useEffect(() => {
    acknowledgeDeviceSessionEnd();
  }, []);

  // Con sesión guardada (de la persona adulta o de un celular vinculado con un
  // código) se salta la bienvenida y se va a la pantalla que corresponde.
  if (ready && (session || deviceSession)) {
    return <Redirect href={homeRouteFor(session, deviceSession)} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.logos}>
          <Image
            source={require("../../assets/protege-01.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="BA Protege+"
          />
          <Image
            source={require("../../assets/logo-loteria-01.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Lotería de la Ciudad de Buenos Aires"
          />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Bienvenido/a
        </Text>
        <Text style={styles.description}>
          Acompañá y protegé a tu familia{"\n"}en el mundo digital.
        </Text>
      </View>

      <View style={styles.footer}>
        {!ready ? (
          <ActivityIndicator color={colors.text} accessibilityLabel="Cargando" />
        ) : (
          <>
            <AppButton
              title="Comenzar"
              accessibilityLabel="Comenzar y conocer la aplicación"
              onPress={() => router.push("/onboarding")}
            />
            <AppButton
              variant="secondary"
              title="Ya tengo una cuenta"
              accessibilityLabel="Ya tengo una cuenta, ir a iniciar sesión"
              onPress={() => router.push("/login")}
            />
            <LinkWithCodeEntry onPress={() => router.push("/vincular")} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logos: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    marginBottom: 64,
  },
  logo: {
    width: 125,
    height: 55,
  },
  title: {
    ...typography.display,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    textAlign: "center",
  },
  footer: {
    gap: spacing.md,
    minHeight: 108,
    justifyContent: "flex-end",
  },
});
