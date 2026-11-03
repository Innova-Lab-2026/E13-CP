import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../src/components/AppButton";
import { colors, radius, shadow, spacing, typography } from "../../src/theme";

/** Bloqueo: aviso contenido y sin culpa cuando se intenta abrir un sitio de apuestas. */
export default function BlockedSiteScreen() {
  const router = useRouter();
  const { domain } = useLocalSearchParams<{ domain?: string }>();
  const site = typeof domain === "string" && domain.trim() ? domain.trim() : null;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/protected");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.icon}>
          <Ionicons name="shield-half" size={52} color={colors.text} />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Este sitio está bloqueado
        </Text>

        {site ? (
          <View style={styles.domainChip} accessibilityLabel={`Sitio: ${site}`}>
            <Ionicons name="globe-outline" size={16} color={colors.textMuted} />
            <Text style={styles.domainText} numberOfLines={1}>
              {site}
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>¿Por qué no se puede abrir?</Text>
          <Text style={styles.cardText}>
            Este sitio forma parte del listado oficial de sitios de apuestas online de
            LOTBA. BA Protege+ lo bloquea para cuidar este celular.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>No hiciste nada malo</Text>
          <Text style={styles.cardText}>
            Si tenés dudas, si alguien te invitó a apostar o si querés contar cómo te
            sentís, hablá con una persona adulta de confianza. Está bueno charlarlo.
          </Text>
        </View>

        <View style={styles.actions}>
          <AppButton title="Volver" onPress={goBack} />
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
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.lg,
  },
  icon: {
    alignSelf: "center",
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.display,
    textAlign: "center",
  },
  domainChip: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: "100%",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  domainText: {
    ...typography.label,
    flexShrink: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardTitle: {
    ...typography.subtitle,
  },
  cardText: {
    ...typography.body,
  },
  actions: {
    marginTop: spacing.sm,
  },
});
