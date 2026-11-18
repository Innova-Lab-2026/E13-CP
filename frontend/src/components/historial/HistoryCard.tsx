// Tarjeta compacta de un evento (Figma "Historial"): ícono en círculo de color,
// título del color del tipo, "Nombre - detalle" y la hora. La usan el historial,
// las alertas, el inicio y el detalle de un dispositivo.
import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "../../theme";
import { historyLook, type HistoryVariant } from "./historyLook";
import { cardLine } from "./historyFormat";

export type { HistoryVariant } from "./historyLook";

type HistoryCardProps = {
  variant: HistoryVariant;
  title: string;
  description: string;
  time: string;
  device: string;
  onPress?: () => void;
  /**
   * No repite el nombre del perfil en la tarjeta: para listas de un solo
   * dispositivo ("Historial de Sofía", detalle del dispositivo).
   */
  hideDeviceName?: boolean;
  /** Muestra el punto de "sin leer" (alertas). */
  unread?: boolean;
  /** Texto para lectores de pantalla al tocar. Por defecto, "Abre el detalle del evento". */
  accessibilityHint?: string;
};

export default function HistoryCard({
  variant,
  title,
  description,
  time,
  device,
  onPress,
  hideDeviceName = false,
  unread = false,
  accessibilityHint,
}: HistoryCardProps) {
  const look = historyLook(variant);
  const line = cardLine(device, description, hideDeviceName);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${unread ? "Sin leer. " : ""}${title}. ${line}. ${time}`}
      accessibilityHint={onPress ? (accessibilityHint ?? "Abre el detalle del evento") : undefined}
    >
      <View style={[styles.iconContainer, { backgroundColor: look.iconBackground }]}>
        <MaterialCommunityIcons name={look.icon} size={24} color={look.iconColor} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: look.titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {line ? (
          <Text style={styles.line} numberOfLines={2}>
            {line}
          </Text>
        ) : null}
        {time ? <Text style={styles.time}>{time}</Text> : null}
      </View>

      {unread ? <View style={styles.unreadDot} /> : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.text} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg + 2,
    paddingRight: spacing.md,
    borderRadius: radius.md + 2,
    marginBottom: spacing.md + 2,
    gap: spacing.md + 2,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.75,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  line: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
});
