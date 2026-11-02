import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../../../../src/components/AppHeader";
import AppInput from "../../../../src/components/AppInput";
import AppButton from "../../../../src/components/AppButton";
import ConfirmModal from "../../../../src/components/ConfirmModal";
import { deleteMyAccount } from "../../../../src/services/auth";
import { ApiError, errorMessage } from "../../../../src/services/api";
import { colors, radius, spacing, typography } from "../../../../src/theme";

const WHAT_IS_DELETED = [
  "Tu cuenta y tus datos personales",
  "Los perfiles de todos tus dispositivos protegidos",
  "Las alertas y el historial de actividad",
  "Los sitios que agregaste a tu lista de bloqueo",
];

export default function EliminarCuentaScreen() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const openConfirm = () => {
    if (!password) {
      setPasswordError("Ingresá tu contraseña para continuar.");
      return;
    }
    setPasswordError(undefined);
    setDeleteError(null);
    setConfirmVisible(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyAccount(password);
      setConfirmVisible(false);
      setPassword("");
      setDeleted(true);
    } catch (error) {
      setDeleteError(
        error instanceof ApiError && error.status === 401
          ? "La contraseña es incorrecta. Revisala e intentá de nuevo."
          : errorMessage(error, "No pudimos eliminar la cuenta. Intentá de nuevo."),
      );
    } finally {
      setDeleting(false);
    }
  };

  if (deleted) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.successSafeArea]}>
        <StatusBar style="dark" />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color={colors.successText} />
          </View>
          <Text style={styles.successTitle} accessibilityRole="header">
            Eliminamos tu cuenta
          </Text>
          <Text style={styles.successText}>
            Borramos tu cuenta y todos sus datos. Gracias por haber usado BA Protege+ para
            acompañar a tu familia. Si querés volver, podés crear una cuenta nueva cuando quieras.
          </Text>
          <View style={styles.successActions}>
            <AppButton title="Ir al inicio de sesión" onPress={() => router.replace("/login")} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppHeader title="Eliminar cuenta" />

          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning-outline" size={22} color={colors.dangerText} />
              <Text style={styles.warningTitle}>Esta acción no se puede deshacer</Text>
            </View>
            <Text style={styles.warningText}>
              Si eliminás tu cuenta, vamos a borrar de forma permanente:
            </Text>
            <View style={styles.list}>
              {WHAT_IS_DELETED.map((item) => (
                <View key={item} style={styles.listItem}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.warningText}>
              Los celulares vinculados dejan de estar protegidos. Si querés seguir cuidándolos, no
              elimines la cuenta.
            </Text>
          </View>

          <View style={styles.card}>
            <AppInput
              label="Contraseña"
              placeholder="Ingresá tu contraseña"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setPasswordError(undefined);
              }}
              secureTextEntry
              error={passwordError}
            />
            <Text style={styles.hint}>Te la pedimos para confirmar que sos vos.</Text>
          </View>

          <View style={styles.actions}>
            <AppButton title="Eliminar cuenta" onPress={openConfirm} variant="danger" />
            <AppButton title="Cancelar" onPress={() => router.back()} variant="secondary" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={confirmVisible}
        title="¿Eliminar tu cuenta?"
        message="Vamos a borrar tu cuenta, los perfiles de tus dispositivos, las alertas y el historial. No vas a poder recuperarlos."
        confirmLabel="Sí, eliminar cuenta"
        onConfirm={handleDelete}
        onCancel={() => setConfirmVisible(false)}
        destructive
        busy={deleting}
        error={deleteError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  warningCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  warningTitle: {
    flex: 1,
    ...typography.subtitle,
    color: colors.dangerText,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.dangerText,
  },
  list: {
    gap: spacing.sm,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  successSafeArea: {
    backgroundColor: colors.backgroundWarm,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.lg,
    backgroundColor: colors.backgroundWarm,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    ...typography.display,
    textAlign: "center",
  },
  successText: {
    ...typography.body,
    textAlign: "center",
    maxWidth: 360,
  },
  successActions: {
    width: "100%",
    maxWidth: 420,
    marginTop: spacing.md,
  },
});
