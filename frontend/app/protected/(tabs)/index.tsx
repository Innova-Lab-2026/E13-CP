import { useCallback, useRef } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppAlert from "../../../src/components/AppAlert";
import AppSwitch from "../../../src/components/AppSwitch";
import ScreenState from "../../../src/components/ScreenState";
import InfoCard from "../../../src/components/protected/InfoCard";
import {
  IS_ANDROID,
  useProtectedDevice,
} from "../../../src/components/protected/ProtectedDeviceProvider";
import { formatListUpdate } from "../../../src/components/protected/listUpdate";
import { protectedColors } from "../../../src/components/protected/palette";
import { colors, radius, shadow, spacing, typography } from "../../../src/theme";

/**
 * Inicio del celular protegido (Figma "Dasboard dispositivo protegido"): saludo,
 * tarjeta grande con el estado de la protección y el interruptor del bloqueo
 * (VPN de Android), estado de la lista y accesos a consejos y preguntas frecuentes.
 */
export default function ProtectedHomeScreen() {
  const router = useRouter();
  const {
    isDevice,
    deviceName,
    blocklist,
    remoteStatus,
    pausedByAdult,
    reloadRemote,
    vpnOn,
    vpnBusy,
    vpnFeedback,
    handleVpnToggle,
    refreshVpn,
  } = useProtectedDevice();

  // Al volver a esta pestaña se relee la VPN (puede cambiar desde los ajustes de
  // Android) y el estado del perfil. La primera vez ya lo cargó el layout.
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      refreshVpn();
      if (focusedBefore.current) reloadRemote();
      focusedBefore.current = true;
    }, [refreshVpn, reloadRemote]),
  );

  // En Android manda la VPN; en la web no hay bloqueo y se muestra el estado del perfil.
  const protectedNow = IS_ANDROID ? vpnOn : !pausedByAdult;

  let heroText: string;
  if (protectedNow) {
    heroText = IS_ANDROID
      ? "Este dispositivo está protegido para que puedas navegar de forma segura."
      : "Tu perfil está protegido para que puedas navegar de forma segura.";
  } else if (pausedByAdult) {
    // En la web no hay interruptor: solo se avisa.
    heroText = !IS_ANDROID
      ? "La persona adulta pausó la protección desde su celular."
      : isDevice
        ? "La persona adulta pausó la protección desde su celular. Para volver a activarla hace falta su PIN."
        : "La persona adulta pausó la protección desde su celular. Si querés, podés volver a activarla acá.";
  } else if (remoteStatus === "active" && !vpnBusy) {
    heroText =
      "La protección está activa en la cuenta de la persona adulta, pero el bloqueo está apagado en este celular. Activalo con el interruptor.";
  } else {
    heroText = "Activá el bloqueo de sitios de apuestas para navegar de forma segura.";
  }

  // El aviso "la persona adulta pausó..." ya lo dice la tarjeta.
  const showFeedback =
    vpnFeedback && !(pausedByAdult && !vpnOn && vpnFeedback.variant === "info");

  const lastUpdate = formatListUpdate(blocklist.data?.status.lastUpdated);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image
          source={require("../../../assets/protege-01.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityLabel="BA Protege+"
        />

        <View style={styles.greeting}>
          <Text style={styles.hello} accessibilityRole="header">
            {deviceName ? `Hola, ${deviceName}` : "Hola"}
          </Text>
          <Text style={styles.helloSubtitle}>Este es tu dispositivo protegido</Text>
        </View>

        {/* Tarjeta principal: estado de la protección e interruptor del bloqueo. */}
        <View style={[styles.hero, protectedNow ? styles.heroOn : styles.heroOff]}>
          <View
            style={[styles.heroIcon, protectedNow ? styles.heroIconOn : styles.heroIconOff]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Ionicons
              name={protectedNow ? "shield-checkmark-outline" : "shield-half-outline"}
              size={58}
              color={protectedNow ? protectedColors.greenIcon : protectedColors.amberIcon}
            />
          </View>
          <Text style={styles.heroTitle} accessibilityRole="header">
            {protectedNow ? "Protección activa" : "Protección pausada"}
          </Text>
          <Text style={styles.heroText}>{heroText}</Text>

          {IS_ANDROID ? (
            <View style={styles.switchBlock}>
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchLabel}>Bloqueo de sitios de apuestas</Text>
                  <Text style={styles.switchHint}>
                    Para pausarlo hace falta el PIN de la persona adulta.
                  </Text>
                </View>
                <AppSwitch
                  accessibilityLabel={
                    deviceName ? `Protección de ${deviceName}` : "Bloqueo de sitios de apuestas"
                  }
                  value={vpnOn}
                  onValueChange={handleVpnToggle}
                  disabled={vpnBusy || (!vpnOn && !blocklist.data && blocklist.loading)}
                />
              </View>
              {vpnBusy ? (
                <Text style={styles.switchHint}>Activando la protección...</Text>
              ) : null}
              {showFeedback && vpnFeedback ? (
                <AppAlert message={vpnFeedback.message} variant={vpnFeedback.variant} />
              ) : null}
            </View>
          ) : null}
        </View>

        {blocklist.error ? (
          <ScreenState error={blocklist.error} onRetry={blocklist.reload} />
        ) : blocklist.data ? (
          <InfoCard
            title="Todo actualizado"
            description={
              lastUpdate
                ? `Última actualización - ${lastUpdate}`
                : "La lista de sitios de apuestas está al día."
            }
            icon="checkmark"
            tone="green"
          />
        ) : (
          <InfoCard
            title="Actualizando la lista"
            description="Estamos buscando la versión más reciente de la lista."
            icon="sync-outline"
            tone="gray"
          />
        )}

        <InfoCard
          title="Consejos para navegar seguro"
          description="Conocé algunas recomendaciones para tener una mejor experiencia en internet."
          icon="bulb-outline"
          tone="amber"
          onPress={() => router.navigate("/protected/navegacion")}
        />

        <InfoCard
          title="Preguntas frecuentes"
          description="Encontrá respuesta a tus dudas."
          icon="help"
          tone="pink"
          onPress={() => router.push("/protected/preguntas-frecuentes")}
        />

        {/* En la web no hay bloqueo: se explica al final para respetar el orden del Figma. */}
        {!IS_ANDROID ? (
          <AppAlert
            variant="info"
            message="En el navegador no podemos bloquear sitios. El bloqueo lo hace la app de BA Protege+ para Android, instalada en el celular. Desde Configuración podés probar si un sitio está en la lista."
          />
        ) : null}
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  logo: {
    width: 96,
    height: 36,
    alignSelf: "flex-start",
  },
  greeting: {
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  hello: {
    ...typography.display,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
  },
  helloSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  hero: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    ...shadow.card,
  },
  heroOn: {
    backgroundColor: protectedColors.greenCard,
  },
  heroOff: {
    backgroundColor: protectedColors.amberCard,
  },
  heroIcon: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroIconOn: {
    backgroundColor: protectedColors.greenCircle,
  },
  heroIconOff: {
    backgroundColor: protectedColors.amberCircle,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    textAlign: "center",
  },
  switchBlock: {
    alignSelf: "stretch",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(28, 28, 28, 0.12)",
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    ...typography.label,
    fontWeight: "700",
  },
  switchHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
  },
});
