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
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../../../../src/components/AppHeader";
import AppInput from "../../../../src/components/AppInput";
import AppButton from "../../../../src/components/AppButton";
import AppAlert from "../../../../src/components/AppAlert";
import {
  suggestSite,
  SUGGESTION_INFO_MAX_LENGTH,
  SUGGESTION_REASONS,
  type SuggestionReason,
} from "../../../../src/services/blocklistService";
import { errorMessage } from "../../../../src/services/api";
import { colors, radius, shadow, spacing, typography } from "../../../../src/theme";

/** Sugerir un sitio: la persona adulta propone un sitio para que se revise con LOTBA. */
export default function SugerirSitioScreen() {
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [motivo, setMotivo] = useState<SuggestionReason | null>(null);
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
    let valid = true;
    if (!url.trim()) {
      setUrlError("Por favor, ingresá la URL del sitio.");
      valid = false;
    }
    if (!motivo) {
      setMotivoError("Por favor, seleccioná el motivo.");
      valid = false;
    }
    if (!valid || !motivo) return;

    setSending(true);
    try {
      const extra = info.trim();
      await suggestSite({ url: url.trim(), motivo, ...(extra ? { info: extra } : null) });
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
        <ScrollView contentContainerStyle={[styles.container, styles.centered]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color={colors.successText} />
          </View>
          <Text style={styles.successTitle} accessibilityRole="header">
            ¡Sugerencia enviada!
          </Text>
          <Text style={styles.successText}>Gracias. La revisamos con LOTBA.</Text>
          <View style={styles.fullWidth}>
            <AppButton title="Volver" onPress={goBack} />
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

          <View style={styles.card}>
            <AppInput
              label="URL del sitio"
              placeholder="sitio.com.ar"
              value={url}
              onChangeText={(text) => {
                setUrl(text);
                setUrlError("");
              }}
              keyboardType="url"
              autoCorrect={false}
              error={urlError}
              editable={!sending}
            />

            <Text style={styles.label}>¿Por qué querés denunciarlo?</Text>
            <View style={styles.options} accessibilityRole="radiogroup">
              {SUGGESTION_REASONS.map((reason) => {
                const selected = motivo === reason.value;
                return (
                  <Pressable
                    key={reason.value}
                    onPress={() => {
                      setMotivo(reason.value);
                      setMotivoError("");
                    }}
                    disabled={sending}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityLabel={reason.label}
                    accessibilityState={{ checked: selected, disabled: sending }}
                  >
                    <Text style={styles.optionText}>{reason.label}</Text>
                    <Ionicons
                      name={selected ? "radio-button-on" : "radio-button-off"}
                      size={22}
                      color={selected ? colors.text : colors.borderStrong}
                    />
                  </Pressable>
                );
              })}
            </View>
            {motivoError ? <Text style={styles.error}>{motivoError}</Text> : null}

            <Text style={[styles.label, styles.infoLabel]}>Información adicional</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Opcional: contanos dónde lo viste o qué ofrece"
              placeholderTextColor={colors.textSubtle}
              value={info}
              onChangeText={setInfo}
              multiline
              maxLength={SUGGESTION_INFO_MAX_LENGTH}
              textAlignVertical="top"
              editable={!sending}
              accessibilityLabel="Información adicional"
            />
            <Text style={styles.counter}>
              {info.length}/{SUGGESTION_INFO_MAX_LENGTH}
            </Text>
          </View>

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
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  intro: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  label: {
    ...typography.label,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  infoLabel: {
    marginTop: spacing.lg,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: 48,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionSelected: {
    borderColor: colors.brand,
    borderWidth: 2,
    backgroundColor: colors.brandSoft,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionText: {
    ...typography.label,
    flex: 1,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  textArea: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  counter: {
    ...typography.caption,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  actions: {
    marginTop: spacing.sm,
  },
  successIcon: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  successTitle: {
    ...typography.display,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  successText: {
    ...typography.body,
    textAlign: "center",
  },
  fullWidth: {
    width: "100%",
    marginTop: spacing.xxl,
  },
});
