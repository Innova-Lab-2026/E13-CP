import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../src/components/AppHeader";
import SecurityPinForm from "../../src/components/SecurityPinForm";
import { useSession } from "../../src/services/session";
import { colors, spacing } from "../../src/theme";

/**
 * Alta del PIN de seguridad del adulto ("PIN - Responsable" del Figma): PIN y
 * Repetir PIN en la misma pantalla y el botón "Crear". Cambiar un PIN existente
 * se hace desde Configuración > Privacidad y seguridad.
 */
export default function PinSetupScreen() {
  const router = useRouter();
  const { session, loading } = useSession();
  // Al guardar, la sesión pasa a tener PIN: no tiene que disparar la redirección de abajo.
  const [saved, setSaved] = useState(false);

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

  // Con un PIN ya creado esta pantalla no se muestra: cambiarlo pide el PIN actual
  // y vive en Privacidad y seguridad (también los enlaces viejos a "?change=1").
  // En un celular protegido por la vinculación clásica, que tiene la sesión del
  // adulto, se vuelve al modo protegido.
  if (session.profile.hasPin && !saved) {
    return (
      <Redirect
        href={session.linkedDeviceId ? "/protected" : "/(main)/(tabs)/configuracion/privacidad"}
      />
    );
  }

  const canGoBack = router.canGoBack();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppHeader title="PIN de seguridad" hideBack={!canGoBack} />
          <SecurityPinForm
            mode="create"
            onSaved={() => {
              setSaved(true);
              router.replace("/(main)/(tabs)/inicio");
            }}
          />
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
});
