import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../../../../src/components/AppHeader";
import AppInput from "../../../../src/components/AppInput";
import AppButton from "../../../../src/components/AppButton";
import AppAlert from "../../../../src/components/AppAlert";
import ScreenState from "../../../../src/components/ScreenState";
import { useAsyncResource } from "../../../../src/hooks/useAsyncResource";
import { getMyProfile, updateMyProfile } from "../../../../src/services/auth";
import { errorMessage } from "../../../../src/services/api";
import { isValidPhone } from "../../../../src/utils/phone";
import { colors, radius, spacing, typography } from "../../../../src/theme";

export default function MiCuentaScreen() {
  const { data: profile, loading, error, reload } = useAsyncResource(() => getMyProfile(), []);

  const [name, setName] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dirty, setDirty] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Carga los datos del servidor salvo que la persona ya esté editando.
  useEffect(() => {
    if (profile && !dirty) {
      setName(profile.name);
      setTelefono(profile.telefono ?? "");
    }
  }, [profile, dirty]);

  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setDirty(true);
    setSaved(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setNameError("Ingresá tu nombre.");
      return;
    }
    setNameError(undefined);
    const cleanPhone = telefono.trim();
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setPhoneError("Ingresá un número de teléfono válido.");
      return;
    }
    setPhoneError(undefined);
    setSaving(true);
    setSaveError(null);
    try {
      await updateMyProfile({ name: cleanName, telefono: telefono.trim() });
      setDirty(false);
      setSaved(true);
      await reload();
    } catch (err) {
      setSaveError(errorMessage(err, "No pudimos guardar los cambios. Intentá de nuevo."));
    } finally {
      setSaving(false);
    }
  };

  const unchanged =
    !!profile && name.trim() === profile.name && telefono.trim() === (profile.telefono ?? "");

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
          <AppHeader title="Mi cuenta" />

          {!profile ? (
            <ScreenState loading={loading} error={error} onRetry={reload} />
          ) : (
            <>
              <Text style={styles.intro}>
                Mantené tus datos al día para que podamos acompañarte. El correo es el que usás para
                ingresar y no se puede cambiar desde la app.
              </Text>

              <View style={styles.card}>
                <AppInput
                  label="Nombre"
                  placeholder="Ingresá tu nombre"
                  value={name}
                  onChangeText={edit(setName)}
                  autoCapitalize="words"
                  error={nameError}
                />
                <AppInput
                  label="Teléfono"
                  placeholder="Ingresá tu teléfono (opcional)"
                  value={telefono}
                  onChangeText={(value) => {
                    setPhoneError(undefined);
                    edit(setTelefono)(value);
                  }}
                  keyboardType="phone-pad"
                  error={phoneError}
                />
                <AppInput
                  label="Correo electrónico"
                  placeholder=""
                  value={profile.email}
                  onChangeText={() => {}}
                  editable={false}
                />
                {profile.authProviders?.includes("google") ? (
                  <View style={styles.provider}>
                    <Ionicons name="logo-google" size={16} color={colors.textMuted} />
                    <Text style={styles.providerText}>Cuenta vinculada con Google</Text>
                  </View>
                ) : null}
              </View>

              {saveError ? <AppAlert message={saveError} variant="error" /> : null}
              {saved ? <AppAlert message="Guardamos tus cambios." variant="success" /> : null}

              <View style={styles.actions}>
                <AppButton
                  title="Guardar cambios"
                  onPress={handleSave}
                  loading={saving}
                  disabled={unchanged}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  intro: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: spacing.xs,
    marginBottom: spacing.md,
  },
  actions: {
    marginTop: spacing.md,
  },
  provider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: -spacing.xs,
    marginBottom: spacing.lg,
  },
  providerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
