import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

// Componentes reutilizables
import AppHeader from '../../../../src/components/AppHeader';
import DeviceItem from '../../../../src/components/DeviceItem';
import AddDeviceButton from '../../../../src/components/AddDeviceButton';
import { getDevices } from '../../../../src/services/deviceService';

export default function DevicesScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState(getDevices);

  useFocusEffect(
    useCallback(() => {
      setDevices(getDevices());
    }, []),
  );

  const handleAddDevice = () => {
    router.push('/(main)/(tabs)/(dispositivos)/add-device');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Cabecera unificada con botón volver */}
        <AppHeader title="Mis Dispositivos" onBackPress={() => router.back()} />

        <View style={styles.list}>
          {devices.map((device) => (
            <DeviceItem
              key={device.id}
              name={device.name}
              status={device.status}
              birthDate={device.birthDate}
              onPress={() =>
                router.push({
                  pathname: '/(main)/(tabs)/(dispositivos)/[deviceId]',
                  params: { deviceId: device.id },
                })
              }
            />
          ))}

          {/* Botón para agregar nuevos dispositivos */}
          <AddDeviceButton onPress={handleAddDevice} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 24,
  },
  list: {
    width: '100%',
    marginTop: 8,
  },
});