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
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AppInput from "../../src/components/AppInput";
import AppButton from "../../src/components/AppButton";
import AppAlert from "../../src/components/AppAlert";
import { registerResponsible } from "../../src/services/auth";
import { errorMessage } from "../../src/services/api";
import { isValidPhone } from "../../src/utils/phone";
import { colors, spacing, typography } from "../../src/theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


type Errors = Partial<
  Record<"name" | "lastName" | "email" | "phone" | "password" | "confirm", string>
>;

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function clearError(field: keyof Errors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate(): Errors {
    const next: Errors = {};

    if (name.trim().length < 2) {
      next.name = name.trim()
        ? "El nombre tiene que tener al menos 2 caracteres."
        : "Ingresá tu nombre.";
    }
    if (lastName.trim().length < 2) {
      next.lastName = lastName.trim()
        ? "El apellido tiene que tener al menos 2 caracteres."
        : "Ingresá tu apellido.";
    }
    if (!email.trim()) {
      next.email = "Ingresá tu correo electrónico.";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      next.email = "Ingresá un correo electrónico válido.";
    }
    if (!phone.trim()) {
      next.phone = "Ingresá tu teléfono.";
    } else if (!isValidPhone(phone)) {
      next.phone = "Ingresá un número de teléfono válido.";
    }
    if (!password) {
      next.password = "Ingresá una contraseña.";
    } else if (password.length < 6) {
      next.password = "La contraseña tiene que tener al menos 6 caracteres.";
    }
    if (!confirmPassword) {
      next.confirm = "Repetí la contraseña.";
    } else if (confirmPassword !== password) {
      next.confirm = "Las contraseñas no coinciden.";
    }

    return next;
  }

  async function handleRegister() {
    if (isSubmitting) return;

    setSubmitError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await registerResponsible({
        name: `${name.trim()} ${lastName.trim()}`,
        email: email.trim(),
        password,
        telefono: phone.trim(),
      });
      router.replace("/mode");
    } catch (error) {
      setSubmitError(
        errorMessage(
          error,
          "No pudimos crear tu cuenta. Revisá tu conexión e intentá de nuevo.",
        ),
      );
      setIsSubmitting(false);
    }
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
              Crear cuenta
            </Text>
            <Text style={styles.subtitle}>
              Completá tus datos para crear tu cuenta y empezar a proteger a tu
              familia.
            </Text>
          </View>

          {submitError ? <AppAlert message={submitError} variant="error" /> : null}

          <AppInput
            label="Nombre"
            placeholder="Ingresá tu nombre"
            value={name}
            onChangeText={(text) => {
              setName(text);
              clearError("name");
            }}
            autoCapitalize="words"
            error={errors.name}
          />
          <AppInput
            label="Apellido"
            placeholder="Ingresá tu apellido"
            value={lastName}
            onChangeText={(text) => {
              setLastName(text);
              clearError("lastName");
            }}
            autoCapitalize="words"
            error={errors.lastName}
          />
          <AppInput
            label="Correo electrónico"
            placeholder="Ingresá tu correo electrónico"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearError("email");
            }}
            keyboardType="email-address"
            error={errors.email}
          />
          <AppInput
            label="Teléfono"
            placeholder="Ingresá tu teléfono"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              clearError("phone");
            }}
            keyboardType="phone-pad"
            error={errors.phone}
          />
          <AppInput
            label="Contraseña"
            placeholder="Al menos 6 caracteres"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearError("password");
            }}
            secureTextEntry
            error={errors.password}
          />
          <AppInput
            label="Confirmar contraseña"
            placeholder="Repetí tu contraseña"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              clearError("confirm");
            }}
            secureTextEntry
            error={errors.confirm}
          />

          <View style={styles.actions}>
            <AppButton
              title="Crear cuenta"
              onPress={handleRegister}
              loading={isSubmitting}
            />

            <Pressable
              style={styles.loginLink}
              onPress={() => router.dismissTo("/login")}
              accessibilityRole="link"
              accessibilityLabel="¿Ya tenés una cuenta? Iniciá sesión"
              hitSlop={8}
            >
              <Text style={styles.loginPrompt}>
                ¿Ya tenés una cuenta?{" "}
                <Text style={styles.loginLinkText}>Iniciá sesión</Text>
              </Text>
            </Pressable>
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
  actions: {
    marginTop: spacing.sm,
    gap: spacing.lg,
  },
  loginLink: {
    alignSelf: "center",
    paddingVertical: spacing.sm,
  },
  loginPrompt: {
    ...typography.body,
    textAlign: "center",
  },
  loginLinkText: {
    fontWeight: "700",
    color: colors.text,
    textDecorationLine: "underline",
  },
});
