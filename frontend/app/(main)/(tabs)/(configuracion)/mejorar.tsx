import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../../../src/components/AppHeader";
import AppButton from "../../../../src/components/AppButton";
import AppAlert from "../../../../src/components/AppAlert";
import { colors, radius, spacing, typography } from "../../../../src/theme";

/**
 * Casilla que recibe los comentarios. Se define al compilar con
 * EXPO_PUBLIC_FEEDBACK_EMAIL; si falta, la pantalla avisa que el envío llega pronto.
 */
const FEEDBACK_EMAIL = (process.env.EXPO_PUBLIC_FEEDBACK_EMAIL ?? "").trim();

const TOPICS = ["Una idea", "Algo no funciona", "Una duda", "Otro tema"] as const;
type Topic = (typeof TOPICS)[number];

const MAX_LENGTH = 1000;

export default function MejorarScreen() {
  const [topic, setTopic] = useState<Topic>(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; variant: "info" | "error" } | null>(null);
  const [opening, setOpening] = useState(false);

  const handleSend = async () => {
    if (!FEEDBACK_EMAIL) return;
    const text = message.trim();
    if (text.length < 10) {
      setMessageError("Contanos un poco más: escribí al menos 10 caracteres.");
      return;
    }
    setMessageError(null);
    setResult(null);
    setOpening(true);

    const subject = `BA Protege+ · ${topic}`;
    const url = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

    try {
      await Linking.openURL(url);
      setResult({
        message:
          "Abrimos tu app de correo con el mensaje listo. Revisalo y envialo desde ahí. Gracias por ayudarnos.",
        variant: "info",
      });
    } catch {
      setResult({
        message: `No encontramos una app de correo en este dispositivo. Podés escribirnos a ${FEEDBACK_EMAIL}.`,
        variant: "error",
      });
    } finally {
      setOpening(false);
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
          <AppHeader title="Ayudanos a mejorar" />

          <Text style={styles.intro}>
            BA Protege+ es un prototipo y tu opinión nos ayuda a mejorarlo. Contanos qué te sirvió,
            qué te costó o qué te gustaría que haga.
            {FEEDBACK_EMAIL
              ? " Cuando toques «Preparar correo» se abre tu app de correo con el mensaje armado: nada se envía hasta que lo mandes vos."
              : ""}
          </Text>

          {!FEEDBACK_EMAIL ? (
            <AppAlert
              variant="info"
              message="Pronto vas a poder enviarnos tus comentarios desde acá."
            />
          ) : (
          <>
          <View style={styles.card}>
            <Text style={styles.label}>¿Sobre qué nos querés contar?</Text>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {TOPICS.map((item) => {
                const selected = item === topic;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setTopic(item)}
                    style={[styles.chip, selected && styles.chipSelected]}
                    accessibilityRole="radio"
                    accessibilityLabel={item}
                    accessibilityState={{ checked: selected, selected }}
                    hitSlop={{ top: 4, bottom: 4 }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Tu comentario</Text>
            <TextInput
              style={[styles.textArea, messageError ? styles.textAreaError : null]}
              placeholder="Escribí tu comentario acá"
              placeholderTextColor={colors.textSubtle}
              value={message}
              onChangeText={(value) => {
                setMessage(value);
                setMessageError(null);
              }}
              multiline
              maxLength={MAX_LENGTH}
              textAlignVertical="top"
              accessibilityLabel="Tu comentario"
            />
            <View style={styles.counterRow}>
              {messageError ? <Text style={styles.error}>{messageError}</Text> : <View />}
              <Text style={styles.counter}>
                {message.length}/{MAX_LENGTH}
              </Text>
            </View>

            <Text style={styles.hint}>
              No incluyas datos personales de tus hijos o hijas en el comentario.
            </Text>
          </View>

          {result ? <AppAlert message={result.message} variant={result.variant} /> : null}

          <View style={styles.actions}>
            <AppButton title="Preparar correo" onPress={handleSend} loading={opening} />
          </View>
          </>
          )}
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
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    fontSize: 15,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 44,
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: colors.onBrand,
  },
  textArea: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  textAreaError: {
    borderColor: colors.danger,
  },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  error: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
  },
  counter: {
    ...typography.caption,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actions: {
    marginTop: spacing.sm,
  },
});
