import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./ThemedText";
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
 * Botón "Continuar con Google" con la G a color, como en el Figma. Solo aparece
 * si el servidor tiene configurado el ingreso con Google; mientras lo consulta
 * se muestra el mismo botón deshabilitado, así la pantalla no queda con un hueco.
 */
export default function GoogleButton({
  onPress,
  loading = false,
  disabled = false,
  withSeparator = false,
}: GoogleButtonProps) {
  const enabled = useGoogleLoginEnabled();

  if (enabled === false) return null;

  const checking = enabled === null;
  const isDisabled = checking || disabled || loading;

  return (
    <>
      {withSeparator ? (
        <View
          style={styles.separator}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>o</Text>
          <View style={styles.separatorLine} />
        </View>
      ) : null}
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
        accessibilityHint={
          checking ? "Estamos revisando si el ingreso con Google está disponible" : undefined
        }
        accessibilityState={{ disabled: isDisabled, busy: loading || checking }}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            <Image
              source={require("../../assets/google-g.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
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
    gap: spacing.lg,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
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
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  logo: {
    width: 22,
    height: 22,
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
