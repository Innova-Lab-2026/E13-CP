import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../../../../src/components/AppHeader";
import AppButton from "../../../../src/components/AppButton";
import AppAlert from "../../../../src/components/AppAlert";
import {
  suggestSite,
  SUGGESTION_INFO_MAX_LENGTH,
  SUGGESTION_REASON_TEXT_MAX_LENGTH,
} from "../../../../src/services/blocklistService";
import { errorMessage } from "../../../../src/services/api";
import { colors, radius, spacing } from "../../../../src/theme";

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
};

/** Campo suelto sobre el fondo, como en "Sugerencia de sitio" del Figma. */
function Field({ label, error, style, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel={label}
        {...inputProps}
        style={[styles.input, inputProps.multiline && styles.inputMultiline, error ? styles.inputError : null, style]}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Sugerir un sitio: la persona adulta propone un sitio para que LOTBA lo evalúe. */
export default function SugerirSitioScreen() {
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState("");
  const [info, setInfo] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/(tabs)/configuracion");
    }
  };

  const handleSend = async () => {
    if (sending) return;
    setSubmitError(null);

    // Acá solo se pide que no esté vacía: el backend valida la dirección y acepta
    // también dominios con tildes o eñes (los pasa a punycode). Su 400 se muestra abajo.
    const cleanUrl = url.trim();
    const cleanMotivo = motivo.trim();
    let valid = true;
    if (!cleanUrl || /^https?:\/\/$/i.test(cleanUrl)) {
      setUrlError("Por favor, ingresá la URL del sitio.");
      valid = false;
    }
    if (!cleanMotivo) {
      setMotivoError("Por favor, contanos por qué querés denunciarlo.");
      valid = false;
    }
    if (!valid) return;

    setSending(true);
    try {
      const extra = info.trim();
      // "otro" acompaña al texto para que un backend anterior al motivo libre también lo acepte.
      await suggestSite({
        url: cleanUrl,
        motivo: "otro",
        motivoTexto: cleanMotivo,
        ...(extra ? { info: extra } : null),
      });
      setSent(true);
    } catch (error) {
      setSubmitError(
        errorMessage(error, "No pudimos enviar la sugerencia. Revisá tu conexión e intentá de nuevo."),
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.successTop}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            hitSlop={12}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.successContainer}>
          <View
            style={styles.successIcon}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Ionicons name="checkmark-circle-outline" size={64} color={colors.success} />
          </View>
          <View style={styles.successBody}>
            <Text style={styles.successTitle} accessibilityRole="header">
              ¡Sugerencia enviada!
            </Text>
            <Text style={styles.successText}>
              Gracias por ayudarnos a detectar sitios de apuestas ilegales. LOTBA evaluará la
              información proporcionada.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppHeader title="¿Querés sugerir un sitio?" onBackPress={goBack} />
          <Text style={styles.intro}>Compartinos la dirección y la evaluaremos</Text>

          <Field
            label="URL del sitio"
            placeholder="http://"
            value={url}
            onChangeText={(text) => {
              setUrl(text);
              setUrlError("");
            }}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            error={urlError}
            editable={!sending}
          />

          <Field
            label="¿Por qué querés denunciarlo?"
            placeholder="Escribí un motivo"
            value={motivo}
            onChangeText={(text) => {
              setMotivo(text);
              setMotivoError("");
            }}
            multiline
            maxLength={SUGGESTION_REASON_TEXT_MAX_LENGTH}
            textAlignVertical="top"
            error={motivoError}
            editable={!sending}
          />

          <Field
            label="Información adicional"
            placeholder="Contanos algo más sobre el sitio"
            value={info}
            onChangeText={setInfo}
            multiline
            maxLength={SUGGESTION_INFO_MAX_LENGTH}
            textAlignVertical="top"
            editable={!sending}
          />

          {submitError ? <AppAlert message={submitError} variant="error" /> : null}

          <View style={styles.actions}>
            <AppButton title="Enviar sugerencia" onPress={handleSend} loading={sending} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  intro: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
  },
  field: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  inputMultiline: {
    minHeight: 52,
    maxHeight: 160,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  actions: {
    marginTop: "auto",
    paddingTop: spacing.lg,
  },
  successTop: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  closeButton: {
    padding: spacing.xs,
  },
  successContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.xxxl * 2,
    paddingBottom: spacing.xxxl,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxxl * 2,
  },
  successBody: {
    width: "100%",
    maxWidth: 300,
    gap: spacing.sm,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  successText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
});
