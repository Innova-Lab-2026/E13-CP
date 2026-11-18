// Detalle por dispositivo (Figma "Detalle por dispositivo - Responsable"):
// encabezado "Dispositivo de <nombre>", tarjeta resumen con la edad y las webs
// bloqueadas en la semana, y el historial reciente. Debajo, discretos, quedan la
// pausa de la protección y el desvincular con PIN, que Figma no muestra.
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { AppState, Pressable, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AppAlert from '../../../../src/components/AppAlert';
import AppButton from '../../../../src/components/AppButton';
import AppSwitch from '../../../../src/components/AppSwitch';
import ConfirmModal from '../../../../src/components/ConfirmModal';
import DeviceAvatar from '../../../../src/components/DeviceAvatar';
import PinInput from '../../../../src/components/PinInput';
import RestrictionSummaryCard, {
  type MetricItem,
} from '../../../../src/components/RestrictionSummaryCard';
import ScreenState from '../../../../src/components/ScreenState';
import type { HistoryVariant } from '../../../../src/components/historial/HistoryCard';
import { useAsyncResource } from '../../../../src/hooks/useAsyncResource';
import {
  generateLinkCode,
  getDeviceById,
  setDeviceProtection,
  type Device,
} from '../../../../src/services/deviceService';
import { getDeviceActivities, type HistoryEvent } from '../../../../src/services/historyService';
import { errorMessage } from '../../../../src/services/api';
import { formatDate, formatDayLabel, formatTime } from '../../../../src/utils/date';
import {
  ageFromBirthDate,
  countBlockedLastWeek,
  formatRelativeTime,
  plural,
} from '../../../../src/utils/dispositivos';
import { colors, radius, shadow, spacing, typography } from '../../../../src/theme';

/** Eventos que se muestran en el resumen; el resto, en "Ver todo". */
const PREVIEW_ACTIVITIES = 5;

/** Mientras el perfil está pendiente, cada cuánto se revisa si el celular ya se vinculó. */
const PENDING_POLL_MS = 20_000;

const STATUS_TEXT: Record<Device['status'], string> = {
  active: 'Protección activa',
  pending: 'Pendiente de vinculación',
  disabled: 'Protección pausada',
};

const STATUS_TONE = {
  active: 'success',
  pending: 'warning',
  disabled: 'danger',
} as const;

type IconName = ComponentProps<typeof Ionicons>['name'];

const ROW_ICON: Record<HistoryVariant, { name: IconName; color: string; background: string }> = {
  blocked: { name: 'ban', color: colors.danger, background: colors.dangerSoft },
  alert: { name: 'alert-circle-outline', color: colors.warning, background: colors.warningSoft },
  settings: { name: 'settings-outline', color: colors.textMuted, background: colors.surfaceMuted },
  protected: { name: 'shield-checkmark-outline', color: colors.success, background: colors.successSoft },
};

function formatLastSeen(value?: string): string | null {
  if (!value) return null;
  const day = formatDayLabel(value);
  const time = formatTime(value);
  if (!day) return null;
  return time ? `${day} · ${time}` : day;
}

function formatLinkedAt(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatDate(date);
}

export default function DeviceDetailScreen() {
  const router = useRouter();
  const { deviceId: routeDeviceId } = useLocalSearchParams<{ deviceId?: string | string[] }>();
  const deviceId = (Array.isArray(routeDeviceId) ? routeDeviceId[0] : routeDeviceId) ?? '';

  const deviceResource = useAsyncResource(
    () => (deviceId ? getDeviceById(deviceId) : Promise.resolve(undefined)),
    [deviceId],
  );
  const activitiesResource = useAsyncResource(
    () => (deviceId ? getDeviceActivities(deviceId) : Promise.resolve([])),
    [deviceId],
  );

  const [confirmPauseVisible, setConfirmPauseVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [protectionError, setProtectionError] = useState<string | null>(null);
  const [protectionNotice, setProtectionNotice] = useState<string | null>(null);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);

  const [unlinkVisible, setUnlinkVisible] = useState(false);
  const [unlinkPin, setUnlinkPin] = useState('');
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const device = deviceResource.data;
  const firstLoad = deviceResource.loading && !device;
  const deviceStatus = device?.status;
  const reloadDevice = deviceResource.reload;

  // Mientras esté pendiente se vuelve a consultar: el menor puede vincular su
  // celular en cualquier momento.
  useEffect(() => {
    if (deviceStatus !== 'pending') return;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') reloadDevice();
    }, PENDING_POLL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reloadDevice();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [deviceStatus, reloadDevice]);

  // Si se vinculó con la pantalla abierta, se avisa.
  const previousStatus = useRef(deviceStatus);
  useEffect(() => {
    if (previousStatus.current === 'pending' && deviceStatus && deviceStatus !== 'pending') {
      setLinkNotice(null);
      setProtectionNotice(`¡Listo! El celular de ${device?.name ?? 'tu hijo o hija'} ya está vinculado.`);
    }
    previousStatus.current = deviceStatus;
  }, [deviceStatus, device?.name]);

  const goToLinkCode = () => {
    if (!device) return;
    router.push({
      pathname: '/(main)/(tabs)/dispositivos/device-success',
      params: { deviceId: device.id, name: device.name },
    });
  };

  const goToHistory = () => {
    if (!device) return;
    router.push({
      pathname: '/(main)/(tabs)/dispositivos/historial/[deviceId]',
      params: { deviceId: device.id },
    });
  };

  const openUnlink = () => {
    setUnlinkPin('');
    setUnlinkError(null);
    setUnlinkVisible(true);
  };

  const closeUnlink = () => {
    if (unlinking) return;
    setUnlinkVisible(false);
    setUnlinkPin('');
    setUnlinkError(null);
  };

  // Desvincular: con el PIN, el servidor revoca la credencial del celular y deja
  // el perfil pendiente con un código nuevo para volver a vincularlo.
  const handleUnlink = async () => {
    if (!device || unlinking) return;
    if (unlinkPin.length !== 4) {
      setUnlinkError('Ingresá los 4 dígitos del PIN.');
      return;
    }
    setUnlinking(true);
    setUnlinkError(null);
    try {
      await generateLinkCode(device.id, unlinkPin);
      setUnlinkVisible(false);
      setUnlinkPin('');
      setProtectionNotice(null);
      await deviceResource.reload();
      setLinkNotice(
        `Desvinculaste el celular de ${device.name}. Si querés volver a vincularlo, tocá «Ver código de vinculación».`,
      );
    } catch (error) {
      setUnlinkPin('');
      setUnlinkError(errorMessage(error, 'No pudimos desvincular el celular. Intentá de nuevo.'));
    } finally {
      setUnlinking(false);
    }
  };

  const changeProtection = async (active: boolean) => {
    if (!device) return;
    setUpdating(true);
    setProtectionError(null);
    setProtectionNotice(null);
    try {
      await setDeviceProtection(device.id, active);
      await deviceResource.reload();
      setConfirmPauseVisible(false);
      setProtectionNotice(
        active
          ? `La protección de ${device.name} está activa de nuevo. Se aplica cuando su celular abre BA Protege+ con conexión.`
          : `Pausaste la protección de ${device.name}. Se aplica cuando su celular abre BA Protege+ con conexión, y podés volver a activarla cuando quieras.`,
      );
    } catch (error) {
      setProtectionError(errorMessage(error, 'No pudimos cambiar la protección. Intentá de nuevo.'));
    } finally {
      setUpdating(false);
    }
  };

  const handleToggle = (nextValue: boolean) => {
    setProtectionError(null);
    if (nextValue) {
      changeProtection(true);
    } else {
      setConfirmPauseVisible(true);
    }
  };

  const renderHistory = (current: Device) => {
    const events = activitiesResource.data ?? [];
    const isPending = current.status === 'pending';

    return (
      <View style={styles.historySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header" numberOfLines={1}>
            Historial de {current.name}
          </Text>
          {events.length > 0 ? (
            <Pressable
              onPress={goToHistory}
              style={styles.seeAll}
              accessibilityRole="button"
              accessibilityLabel={`Ver todo el historial de ${current.name}`}
              hitSlop={8}
            >
              <Text style={styles.seeAllText}>Ver todo</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </Pressable>
          ) : null}
        </View>

        {events.length > 0 ? (
          <View style={styles.historyCard}>
            {events.slice(0, PREVIEW_ACTIVITIES).map((event, index) => (
              <HistoryRow
                key={event.id}
                event={event}
                last={index === Math.min(events.length, PREVIEW_ACTIVITIES) - 1}
                onPress={() =>
                  router.push({
                    pathname: '/(main)/(tabs)/historial/[historyId]',
                    params: { historyId: event.id },
                  })
                }
              />
            ))}
          </View>
        ) : (
          <ScreenState
            loading={activitiesResource.loading && !activitiesResource.data}
            error={!activitiesResource.data ? activitiesResource.error : null}
            onRetry={activitiesResource.reload}
            isEmpty={!!activitiesResource.data}
            emptyTitle="Todavía no hay actividad"
            emptyText={
              isPending
                ? 'Cuando vincules el celular, los eventos de este perfil van a aparecer acá.'
                : 'Cuando se registren eventos de este dispositivo, los vas a encontrar acá.'
            }
          />
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (firstLoad || (deviceResource.error && !device)) {
      return (
        <ScreenState loading={firstLoad} error={deviceResource.error} onRetry={deviceResource.reload} />
      );
    }

    if (!device) {
      return (
        <View style={styles.notFound}>
          <ScreenState
            isEmpty
            emptyTitle="No encontramos este dispositivo"
            emptyText="Puede que lo hayan quitado. Volvé a la lista y elegí otro perfil."
          />
          <AppButton
            title="Volver a Mis dispositivos"
            variant="secondary"
            onPress={() => router.dismissTo('/(main)/(tabs)/dispositivos')}
          />
        </View>
      );
    }

    const isPending = device.status === 'pending';
    const isProtected = device.status === 'active';
    const linkedAt = formatLinkedAt(device.linkedAt);
    const lastSeen = formatLastSeen(device.lastSeen);
    const age = ageFromBirthDate(device.birthDate);
    const blockedThisWeek = countBlockedLastWeek(activitiesResource.data ?? [], device.id);

    const metrics: MetricItem[] = [];
    if (age !== null) {
      metrics.push({
        value: age,
        unit: plural(age, 'año', 'años'),
        accessibilityLabel: `${age} ${plural(age, 'año', 'años')}`,
      });
    }
    if (!isPending) {
      metrics.push({
        sublabel: 'Esta semana',
        value: activitiesResource.data ? blockedThisWeek : '…',
        label: plural(blockedThisWeek, 'Web bloqueada', 'Webs bloqueadas'),
        isDanger: blockedThisWeek > 0,
        accessibilityLabel: activitiesResource.data
          ? `Esta semana, ${blockedThisWeek} ${plural(blockedThisWeek, 'web bloqueada', 'webs bloqueadas')}`
          : 'Cargando las webs bloqueadas de esta semana',
      });
    }

    const subtitle = isPending
      ? 'Celular sin vincular'
      : linkedAt
        ? `Vinculado el ${linkedAt}`
        : 'Celular vinculado';

    return (
      <>
        <View style={styles.profileHeader}>
          <DeviceAvatar seed={device.id} size={64} />
          <View style={styles.flex}>
            <Text style={styles.title} accessibilityRole="header">
              Dispositivo de {device.name}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <RestrictionSummaryCard
          statusText={STATUS_TEXT[device.status]}
          tone={STATUS_TONE[device.status]}
          metrics={metrics}
        />

        {isPending ? (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>Falta vincular el celular de {device.name}</Text>
            <Text style={styles.pendingText}>
              Con el código de vinculación, la protección empieza a funcionar en su celular.
            </Text>
            {linkNotice ? <AppAlert variant="success" message={linkNotice} /> : null}
            <AppButton
              title="Ver código de vinculación"
              onPress={goToLinkCode}
              accessibilityLabel={`Ver el código de vinculación de ${device.name}`}
            />
          </View>
        ) : null}

        {protectionNotice ? <AppAlert variant="success" message={protectionNotice} /> : null}

        {renderHistory(device)}

        {!isPending ? (
          <View style={styles.settings}>
            <Text style={styles.settingsTitle} accessibilityRole="header">
              Ajustes de la protección
            </Text>
            <View style={styles.protectionRow}>
              <View style={styles.flex}>
                <Text style={styles.protectionTitle}>Protección</Text>
                <Text style={styles.protectionDescription}>
                  {isProtected
                    ? 'Los sitios de apuestas del listado oficial están bloqueados en este celular.'
                    : `La protección está pausada. El cambio se aplica cuando el celular de ${device.name} abre BA Protege+ con conexión.`}
                </Text>
              </View>
              <AppSwitch
                accessibilityLabel={`Protección de ${device.name}`}
                value={isProtected}
                onValueChange={handleToggle}
                disabled={updating}
              />
            </View>

            {protectionError && !confirmPauseVisible ? (
              <AppAlert variant="error" message={protectionError} />
            ) : null}

            {lastSeen ? <Text style={styles.meta}>Última actividad: {lastSeen}</Text> : null}

            <Pressable
              onPress={openUnlink}
              style={styles.unlink}
              accessibilityRole="button"
              accessibilityLabel={`Desvincular el celular de ${device.name}`}
              hitSlop={6}
            >
              <Ionicons name="unlink-outline" size={18} color={colors.dangerText} />
              <Text style={styles.unlinkText}>Desvincular este celular</Text>
            </Pressable>
          </View>
        ) : null}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        {renderContent()}
      </ScrollView>

      <ConfirmModal
        visible={confirmPauseVisible}
        title="¿Pausar la protección?"
        message={
          device
            ? `Cuando el celular de ${device.name} abra BA Protege+ con conexión, los sitios de apuestas dejan de bloquearse hasta que vuelvas a activarla.`
            : undefined
        }
        confirmLabel="Pausar protección"
        cancelLabel="Mantener activa"
        destructive
        busy={updating}
        error={protectionError}
        onConfirm={() => changeProtection(false)}
        onCancel={() => {
          if (updating) return;
          setConfirmPauseVisible(false);
          setProtectionError(null);
        }}
      />

      <ConfirmModal
        visible={unlinkVisible}
        title="¿Desvincular este celular?"
        message={
          device
            ? `El celular de ${device.name} deja de estar protegido. Para volver a vincularlo vas a necesitar un código nuevo. Si lo vinculaste iniciando sesión con tu cuenta en su celular, esa sesión sigue abierta ahí: cerrala desde ese celular. Ingresá tu PIN para confirmar.`
            : undefined
        }
        confirmLabel="Desvincular"
        destructive
        busy={unlinking}
        error={unlinkError}
        onConfirm={handleUnlink}
        onCancel={closeUnlink}
      >
        <PinInput
          value={unlinkPin}
          onChange={(value) => {
            setUnlinkPin(value);
            setUnlinkError(null);
          }}
          label="Tu PIN de seguridad"
          autoFocus
        />
      </ConfirmModal>
    </SafeAreaView>
  );
}

/** Fila compacta del historial reciente: ícono, título, detalle y tiempo relativo. */
function HistoryRow({
  event,
  last,
  onPress,
}: {
  event: HistoryEvent;
  last: boolean;
  onPress: () => void;
}) {
  const icon = ROW_ICON[event.variant] ?? ROW_ICON.settings;
  const detail = event.domain || event.description;
  const when = formatRelativeTime(event.timestamp);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}. ${detail}. ${when}`}
      accessibilityHint="Abre el detalle de la actividad"
    >
      <View style={[styles.rowIcon, { backgroundColor: icon.background }]}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Text style={styles.rowTime}>{when}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  pendingCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  pendingTitle: {
    ...typography.subtitle,
  },
  pendingText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  historySection: {
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  historyCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  rowDetail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  rowTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  settings: {
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  protectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  protectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  protectionDescription: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  unlink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  unlinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dangerText,
    textDecorationLine: 'underline',
  },
  notFound: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
});
