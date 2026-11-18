import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "../../../../src/components/ThemedText";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../../../../src/components/AppHeader";
import AppInput from "../../../../src/components/AppInput";
import AppButton from "../../../../src/components/AppButton";
import ConfirmModal from "../../../../src/components/ConfirmModal";
import PinInput from "../../../../src/components/PinInput";
import { deleteMyAccount, getMyProfile } from "../../../../src/services/auth";
import { useSession } from "../../../../src/services/session";
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
  const { session } = useSession();
  // Las cuentas creadas con Google no tienen contraseña: confirman con el PIN.
  const usesPin = session?.profile.hasPassword === false;

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | undefined>();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Trae el perfil vigente (actualiza la sesión) para saber si la cuenta tiene contraseña.
  useEffect(() => {
    getMyProfile().catch(() => {
      // Sin conexión se usa el perfil guardado en la sesión.
    });
  }, []);

  const openConfirm = () => {
    if (usesPin) {
      if (pin.length !== 4) {
        setPinError("Ingresá los 4 dígitos de tu PIN para continuar.");
        return;
      }
      setPinError(undefined);
    } else {
      if (!password) {
        setPasswordError("Ingresá tu contraseña para continuar.");
        return;
      }
      setPasswordError(undefined);
    }
    setDeleteError(null);
    setConfirmVisible(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyAccount(usesPin ? { pin } : { password }, { clearLocalSession: false });
      setConfirmVisible(false);
      setPassword("");
      setPin("");
      // La confirmación es pública y cierra la sesión local al abrirse.
      router.replace("/cuenta-eliminada");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setDeleteError(
          usesPin
            ? "El PIN es incorrecto. Revisalo e intentá de nuevo."
            : "La contraseña es incorrecta. Revisala e intentá de nuevo.",
        );
      } else if (usesPin && error instanceof ApiError && error.status === 409) {
        setDeleteError(
          "Todavía no creaste tu PIN de seguridad. Crealo primero para poder eliminar la cuenta.",
        );
      } else {
        setDeleteError(errorMessage(error, "No pudimos eliminar la cuenta. Intentá de nuevo."));
      }
    } finally {
      setDeleting(false);
    }
  };

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
            {usesPin ? (
              <>
                <PinInput
                  label="PIN de seguridad"
                  value={pin}
                  onChange={(value) => {
                    setPin(value);
                    setPinError(undefined);
                  }}
                  error={pinError}
                />
                <Text style={styles.hint}>
                  Tu cuenta entra con Google, así que te pedimos tu PIN para confirmar que sos vos.
                </Text>
              </>
            ) : (
              <>
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
              </>
            )}
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
    backgroundColor: colors.backgroundWarm,
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
});
