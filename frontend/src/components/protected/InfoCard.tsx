import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../../theme";
import { protectedColors, toneColors, type ProtectedTone } from "./palette";

type IconName = ComponentProps<typeof Ionicons>["name"];

type InfoCardProps = {
  title: string;
  description?: string;
  /** Ícono dentro del círculo de color. Se ignora si se pasa `badge`. */
  icon?: IconName;
  /** Contenido propio del círculo (por ejemplo, el número de un paso). */
  badge?: ReactNode;
  tone?: ProtectedTone;
  /** Con `onPress` la tarjeta es un botón y muestra el chevron. */
  onPress?: () => void;
  accessibilityHint?: string;
};

/**
 * Tarjeta de una fila del Figma del celular protegido: círculo de color con un
 * ícono, título en negrita y una línea de descripción. Se usa en el Inicio
 * ("Todo actualizado", "Consejos para navegar seguro"), en "Navegá seguro" y en
 * los pasos numerados de cada consejo.
 */
export default function InfoCard({
  title,
  description,
  icon,
  badge,
  tone = "green",
  onPress,
  accessibilityHint,
}: InfoCardProps) {
  const palette = toneColors(tone);

  const content = (
    <>
      <View
        style={[styles.circle, { backgroundColor: palette.circle }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {badge ?? (icon ? <Ionicons name={icon} size={22} color={palette.icon} /> : null)}
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.text}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={styles.card}
        accessible
        accessibilityLabel={description ? `${title}. ${description}` : title}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={description ? `${title}. ${description}` : title}
      accessibilityHint={accessibilityHint}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: protectedColors.cardBorder,
    paddingVertical: spacing.lg,
    paddingLeft: spacing.xl,
    paddingRight: spacing.md,
    minHeight: 72,
    ...shadow.card,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.label,
    fontSize: 15,
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
});
