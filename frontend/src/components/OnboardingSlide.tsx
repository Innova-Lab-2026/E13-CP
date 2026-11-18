import {
  Image,
  ImageBackground,
  ImageSourcePropType,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "./ThemedText";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "./AppButton";
import { colors, radius, spacing, typography } from "../theme";

type OnboardingSlideProps = {
  background: ImageSourcePropType;
  title: string;
  /** Uno o más párrafos: el segundo se muestra separado, como en el Figma. */
  description: string | string[];
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
  const paragraphs = Array.isArray(description) ? description : [description];

  return (
    <ImageBackground source={background} style={styles.background} resizeMode="cover">
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* En pantallas chicas el contenido se desplaza en vez de cortarse. */}
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
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
              {/* Como en el Figma: los pasos ya vistos quedan como barra amarilla. */}
              {Array.from({ length: total }, (_, index) => (
                <View
                  key={index}
                  style={index <= step ? styles.activeDot : styles.dot}
                />
              ))}
            </View>
          </View>

          {/* Como en el Figma, la tarjeta queda más cerca de los botones que del logo
              y deja ver la cara de la foto. */}
          <View style={styles.spacerTop} />

          <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <View style={styles.paragraphs}>
              {paragraphs.map((paragraph) => (
                <Text key={paragraph} style={styles.description}>
                  {paragraph}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.spacerBottom} />

          <View style={styles.footer}>
            <AppButton
              variant="secondary"
              title="Omitir"
              accessibilityLabel="Omitir la presentación e ir a iniciar sesión"
              onPress={onSkip}
            />
            <AppButton title="Continuar" onPress={onContinue} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
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
    width: 22,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  // Figma (844 de alto): la tarjeta arranca cerca de y 322 y termina unos 145 px
  // arriba de los botones. Los espaciadores reparten el alto que sobra en esa
  // proporción y, en pantallas chicas, se achican hasta el mínimo.
  spacerTop: {
    flexGrow: 1,
    minHeight: spacing.xl,
  },
  spacerBottom: {
    flexGrow: 0.75,
    minHeight: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: "center",
  },
  title: {
    ...typography.display,
    fontSize: 26,
    lineHeight: 32,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  paragraphs: {
    gap: spacing.md,
  },
  description: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  footer: {
    gap: spacing.md,
  },
});
