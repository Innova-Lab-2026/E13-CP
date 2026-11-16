import { useEffect, useState } from 'react';
import { AppState, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AppAlert from '../../../../src/components/AppAlert';
import AppButton from '../../../../src/components/AppButton';
import DeviceLinkSteps from '../../../../src/components/DeviceLinkSteps';
import { getDeviceById } from '../../../../src/services/deviceService';
import { colors, radius, spacing, typography } from '../../../../src/theme';

/** Cada cuánto se revisa si el celular ya se vinculó con el código. */
const LINKED_POLL_MS = 20_000;

type Params = {
  name?: string | string[];
  linkCode?: string | string[];
  linkCodeExpiresAt?: string | string[];
  deviceId?: string | string[];
};

function first(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function DeviceSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const name = first(params.name)?.trim() || 'tu hijo o hija';
  const linkCode = first(params.linkCode);
  const linkCodeExpiresAt = first(params.linkCodeExpiresAt);
  const deviceId = first(params.deviceId);
  const initial = first(params.name)?.trim().charAt(0).toUpperCase();
  const [linked, setLinked] = useState(false);

  // Mientras se muestra el código, el menor puede vincular su celular: se revisa
  // cada tanto para no seguir mostrando un código que ya se usó.
  useEffect(() => {
    if (!deviceId || linked) return;
    let cancelled = false;
    const check = async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const device = await getDeviceById(deviceId);
        if (!cancelled && device && device.status !== 'pending') setLinked(true);
      } catch {
        // Sin conexión: se vuelve a intentar en la próxima vuelta.
      }
    };
    const interval = setInterval(check, LINKED_POLL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      subscription.remove();
    };
  }, [deviceId, linked]);

  const goToList = () => {
    router.dismissTo('/(main)/(tabs)/dispositivos');
  };

  const goToDevice = () => {
    if (!deviceId) {
      goToList();
      return;
    }
    router.replace({
      pathname: '/(main)/(tabs)/dispositivos/[deviceId]',
      params: { deviceId },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.avatarCircle}>
            {initial ? (
              <Text style={styles.avatarText}>{initial}</Text>
            ) : (
              <Ionicons name="person" size={40} color={colors.text} />
            )}
          </View>
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={18} color={colors.background} />
          </View>
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Perfil creado
        </Text>
        {linked ? (
          <View style={styles.linked}>
            <AppAlert
              variant="success"
              message={`¡Listo! El celular de ${name} ya está vinculado. Podés ver su estado en «Ver dispositivo».`}
            />
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Ya creamos el perfil de {name}. Para que la protección empiece a funcionar,
              vinculá su celular con este código.
            </Text>

            <DeviceLinkSteps name={name} linkCode={linkCode} linkCodeExpiresAt={linkCodeExpiresAt} />
          </>
        )}

        <View style={styles.buttons}>
          {deviceId ? <AppButton title="Ver dispositivo" onPress={goToDevice} /> : null}
          <AppButton
            title="Volver a Mis dispositivos"
            onPress={goToList}
            variant={deviceId ? 'secondary' : 'primary'}
          />
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
    padding: spacing.xxl,
    alignItems: 'center',
  },
  illustration: {
    width: 104,
    height: 104,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.display,
    color: colors.onBrand,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  title: {
    ...typography.display,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  linked: {
    width: '100%',
  },
  buttons: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
});
