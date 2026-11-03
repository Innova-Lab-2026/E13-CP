import {
  Pressable,
  Text,
  StyleSheet,
} from "react-native";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "tertiary";
};

export default function AppButton({
  title,
  onPress,
  disabled = false,
  variant = "primary",
}: AppButtonProps) {
  return (
    <Pressable
      style={[
        styles.button,
        styles[variant],
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
    >
      <Text
        style={[
          styles.text,
          variant === "primary"
            ? styles.primaryText
            : styles.secondaryText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: "#CCCCCC",
  },
  primary: {
    backgroundColor: "#FACC15",
  },
  secondary: {
    backgroundColor: "#FEF08A",
  },
  tertiary: {
    backgroundColor: "#F3F4F6",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryText: {
    color: "#1F2937",
  },
  secondaryText: {
    color: "#1F2937",
  },
});