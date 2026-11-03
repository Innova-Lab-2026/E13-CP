import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";

interface GreetingHeaderProps {
  name: string;
  subtitle?: string;
  showStatusDot?: boolean;
}

export default function GreetingHeader({
  name,
  subtitle = "Qué bueno tenerte de vuelta.",
  showStatusDot = false,
}: GreetingHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting} accessibilityRole="header">
        Hola, {name}
      </Text>

      <View style={styles.subtitleRow}>
        {showStatusDot && <View style={styles.greenDot} />}
        <Text style={[styles.subtitleText, showStatusDot && styles.statusText]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.display,
    fontSize: 24,
    marginBottom: 2,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  subtitleText: {
    ...typography.body,
  },
  statusText: {
    fontSize: 13,
    color: colors.successText,
    fontWeight: "600",
  },
});
