import { useEffect } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../src/components/AppButton";
import {
  acknowledgeDeviceSessionEnd,
  useDeviceSession,
} from "../../src/services/deviceSession";
import { colors, radius, spacing, typography } from "../../src/theme";
import LocalVpnModule from "../../modules/local-vpn";

/**
 * Aviso para el celular protegido cuando la persona adulta lo desvinculó desde su
 * celular: la credencial de este celular quedó revocada y deja de estar protegido.
 */
export default function DeviceUnlinkedScreen() {
  const router = useRouter();
  const { deviceSession, loading } = useDeviceSession();

  useEffect(() => {
    acknowledgeDeviceSessionEnd();
    // Sin vínculo, el bloqueo de sitios de este celular ya no corresponde.
    if (Platform.OS === "android") {
      try {
        LocalVpnModule.stopVpn();
      } catch {
        // Si el servicio ya estaba detenido no hay nada más que hacer.
      }
    }
  }, []);

  if (!loading && deviceSession) {
    return <Redirect href="/protected" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.icon}>
          <Ionicons name="phone-portrait-outline" size={48} color={colors.text} />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Este celular fue desvinculado
        </Text>
        <Text style={styles.text}>
          La persona adulta lo desvinculó desde su celular, así que BA Protege+ ya no lo
          protege. Si hay que volver a protegerlo, pedile un código nuevo.
        </Text>

        <View style={styles.actions}>
          <AppButton title="Vincular con un código" onPress={() => router.replace("/vincular")} />
          <AppButton
            title="Volver al inicio"
            variant="secondary"
            onPress={() => router.replace("/")}
          />
        </View>
      </ScrollView>
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
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  icon: {
    alignSelf: "center",
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.display,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  text: {
    ...typography.body,
    textAlign: "center",
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xxxl,
  },
});
