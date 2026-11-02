import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../src/components/AppButton";
import AppAlert from "../../src/components/AppAlert";
import PinInput from "../../src/components/PinInput";
import ConfirmModal from "../../src/components/ConfirmModal";
import ScreenState from "../../src/components/ScreenState";
import { useAsyncResource } from "../../src/hooks/useAsyncResource";
import {
  confirmDeviceLink,
  getDevices,
  setDeviceProtection,
  type Device,
} from "../../src/services/deviceService";
import { verifySecurityPin } from "../../src/services/auth";
import { updateSession } from "../../src/services/session";
import { ApiError, errorMessage } from "../../src/services/api";
import { formatIsoDate } from "../../src/utils/date";
import { colors, radius, shadow, spacing, typography } from "../../src/theme";

type Step = "choose" | "pin" | "success";

/** Vinculación: este celular se asocia a un perfil protegido creado por la persona adulta. */
export default function LinkDeviceScreen() {
  const router = useRouter();
  const { data: devices, loading, error, reload } = useAsyncResource(getDevices, []);

  const [step, setStep] = useState<Step>("choose");
  const [selected, setSelected] = useState<Device | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [wrongPinVisible, setWrongPinVisible] = useState(false);

  // Primero los perfiles pendientes; después los ya vinculados, para volver a
  // vincular este celular (por ejemplo, si se reinstaló la app o venció la sesión).
  const pending = [...(devices ?? [])].sort(
    (a, b) => Number(a.status !== "pending") - Number(b.status !== "pending"),
  );

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
    const name = selected?.name ?? "";
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.content, styles.centered]}>
          <View style={styles.successIcon}>
            <Ionicons name="shield-checkmark" size={56} color={colors.successText} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            Celular vinculado
          </Text>
          <Text style={styles.subtitle}>
            {name
              ? `Este celular ya está vinculado al perfil de ${name}. Desde ahora te acompañamos para que navegue sin sitios de apuestas.`
              : "Este celular ya está vinculado. Desde ahora te acompañamos para navegar sin sitios de apuestas."}
          </Text>
          <View style={styles.fullWidth}>
            <AppButton title="Continuar" onPress={() => router.replace("/protected")} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/protege-01.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            accessibilityLabel="BA Protege+"
          />
        </View>

        {step === "choose" ? (
          <>
            <Text style={styles.title} accessibilityRole="header">
              ¿De quién es este celular?
            </Text>
            <Text style={styles.subtitle}>
              Elegí el perfil que la persona adulta creó para este celular.
            </Text>

            <ScreenState
              loading={loading && !devices}
              error={error}
              onRetry={reload}
              isEmpty={!loading && !error && pending.length === 0}
              emptyTitle="Todavía no hay perfiles para vincular"
              emptyText="Primero, la persona adulta tiene que crear el perfil desde su celular, en Dispositivos > Agregar dispositivo. Cuando lo haga, tocá Reintentar."
            />

            {!loading && !error && pending.length === 0 ? (
              <View style={styles.fullWidth}>
                <AppButton title="Reintentar" onPress={reload} variant="secondary" />
              </View>
            ) : null}

            {pending.length > 0 ? (
              <View style={styles.list} accessibilityRole="radiogroup">
                {pending.map((device) => {
                  const isSelected = selected?.id === device.id;
                  return (
                    <Pressable
                      key={device.id}
                      onPress={() => setSelected(device)}
                      style={[styles.profileCard, isSelected && styles.profileCardSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`Perfil de ${device.name}`}
                    >
                      <View style={styles.avatar}>
                        <Ionicons name="person" size={22} color={colors.text} />
                      </View>
                      <View style={styles.profileText}>
                        <Text style={styles.profileName}>{device.name}</Text>
                        {device.birthDate ? (
                          <Text style={styles.profileMeta}>
                            Nació el {formatIsoDate(device.birthDate)}
                          </Text>
                        ) : null}
                        {device.status !== "pending" ? (
                          <Text style={styles.profileMeta}>
                            Ya vinculado. Elegilo para volver a vincular este celular.
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name={isSelected ? "radio-button-on" : "radio-button-off"}
                        size={22}
                        color={colors.text}
                      />
                    </Pressable>
                  );
                })}

                <AppButton
                  title="Continuar"
                  onPress={() => setStep("pin")}
                  disabled={!selected}
                />
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    width: "100%",
    marginTop: spacing.lg,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
  logo: {
    width: 125,
    height: 55,
  },
  title: {
    ...typography.display,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  list: {
    gap: spacing.md,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },
  profileCardSelected: {
    borderColor: colors.text,
    borderWidth: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    ...typography.subtitle,
  },
  profileMeta: {
    ...typography.caption,
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
  successIcon: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
});
