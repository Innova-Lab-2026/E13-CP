import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppHeader from "../../src/components/AppHeader";
import AppButton from "../../src/components/AppButton";
import AppAlert from "../../src/components/AppAlert";
import PinInput from "../../src/components/PinInput";
import { setSecurityPin, verifySecurityPin } from "../../src/services/auth";
import { useSession } from "../../src/services/session";
import { errorMessage } from "../../src/services/api";
import { colors, radius, spacing, typography } from "../../src/theme";

const PIN_LENGTH = 4;
const BACK_DELAY_MS = 1500;

type Phase = "create" | "confirm" | "done";

/** PIN fácil de adivinar: todos los dígitos iguales o una secuencia (1234, 4321). */
function isWeakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  const digits = pin.split("").map(Number);
  const steps = digits.slice(1).map((digit, index) => digit - digits[index]);
  return steps.every((step) => step === 1) || steps.every((step) => step === -1);
}

export default function PinSetupScreen() {
  const router = useRouter();
  const { change } = useLocalSearchParams<{ change?: string }>();
  const isChange = change === "1";
  const { session, loading } = useSession();

  const [phase, setPhase] = useState<Phase>("create");
  const [currentVerified, setCurrentVerified] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const backTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (backTimer.current) clearTimeout(backTimer.current);
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator color={colors.text} accessibilityLabel="Cargando" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  // Para cambiar un PIN existente primero se pide el actual.
  const needsCurrent = isChange && !!session.profile.hasPin && !currentVerified;
  const step = needsCurrent ? "current" : phase;

  function resetErrors() {
    setFieldError("");
    setSubmitError(null);
  }

  function goBack() {
    if (backTimer.current) clearTimeout(backTimer.current);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/(tabs)/inicio");
    }
  }

  function handleHeaderBack() {
    if (step === "confirm") {
      setConfirmPin("");
      resetErrors();
      setPhase("create");
      return;
    }
    goBack();
  }

  async function handleVerifyCurrent() {
    if (currentPin.length < PIN_LENGTH || isSubmitting) return;
    resetErrors();
    setIsSubmitting(true);
    try {
      const ok = await verifySecurityPin(currentPin);
      if (ok) {
        setCurrentVerified(true);
      } else {
        setFieldError("El PIN no es correcto. Probá de nuevo.");
        setCurrentPin("");
      }
    } catch (error) {
      setSubmitError(
        errorMessage(error, "No pudimos verificar el PIN. Intentá de nuevo."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCreate() {
    if (pin.length < PIN_LENGTH) return;
    resetErrors();
    if (isWeakPin(pin)) {
      setFieldError("Elegí un PIN más difícil de adivinar, sin números repetidos ni seguidos.");
      return;
    }
    setPhase("confirm");
  }

  async function handleSave() {
    if (confirmPin.length < PIN_LENGTH || isSubmitting) return;
    resetErrors();

    if (confirmPin !== pin) {
      setFieldError("Los PIN no coinciden. Volvé a crearlo.");
      setPin("");
      setConfirmPin("");
      setPhase("create");
      return;
    }

    setIsSubmitting(true);
    try {
      await setSecurityPin(pin);
      if (isChange) {
        setPhase("done");
        setIsSubmitting(false);
        backTimer.current = setTimeout(goBack, BACK_DELAY_MS);
      } else {
        router.replace("/(main)/(tabs)/inicio");
      }
    } catch (error) {
      setSubmitError(
        errorMessage(error, "No pudimos guardar el PIN. Intentá de nuevo."),
      );
      setIsSubmitting(false);
    }
  }

  const copy = {
    current: {
      title: "Ingresá tu PIN actual",
      subtitle: "Para cambiarlo, primero confirmá que sos vos.",
    },
    create: {
      title: isChange ? "Elegí tu nuevo PIN" : "Creá tu PIN de seguridad",
      subtitle: "Elegí 4 números que puedas recordar.",
    },
    confirm: {
      title: "Confirmá tu PIN",
      subtitle: "Ingresá los mismos 4 números otra vez.",
    },
    done: {
      title: "PIN actualizado",
      subtitle: "Ya podés usar tu nuevo PIN.",
    },
  }[step];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <AppHeader
          title={isChange ? "Cambiar PIN" : "PIN de seguridad"}
          onBackPress={handleHeaderBack}
          hideBack={step === "done" || (!isChange && step === "create" && !router.canGoBack())}
        />

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name={step === "done" ? "check-circle-outline" : "shield-lock-outline"}
              size={36}
              color={colors.text}
            />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {copy.title}
          </Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>

        {submitError ? <AppAlert message={submitError} variant="error" /> : null}

        {step === "done" ? (
          <>
            <AppAlert
              message="Listo. Tu PIN de seguridad se actualizó correctamente."
              variant="success"
            />
            <View style={styles.actions}>
              <AppButton title="Volver a Configuración" onPress={goBack} />
            </View>
          </>
        ) : (
          <>
            {step === "current" ? (
              <PinInput
                key="current"
                label="PIN actual"
                value={currentPin}
                onChange={(value) => {
                  setCurrentPin(value);
                  resetErrors();
                }}
                error={fieldError}
                length={PIN_LENGTH}
                autoFocus
              />
            ) : null}

            {step === "create" ? (
              <PinInput
                key="create"
                label={isChange ? "Nuevo PIN" : "PIN"}
                value={pin}
                onChange={(value) => {
                  setPin(value);
                  setFieldError("");
                }}
                error={fieldError}
                length={PIN_LENGTH}
                autoFocus
              />
            ) : null}

            {step === "confirm" ? (
              <PinInput
                key="confirm"
                label="Repetí el PIN"
                value={confirmPin}
                onChange={(value) => {
                  setConfirmPin(value);
                  setFieldError("");
                }}
                error={fieldError}
                length={PIN_LENGTH}
                autoFocus
              />
            ) : null}

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>¿Para qué sirve el PIN?</Text>
              <Text style={styles.infoText}>
                Lo vas a usar para autorizar la vinculación del celular de tu hijo
                o hija y para confirmar los cambios importantes, como pausar la
                protección.
              </Text>
              <View style={styles.infoWarning}>
                <MaterialCommunityIcons
                  name="eye-off-outline"
                  size={18}
                  color={colors.warningText}
                />
                <Text style={styles.infoWarningText}>
                  Guardalo solo para vos y nunca se lo compartas al menor.
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              {step === "current" ? (
                <AppButton
                  title="Continuar"
                  onPress={handleVerifyCurrent}
                  disabled={currentPin.length < PIN_LENGTH}
                  loading={isSubmitting}
                />
              ) : null}
              {step === "create" ? (
                <AppButton
                  title="Continuar"
                  onPress={handleCreate}
                  disabled={pin.length < PIN_LENGTH}
                />
              ) : null}
              {step === "confirm" ? (
                <AppButton
                  title="Guardar PIN"
                  onPress={handleSave}
                  disabled={confirmPin.length < PIN_LENGTH}
                  loading={isSubmitting}
                />
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.display,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  infoTitle: {
    ...typography.subtitle,
    fontSize: 15,
  },
  infoText: {
    ...typography.body,
  },
  infoWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  infoWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.warningText,
  },
  actions: {
    marginTop: "auto",
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
});
