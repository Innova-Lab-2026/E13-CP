// Cuerpo de "Detalle del evento" (Figma): lo comparten el detalle de una alerta y
// el de un evento del historial.
import { Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../ThemedText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppButton from "../AppButton";
import { avatarColors } from "../DeviceAvatar";
import { colors, radius, shadow, spacing } from "../../theme";
import {
  STATUS_BY_VARIANT,
  historyLook,
  type HistoryIconName,
  type HistoryVariant,
} from "./historyLook";

type EventDetailProps = {
  variant: HistoryVariant;
  title: string;
  /** "Sofía intentó acceder a un sitio restringido". */
  sentence: string;
  deviceName: string;
  /** Id del perfil: fija el color del avatar (como en DeviceAvatar). */
  deviceId?: string;
  site?: string;
  /** "Hoy - 14:25". */
  dateTime: string;
  /** Estado del evento; por defecto, el de la variante ("Acceso bloqueado"...). */
  status?: string;
  /** Texto del bloque "¿QUÉ SIGNIFICA ESTO?". */
  meaning: string;
  guidance?: string;
  onViewHistory?: () => void;
  onViewDevice?: () => void;
};

export default function EventDetail({
  variant,
  title,
  sentence,
  deviceName,
  deviceId,
  site,
  dateTime,
  status,
  meaning,
  guidance,
  onViewHistory,
  onViewDevice,
}: EventDetailProps) {
  const look = historyLook(variant);
  // El mismo color de avatar que el perfil tiene en Mis dispositivos.
  const avatar = avatarColors(deviceId || deviceName);
  const statusLook = STATUS_BY_VARIANT[variant] ?? STATUS_BY_VARIANT.settings;
  const statusLabel = status ?? statusLook.label;

  const rows: { key: string; node: ReactNode; label: string; onPress?: () => void }[] = [
    {
      key: "device",
      label: `Dispositivo de ${deviceName}`,
      // Tocar la fila abre el detalle del dispositivo (Figma no tiene otro botón para eso).
      onPress: onViewDevice,
      node: (
        <>
          <View style={[styles.avatar, { backgroundColor: avatar.background }]}>
            <MaterialCommunityIcons name="account" size={20} color={avatar.icon} />
          </View>
          <Text style={styles.rowText}>
            Dispositivo de <Text style={styles.bold}>{deviceName}</Text>
          </Text>
        </>
      ),
    },
    ...(site
      ? [
          {
            key: "site",
            label: `Sitio web: ${site}`,
            node: <IconRow icon="link-variant" label="Sitio web" value={site} />,
          },
        ]
      : []),
    {
      key: "date",
      label: `Fecha y hora: ${dateTime}`,
      node: <IconRow icon="calendar-blank-outline" label="Fecha y hora" value={dateTime} />,
    },
    {
      key: "status",
      label: `Estado: ${statusLabel}`,
      node: (
        <>
          <View style={styles.rowIcon} />
          <View style={styles.flex}>
            <Text style={styles.rowLabel}>Estado</Text>
            <View style={styles.statusLine}>
              <MaterialCommunityIcons
                name={statusLook.icon}
                size={16}
                color={look.titleColor}
              />
              <Text style={[styles.statusText, { color: look.titleColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </>
      ),
    },
  ];

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: look.iconBackground }]}>
          <MaterialCommunityIcons name={look.icon} size={26} color={look.iconColor} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: look.titleColor }]} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.sentence}>{sentence}</Text>
        </View>
      </View>

      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={row.key}>
            {index > 0 ? <View style={styles.separator} /> : null}
            {row.onPress ? (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={row.onPress}
                accessibilityRole="button"
                accessibilityLabel={row.label}
                accessibilityHint="Abre el detalle del dispositivo"
              >
                {row.node}
              </Pressable>
            ) : (
              <View style={styles.row} accessible accessibilityLabel={row.label}>
                {row.node}
              </View>
            )}
          </Fragment>
        ))}
      </View>

      <View style={styles.meaning}>
        <Text style={styles.meaningTitle} accessibilityRole="header">
          ¿QUÉ SIGNIFICA ESTO?
        </Text>
        <Text style={styles.meaningText}>{meaning}</Text>
      </View>

      {/* Segundo bloque con el mismo estilo que el de Figma. */}
      {guidance ? (
        <View style={styles.meaning}>
          <Text style={styles.meaningTitle} accessibilityRole="header">
            ¿QUÉ PODÉS HACER?
          </Text>
          <Text style={styles.meaningText}>{guidance}</Text>
        </View>
      ) : null}

      {onViewHistory ? (
        <View style={styles.buttons}>
          <AppButton title={`Ver historial de ${deviceName}`} onPress={onViewHistory} />
        </View>
      ) : null}
    </View>
  );
}

function IconRow({
  icon,
  label,
  value,
}: {
  icon: HistoryIconName;
  label: string;
  value: string;
}) {
  return (
    <>
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  sentence: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xxxl,
    ...shadow.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderStrong,
    marginLeft: spacing.xxxl + spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  rowIcon: {
    width: 38,
    alignItems: "center",
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  bold: {
    fontWeight: "700",
  },
  rowLabel: {
    fontSize: 13,
    color: colors.text,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
  },
  meaning: {
    marginBottom: spacing.xl,
  },
  meaningTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  meaningText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  pressed: {
    opacity: 0.7,
  },
  // Como en Figma, el botón queda abajo de todo cuando sobra lugar.
  buttons: {
    marginTop: "auto",
    paddingTop: spacing.lg,
  },
});
