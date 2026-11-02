import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../../../../src/components/AppButton';
import DeviceLinkSteps from '../../../../src/components/DeviceLinkSteps';
import { colors, radius, spacing, typography } from '../../../../src/theme';

type Params = {
  name?: string | string[];
  linkCode?: string | string[];
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
  const deviceId = first(params.deviceId);
  const initial = first(params.name)?.trim().charAt(0).toUpperCase();

  const goToList = () => {
    router.dismissTo('/(main)/(tabs)/(dispositivos)');
  };

  const goToDevice = () => {
    if (!deviceId) {
      goToList();
      return;
    }
    router.replace({
      pathname: '/(main)/(tabs)/(dispositivos)/[deviceId]',
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
        <Text style={styles.subtitle}>
          Ya creamos el perfil de {name}. Para que la protección empiece a funcionar, falta
          vincular su celular.
        </Text>

        <Text style={styles.sectionTitle}>Cómo vincularlo</Text>
        <DeviceLinkSteps name={name} linkCode={linkCode} />

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
  sectionTitle: {
    ...typography.subtitle,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  buttons: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
});
