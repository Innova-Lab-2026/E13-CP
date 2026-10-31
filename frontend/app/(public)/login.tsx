import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import AppInput from "../../src/components/AppInput";
import AppButton from "../../src/components/AppButton";
import AppAlert from "../../src/components/AppAlert";
import { loginResponsible } from "../../src/services/auth";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  async function handleLogin() {
    let isValid = true;

    setEmailError("");
    setPasswordError("");
    setFeedback(null);

    if (!email.trim()) {
      setEmailError("El correo electrónico es obligatorio.");
      isValid = false;
    } else if (!email.includes("@")) {
      setEmailError("Ingresá un correo electrónico válido.");
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError("La contraseña es obligatoria.");
      isValid = false;
    }

    if (!isValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginResponsible({ email: email.trim(), password });
      router.replace({
        pathname: "/(main)/(tabs)/(dashboard)",
        params: { name: result.responsible.name },
      });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo iniciar sesión. Inténtalo nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/protege-01.png")}
          style={styles.loteriaImage}
          resizeMode="contain"
        />
      </View>

      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.title}>Te damos la bienvenida</Text>

        <Text style={styles.subtitle}>
          Iniciá sesión para acompañar y proteger{"\n"}a tu familia en el mundo
          digital.
        </Text>
      </View>

      {/* Formulario */}
      <View style={styles.form}>
        {feedback && (
          <AppAlert message={feedback.message} variant={feedback.variant} />
        )}
        <AppInput
          label="Correo electrónico"
          placeholder="Ingresa tu correo electrónico"
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
          placeholder="Ingresa tu contraseña"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setPasswordError("");
          }}
          secureTextEntry
          error={passwordError}
        />

        <Pressable
          style={styles.forgotContainer}
          onPress={() => {
            console.log("Recuperar contraseña");
          }}
        >
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </Pressable>

        <View style={styles.loginButton}>
          <AppButton
            title={isSubmitting ? "Ingresando..." : "Iniciar sesión"}
            onPress={handleLogin}
          />
        </View>

        {/* Separador */}
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>o</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* Google */}
        <Pressable
          style={styles.googleButton}
          onPress={() => {
            console.log("Continuar con Google");
          }}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleText}>Continuar con Google</Text>
        </Pressable>

        {/* Registro */}
        <Text style={styles.registerPrompt}>
          ¿Todavía no tienes una cuenta?
        </Text>

        <Pressable
          style={styles.registerButton}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.registerText}>Crear cuenta</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 52,
  },

  logo: {
    backgroundColor: "#FFD900",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopLeftRadius: 12,
  },
  loteriaImage: {
    width: 125,
    height: 55,
  },

  logoText: {
    color: "#000000",
    fontSize: 17,
    fontWeight: "800",
  },

  header: {
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    color: "#1C1C1C",
    fontSize: 27,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    color: "#777777",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  form: {
    width: "100%",
  },

  forgotContainer: {
    alignItems: "flex-end",
    marginTop: -8,
    marginBottom: 28,
  },

  forgotText: {
    color: "#292929",
    fontSize: 13,
    fontWeight: "600",
  },

  loginButton: {
    marginBottom: 20,
  },

  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },

  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D1D1",
  },

  separatorText: {
    color: "#777777",
    fontSize: 13,
  },

  googleButton: {
    minHeight: 48,
    backgroundColor: "#F7F7F2",
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 18,
  },

  googleIcon: {
    color: "#4285F4",
    fontSize: 21,
    fontWeight: "800",
  },

  googleText: {
    color: "#1C1C1C",
    fontSize: 14,
    fontWeight: "700",
  },

  registerPrompt: {
    color: "#777777",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },

  registerButton: {
    minHeight: 48,
    backgroundColor: "#F7F7F2",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  registerText: {
    color: "#1C1C1C",
    fontSize: 14,
    fontWeight: "700",
  },
});
