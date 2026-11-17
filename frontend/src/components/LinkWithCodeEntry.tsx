import { Pressable, StyleSheet, Text } from "react-native";
import { colors, spacing, typography } from "../theme";

type LinkWithCodeEntryProps = {
  onPress: () => void;
};

/**
 * Enlace secundario de la bienvenida y del login para vincular el celular del
 * menor con un código, sin iniciar sesión con la cuenta de la persona adulta.
 */
export default function LinkWithCodeEntry({ onPress }: LinkWithCodeEntryProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="¿Es el celular de tu hijo o hija? Vincular con un código"
      hitSlop={4}
    >
      <Text style={styles.prompt}>¿Es el celular de tu hijo o hija?</Text>
      <Text style={styles.link}>Vincular con un código</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  // Acceso secundario y discreto, debajo de las acciones principales del Figma.
  prompt: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  link: {
    ...typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
