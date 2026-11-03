import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AppInput from "../../src/components/AppInput";
import AppButton from "../../src/components/AppButton";
import AppAlert from "../../src/components/AppAlert";
import GoogleButton from "../../src/components/GoogleButton";
import { loginResponsible } from "../../src/services/auth";
import {
  startGoogleLogin,
  useResetOnBackForwardRestore,
} from "../../src/services/googleAuth";
import { loadSession } from "../../src/services/session";
import { errorMessage } from "../../src/services/api";
import { homeRouteFor } from "../../src/navigation";
import { colors, spacing, typography } from "../../src/theme";

type Feedback = { message: string; variant: "error" | "info" };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useResetOnBackForwardRestore(() => setIsGoogleSubmitting(false));

  async function handleGoogleLogin() {
    if (isSubmitting || isGoogleSubmitting) return;

    setFeedback(null);
    setIsGoogleSubmitting(true);
    try {
      const result = await startGoogleLogin();
      // En la web la página ya se está yendo a Google: el botón sigue cargando.
      if (result.type === "redirect") return;
      // En Android la vuelta también puede abrir la ruta /auth/google encima de
      // esta pantalla; en ese caso es esa ruta la que sigue la navegación.
      if (result.type === "success" && navigation.isFocused()) {
        router.replace(homeRouteFor(await loadSession()));
        return;
      }
      setIsGoogleSubmitting(false);
    } catch (error) {
      setFeedback({
        message: errorMessage(
          error,
          "No pudimos iniciar sesión con Google. Revisá tu conexión e intentá de nuevo.",
        ),
        variant: "error",
      });
      setIsGoogleSubmitting(false);
    }
  }

  async function handleLogin() {
    if (isSubmitting || isGoogleSubmitting) return;

    const trimmedEmail = email.trim();
    let isValid = true;
    setEmailError("");
    setPasswordError("");
    setFeedback(null);

    if (!trimmedEmail) {
      setEmailError("Ingresá tu correo electrónico.");
      isValid = false;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError("Ingresá un correo electrónico válido.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Ingresá tu contraseña.");
      isValid = false;
    }

    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await loginResponsible({ email: trimmedEmail, password });
      router.replace(homeRouteFor(await loadSession()));
    } catch (error) {
      setFeedback({
        message: errorMessage(
          error,
          "No pudimos iniciar sesión. Revisá tu conexión e intentá de nuevo.",
        ),
        variant: "error",
      });
      setIsSubmitting(false);
    }
  }

  function handleForgotPassword() {
    setFeedback({
      message:
        "La recuperación de contraseña todavía no está disponible en la app. Estamos trabajando para sumarla.",
      variant: "info",
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/protege-01.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="BA Protege+"
            />
          </View>

          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Te damos la bienvenida
            </Text>
            <Text style={styles.subtitle}>
              Iniciá sesión para acompañar y proteger{"\n"}a tu familia en el
              mundo digital.
            </Text>
          </View>

          {feedback ? (
            <AppAlert message={feedback.message} variant={feedback.variant} />
          ) : null}

          <AppInput
            label="Correo electrónico"
            placeholder="Ingresá tu correo electrónico"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError("");
            }}
            keyboardType="email-address"
            error={emailError}
          />

          <AppInput
            label="Contraseña"
            placeholder="Ingresá tu contraseña"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError("");
            }}
            secureTextEntry
            error={passwordError}
          />

          <Pressable
            style={styles.forgot}
            onPress={handleForgotPassword}
            accessibilityRole="button"
            accessibilityLabel="¿Olvidaste tu contraseña?"
            hitSlop={8}
          >
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>

          <View style={styles.actions}>
            <AppButton
              title="Iniciar sesión"
              onPress={handleLogin}
              loading={isSubmitting}
              disabled={isGoogleSubmitting}
            />

            <GoogleButton
              withSeparator
              onPress={handleGoogleLogin}
              loading={isGoogleSubmitting}
              disabled={isSubmitting}
            />

            <Text style={styles.registerPrompt}>¿Todavía no tenés una cuenta?</Text>
            <AppButton
              variant="secondary"
              title="Crear cuenta"
              onPress={() => router.push("/register")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 125,
    height: 55,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.display,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: "center",
  },
  forgot: {
    alignSelf: "flex-end",
    marginTop: -spacing.xs,
    marginBottom: spacing.xxl,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  actions: {
    marginTop: "auto",
    gap: spacing.lg,
  },
  registerPrompt: {
    ...typography.body,
    textAlign: "center",
    marginBottom: -spacing.sm,
  },
});
