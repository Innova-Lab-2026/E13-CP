// Confirmación después de eliminar la cuenta. Es una ruta pública: si se
// mostrara dentro de (main), la guardia del _layout raíz mandaría al login apenas
// se borra la sesión y la persona no vería ningún aviso.
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../../src/components/ThemedText";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppButton from "../../src/components/AppButton";
import { clearSession } from "../../src/services/session";
import { colors, radius, spacing, typography } from "../../src/theme";

export default function CuentaEliminadaScreen() {
  const router = useRouter();

  // La cuenta ya se borró en el servidor: la sesión local se cierra acá, cuando
  // la pantalla ya es pública.
  useEffect(() => {
    clearSession().catch(() => {
      // Si falla, el token ya no sirve: el próximo pedido cierra la sesión igual.
    });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
          <Ionicons name="checkmark-sharp" size={40} color={colors.success} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Eliminamos tu cuenta
        </Text>
        <Text style={styles.text}>
          Borramos tu cuenta y todos sus datos. Gracias por haber usado BA Protege+ para
          acompañar a tu familia. Si querés volver, podés crear una cuenta nueva cuando quieras.
        </Text>
        <View style={styles.actions}>
          <AppButton title="Ir al inicio de sesión" onPress={() => router.replace("/login")} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundWarm,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.successStrongSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.display,
    textAlign: "center",
  },
  text: {
    ...typography.body,
    textAlign: "center",
    maxWidth: 360,
  },
  actions: {
    width: "100%",
    maxWidth: 420,
    marginTop: spacing.md,
  },
});
