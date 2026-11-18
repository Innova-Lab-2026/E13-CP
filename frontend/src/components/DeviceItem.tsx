// Fila compacta de un perfil protegido (Figma "Mis Dispositivos" y el inicio):
// avatar de color, nombre y, a la derecha, el estado de la protección.
import type { ComponentProps } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DeviceStatus } from '../services/deviceService';
import DeviceAvatar from './DeviceAvatar';
import { colors, radius, shadow, spacing } from '../theme';

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
  /** Id del perfil: fija el color del avatar. Si falta se usa el nombre. */
  deviceId?: string;
  /** Ya no se muestra en la fila (Figma); se acepta para no romper llamadas viejas. */
  birthDate?: string;
  statusText?: string;
  onPress?: () => void;
}

type IconName = ComponentProps<typeof Ionicons>['name'];

export const DEVICE_STATUS_CONFIG: Record<
  DeviceStatus,
  { label: string; icon: IconName; iconColor: string; text: string }
> = {
  active: {
    label: 'Protección activa',
    icon: 'checkmark-circle-outline',
    iconColor: colors.success,
    text: colors.successText,
  },
  pending: {
    label: 'Pendiente de vinculación',
    icon: 'alert-circle-outline',
    iconColor: colors.warning,
    text: colors.warningText,
  },
  disabled: {
    label: 'Protección pausada',
    icon: 'pause-circle-outline',
    iconColor: colors.danger,
    text: colors.dangerText,
  },
};

export default function DeviceItem({
  name,
  status,
  deviceId,
  statusText,
  onPress,
}: DeviceItemProps) {
  const config = DEVICE_STATUS_CONFIG[status] ?? DEVICE_STATUS_CONFIG.pending;
  const label = statusText || config.label;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${name}. ${label}`}
      accessibilityHint={onPress ? 'Abre el detalle del dispositivo' : undefined}
    >
      <DeviceAvatar seed={deviceId || name} />

      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>

      <View style={styles.status}>
        <Ionicons name={config.icon} size={15} color={config.iconColor} />
        <Text style={[styles.statusText, { color: config.text }]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.text} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.8,
  },
  name: {
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 48,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginLeft: spacing.xs,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
});
