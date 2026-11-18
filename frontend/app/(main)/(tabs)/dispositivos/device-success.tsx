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
import DeviceLinkSteps, { LinkCodeShareButton } from '../../../../src/components/DeviceLinkSteps';
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
      setNotice('Código nuevo generado. El anterior ya no sirve.');
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
        {/* "i" sans en Inter, como en el Figma (el glifo de Ionicons tiene serifa). */}
        <View style={styles.infoIcon}>
          <Text style={styles.infoIconText}>i</Text>
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

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
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
                {visibleCode ? (
                  <View style={styles.shareSlot}>
                    <LinkCodeShareButton
                      name={displayName}
                      code={visibleCode}
                      onFeedback={setNotice}
                    />
                  </View>
                ) : null}
              </View>

              {/* Avisos chicos debajo del código, sin bloque: los botones siguen a la vista. */}
              {notice ? (
                <Text style={styles.notice} accessibilityLiveRegion="polite">
                  {notice}
                </Text>
              ) : null}

              {renderValidity()}

              {error ? <AppAlert variant="error" message={error} /> : null}

              <DeviceLinkSteps name={displayName} />
            </>
          )}
        </View>
      </ScrollView>

      {/* Como en el Figma, los dos botones quedan siempre visibles abajo. */}
      <View style={styles.footer}>
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
    paddingBottom: spacing.lg,
  },
  content: {
    gap: spacing.lg,
  },
  iconCircle: {
    alignSelf: 'center',
    width: 92,
    height: 92,
    borderRadius: radius.pill,
    // Verde lima del Figma, más saturado que el de las tarjetas.
    backgroundColor: colors.successStrongSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  iconCircleLinked: {
    backgroundColor: colors.successStrongSoft,
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
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    // Lugar para el ícono de compartir a la derecha sin descentrar el código.
    paddingHorizontal: 48,
    marginTop: spacing.sm,
    ...shadow.card,
  },
  shareSlot: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  notice: {
    ...typography.caption,
    color: colors.successText,
    textAlign: 'center',
    marginTop: -spacing.sm,
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
    borderColor: colors.border,
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
  infoIconText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.warningText,
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
  footer: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
});
