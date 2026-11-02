import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../../../../src/components/AppHeader';
import AppAlert from '../../../../src/components/AppAlert';
import AppButton from '../../../../src/components/AppButton';
import AppSwitch from '../../../../src/components/AppSwitch';
import ConfirmModal from '../../../../src/components/ConfirmModal';
import DeviceLinkSteps from '../../../../src/components/DeviceLinkSteps';
import RestrictionSummaryCard from '../../../../src/components/RestrictionSummaryCard';
import ScreenState from '../../../../src/components/ScreenState';
import HistoryCard from '../../../../src/components/historial/HistoryCard';
import { useAsyncResource } from '../../../../src/hooks/useAsyncResource';
import {
  getDeviceById,
  setDeviceProtection,
  type Device,
} from '../../../../src/services/deviceService';
import { getDeviceActivities } from '../../../../src/services/historyService';
import { errorMessage } from '../../../../src/services/api';
import { formatDayLabel, formatIsoDate, formatTime } from '../../../../src/utils/date';
import { colors, radius, spacing, typography } from '../../../../src/theme';

const MAX_ACTIVITIES = 10;

const STATUS_TEXT: Record<Device['status'], string> = {
  active: 'Protección activa',
  pending: 'Pendiente de vinculación',
  disabled: 'Protección pausada',
};

function formatLastSeen(value?: string): string {
  if (!value) return 'Sin registros';
  const day = formatDayLabel(value);
  const time = formatTime(value);
  if (!day) return 'Sin registros';
  return time ? `${day} · ${time}` : day;
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

  const device = deviceResource.data;
  const firstLoad = deviceResource.loading && !device;

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
      setProtectionError(
        errorMessage(error, 'No pudimos cambiar la protección. Intentá de nuevo.'),
      );
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

  const renderContent = () => {
    if (firstLoad || (deviceResource.error && !device)) {
      return (
        <ScreenState
          loading={firstLoad}
          error={deviceResource.error}
          onRetry={deviceResource.reload}
        />
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
            onPress={() => router.dismissTo('/(main)/(tabs)/(dispositivos)')}
          />
        </View>
      );
    }

    const isPending = device.status === 'pending';
    const isProtected = device.status === 'active';
    const birthDate = device.birthDate ? formatIsoDate(device.birthDate) : 'No especificada';

    return (
      <>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{device.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {device.name}
          </Text>
        </View>

        {isPending ? (
          <View style={styles.section}>
            <AppAlert
              variant="warning"
              message={`El perfil de ${device.name} todavía no está vinculado. Seguí estos pasos en su celular para activar la protección.`}
            />
            <DeviceLinkSteps name={device.name} linkCode={device.linkCode} />
            <View style={styles.infoCard}>
              <InfoRow label="Estado" value={STATUS_TEXT.pending} />
              <InfoRow label="Fecha de nacimiento" value={birthDate} last />
            </View>
          </View>
        ) : (
          <>
            <RestrictionSummaryCard
              statusText={STATUS_TEXT[device.status]}
              isProtected={isProtected}
              metrics={[
                { sublabel: 'Fecha de nacimiento', value: birthDate },
                { sublabel: 'Última actividad', value: formatLastSeen(device.lastSeen) },
              ]}
            />

            <View style={styles.protectionCard}>
              <View style={styles.protectionText}>
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

            {protectionError && !confirmPauseVisible ? <AppAlert variant="error" message={protectionError} /> : null}
            {protectionNotice ? <AppAlert variant="success" message={protectionNotice} /> : null}

            <View style={[styles.infoCard, styles.section]}>
              <InfoRow label="Estado" value={STATUS_TEXT[device.status]} />
              <InfoRow label="Fecha de nacimiento" value={birthDate} />
              <InfoRow label="Última actividad" value={formatLastSeen(device.lastSeen)} last />
            </View>
          </>
        )}

        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Actividad de {device.name}</Text>
          {activitiesResource.data && activitiesResource.data.length > 0 ? (
            <>
              {activitiesResource.data.slice(0, MAX_ACTIVITIES).map((activity) => (
                <HistoryCard
                  key={activity.id}
                  variant={activity.variant}
                  title={activity.title}
                  description={activity.description}
                  time={`${activity.date} · ${activity.time}`}
                  device={device.name}
                />
              ))}
              {activitiesResource.data.length > MAX_ACTIVITIES ? (
                <AppButton
                  title="Ver todo en Historial"
                  variant="tertiary"
                  onPress={() => router.push('/(main)/(tabs)/(historial)')}
                />
              ) : null}
            </>
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
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppHeader title="Detalle del dispositivo" onBackPress={() => router.back()} />
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
    </SafeAreaView>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowDivider]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
    paddingBottom: spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  section: {
    gap: spacing.lg,
  },
  protectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  protectionText: {
    flex: 1,
    gap: spacing.xs,
  },
  protectionTitle: {
    ...typography.subtitle,
  },
  protectionDescription: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 17,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  infoRow: {
    paddingVertical: spacing.md,
    gap: 2,
  },
  infoRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    ...typography.caption,
  },
  infoValue: {
    ...typography.label,
    fontSize: 15,
  },
  activitySection: {
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 17,
    marginBottom: spacing.md,
  },
  notFound: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
});
