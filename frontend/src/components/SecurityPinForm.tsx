import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppAlert from "./AppAlert";
import AppButton from "./AppButton";
import PinInput from "./PinInput";
import { setSecurityPin } from "../services/auth";
import { ApiError, errorMessage } from "../services/api";
import { colors, spacing, typography } from "../theme";

const PIN_LENGTH = 4;

/** PIN fácil de adivinar: todos los dígitos iguales o una secuencia (1234, 4321). */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  const digits = pin.split("").map(Number);
  const steps = digits.slice(1).map((digit, index) => digit - digits[index]);
  return steps.every((step) => step === 1) || steps.every((step) => step === -1);
}

type SecurityPinFormProps = {
  /** "create": PIN y Repetir PIN. "change": además pide el PIN actual. */
  mode: "create" | "change";
  /** Se llama después de guardar el PIN en el servidor. */
  onSaved?: () => void;
};

type FieldErrors = { current?: string; pin?: string; confirm?: string };

/**
 * Formulario del PIN de seguridad del adulto, como "PIN - Responsable" del Figma:
 * título, párrafo explicativo, los campos en la misma pantalla y el botón abajo.
 */
export default function SecurityPinForm({ mode, onSaved }: SecurityPinFormProps) {
  const isChange = mode === "change";
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const edit = (setter: (value: string) => void, field: keyof FieldErrors) => (value: string) => {
    setter(value);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError(null);
    setSaved(false);
  };

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (isChange && currentPin.length < PIN_LENGTH) {
      next.current = "Ingresá tu PIN actual de 4 dígitos.";
    }
    if (pin.length < PIN_LENGTH) {
      next.pin = "El PIN tiene que tener 4 dígitos.";
    } else if (isWeakPin(pin)) {
      next.pin = "Elegí un PIN más difícil de adivinar, sin números repetidos ni seguidos.";
    } else if (isChange && pin === currentPin) {
      next.pin = "El PIN nuevo tiene que ser distinto del actual.";
    }
    if (!next.pin) {
      if (confirmPin.length < PIN_LENGTH) {
        next.confirm = "Repetí el PIN para confirmarlo.";
      } else if (confirmPin !== pin) {
        next.confirm = "Los PIN no coinciden. Revisalos e intentá de nuevo.";
      }
    }
    return next;
  }

  async function handleSubmit() {
    if (saving) return;
    setSubmitError(null);
    setSaved(false);
    const found = validate();
    setErrors(found);
    if (found.current || found.pin || found.confirm) return;

    setSaving(true);
    try {
      // Al cambiarlo se manda el PIN actual: el servidor lo verifica.
      await setSecurityPin(pin, isChange ? currentPin : undefined);
      setCurrentPin("");
      setPin("");
      setConfirmPin("");
      setSaved(true);
      onSaved?.();
    } catch (error) {
      if (isChange && error instanceof ApiError && error.status === 401) {
        setErrors({ current: "El PIN actual no es correcto. Probá de nuevo." });
        setCurrentPin("");
      } else {
        setSubmitError(errorMessage(error, "No pudimos guardar el PIN. Intentá de nuevo."));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {isChange ? "Cambiá tu PIN de seguridad" : "Creá tu PIN de seguridad"}
      </Text>
      <Text style={styles.description}>
        Este PIN protege el acceso a las funciones de vinculación, configuración y control del
        dispositivo protegido.
      </Text>

      {isChange ? (
        <PinInput
          variant="field"
          label="PIN actual"
          placeholder="Ingresá tu PIN actual"
          value={currentPin}
          onChange={edit(setCurrentPin, "current")}
          error={errors.current}
          length={PIN_LENGTH}
          editable={!saving}
        />
      ) : null}
      <PinInput
        variant="field"
        label={isChange ? "PIN nuevo" : "PIN"}
        placeholder="Ingresá un PIN de 4 dígitos"
        value={pin}
        onChange={edit(setPin, "pin")}
        error={errors.pin}
        length={PIN_LENGTH}
        editable={!saving}
      />
      <PinInput
        variant="field"
        label="Repetir PIN"
        placeholder="Reingresá el PIN de 4 dígitos"
        value={confirmPin}
        onChange={edit(setConfirmPin, "confirm")}
        error={errors.confirm}
        length={PIN_LENGTH}
        editable={!saving}
      />

      <Text style={styles.hint}>Guardalo solo para vos y nunca se lo compartas al menor.</Text>

      {submitError ? <AppAlert message={submitError} variant="error" /> : null}
      {saved && isChange ? (
        <AppAlert message="Listo. Tu PIN de seguridad se actualizó." variant="success" />
      ) : null}

      <View style={styles.actions}>
        <AppButton
          title={isChange ? "Guardar" : "Crear"}
          accessibilityLabel={isChange ? "Guardar PIN" : "Crear PIN"}
          onPress={handleSubmit}
          loading={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  title: {
    ...typography.title,
    fontSize: 24,
    textAlign: "center",
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  actions: {
    marginTop: "auto",
    paddingTop: spacing.xxl,
  },
});
