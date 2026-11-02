
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardTypeOptions,
  
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type AppInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  maxLength?: number;
};

export default function AppInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  error,
}: AppInputProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputContainer, error ? styles.inputError : null]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !passwordVisible}
          keyboardType={keyboardType}
          autoCapitalize="none"
        />

        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            onPress={() => setPasswordVisible((visible) => !visible)}
            hitSlop={8}
            style={styles.visibilityButton}
          >
            <MaterialCommunityIcons
              name={passwordVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#64748B"
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: "#DC2626",
  },
  error: {
    color: "#DC2626",
    fontSize: 13,
  },
  visibilityButton: {
    padding: 4,
  },
});
