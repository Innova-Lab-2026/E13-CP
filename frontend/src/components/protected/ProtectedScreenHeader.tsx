import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../theme";

type ProtectedScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Con `onBack` se muestra la flecha de volver a la izquierda del título. */
  onBack?: () => void;
};

/**
 * Título grande de las pantallas del celular protegido, como en el Figma:
 * "Navegá seguro", "Protegé tus datos" (con flecha de volver) y el resto.
 */
export default function ProtectedScreenHeader({ title, subtitle, onBack }: ProtectedScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={26} color={colors.text} />
          </Pressable>
        ) : null}
        <Text style={[styles.title, onBack && styles.titleWithBack]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    marginBottom: spacing.xxl,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  back: {
    marginRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  title: {
    ...typography.display,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    flexShrink: 1,
  },
  titleWithBack: {
    fontSize: 25,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
});
