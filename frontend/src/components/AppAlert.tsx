import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../theme";

type AppAlertProps = {
  message: string;
  variant?: "success" | "warning" | "error" | "info";
};

/** Colores de cada variante, todos tomados de los tokens del UI Kit. */
const alertStyles = {
  success: {
    backgroundColor: colors.successSoft,
    textColor: colors.successText,
    borderColor: colors.success,
  },
  warning: {
    backgroundColor: colors.warningSoft,
    textColor: colors.warningText,
    borderColor: colors.warning,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    textColor: colors.dangerText,
    borderColor: colors.danger,
  },
  // Información neutra: amarillo suave de marca con texto oscuro.
  info: {
    backgroundColor: colors.brandSoft,
    textColor: colors.text,
    borderColor: colors.brand,
  },
};

export default function AppAlert({ message, variant = "info" }: AppAlertProps) {
  const look = alertStyles[variant];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: look.backgroundColor, borderLeftColor: look.borderColor },
      ]}
      accessibilityRole={variant === "error" ? "alert" : undefined}
    >
      <Text style={[styles.message, { color: look.textColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: radius.sm,
    borderLeftWidth: 4,
    marginVertical: spacing.sm,
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
  },
});
