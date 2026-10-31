import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../../../../src/components/AppButton';

export default function DeviceSuccessScreen() {
  const router = useRouter();
  const { pin, name } = useLocalSearchParams<{ pin: string; name: string }>();
  const deviceName = name || 'del dispositivo';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>¡Dispositivo creado!</Text>

        {/* Ícono de éxito estilizado */}
        <View style={styles.illustrationContainer}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
          <View style={styles.checkBadge}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        </View>

        <Text style={styles.instructionsTitle}>Ahora, vinculá a {deviceName}:</Text>

        <View style={styles.stepsContainer}>
          <Text style={styles.step}>1. Ingresá en BA Protege+ en el dispositivo de {deviceName}.</Text>
          <Text style={styles.step}>2. Elegí "Este dispositivo será protegido".</Text>
          <Text style={styles.step}>3. Iniciá sesión con la cuenta de adulto responsable.</Text>
          <Text style={styles.step}>4. Seleccioná el perfil correspondiente creado desde la app.</Text>
          <Text style={styles.step}>5. Ingresá el PIN de 4 dígitos para confirmar:</Text>
        </View>

        {/* PIN destacado */}
        <View style={styles.pinContainer}>
          <Text style={styles.pinText}>{pin || '----'}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <AppButton
            title="Volver a Mis Dispositivos"
            onPress={() => router.replace('/(main)/(tabs)/(dispositivos)')}
          />
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
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
    color: '#16A34A',
    textAlign: 'center',
  },
  illustrationContainer: {
    position: 'relative',
    width: 88,
    height: 88,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#86EFAC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    fontSize: 38,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1F2937',
    alignSelf: 'flex-start',
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  step: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  pinContainer: {
    marginVertical: 12,
    paddingHorizontal: 30,
    paddingVertical: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
    width: '100%',
  },
  pinText: {
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: 8,
    color: '#B45309',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 16,
  },
});