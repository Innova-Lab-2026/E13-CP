// "Código de vinculación" (Figma "Vinculación código - Responsable"): se abre
// después de crear un perfil y desde el detalle de un perfil pendiente.
import { useCallback, useEffect, useState } from 'react';
import { AppState, View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '../../../../src/components/ThemedText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AppAlert from '../../../../src/components/AppAlert';
import AppButton from '../../../../src/components/AppButton';
import DeviceLinkSteps, { LinkCodeShareActions } from '../../../../src/components/DeviceLinkSteps';
import { generateLinkCode, getDeviceById } from '../../../../src/services/deviceService';
import { ApiError, errorMessage } from '../../../../src/services/api';
import { formatValidity } from '../../../../src/utils/dispositivos';
import { colors, radius, shadow, spacing, typography } from '../../../../src/theme';

/** Cada cuánto se revisa si el celular ya se vinculó con el código. */
const LINKED_POLL_MS = 20_000;

type Params = {
  name?: string | string[];
  linkCode?: string | string[];
  linkCodeExpiresAt?: string | string[];
  deviceId?: string | string[];
  /** "1" cuando se llega recién creado el perfil (desde "Agregar dispositivo"). */
  created?: string | string[];
};

function first(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function LinkCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const deviceId = first(params.deviceId);
  const justCreated = first(params.created) === '1';

  const [name, setName] = useState(first(params.name)?.trim() || '');
  const [code, setCode] = useState(first(params.linkCode));
  const [expiresAt, setExpiresAt] = useState(first(params.linkCodeExpiresAt));
  const [linked, setLinked] = useState(false);
  const [loadingDevice, setLoadingDevice] = useState(!first(params.linkCode) && !!deviceId);
  const [now, setNow] = useState(() => new Date());

  const [newCodeLoading, setNewCodeLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayName = name || 'tu hijo o hija';

  // El tiempo que le queda al código se recalcula solo mientras la pantalla está abierta.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Desde el detalle se llega solo con el id: el código vigente se pide al servidor.
  const loadDevice = useCallback(async () => {
    if (!deviceId) return;
    try {
      const device = await getDeviceById(deviceId);
      if (!device) return;
      setName((current) => current || device.name);
      if (device.status !== 'pending') {
        setLinked(true);
        return;
      }
      setCode(device.linkCode);
      setExpiresAt(device.linkCodeExpiresAt);
    } catch (loadError) {
      setError(errorMessage(loadError, 'No pudimos cargar el código. Revisá tu conexión.'));
    } finally {
      setLoadingDevice(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (!first(params.linkCode)) loadDevice();
    // Solo al abrir la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const validity = formatValidity(expiresAt, now);
  const expired = !!expiresAt && !validity;
  const visibleCode = code && !expired ? code : null;

  // Perfil pendiente: el servidor no pide PIN y el código nuevo reemplaza al anterior.
  const handleNewCode = async () => {
    if (!deviceId || newCodeLoading) return;
    setNewCodeLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await generateLinkCode(deviceId);
      setCode(result.linkCode);
      setExpiresAt(result.linkCodeExpiresAt ?? result.device.linkCodeExpiresAt);
      setNow(new Date());
      setNotice('Generamos un código nuevo. El anterior ya no sirve.');
    } catch (newCodeError) {
      // Un 400 acá es que el celular se vinculó mientras tanto.
      if (newCodeError instanceof ApiError && newCodeError.status === 400) {
        const fresh = await getDeviceById(deviceId).catch(() => undefined);
        if (fresh && fresh.status !== 'pending') {
          setLinked(true);
          return;
        }
      }
      setError(errorMessage(newCodeError, 'No pudimos generar el código. Intentá de nuevo.'));
    } finally {
      setNewCodeLoading(false);
    }
  };

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

  const renderValidity = () => {
    if (loadingDevice) return null;
    const title = visibleCode
      ? validity
        ? `Válido durante ${validity}`
        : 'Código vigente'
      : expired
        ? 'Este código venció'
        : 'No hay un código vigente';
    const text = visibleCode
      ? 'Este código solo puede utilizarse una vez.'
      : 'Generá uno nuevo para vincular el celular.';

    return (
      <View style={styles.infoCard} accessible accessibilityLabel={`${title}. ${text}`}>
        <View style={styles.infoIcon}>
          <Ionicons name="information" size={22} color={colors.warningText} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoText}>{text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {justCreated ? (
            <View style={styles.createdPill}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.createdText} numberOfLines={1}>
                Perfil creado para {displayName}
              </Text>
            </View>
          ) : null}

          <View
            style={[styles.iconCircle, linked && styles.iconCircleLinked]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Ionicons name={linked ? 'checkmark' : 'link'} size={48} color={colors.success} />
          </View>

          <Text style={styles.title} accessibilityRole="header">
            {linked ? '¡Dispositivo vinculado!' : 'Código de vinculación'}
          </Text>

          {linked ? (
            <AppAlert
              variant="success"
              message={`¡Listo! El celular de ${displayName} ya está vinculado. Podés ver su estado en «Ver dispositivo».`}
            />
          ) : (
            <>
              <Text style={styles.subtitle}>
                Compartí este código con la persona que está vinculando el dispositivo.
              </Text>

              <View style={styles.codeCard}>
                {loadingDevice ? (
                  <Text style={styles.codeMissing}>Cargando el código…</Text>
                ) : visibleCode ? (
                  <Text
                    style={styles.codeText}
                    selectable
                    testID="link-code"
                    accessibilityLabel={`Código de vinculación: ${visibleCode.split('').join(' ')}`}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {visibleCode}
                  </Text>
                ) : (
                  <Text style={styles.codeMissing}>Sin código vigente</Text>
                )}
              </View>

              {visibleCode ? <LinkCodeShareActions name={displayName} code={visibleCode} /> : null}

              {renderValidity()}

              {notice ? <AppAlert variant="success" message={notice} /> : null}
              {error ? <AppAlert variant="error" message={error} /> : null}

              <DeviceLinkSteps name={displayName} />
            </>
          )}
        </View>

        <View style={styles.buttons}>
          {linked ? (
            <>
              <AppButton title="Ver dispositivo" onPress={goToDevice} />
              <AppButton title="Volver a Mis dispositivos" variant="secondary" onPress={goToList} />
            </>
          ) : (
            <>
              {deviceId ? (
                <AppButton
                  title="Generar nuevo código"
                  onPress={handleNewCode}
                  loading={newCodeLoading}
                  accessibilityLabel="Generar nuevo código. El anterior deja de servir"
                />
              ) : null}
              <AppButton
                title="Cancelar vinculación"
                onPress={goToList}
                accessibilityLabel={`Cancelar vinculación. El perfil de ${displayName} queda pendiente y lo podés vincular después`}
              />
            </>
          )}
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
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
    gap: spacing.xxl,
  },
  content: {
    gap: spacing.lg,
  },
  createdPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  createdText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.successText,
    flexShrink: 1,
  },
  iconCircle: {
    alignSelf: 'center',
    width: 92,
    height: 92,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  iconCircleLinked: {
    backgroundColor: colors.successSoft,
  },
  title: {
    ...typography.display,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  codeCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    ...shadow.card,
  },
  codeText: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.text,
    textAlign: 'center',
  },
  codeMissing: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    ...shadow.card,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    marginTop: 2,
  },
  buttons: {
    gap: spacing.md,
  },
});
