import { useRef, type ComponentRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../theme";

type PinInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  /** Cantidad de dígitos. El PIN de seguridad del backend usa 4. */
  length?: number;
  autoFocus?: boolean;
};

/** Campo de PIN numérico con una casilla por dígito. Los dígitos se muestran ocultos. */
export default function PinInput({
  value,
  onChange,
  label,
  error,
  length = 4,
  autoFocus = false,
}: PinInputProps) {
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

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
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, length))}
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
    backgroundColor: colors.surface,
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
});
