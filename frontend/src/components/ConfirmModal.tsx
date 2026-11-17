import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import AppButton from "./AppButton";
import { colors, radius, spacing, typography } from "../theme";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  /** Contenido extra entre el mensaje y los botones (por ejemplo, un PinInput). */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Acción destructiva: el botón de confirmar se muestra en rojo. */
  destructive?: boolean;
  busy?: boolean;
  error?: string | null;
};

/** Modal de confirmación del UI Kit (vinculación, eliminar cuenta, salir del modo protegido). */
export default function ConfirmModal({
  visible,
  title,
  message,
  children,
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  destructive = false,
  busy = false,
  error,
}: ConfirmModalProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel} accessibilityRole="none">
        <Pressable style={styles.card} onPress={() => {}} accessibilityRole="none">
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <AppButton
              title={busy ? "Un momento..." : confirmLabel}
              onPress={onConfirm}
              disabled={busy}
              variant={destructive ? "danger" : "primary"}
            />
            <AppButton title={cancelLabel} onPress={onCancel} variant="secondary" disabled={busy} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: spacing.xxl,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    gap: spacing.md,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  title: {
    ...typography.title,
    textAlign: "center",
  },
  message: {
    ...typography.body,
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
