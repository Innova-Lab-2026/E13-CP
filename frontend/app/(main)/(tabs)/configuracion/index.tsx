import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../../src/components/ThemedText";
import { useRouter, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import AppHeader from "../../../../src/components/AppHeader";
import ConfirmModal from "../../../../src/components/ConfirmModal";
import { logout } from "../../../../src/services/auth";
import { errorMessage } from "../../../../src/services/api";
import { colors, radius, shadow, spacing, typography } from "../../../../src/theme";

type MenuRowProps = {
  /** Ícono ya dibujado (Ionicons o MaterialCommunityIcons), de 20 px. */
  icon: ReactNode;
  label: string;
  hint?: string;
  onPress: () => void;
  /** Círculo rojo suave, como la sirena de "¿Querés sugerir un sitio?" en el Figma. */
  highlight?: boolean;
  /** La última fila de la tarjeta no lleva separador. */
  last?: boolean;
};

/** Fila del menú de Configuración: ícono en círculo, texto y chevron. */
function MenuRow({ icon, label, hint, onPress, highlight = false, last = false }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <View style={[styles.rowInner, !last && styles.rowDivider]}>
        <View
          style={[styles.rowIcon, highlight && styles.rowIconHighlight]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {icon}
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      </View>
    </Pressable>
  );
}

const ICON_SIZE = 20;
const ICON_COLOR = colors.text;

export default function ConfiguracionScreen() {
  const router = useRouter();

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

        {/* Tarjeta principal: las filas del Figma, en el mismo orden. */}
        <View style={styles.card}>
          <MenuRow
            icon={<Ionicons name="person-outline" size={ICON_SIZE} color={ICON_COLOR} />}
            label="Mi cuenta"
            hint="Nombre, teléfono y correo"
            onPress={go("/(main)/(tabs)/configuracion/mi-cuenta")}
          />
          <MenuRow
            icon={<Ionicons name="lock-closed-outline" size={ICON_SIZE} color={ICON_COLOR} />}
            label="Privacidad y seguridad"
            hint="Cambiá el PIN de seguridad de tu cuenta"
            onPress={go("/(main)/(tabs)/configuracion/privacidad")}
          />
          <MenuRow
            icon={
              <MaterialCommunityIcons
                name="alarm-light-outline"
                size={ICON_SIZE}
                color={colors.danger}
              />
            }
            label="¿Querés sugerir un sitio?"
            hint="Contanos de un sitio de apuestas que no esté en la lista"
            onPress={go("/(main)/(tabs)/configuracion/sugerir-sitio")}
            highlight
          />
          <MenuRow
            icon={<Ionicons name="star-outline" size={ICON_SIZE} color={ICON_COLOR} />}
            label="Ayudanos a mejorar"
            onPress={go("/(main)/(tabs)/configuracion/mejorar")}
          />
          <MenuRow
            icon={
              <MaterialCommunityIcons name="shield-search" size={ICON_SIZE} color={ICON_COLOR} />
            }
            label="Términos y políticas"
            onPress={go("/(main)/(tabs)/configuracion/terminos")}
          />
          <MenuRow
            icon={<Ionicons name="log-out-outline" size={ICON_SIZE} color={ICON_COLOR} />}
            label="Cerrar sesión"
            onPress={() => {
              setLogoutError(null);
              setLogoutVisible(true);
            }}
          />
          <MenuRow
            icon={<Ionicons name="close-circle-outline" size={ICON_SIZE} color={ICON_COLOR} />}
            label="Eliminar cuenta"
            hint="Borra tu cuenta y desvincula tus dispositivos"
            onPress={go("/(main)/(tabs)/configuracion/eliminar-cuenta")}
            last
          />
        </View>

        {/* Lo que la app suma al Figma, en una tarjeta aparte y más discreta. */}
        <Text style={styles.sectionTitle}>Más opciones</Text>
        <View style={[styles.card, styles.cardSecondary]}>
          <MenuRow
            icon={
              <Ionicons name="shield-checkmark-outline" size={ICON_SIZE} color={ICON_COLOR} />
            }
            label="Sitios bloqueados"
            hint="Listado oficial de LOTBA y tus sitios agregados"
            onPress={go("/(main)/(tabs)/configuracion/sitios")}
          />
          <MenuRow
            icon={<Ionicons name="help-circle-outline" size={ICON_SIZE} color={ICON_COLOR} />}
            label="Ayuda y preguntas frecuentes"
            onPress={go("/(main)/(tabs)/configuracion/ayuda")}
            last
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
    backgroundColor: colors.backgroundWarm,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xl,
    overflow: "hidden",
    ...shadow.card,
  },
  cardSecondary: {
    shadowOpacity: 0,
    elevation: 0,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.xs,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconHighlight: {
    backgroundColor: colors.dangerStrongSoft,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
});
