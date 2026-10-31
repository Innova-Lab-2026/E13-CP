import { Pressable, Text, View, StyleSheet } from 'react-native';
import type { DeviceStatus } from '../services/deviceService';

/**
 * Tipos de estado sincronizados con el Backend.
 * - 'active': El dispositivo está vinculado y protegido correctamente.
 * - 'pending': El dispositivo está en proceso de vinculación (esperando PIN).
 * - 'disabled': El dispositivo fue desvinculado, pausado o desinstaló la app.
 */
export type { DeviceStatus } from '../services/deviceService';

interface DeviceItemProps {
  name: string;
  status: DeviceStatus;
  birthDate?: string;
  statusText?: string;
  onPress?: () => void;
}

export default function DeviceItem({
  name,
  status,
  birthDate,
  statusText,
  onPress,
}: DeviceItemProps) {
  // Evaluamos cada estado de manera explícita para evitar fallos visuales
  const isActive = status === 'active';
  const isPending = status === 'pending';
  const isDisabled = status === 'disabled';

  // Textos por defecto según el estado que reporte el backend
  const getDefaultStatusText = () => {
    if (isActive) return 'Protección activa';
    if (isPending) return 'Pendiente de vinculación';
    if (isDisabled) return 'Desprotegido / Inactivo';
    return 'Estado desconocido';
  };

  const displayStatusText = statusText || getDefaultStatusText();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={styles.leftContainer}>
        {/* Avatar / Inicial del menor o dispositivo dinámico */}
        <View
          style={[
            styles.avatar,
            isActive && styles.avatarActive,
            isPending && styles.avatarPending,
            isDisabled && styles.avatarDisabled,
          ]}
        >
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.name}>{name}</Text>
          {birthDate && (
            <Text style={styles.birthDate}>Nacimiento: {birthDate}</Text>
          )}
          <View style={styles.statusRow}>
            {/* Badge de estado con color dinámico (Verde, Amarillo o Rojo según corresponda) */}
            <View
              style={[
                styles.statusBadge,
                isActive && styles.badgeActive,
                isPending && styles.badgePending,
                isDisabled && styles.badgeDisabled,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isActive && styles.textActive,
                  isPending && styles.textPending,
                  isDisabled && styles.textDisabled,
                ]}
              >
                {displayStatusText}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {onPress && <Text style={styles.arrow}>›</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarActive: {
    backgroundColor: '#FEF3C7', // Tono amarillo suave del UI Kit
  },
  avatarPending: {
    backgroundColor: '#F3F4F6', // Tono gris neutro
  },
  avatarDisabled: {
    backgroundColor: '#FEE2E2', // Tono rojo suave para alertas/desactivados
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  infoContainer: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  birthDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeActive: {
    backgroundColor: '#DCFCE7', // Fondo verde claro
  },
  badgePending: {
    backgroundColor: '#FEF3C7', // Fondo amarillo claro
  },
  badgeDisabled: {
    backgroundColor: '#FEE2E2', // Fondo rojo claro (Alerta)
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  textActive: {
    color: '#166534', // Texto verde oscuro
  },
  textPending: {
    color: '#B45309', // Texto ámbar/marrón oscuro
  },
  textDisabled: {
    color: '#DC2626', // Texto rojo de advertencia/inactivo
  },
  arrow: {
    fontSize: 22,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
});