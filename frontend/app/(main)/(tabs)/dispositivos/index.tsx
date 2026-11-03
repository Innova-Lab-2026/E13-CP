import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../../../../src/components/AppHeader';
import DeviceItem from '../../../../src/components/DeviceItem';
import AddDeviceButton from '../../../../src/components/AddDeviceButton';
import ScreenState from '../../../../src/components/ScreenState';
import { useAsyncResource } from '../../../../src/hooks/useAsyncResource';
import { getDevices } from '../../../../src/services/deviceService';
import { colors, spacing, typography } from '../../../../src/theme';

export default function DevicesScreen() {
  const router = useRouter();
  const { data: devices, loading, error, reload } = useAsyncResource(() => getDevices(), []);

  const handleAddDevice = () => {
    router.push('/(main)/(tabs)/dispositivos/add-device');
  };

  const hasDevices = (devices?.length ?? 0) > 0;
  // Sólo mostramos el indicador de carga la primera vez; al volver a la pestaña
  // la lista queda visible mientras se actualiza.
  const showState = !devices || !hasDevices;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppHeader title="Mis dispositivos" hideBack />
        <Text style={styles.subtitle}>
          Acá ves cada perfil que cuidás y el estado de su protección.
        </Text>

        {showState ? (
          <ScreenState
            loading={loading && !devices}
            error={!devices ? error : null}
            onRetry={reload}
            isEmpty={!!devices && !hasDevices}
            emptyTitle="Todavía no agregaste dispositivos"
            emptyText="Creá el perfil de quien usa el celular y después vinculalo desde ese teléfono."
          />
        ) : null}

        <View style={styles.list}>
          {devices?.map((device) => (
            <DeviceItem
              key={device.id}
              name={device.name}
              status={device.status}
              birthDate={device.birthDate}
              onPress={() =>
                router.push({
                  pathname: '/(main)/(tabs)/dispositivos/[deviceId]',
                  params: { deviceId: device.id },
                })
              }
            />
          ))}

          {devices || error ? <AddDeviceButton onPress={handleAddDevice} /> : null}
        </View>
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
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  subtitle: {
    ...typography.body,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  list: {
    width: '100%',
    marginTop: spacing.sm,
  },
});
