// "Historial de <nombre>" (Figma "Historial por dispositivo - Responsable"):
// todos los eventos de un perfil, agrupados por día, sin filtros.
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../../../../../src/components/AppHeader';
import ScreenState from '../../../../../src/components/ScreenState';
import HistoryEventList from '../../../../../src/components/historial/HistoryEventList';
import { useAsyncResource } from '../../../../../src/hooks/useAsyncResource';
import { getDeviceById } from '../../../../../src/services/deviceService';
import { getDeviceActivities } from '../../../../../src/services/historyService';
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

  const eventList = events.data ?? [];
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

        {eventList.length === 0 ? (
          <ScreenState
            loading={events.loading && !events.data}
            error={!events.data ? events.error : null}
            onRetry={events.reload}
            isEmpty={!!events.data}
            emptyTitle="Todavía no hay actividad"
            emptyText="Cuando se registren eventos de este dispositivo, los vas a encontrar acá."
          />
        ) : (
          // El nombre del perfil ya está en el título: las tarjetas no lo repiten.
          <HistoryEventList
            events={eventList}
            hideDeviceName
            onPressEvent={(event) =>
              router.push({
                pathname: '/(main)/(tabs)/historial/[historyId]',
                params: { historyId: event.id },
              })
            }
          />
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
});
