import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, TextInput } from "../../../../src/components/ThemedText";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../../../src/components/AppHeader";
import AppButton from "../../../../src/components/AppButton";
import AppAlert from "../../../../src/components/AppAlert";
import {
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_MIN_LENGTH,
  sendFeedback,
} from "../../../../src/services/feedbackService";
import { errorMessage } from "../../../../src/services/api";
import { colors, radius, spacing, typography } from "../../../../src/theme";

/** "Ayudanos a mejorar": la opinión se envía desde la app (POST /api/feedback). */
export default function MejorarScreen() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/(tabs)/configuracion");
    }
  };

  const handleSend = async () => {
    if (sending) return;
    const text = message.trim();
    setSubmitError(null);
    setSent(false);
    if (!text) {
      setMessageError("Por favor, contanos cómo podríamos mejorar.");
      return;
    }
    if (Array.from(text).length < FEEDBACK_MIN_LENGTH) {
      setMessageError(`Escribí al menos ${FEEDBACK_MIN_LENGTH} caracteres.`);
      return;
    }
    setMessageError(null);
    setSending(true);
    try {
      await sendFeedback(text);
      setMessage("");
      setSent(true);
    } catch (error) {
      setSubmitError(
        errorMessage(error, "No pudimos enviar tu opinión. Revisá tu conexión e intentá de nuevo."),
      );
    } finally {
      setSending(false);
    }
  };

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
          <AppHeader title="Ayudanos a mejorar" onBackPress={goBack} />

          <Text style={styles.intro}>Tu opinión nos ayuda a mejorar BA Protege+</Text>

          <View style={styles.field}>
            <Text style={styles.label}>¿Cómo podríamos mejorar?</Text>
            <TextInput
              style={[styles.input, messageError ? styles.inputError : null]}
              placeholder="Escribí tu opinión"
              placeholderTextColor={colors.textSubtle}
              value={message}
              onChangeText={(value) => {
                setMessage(value);
                setMessageError(null);
                setSent(false);
              }}
              multiline
              maxLength={FEEDBACK_MAX_LENGTH}
              textAlignVertical="top"
              editable={!sending}
              accessibilityLabel="¿Cómo podríamos mejorar?"
            />
            {messageError ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {messageError}
              </Text>
            ) : null}
            <Text style={styles.hint}>
              No incluyas datos personales de tus hijos o hijas.
            </Text>
          </View>

          {sent ? (
            <AppAlert
              variant="success"
              message="¡Gracias! Recibimos tu opinión y la vamos a tener en cuenta."
            />
          ) : null}
          {submitError ? <AppAlert variant="error" message={submitError} /> : null}

          <View style={styles.actions}>
            <AppButton title="Enviar opinión" onPress={handleSend} loading={sending} />
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
    marginBottom: spacing.xxl,
  },
  field: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 15,
    color: colors.text,
  },
  input: {
    minHeight: 52,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.field,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actions: {
    marginTop: "auto",
    paddingTop: spacing.lg,
  },
});
