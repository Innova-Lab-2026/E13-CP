import { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import AppInput from "../../src/components/AppInput";
import AppButton from "../../src/components/AppButton";
import AppAlert from "../../src/components/AppAlert";
import { registerResponsible } from "../../src/services/auth";

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [nameError, setNameError] = useState("");
  const [lastnameError, setLastnameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  async function handleRegister() {
    let isValid = true;

    // Limpiar errores previos
    setNameError("");
    setLastnameError("");
    setEmailError("");
    setPhoneError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setFeedback(null);

    // 1. Validar Nombre
    if (!name.trim()) {
      setNameError("El nombre es obligatorio.");
      isValid = false;
    } else if (name.trim().length < 2) {
      setNameError("El nombre debe tener al menos 2 caracteres.");
      isValid = false;
    }

    // 2. Validar Apellido
    if (!lastName.trim()) {
      setLastnameError("El apellido es obligatorio.");
      isValid = false;
    } else if (lastName.trim().length < 2) {
      setLastnameError("El apellido debe tener al menos 2 caracteres.");
      isValid = false;
    }

    // 3. Validar Correo Electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError("El correo electrónico es obligatorio.");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Ingresá un correo electrónico válido.");
      isValid = false;
    }

    // 4. Validar Teléfono
    const phoneRegex = /^[0-9+\s()-]{7,15}$/;
    if (!phone.trim()) {
      setPhoneError("El teléfono es obligatorio.");
      isValid = false;
    } else if (!phoneRegex.test(phone)) {
      setPhoneError("Ingresá un número de teléfono válido.");
      isValid = false;
    }

    // 5. Validar Contraseña principal
    if (!password.trim()) {
      setPasswordError("La contraseña es obligatoria.");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres.");
      isValid = false;
    }

    // 6. Validar Confirmación de Contraseña (¡NUEVO!)
    if (!confirmPassword.trim()) {
      setConfirmPasswordError("Debes confirmar la contraseña.");
      isValid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError("Las contraseñas no coinciden.");
      isValid = false;
    }

    if (!isValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Aquí puedes enviar los datos al backend
      const result = await registerResponsible({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      console.log("Validación y registro en backend exitosos");

      // Redirigir al dashboard llevando el nombre correcto que devolvió el backend
      router.replace({
        pathname: "/(main)/(tabs)/(dashboard)",
        params: { name: result.responsible.name },
      });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo registrar la cuenta. Inténtalo nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
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
        <Text style={styles.title}>Crear cuenta</Text>

        <Text style={styles.subtitle}>
          Completa tus datos para crear tu cuenta y comensa a {"\n"} proteger a
          tu familia.
        </Text>
      </View>
      {/* Formulario */}
      <View style={styles.form}>
        {feedback && (
          <AppAlert message={feedback.message} variant={feedback.variant} />
        )}
        <AppInput
          label="Nombre"
          placeholder="Ingresa tu nombre"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setNameError("");
          }}
          error={nameError}
        />

        <AppInput
          label="Apellido"
          placeholder="Ingresa tu apellido"
          value={lastName}
          onChangeText={(text) => {
            setLastName(text);
            setLastnameError("");
          }}
          error={lastnameError}
        />
        <AppInput
          label="Mail"
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
          label="Teléfono"
          placeholder="Ingresa tu teléfono"
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            setPhoneError("");
          }}
          error={phoneError}
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

        <AppInput
          label=" Confirmar Contraseña"
          placeholder="Ingresa tu contraseña"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setConfirmPasswordError("");
          }}
          secureTextEntry
          error={confirmPasswordError}
        />

        <Pressable
          style={styles.forgotContainer}
          onPress={() => router.push("/(public)/login")}
        >
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </Pressable>

        <View style={styles.loginButton}>
          <AppButton
            title={isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            onPress={handleRegister}
          />
        </View>

        {/* Registro */}

        <Pressable
          style={styles.forgotContainer}
          onPress={() => router.push("/(public)/login")}
        >
          <Text style={styles.registerPrompt}>¿Ya tienes una cuenta?</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    // paddingHorizontal: 20,
    // paddingTop: 60,
    // paddingBottom: 24,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 60, // <- ¡Esto empuja todo hacia arriba y te deja ver y clickear el botón sin drama!
  },
});