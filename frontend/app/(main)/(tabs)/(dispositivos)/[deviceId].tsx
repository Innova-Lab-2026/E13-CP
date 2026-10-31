import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../../../../src/components/AppHeader';
import RestrictionSummaryCard from '../../../../src/components/RestrictionSummaryCard';
import HistoryCard from '../../../../src/components/historial/HistoryCard';
import {
  getDeviceActivities,
  getDeviceById,
} from '../../../../src/services/deviceService';

export default function DeviceDetailScreen() {
  const router = useRouter();
  const { deviceId: routeDeviceId } = useLocalSearchParams<{
    deviceId?: string | string[];
  }>();
  const deviceId = Array.isArray(routeDeviceId)
    ? routeDeviceId[0]
    : routeDeviceId;
  const device = deviceId ? getDeviceById(deviceId) : undefined;
  const activities = deviceId ? getDeviceActivities(deviceId) : [];

  const statusText = device
    ? {
        active: 'Protección activa',
        pending: 'Pendiente de vinculación',
        disabled: 'Desprotegido / Inactivo',
      }[device.status]
    : '';
  const isProtected = device?.status === 'active';
  const birthDate = device?.birthDate
    ? formatBirthDate(device.birthDate)
    : 'No especificada';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppHeader
          title="Detalle del dispositivo"
          onBackPress={() => router.back()}
        />

        {device ? (
          <>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {device.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.title}>Dispositivo de {device.name}</Text>
            </View>

            <RestrictionSummaryCard
              statusText={statusText}
              isProtected={isProtected}
              metrics={[
                {
                  sublabel: 'Fecha de nacimiento',
                  value: birthDate,
                },
              ]}
            />

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Información del perfil</Text>
              <Text style={styles.infoLabel}>Nombre</Text>
              <Text style={styles.infoValue}>{device.name}</Text>
              <Text style={styles.infoLabel}>Estado</Text>
              <Text style={styles.infoValue}>{statusText}</Text>
              <Text style={styles.infoLabel}>Fecha de nacimiento</Text>
              <Text style={styles.infoValue}>{birthDate}</Text>
            </View>

            <View style={styles.activitySection}>
              <Text style={styles.sectionTitle}>
                Actividad de {device.name}
              </Text>
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <HistoryCard
                    key={activity.id}
                    variant={activity.variant}
                    title={activity.title}
                    description={activity.description}
                    time={`${activity.date} · ${activity.time}`}
                    device={device.name}
                  />
                ))
              ) : (
                <View style={styles.emptyActivity}>
                  <Text style={styles.emptyActivityTitle}>
                    Todavía no hay actividad
                  </Text>
                  <Text style={styles.emptyActivityText}>
                    Cuando se registren eventos de este dispositivo, los vas a
                    encontrar acá.
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.notFound}>
            <Text style={styles.notFoundTitle}>No encontramos este dispositivo</Text>
            <Text style={styles.notFoundText}>
              Volvé a la lista y seleccioná un perfil existente.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatBirthDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: -8,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#374151',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 18,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 14,
  },
  activitySection: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#1F2937',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  emptyActivity: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 20,
  },
  emptyActivityTitle: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyActivityText: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  notFound: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 16,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  notFoundText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});