import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AppAlert from "../../../src/components/AppAlert";
import AppButton from "../../../src/components/AppButton";
import ScreenState from "../../../src/components/ScreenState";
import { completeGoogleLogin, GoogleLoginError } from "../../../src/services/googleAuth";
import { loadSession } from "../../../src/services/session";
import { errorMessage } from "../../../src/services/api";
import { homeRouteFor } from "../../../src/navigation";
import { colors, spacing, typography } from "../../../src/theme";

type Feedback = { message: string; variant: "error" | "info" };

type CallbackParams = {
  code?: string | string[];
  state?: string | string[];
  error?: string | string[];
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Vuelta del ingreso con Google (/auth/google; en la web, /app/auth/google).
 * El backend redirige acá con `code` y `state`, o con `error` si se canceló.
 */
export default function GoogleAuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<CallbackParams>();
  const code = first(params.code);
  const state = first(params.state);
  const oauthError = first(params.error);

  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let active = true;
    setFeedback(null);

    completeGoogleLogin({ code, state, error: oauthError })
      .then(async () => {
        const session = await loadSession();
        if (!active) return;
        // En Android el deep link apila esta ruta encima de login: se vacía la
        // pila para que "Atrás" no vuelva al formulario con la sesión iniciada.
        if (router.canDismiss()) router.dismissAll();
        router.replace(homeRouteFor(session));
      })
      .catch((error) => {
        if (!active) return;
        setFeedback({
          message: errorMessage(
            error,
            "No pudimos iniciar sesión con Google. Revisá tu conexión e intentá de nuevo.",
          ),
          variant: error instanceof GoogleLoginError && error.cancelled ? "info" : "error",
        });
      });

    return () => {
      active = false;
    };
  }, [code, state, oauthError, router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../../assets/protege-01.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="BA Protege+"
          />
        </View>

        {feedback ? (
          <View style={styles.content}>
            <Text style={styles.title} accessibilityRole="header">
              No pudimos entrar con Google
            </Text>
            <AppAlert message={feedback.message} variant={feedback.variant} />
            <AppButton
              title="Volver a iniciar sesión"
              onPress={() => router.replace("/login")}
            />
          </View>
        ) : (
          <View style={styles.content} accessibilityLiveRegion="polite">
            <ScreenState loading />
            <Text style={styles.subtitle}>Entrando con Google…</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 125,
    height: 55,
  },
  content: {
    gap: spacing.md,
  },
  title: {
    ...typography.display,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    textAlign: "center",
  },
});
