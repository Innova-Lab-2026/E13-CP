import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "../../theme";

export type HistoryVariant =
  | "blocked"
  | "alert"
  | "settings"
  | "protected";

type HistoryCardProps = {
  variant: HistoryVariant;
  title: string;
  description: string;
  time: string;
  device: string;
  onPress?: () => void;
};

const historyStyles = {
  blocked: {
    backgroundColor: colors.dangerSoft,
    iconColor: colors.danger,
    iconName: "ban",
  },
  alert: {
    backgroundColor: colors.warningSoft,
    iconColor: colors.warning,
    iconName: "alert-circle",
  },
  settings: {
    backgroundColor: colors.surfaceMuted,
    iconColor: colors.textMuted,
    iconName: "settings",
  },
  protected: {
    backgroundColor: colors.successSoft,
    iconColor: colors.success,
    iconName: "shield-checkmark",
  },
} as const;

export default function HistoryCard({
  variant,
  title,
  description,
  time,
  device,
  onPress,
}: HistoryCardProps) {
  const config = historyStyles[variant] ?? historyStyles.settings;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${title}. ${description}. ${device}, ${time}`}
      accessibilityHint={onPress ? "Abre el detalle de la actividad" : undefined}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: config.backgroundColor },
        ]}
      >
        <Ionicons
          name={config.iconName}
          size={22}
          color={config.iconColor}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.device}>{device}</Text>
      </View>

      <View style={styles.rightContent}>
        <Text style={styles.time}>{time}</Text>
        {onPress ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.75,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  device: {
    fontSize: 12,
    color: colors.textMuted,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
  },
  rightContent: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
});
