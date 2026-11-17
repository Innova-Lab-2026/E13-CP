import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AppAlert from "../../src/components/AppAlert";
import { logout, updateMyMode, type UserMode } from "../../src/services/auth";
import { useSession } from "../../src/services/session";
import { errorMessage } from "../../src/services/api";
import { colors, radius, shadow, spacing, typography } from "../../src/theme";

type ModeOption = {
  mode: UserMode;
  title: string;
  description: string;
};

const OPTIONS: ModeOption[] = [
  {
    mode: "adulto",
    title: "Soy Responsable",
    description:
      "Supervisá los dispositivos protegidos y recibí avisos cuando algo necesita atención.",
  },
  {
    mode: "dispositivo_protegido",
    title: "Este es un dispositivo protegido",
    description: "Activá la protección para bloquear los sitios de apuestas online.",
  },
];

/** Selección de modo del Figma: se avanza tocando la tarjeta, sin botón Continuar. */
export default function ModeScreen() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [submitting, setSubmitting] = useState<UserMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator color={colors.text} accessibilityLabel="Cargando" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  async function handleSelect(mode: UserMode) {
    if (!session || submitting) return;

    setError(null);
    setSubmitting(mode);
    try {
      const profile = await updateMyMode(mode);
      let next: Href;
      if (mode === "adulto") {
        const hasPin = profile.hasPin ?? session.profile.hasPin;
        next = hasPin ? "/(main)/(tabs)/inicio" : "/pin-setup";
      } else {
        next = session.linkedDeviceId ? "/protected" : "/protected/link";
      }
      router.replace(next);
    } catch (err) {
      setError(errorMessage(err, "No pudimos guardar el modo. Intentá de nuevo."));
      setSubmitting(null);
    }
  }

  // Al cerrar la sesión, esta pantalla muestra <Redirect href="/login" />.
  async function handleSwitchAccount() {
    await logout();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/protege-01.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="BA Protege+"
          />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          ¿Cómo vas a utilizar BA Protege+?
        </Text>

        {error ? (
          <View style={styles.alert}>
            <AppAlert message={error} variant="error" />
          </View>
        ) : null}

        <View style={styles.options}>
          {OPTIONS.map((option) => {
            const isSubmitting = submitting === option.mode;
            return (
              <Pressable
                key={option.mode}
                onPress={() => handleSelect(option.mode)}
                disabled={submitting !== null}
                accessibilityRole="button"
                accessibilityLabel={`${option.title}. ${option.description}`}
                accessibilityState={{
                  disabled: submitting !== null,
                  busy: isSubmitting,
                  selected: session.mode === option.mode,
                }}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                  submitting !== null && !isSubmitting && styles.cardDimmed,
                ]}
              >
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
                {isSubmitting ? (
                  <ActivityIndicator
                    style={styles.cardSpinner}
                    color={colors.text}
                    accessibilityLabel="Guardando"
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Image
            source={require("../../assets/logo-loteria-01.png")}
            style={styles.loteria}
            resizeMode="contain"
            accessibilityLabel="Lotería de la Ciudad de Buenos Aires"
          />
          <Pressable
            onPress={handleSwitchAccount}
            disabled={submitting !== null}
            style={({ pressed }) => [styles.switchAccount, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión y usar otra cuenta"
            hitSlop={4}
          >
            <Text style={styles.switchAccountText}>Usar otra cuenta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 72,
  },
  logo: {
    width: 125,
    height: 55,
  },
  title: {
    ...typography.title,
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.xxxl,
  },
  alert: {
    marginBottom: spacing.lg,
  },
  options: {
    gap: spacing.xxl,
  },
  card: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    ...shadow.card,
    elevation: 4,
    shadowOpacity: 0.12,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardDimmed: {
    opacity: 0.6,
  },
  cardTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    textAlign: "center",
    maxWidth: 280,
  },
  cardSpinner: {
    marginTop: spacing.md,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 56,
    alignItems: "center",
    gap: spacing.lg,
  },
  loteria: {
    width: 104,
    height: 46,
  },
  switchAccount: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  switchAccountText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textDecorationLine: "underline",
  },
});
