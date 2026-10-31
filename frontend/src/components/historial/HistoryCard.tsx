
import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
    backgroundColor: "#FEE2E2",
    iconColor: "#DC2626",
    iconName: "ban",
  },
  alert: {
    backgroundColor: "#FEE2E2",
    iconColor: "#DC2626",
    iconName: "alert-circle",
  },
  settings: {
    backgroundColor: "#E5E7EB",
    iconColor: "#475569",
    iconName: "settings",
  },
  protected: {
    backgroundColor: "#DCFCE7",
    iconColor: "#16A34A",
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
  const config = historyStyles[variant];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
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
        {onPress && <Text style={styles.arrow}>›</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    gap: 12,
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  pressed: {
    opacity: 0.75,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#202020",
  },
  description: {
    fontSize: 13,
    color: "#555555",
  },
  device: {
    fontSize: 12,
    color: "#777777",
  },
  time: {
    fontSize: 11,
    color: "#777777",
  },
  rightContent: {
    alignItems: "flex-end",
    gap: 8,
  },
  arrow: {
    fontSize: 18,
    color: "#9CA3AF",
    fontWeight: "bold",
  },
});
