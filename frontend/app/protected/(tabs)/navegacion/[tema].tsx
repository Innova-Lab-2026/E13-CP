import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../../src/components/ThemedText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import InfoCard from "../../../../src/components/protected/InfoCard";
import ProtectedScreenHeader from "../../../../src/components/protected/ProtectedScreenHeader";
import { findTipTopic } from "../../../../src/components/protected/navigationTips";
import { toneColors } from "../../../../src/components/protected/palette";
import { colors, radius, shadow, spacing, typography } from "../../../../src/theme";

/**
 * Pantalla de un consejo (Figma "Navegación - datos / engaños / BA Protege+ /
 * habla con alguien"): tres pasos numerados y una tarjeta "Recordá" de color.
 */
export default function ProtectedTipScreen() {
  const router = useRouter();
  const { tema } = useLocalSearchParams<{ tema?: string }>();
  const topic = findTipTopic(typeof tema === "string" ? tema : undefined);

  if (!topic) {
    return <Redirect href="/protected/navegacion" />;
  }

  const reminderColors = toneColors(topic.tone);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/protected/navegacion");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProtectedScreenHeader title={topic.title} subtitle={topic.intro} onBack={goBack} />

        <View style={styles.list}>
          {topic.steps.map((step, index) => (
            <InfoCard
              key={step.title}
              title={step.title}
              description={step.text}
              tone="gray"
              badge={<Text style={styles.stepNumber}>{index + 1}</Text>}
            />
          ))}
        </View>

        <View
          style={[styles.reminder, { backgroundColor: reminderColors.card }]}
          accessible
          accessibilityLabel={`Recordá. ${topic.reminder}`}
        >
          <View style={[styles.reminderIcon, { backgroundColor: reminderColors.circle }]}>
            <Ionicons name="bulb-outline" size={24} color={reminderColors.icon} />
          </View>
          <View style={styles.reminderText}>
            <Text style={styles.reminderTitle}>Recordá</Text>
            <Text style={styles.reminderBody}>{topic.reminder}</Text>
          </View>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },
  list: {
    gap: spacing.lg,
  },
  stepNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  reminder: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxxl + spacing.xl,
    ...shadow.card,
  },
  reminderIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderText: {
    flex: 1,
    gap: 2,
  },
  reminderTitle: {
    ...typography.label,
    fontSize: 15,
    fontWeight: "700",
  },
  reminderBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
});
