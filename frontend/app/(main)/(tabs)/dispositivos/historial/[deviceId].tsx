// "Historial de <nombre>" (Figma "Historial por dispositivo - Responsable"):
// todos los eventos de un perfil, agrupados por día, sin filtros.
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../../../../../src/components/AppHeader';
import ScreenState from '../../../../../src/components/ScreenState';
import HistoryCard from '../../../../../src/components/historial/HistoryCard';
import { useAsyncResource } from '../../../../../src/hooks/useAsyncResource';
import { getDeviceById } from '../../../../../src/services/deviceService';
import { getDeviceActivities } from '../../../../../src/services/historyService';
import { formatCardTime, groupByDay } from '../../../../../src/utils/dispositivos';
import { colors, spacing } from '../../../../../src/theme';

export default function DeviceHistoryScreen() {
  const router = useRouter();
  const { deviceId: routeDeviceId } = useLocalSearchParams<{ deviceId?: string | string[] }>();
  const deviceId = (Array.isArray(routeDeviceId) ? routeDeviceId[0] : routeDeviceId) ?? '';

  const device = useAsyncResource(
    () => (deviceId ? getDeviceById(deviceId) : Promise.resolve(undefined)),
    [deviceId],
  );
  const events = useAsyncResource(
    () => (deviceId ? getDeviceActivities(deviceId) : Promise.resolve([])),
    [deviceId],
  );

  const groups = useMemo(() => groupByDay(events.data ?? []), [events.data]);
  const name = device.data?.name;
  const title = name ? `Historial de ${name}` : 'Historial';

  const reloadAll = () => {
    device.reload();
    events.reload();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={events.loading && events.data !== undefined}
            onRefresh={reloadAll}
            tintColor={colors.text}
          />
        }
      >
        <AppHeader title={title} onBackPress={() => router.back()} />

        {groups.length === 0 ? (
          <ScreenState
            loading={events.loading && !events.data}
            error={!events.data ? events.error : null}
            onRetry={events.reload}
            isEmpty={!!events.data}
            emptyTitle="Todavía no hay actividad"
            emptyText="Cuando se registren eventos de este dispositivo, los vas a encontrar acá."
          />
        ) : (
          groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.dayTitle} accessibilityRole="header">
                {group.title}
              </Text>
              {group.items.map((event) => (
                // El nombre del perfil ya está en el título: la tarjeta no lo repite.
                <HistoryCard
                  key={event.id}
                  variant={event.variant}
                  title={event.title}
                  description={event.domain || event.description}
                  time={formatCardTime(event.timestamp)}
                  device=""
                  onPress={() =>
                    router.push({
                      pathname: '/(main)/(tabs)/historial/[historyId]',
                      params: { historyId: event.id },
                    })
                  }
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  group: {
    marginBottom: spacing.md,
  },
  dayTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
});
