import {
  Image,
  ImageBackground,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "./AppButton";
import { colors, radius, spacing, typography } from "../theme";

type OnboardingSlideProps = {
  background: ImageSourcePropType;
  title: string;
  description: string;
  /** Posición de esta pantalla (empieza en 0) y total de pantallas del onboarding. */
  step: number;
  total: number;
  onSkip: () => void;
  onContinue: () => void;
};

/** Pantalla de onboarding del Figma: foto a sangre, logo arriba, tarjeta crema y dos botones. */
export default function OnboardingSlide({
  background,
  title,
  description,
  step,
  total,
  onSkip,
  onContinue,
}: OnboardingSlideProps) {
  return (
    <ImageBackground source={background} style={styles.background} resizeMode="cover">
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/protege-01.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="BA Protege+"
          />

          <View
            style={styles.pagination}
            accessible
            accessibilityLabel={`Paso ${step + 1} de ${total}`}
          >
            {Array.from({ length: total }, (_, index) => (
              <View
                key={index}
                style={index === step ? styles.activeDot : styles.dot}
              />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <View style={styles.footer}>
          <AppButton
            variant="secondary"
            title="Omitir"
            accessibilityLabel="Omitir la presentación e ir a iniciar sesión"
            onPress={onSkip}
          />
          <AppButton title="Continuar" onPress={onContinue} />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: "center",
  },
  logo: {
    width: 125,
    height: 55,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  activeDot: {
    width: 24,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  title: {
    ...typography.display,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    textAlign: "center",
  },
  footer: {
    gap: spacing.md,
  },
});
