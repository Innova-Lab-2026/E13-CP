import { useState, type ComponentProps } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../../../../src/components/AppHeader";
import ConfirmModal from "../../../../src/components/ConfirmModal";
import { logout } from "../../../../src/services/auth";
import { useSession } from "../../../../src/services/session";
import { errorMessage } from "../../../../src/services/api";
import { colors, radius, shadow, spacing, typography } from "../../../../src/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type MenuRowProps = {
  icon: IconName;
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
};

function MenuRow({ icon, label, description, onPress, destructive = false }: MenuRowProps) {
  const tint = destructive ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
    >
      <View style={[styles.rowIcon, destructive && styles.rowIconDanger]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDanger]}>{label}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={destructive ? colors.danger : colors.textSubtle} />
    </Pressable>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

export default function ConfiguracionScreen() {
  const router = useRouter();
  const { session } = useSession();
  const profile = session?.profile;

  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const go = (href: Href) => () => router.push(href);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      setLogoutVisible(false);
      router.replace("/login");
    } catch (error) {
      setLogoutError(errorMessage(error, "No pudimos cerrar la sesión. Intentá de nuevo."));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppHeader title="Configuración" hideBack />

        <View style={styles.profileCard}>
          <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no">
            <Text style={styles.avatarText}>{initials(profile?.name ?? "")}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile?.name ?? "Tu cuenta"}
            </Text>
            {profile?.email ? (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {profile.email}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Tu cuenta</Text>
        <View style={styles.group}>
          <MenuRow
            icon="person-outline"
            label="Mi cuenta"
            description="Nombre, teléfono y correo"
            onPress={go("/(main)/(tabs)/(configuracion)/mi-cuenta")}
          />
          <MenuRow
            icon="keypad-outline"
            label="PIN de seguridad"
            description="Cambiá el PIN de 4 dígitos de tu cuenta"
            onPress={go("/pin-setup?change=1")}
          />
        </View>

        <Text style={styles.sectionTitle}>Protección</Text>
        <View style={styles.group}>
          <MenuRow
            icon="shield-checkmark-outline"
            label="Sitios bloqueados"
            description="Listado oficial de LOTBA y tus sitios agregados"
            onPress={go("/(main)/(tabs)/(configuracion)/sitios")}
          />
        </View>

        <Text style={styles.sectionTitle}>Ayuda</Text>
        <View style={styles.group}>
          <MenuRow
            icon="help-circle-outline"
            label="Ayuda y preguntas frecuentes"
            onPress={go("/(main)/(tabs)/(configuracion)/ayuda")}
          />
          <MenuRow
            icon="document-text-outline"
            label="Términos y políticas"
            onPress={go("/(main)/(tabs)/(configuracion)/terminos")}
          />
          <MenuRow
            icon="chatbubble-ellipses-outline"
            label="Ayudanos a mejorar"
            onPress={go("/(main)/(tabs)/(configuracion)/mejorar")}
          />
        </View>

        <View style={styles.group}>
          <MenuRow
            icon="log-out-outline"
            label="Cerrar sesión"
            onPress={() => {
              setLogoutError(null);
              setLogoutVisible(true);
            }}
          />
          <MenuRow
            icon="trash-outline"
            label="Eliminar cuenta"
            onPress={go("/(main)/(tabs)/(configuracion)/eliminar-cuenta")}
            destructive
          />
        </View>
      </ScrollView>

      <ConfirmModal
        visible={logoutVisible}
        title="¿Querés cerrar sesión?"
        message="Vas a tener que ingresar tu correo y contraseña para volver a entrar. La protección de los dispositivos vinculados sigue funcionando."
        confirmLabel="Cerrar sesión"
        onConfirm={handleLogout}
        onCancel={() => setLogoutVisible(false)}
        busy={loggingOut}
        error={logoutError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onBrand,
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    ...typography.subtitle,
    fontSize: 18,
  },
  profileEmail: {
    ...typography.body,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconDanger: {
    backgroundColor: colors.dangerSoft,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...typography.label,
    fontSize: 15,
  },
  rowLabelDanger: {
    color: colors.danger,
  },
  rowDescription: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
