import { useEffect, useState } from "react";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppButton from "../../src/components/AppButton";
import AppAlert from "../../src/components/AppAlert";
import { logout, updateMyMode, type UserMode } from "../../src/services/auth";
import { useSession } from "../../src/services/session";
import { errorMessage } from "../../src/services/api";
import { colors, radius, shadow, spacing, typography } from "../../src/theme";

type ModeOption = {
  mode: UserMode;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const OPTIONS: ModeOption[] = [
  {
    mode: "adulto",
    title: "Soy la persona adulta responsable",
    description:
      "Gestiono los dispositivos de mi familia y recibo avisos cuando algo necesita mi atención.",
    icon: "account-heart-outline",
  },
  {
    mode: "dispositivo_protegido",
    title: "Este es un dispositivo protegido",
    description:
      "Es el celular de mi hijo o hija. Acá se van a bloquear los sitios de apuestas online.",
    icon: "cellphone-lock",
  },
];

export default function ModeScreen() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [selected, setSelected] = useState<UserMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el dispositivo ya tenía un modo elegido, se muestra preseleccionado.
  useEffect(() => {
    if (session?.mode && selected === null) {
      setSelected(session.mode);
    }
  }, [session?.mode, selected]);

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

  async function handleContinue() {
    if (!selected || !session || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const profile = await updateMyMode(selected);
      let next: Href;
      if (selected === "adulto") {
        const hasPin = profile.hasPin ?? session.profile.hasPin;
        next = hasPin ? "/(main)/(tabs)/(dashboard)" : "/pin-setup";
      } else {
        next = session.linkedDeviceId ? "/protected" : "/protected/link";
      }
      router.replace(next);
    } catch (err) {
      setError(
        errorMessage(err, "No pudimos guardar el modo. Intentá de nuevo."),
      );
      setIsSubmitting(false);
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

        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            ¿Cómo vas a usar este celular?
          </Text>
          <Text style={styles.subtitle}>
            Elegí una opción para configurar la app en este dispositivo.
          </Text>
        </View>

        {error ? <AppAlert message={error} variant="error" /> : null}

        <View style={styles.options} accessibilityRole="radiogroup">
          {OPTIONS.map((option) => {
            const isSelected = selected === option.mode;
            return (
              <Pressable
                key={option.mode}
                onPress={() => {
                  setSelected(option.mode);
                  setError(null);
                }}
                disabled={isSubmitting}
                accessibilityRole="radio"
                accessibilityLabel={`${option.title}. ${option.description}`}
                accessibilityState={{ selected: isSelected, disabled: isSubmitting }}
                style={({ pressed }) => [
                  styles.card,
                  isSelected && styles.cardSelected,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={32}
                    color={colors.text}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{option.title}</Text>
                  <Text style={styles.cardDescription}>{option.description}</Text>
                </View>
                <MaterialCommunityIcons
                  name={isSelected ? "radiobox-marked" : "radiobox-blank"}
                  size={24}
                  color={isSelected ? colors.text : colors.borderStrong}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <AppButton
            title="Continuar"
            onPress={handleContinue}
            disabled={!selected}
            loading={isSubmitting}
          />
          <AppButton
            variant="tertiary"
            title="Usar otra cuenta"
            accessibilityLabel="Cerrar sesión y usar otra cuenta"
            onPress={handleSwitchAccount}
            disabled={isSubmitting}
          />
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
  options: {
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  cardSelected: {
    borderColor: colors.brand,
    borderWidth: 2,
    backgroundColor: colors.brandSoft,
  },
  cardPressed: {
    opacity: 0.85,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleSelected: {
    backgroundColor: colors.brand,
  },
  cardText: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.subtitle,
  },
  cardDescription: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    marginTop: "auto",
    gap: spacing.md,
  },
});
