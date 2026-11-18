// "Mis Dispositivos" (Figma "Mis Dispositivos - Responsable"): filas compactas
// con el estado a la derecha y el botón punteado para agregar otro perfil.
import { View, StyleSheet, ScrollView, Text, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import DeviceItem from '../../../../src/components/DeviceItem';
import AddDeviceButton from '../../../../src/components/AddDeviceButton';
import ScreenState from '../../../../src/components/ScreenState';
import { useAsyncResource } from '../../../../src/hooks/useAsyncResource';
import { getDevices } from '../../../../src/services/deviceService';
import { colors, spacing } from '../../../../src/theme';

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

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && devices !== undefined}
            onRefresh={reload}
            tintColor={colors.text}
          />
        }
      >
        <Text style={styles.title} accessibilityRole="header">
          Mis Dispositivos
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
              deviceId={device.id}
              name={device.name}
              status={device.status}
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
    marginLeft: spacing.xs,
  },
  list: {
    width: '100%',
  },
});
