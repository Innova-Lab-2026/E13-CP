import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGoogleLoginEnabled } from "../services/googleAuth";
import { colors, radius, spacing, typography } from "../theme";

type GoogleButtonProps = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Muestra arriba el separador "o", para ponerlo debajo de otra acción principal. */
  withSeparator?: boolean;
};

/**
 * Botón "Continuar con Google". Solo aparece si el servidor tiene configurado el
 * ingreso con Google; mientras lo consulta ocupa el mismo lugar para que la
 * pantalla no salte.
 */
export default function GoogleButton({
  onPress,
  loading = false,
  disabled = false,
  withSeparator = false,
}: GoogleButtonProps) {
  const enabled = useGoogleLoginEnabled();

  if (enabled === false) return null;

  const separator = withSeparator ? (
    <View style={styles.separator}>
      <View style={styles.separatorLine} />
      <Text style={styles.separatorText}>o</Text>
      <View style={styles.separatorLine} />
    </View>
  ) : null;

  if (enabled === null) {
    return (
      <>
        {separator}
        <View style={styles.placeholder} accessibilityElementsHidden />
      </>
    );
  }

  const isDisabled = disabled || loading;

  return (
    <>
      {separator}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && !isDisabled && styles.pressed,
          isDisabled && styles.disabled,
        ]}
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel="Continuar con Google"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color={colors.text} />
            <Text style={styles.text}>Continuar con Google</Text>
          </>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorText: {
    ...typography.caption,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  placeholder: {
    minHeight: 48,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
});
