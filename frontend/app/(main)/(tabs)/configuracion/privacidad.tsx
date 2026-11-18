import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../../../src/components/AppHeader";
import SecurityPinForm from "../../../../src/components/SecurityPinForm";
import { useSession } from "../../../../src/services/session";
import { colors, spacing } from "../../../../src/theme";

/**
 * "Privacidad y seguridad": cambiar el PIN de seguridad del adulto. Como en el
 * Figma, los campos van en la misma pantalla; para cambiarlo se pide el PIN
 * actual (el servidor lo verifica).
 */
export default function PrivacidadScreen() {
  const router = useRouter();
  const { session } = useSession();
  const hasPin = !!session?.profile.hasPin;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/(tabs)/configuracion");
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
          <AppHeader title="Privacidad y seguridad" onBackPress={goBack} />
          {/* Al crear el primer PIN el formulario cambia de modo: la key lo reinicia. */}
          <SecurityPinForm key={hasPin ? "change" : "create"} mode={hasPin ? "change" : "create"} />
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
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
