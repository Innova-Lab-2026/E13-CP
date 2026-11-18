import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";

interface GreetingHeaderProps {
  name: string;
  subtitle?: string;
  showStatusDot?: boolean;
}

/** Saludo del inicio (Figma "Dashboard Responsable"): "Hola, Claudia" grande y una línea abajo. */
export default function GreetingHeader({
  name,
  subtitle = "¡Qué bueno tenerte de vuelta!",
  showStatusDot = false,
}: GreetingHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting} accessibilityRole="header">
        {name ? `Hola, ${name}` : "Hola"}
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
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.display,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700",
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
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  statusText: {
    fontSize: 13,
    color: colors.successText,
    fontWeight: "600",
  },
});
