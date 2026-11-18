import { useRef, type ComponentRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "./ThemedText";
import { colors, radius, spacing } from "../theme";

type PinInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  /** Cantidad de dígitos. El PIN de seguridad del backend usa 4. */
  length?: number;
  autoFocus?: boolean;
  /**
   * "boxes" (por defecto): una casilla por dígito.
   * "field": campo de texto con placeholder, como los formularios del Figma
   * ("PIN" y "Repetir PIN" en la misma pantalla).
   */
  variant?: "boxes" | "field";
  /** Solo en variant="field". */
  placeholder?: string;
  editable?: boolean;
};

const onlyDigits = (text: string, length: number) => text.replace(/\D/g, "").slice(0, length);

/** Campo de PIN numérico. Los dígitos se muestran ocultos. */
export default function PinInput({
  value,
  onChange,
  label,
  error,
  length = 4,
  autoFocus = false,
  variant = "boxes",
  placeholder,
  editable = true,
}: PinInputProps) {
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  if (variant === "field") {
    return (
      <View style={styles.fieldContainer}>
        {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
        <TextInput
          value={value}
          onChangeText={(text) => onChange(onlyDigits(text, length))}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={length}
          autoFocus={autoFocus}
          secureTextEntry
          autoComplete="off"
          textContentType="oneTimeCode"
          editable={editable}
          accessibilityLabel={label ?? "PIN"}
          style={[
            styles.field,
            error ? styles.fieldError : null,
            !editable && styles.fieldDisabled,
          ]}
        />
        {error ? (
          <Text style={styles.fieldErrorText} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.boxes}
        accessibilityRole="none"
      >
        {Array.from({ length }, (_, index) => {
          const filled = index < value.length;
          const current = index === value.length;
          return (
            <View
              key={index}
              style={[
                styles.box,
                current && styles.boxCurrent,
                error ? styles.boxError : null,
              ]}
            >
              <Text style={styles.dot}>{filled ? "•" : ""}</Text>
            </View>
          );
        })}
      </Pressable>

      {/* Un único campo invisible recibe el teclado numérico y el pegado del PIN. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(onlyDigits(text, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        secureTextEntry
        textContentType="oneTimeCode"
        accessibilityLabel={label ?? "PIN"}
        style={styles.hiddenInput}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  boxes: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
  box: {
    width: 56,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.field,
    alignItems: "center",
    justifyContent: "center",
  },
  boxCurrent: {
    borderColor: colors.text,
    borderWidth: 2,
  },
  boxError: {
    borderColor: colors.danger,
  },
  dot: {
    fontSize: 30,
    color: colors.text,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
  fieldContainer: {
    width: "100%",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.field,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  fieldDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  fieldErrorText: {
    color: colors.danger,
    fontSize: 13,
  },
});
