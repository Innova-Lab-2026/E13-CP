import {
  ActivityIndicator,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";
import { colors, radius } from "../theme";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  accessibilityLabel?: string;
};

export default function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  accessibilityLabel,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === "danger" ? colors.onDanger : colors.text} />
      ) : (
        <Text style={[styles.text, variant === "danger" && styles.dangerText]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  primary: {
    backgroundColor: colors.brand,
  },
  // Botón secundario del UI Kit: crema con borde suave (Omitir, Crear cuenta).
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Botón de texto, para acciones de menor peso (Volver, Usar otra cuenta).
  tertiary: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: colors.danger,
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onBrand,
  },
  dangerText: {
    color: colors.onDanger,
  },
});
