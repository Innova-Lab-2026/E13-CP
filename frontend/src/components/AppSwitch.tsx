import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, spacing, typography } from "../theme";

interface AppSwitchProps {
  label?: string;
  /** Texto para el lector de pantalla. Si falta, se usa `label`. */
  accessibilityLabel?: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  disabled?: boolean;
}

/** Interruptor Sí/No del UI Kit, con el amarillo de marca cuando está activo. */
export default function AppSwitch({
  label,
  accessibilityLabel,
  value,
  onValueChange,
  disabled = false,
}: AppSwitchProps) {
  const toggleSwitch = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={toggleSwitch}
        disabled={disabled}
        style={[styles.switchCard, disabled && styles.disabledCard]}
        accessibilityRole="switch"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ checked: value, disabled }}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <View style={[styles.track, value ? styles.trackActive : styles.trackInactive]}>
          <View style={[styles.thumb, value ? styles.thumbActive : styles.thumbInactive]} />
        </View>

        <Text style={[styles.statusText, value && styles.statusTextActive]}>
          {value ? "Sí" : "No"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  label: {
    ...typography.label,
    marginBottom: 6,
  },
  switchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minHeight: 44,
    alignSelf: "flex-start",
    gap: 10,
  },
  disabledCard: {
    opacity: 0.5,
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: radius.md,
    padding: 2,
    justifyContent: "center",
  },
  trackInactive: {
    backgroundColor: colors.borderStrong,
  },
  trackActive: {
    backgroundColor: colors.brand,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    ...shadow.card,
  },
  thumbInactive: {
    alignSelf: "flex-start",
  },
  thumbActive: {
    alignSelf: "flex-end",
  },
  statusText: {
    ...typography.label,
    fontWeight: "700",
    color: colors.textMuted,
  },
  statusTextActive: {
    color: colors.text,
  },
});
