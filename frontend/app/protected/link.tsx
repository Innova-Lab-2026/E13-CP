import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../src/components/ThemedText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../src/components/AppButton";
import AppAlert from "../../src/components/AppAlert";
import PinInput from "../../src/components/PinInput";
import ConfirmModal from "../../src/components/ConfirmModal";
import ScreenState from "../../src/components/ScreenState";
import { avatarColors } from "../../src/components/DeviceAvatar";
import { useAsyncResource } from "../../src/hooks/useAsyncResource";
import {
  confirmDeviceLink,
  getDevices,
  setDeviceProtection,
  type Device,
  type DeviceStatus,
} from "../../src/services/deviceService";
import { verifySecurityPin } from "../../src/services/auth";
import { updateSession, useSession } from "../../src/services/session";
import { useDeviceSession } from "../../src/services/deviceSession";
import { ApiError, errorMessage } from "../../src/services/api";
import { colors, radius, shadow, spacing, typography } from "../../src/theme";

type Step = "choose" | "pin" | "success";

/** La sesión de Google queda abierta en el navegador del celular del menor. */
const GOOGLE_SESSION_NOTICE =
  "Iniciaste sesión con Google en este celular. Cuando termines, cerrá tu sesión de Google en el navegador para que el menor no pueda usar tu cuenta.";

/** El mismo perfil tiene el mismo color que en la app del adulto (DeviceAvatar). */
function avatarColorFor(device: Device) {
  return avatarColors(device.id || device.name);
}

const STATUS_DISPLAY: Record<
  DeviceStatus,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  active: { label: "Protección activa", icon: "checkmark-circle-outline", color: colors.successText },
  pending: { label: "Pendiente de vinculación", icon: "alert-circle-outline", color: colors.warningText },
  disabled: { label: "Protección pausada", icon: "pause-circle-outline", color: colors.textMuted },
};

/**
 * Texto del Figma, ajustado a lo que pasa de verdad: en Android el filtro empieza
 * cuando se activa la protección (VPN) en el Inicio, y en el navegador no se bloquea.
 */
function successText(name?: string): string {
  const linked = name
    ? `Este dispositivo se encuentra vinculado correctamente al perfil de ${name}.`
    : "Este dispositivo se encuentra vinculado correctamente.";
  const next =
    Platform.OS === "android"
      ? "Para que el acceso a sitios de apuestas se filtre en segundo plano, activá la protección en el Inicio."
      : "El bloqueo de sitios de apuestas funciona en la app de Android; desde el Inicio podés probar si un sitio está bloqueado.";
  return `${linked} ${next}`;
}

