import type { ComponentProps } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProtectedScreenHeader from "../../../../src/components/protected/ProtectedScreenHeader";
import {
  IS_ANDROID,
  useProtectedDevice,
} from "../../../../src/components/protected/ProtectedDeviceProvider";
import { protectedColors } from "../../../../src/components/protected/palette";
import { colors, radius, shadow, spacing, typography } from "../../../../src/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type SettingsRowProps = {
  icon: IconName;
  label: string;
  description?: string;
  onPress: () => void;
  last?: boolean;
};

/** Fila de la tarjeta de Configuración, como en el Figma de la persona adulta. */
function SettingsRow({ icon, label, description, onPress, last = false }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
    >
      <View style={styles.rowIcon} accessibilityElementsHidden importantForAccessibility="no">
        <Ionicons name={icon} size={20} color={protectedColors.grayIcon} />
      </View>
      <View style={[styles.rowBody, !last && styles.rowDivider]}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{label}</Text>
          {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      </View>
    </Pressable>
  );
}

function initial(name: string | undefined): string {
  return name?.trim().charAt(0).toUpperCase() || "?";
}

/**
 * Configuración del celular protegido (no tiene pantalla propia en el Figma:
 * sigue la Configuración de la persona adulta, una tarjeta con filas). Reúne lo
 * que antes estaba al final del Inicio: probar un sitio y salir del modo
 * protegido con el PIN de la persona adulta.
 */
export default function ProtectedSettingsScreen() {
  const router = useRouter();
  const { deviceName, isDevice, vpnOn, pausedByAdult, blocklist, totalSites, requestExit } =
    useProtectedDevice();

  const protectedNow = IS_ANDROID ? vpnOn : !pausedByAdult;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProtectedScreenHeader title="Configuración" />

        <View style={styles.profileCard}>
          <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no">
            <Text style={styles.avatarText}>{initial(deviceName)}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {deviceName ? `Perfil de ${deviceName}` : "Este dispositivo"}
            </Text>
            <View style={styles.statusRow}>
              <Ionicons
                name={protectedNow ? "checkmark-circle" : "pause-circle"}
                size={16}
                color={protectedNow ? colors.successText : colors.warningText}
              />
              <Text
                style={[styles.statusText, protectedNow ? styles.statusOn : styles.statusOff]}
              >
                {protectedNow ? "Protección activa" : "Protección pausada"}
              </Text>
            </View>
            <Text style={styles.profileMeta}>
              {blocklist.data
                ? `${totalSites.toLocaleString("es-AR")} sitios de apuestas en la lista`
                : "Cargando la lista de sitios..."}
            </Text>
            <Text style={styles.profileMeta}>
              {isDevice
                ? "Vinculado con un código de la persona adulta"
                : "Vinculado con la cuenta de la persona adulta"}
            </Text>
          </View>
        </View>

        <View style={styles.group}>
          <SettingsRow
            icon="search-outline"
            label="Probar un sitio"
            description="Fijate si un sitio está en la lista de bloqueo"
            onPress={() => router.push("/protected/configuracion/probar-sitio")}
          />
          <SettingsRow
            icon="help-circle-outline"
            label="Preguntas frecuentes"
            description="Qué bloquea BA Protege+ y por qué"
            onPress={() => router.push("/protected/preguntas-frecuentes")}
          />
          <SettingsRow
            icon="bulb-outline"
            label="Consejos para navegar seguro"
            onPress={() => router.navigate("/protected/navegacion")}
          />
          <SettingsRow
            icon="log-out-outline"
            label="Salir del modo protegido"
            description="Pide el PIN de la persona adulta"
            onPress={requestExit}
            last
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: protectedColors.cardBorder,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: protectedColors.greenCircle,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: protectedColors.greenIcon,
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    ...typography.subtitle,
    fontSize: 17,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusOn: {
    color: colors.successText,
  },
  statusOff: {
    color: colors.warningText,
  },
  profileMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: protectedColors.cardBorder,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    ...shadow.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: protectedColors.grayCircle,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.text,
  },
  rowDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
});
