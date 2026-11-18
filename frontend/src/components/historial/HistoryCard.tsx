// Tarjeta compacta de un evento (Figma "Historial"): ícono en círculo de color,
// título del color del tipo, "Nombre - detalle" y la hora. La usan el historial,
// las alertas, el inicio y el detalle de un dispositivo.
import { Pressable, View, StyleSheet } from "react-native";
import { Text } from "../ThemedText";
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
  /** Alerta sin leer: fondo blanco y título en negrita. */
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
      style={({ pressed }) => [
        styles.card,
        unread && styles.cardUnread,
        pressed && onPress && styles.pressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${unread ? "Sin leer. " : ""}${title}. ${line}. ${time}`}
      accessibilityHint={onPress ? (accessibilityHint ?? "Abre el detalle del evento") : undefined}
    >
      <View style={[styles.iconContainer, { backgroundColor: look.iconBackground }]}>
        <MaterialCommunityIcons name={look.icon} size={22} color={look.iconColor} />
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.title, unread && styles.titleUnread, { color: look.titleColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {line ? (
          <Text style={styles.line} numberOfLines={unread ? 2 : 1}>
            {line}
          </Text>
        ) : null}
        {time ? <Text style={styles.time}>{time}</Text> : null}
      </View>

      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.text} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Figma "Historial": tarjeta compacta de unos 64 px de alto.
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    paddingLeft: spacing.lg + 2,
    paddingRight: spacing.md,
    borderRadius: radius.md + 2,
    marginBottom: spacing.md,
    gap: spacing.md + 2,
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
    gap: 1,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  line: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
  },
  time: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
  },
  // Sin leer: fondo blanco y título más marcado, sin el punto rojo (Figma no lo tiene).
  cardUnread: {
    backgroundColor: colors.field,
  },
  titleUnread: {
    fontWeight: "800",
  },
});