/** Vinculación: este celular se asocia a un perfil protegido creado por la persona adulta. */
export default function LinkDeviceScreen() {
  const router = useRouter();
  const { data: devices, loading, error, reload } = useAsyncResource(getDevices, []);
  const { session } = useSession();
  const { deviceSession } = useDeviceSession();
  const signedInWithGoogle = session?.authMethod === "google";

  const [step, setStep] = useState<Step>("choose");
  const [selected, setSelected] = useState<Device | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [wrongPinVisible, setWrongPinVisible] = useState(false);

  // Primero los perfiles pendientes; después los ya vinculados, para volver a
  // vincular este celular (por ejemplo, si se reinstaló la app o venció la sesión).
  const profiles = [...(devices ?? [])].sort(
    (a, b) => Number(a.status !== "pending") - Number(b.status !== "pending"),
  );

  // Un celular ya vinculado con un código no usa esta vinculación con la cuenta.
  if (deviceSession) {
    return <Redirect href="/protected" />;
  }

  function choose(device: Device) {
    setSelected(device);
    setPin("");
    setPinError("");
    setSubmitError(null);
    setStep("pin");
  }

  async function handleConfirm() {
    if (!selected || submitting) return;
    if (pin.length !== 4) {
      setPinError("Ingresá los 4 dígitos del PIN.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      let device: Device;
      if (selected.status === "pending") {
        device = await confirmDeviceLink(selected.id, pin);
      } else {
        // Perfil ya vinculado: se revincula con el PIN y se reactiva la protección.
        const valid = await verifySecurityPin(pin);
        if (!valid) {
          setWrongPinVisible(true);
          return;
        }
        device = await setDeviceProtection(selected.id, true);
      }
      await updateSession({
        linkedDeviceId: device.id,
        linkedDeviceName: device.name || selected.name,
      });
      setStep("success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setWrongPinVisible(true);
      } else {
        setSubmitError(errorMessage(err, "No pudimos vincular este celular. Intentá de nuevo."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function retryPin() {
    setWrongPinVisible(false);
    setPin("");
    setPinError("");
  }

  function backToChoose() {
    setStep("choose");
    setPin("");
    setPinError("");
    setSubmitError(null);
  }

  if (step === "success") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.successContent}>
          <View style={styles.successBody}>
            <View style={styles.successIcon} accessibilityElementsHidden>
              <Ionicons name="checkmark" size={34} color={colors.success} />
            </View>
            <Text style={styles.successTitle} accessibilityRole="header">
              ¡Dispositivo vinculado!
            </Text>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>BA Protege+ Activo</Text>
            </View>
            <Text style={styles.successText}>{successText(selected?.name)}</Text>
            {signedInWithGoogle ? (
              <View style={styles.fullWidth}>
                <AppAlert message={GOOGLE_SESSION_NOTICE} variant="info" />
              </View>
            ) : null}
          </View>
          <AppButton title="Ir al Inicio" onPress={() => router.replace("/protected")} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === "choose" ? (
          <>
            <Text style={styles.title} accessibilityRole="header">
              ¿Qué perfil vas a vincular?
            </Text>
            <Text style={styles.subtitle}>
              Elegí el perfil que la persona responsable creó para este dispositivo.
            </Text>

            {signedInWithGoogle ? (
              <View style={styles.notice}>
                <AppAlert message={GOOGLE_SESSION_NOTICE} variant="info" />
              </View>
            ) : null}

            <ScreenState
              loading={loading && !devices}
              error={error}
              onRetry={reload}
              isEmpty={!loading && !error && profiles.length === 0}
              emptyTitle="Todavía no hay perfiles para vincular"
              emptyText="Primero, la persona adulta tiene que crear el perfil desde su celular, en Dispositivos > Agregar dispositivo. Cuando lo haga, tocá Reintentar."
            />

            {!loading && !error && profiles.length === 0 ? (
              <AppButton title="Reintentar" onPress={reload} variant="secondary" />
            ) : null}

            {profiles.length > 0 ? (
              <View style={styles.list}>
                {profiles.map((device) => {
                  const avatar = avatarColorFor(device);
                  const status = STATUS_DISPLAY[device.status] ?? STATUS_DISPLAY.pending;
                  return (
                    <Pressable
                      key={device.id}
                      onPress={() => choose(device)}
                      style={({ pressed }) => [styles.profileRow, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Perfil de ${device.name}. ${status.label}`}
                      accessibilityHint="Abre la confirmación con el PIN de la persona adulta"
                    >
                      <View style={[styles.avatar, { backgroundColor: avatar.background }]}>
                        <Ionicons name="person-circle" size={26} color={avatar.icon} />
                      </View>
                      <Text style={styles.profileName} numberOfLines={1}>
                        {device.name}
                      </Text>
                      <View style={styles.status}>
                        <Ionicons name={status.icon} size={14} color={status.color} />
                        <Text style={[styles.statusText, { color: status.color }]} numberOfLines={1}>
                          {status.label}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.text} />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.backButton}>
              <AppButton
                title="Volver"
                variant="tertiary"
                onPress={() => router.replace("/mode")}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title} accessibilityRole="header">
              Confirmá la vinculación
            </Text>
            <Text style={styles.subtitle}>
              Pedile a la persona adulta que ingrese su PIN de seguridad para vincular este
              celular al perfil de {selected?.name}.
            </Text>

            <View style={styles.card}>
              <PinInput
                value={pin}
                onChange={(value) => {
                  setPin(value);
                  setPinError("");
                }}
                label="PIN de la persona adulta"
                error={pinError}
                autoFocus
              />
              {submitError ? <AppAlert message={submitError} variant="error" /> : null}
              <AppButton
                title="Vincular celular"
                onPress={handleConfirm}
                loading={submitting}
              />
            </View>

            <View style={styles.backButton}>
              <AppButton
                title="Elegir otro perfil"
                variant="tertiary"
                onPress={backToChoose}
                disabled={submitting}
              />
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmModal
        visible={wrongPinVisible}
        title="El PIN no es correcto"
        message="Revisá con la persona adulta el PIN de 4 dígitos que creó en su celular."
        confirmLabel="Intentar de nuevo"
        cancelLabel="Cerrar"
        onConfirm={retryPin}
        onCancel={retryPin}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 72,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.title,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  subtitle: {
    ...typography.body,
    color: colors.text,
    marginBottom: 40,
    paddingHorizontal: spacing.xl,
  },
  notice: {
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.lg,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 56,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadow.card,
    shadowOpacity: 0.12,
    elevation: 3,
  },
  pressed: {
    opacity: 0.85,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  statusText: {
    fontSize: 14,
    flexShrink: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadow.card,
  },
  backButton: {
    marginTop: spacing.lg,
  },
  successContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  successBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  successTitle: {
    ...typography.title,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  activePill: {
    alignSelf: "stretch",
    marginHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  activePillText: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.successText,
    textAlign: "center",
  },
  successText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
    alignSelf: "stretch",
    paddingHorizontal: spacing.xl,
  },
  fullWidth: {
    width: "100%",
    marginTop: spacing.lg,
  },
});
