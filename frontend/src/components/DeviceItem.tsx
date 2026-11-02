import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DeviceStatus } from '../services/deviceService';
import { colors, radius, spacing, typography } from '../theme';
import { formatIsoDate } from '../utils/date';

/**
 * Estados que devuelve el servicio de dispositivos.
 * - 'active': vinculado y con la protección encendida.
 * - 'pending': perfil creado, falta vincular el celular.
 * - 'disabled': vinculado, con la protección pausada.
 */
export type { DeviceStatus } from '../services/deviceService';

interface DeviceItemProps {
  name: string;
  status: DeviceStatus;
  /** AAAA-MM-DD (formato del backend) o un texto ya formateado. */
  birthDate?: string;
  statusText?: string;
  onPress?: () => void;
}

const STATUS_CONFIG: Record<
  DeviceStatus,
  { label: string; badge: string; text: string; avatar: string }
> = {
  active: {
    label: 'Protección activa',
    badge: colors.successSoft,
    text: colors.successText,
    avatar: colors.brandSoft,
  },
  pending: {
    label: 'Pendiente de vinculación',
    badge: colors.warningSoft,
    text: colors.warningText,
    avatar: colors.surfaceMuted,
  },
  disabled: {
    label: 'Protección pausada',
    badge: colors.dangerSoft,
    text: colors.dangerText,
    avatar: colors.dangerSoft,
  },
};

export default function DeviceItem({
  name,
  status,
  birthDate,
  statusText,
  onPress,
}: DeviceItemProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const label = statusText || config.label;
  const formattedBirthDate = birthDate ? formatIsoDate(birthDate) : undefined;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${name}. ${label}`}
      accessibilityHint={onPress ? 'Abre el detalle del dispositivo' : undefined}
    >
      <View style={styles.leftContainer}>
        <View style={[styles.avatar, { backgroundColor: config.avatar }]}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {formattedBirthDate ? (
            <Text style={styles.birthDate}>Nacimiento: {formattedBirthDate}</Text>
          ) : null}
          <View style={[styles.statusBadge, { backgroundColor: config.badge }]}>
            <Text style={[styles.statusText, { color: config.text }]}>{label}</Text>
          </View>
        </View>
      </View>

      {onPress ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  name: {
    ...typography.subtitle,
  },
  birthDate: {
    ...typography.caption,
    marginBottom: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
