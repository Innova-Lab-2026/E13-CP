import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { linkWebUrl } from '../appLinks';
import { formatTimeLeft } from '../utils/date';
import { colors, radius, spacing, typography } from '../theme';

interface DeviceLinkStepsProps {
  /** Nombre del perfil (quién usa el celular protegido). */
  name: string;
  /** Código de vinculación vigente. El backend no lo manda si venció o ya se usó. */
  linkCode?: string;
  /** Vencimiento del código (ISO). */
  linkCodeExpiresAt?: string;
  /** Si se pasa, se ofrece generar un código nuevo (detalle del dispositivo). */
  onNewCode?: () => void;
  newCodeLoading?: boolean;
}

/**
 * Mensaje para mandarle a quien tenga el celular del menor. Nunca incluye el PIN.
 * El enlace abre una página web que ofrece abrir la app con el código o
 * descargarla: vincular desde el navegador no bloquea nada.
 */
function shareMessage(name: string, code: string): string {
  return (
    `Para proteger el celular de ${name} con BA Protege+: en su celular, abrí la app, ` +
    `tocá «Vincular con un código» y escribí ${code}. ` +
    `Si todavía no tiene la app, desde este enlace la descargás o la abrís con el ` +
    `código ya escrito: ${linkWebUrl(code)}`
  );
}

/**
 * Cómo vincular el celular del menor con su perfil: el código es lo principal y
 * abajo quedan, plegados, los pasos para hacerlo iniciando sesión en su celular.
 * Se usa en "Perfil creado" y en el detalle de un dispositivo pendiente.
 */
export default function DeviceLinkSteps({
  name,
  linkCode,
  linkCodeExpiresAt,
  onNewCode,
  newCodeLoading = false,
}: DeviceLinkStepsProps) {
  const [now, setNow] = useState(() => new Date());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showLoginSteps, setShowLoginSteps] = useState(false);

  // El vencimiento se recalcula solo mientras la pantalla está abierta.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setFeedback(null);
  }, [linkCode]);

  const timeLeft = linkCodeExpiresAt ? formatTimeLeft(linkCodeExpiresAt, now) : null;
  const expired = !!linkCodeExpiresAt && !timeLeft;
  const code = linkCode && !expired ? linkCode : null;

  const codeSteps = [
    `En el celular de ${name}, abrí BA Protege+.`,
    'Tocá «Vincular con un código».',
    'Escribí este código.',
    'Ingresá tu PIN de seguridad.',
  ];
  const loginSteps = [
    `En el celular de ${name}, instalá BA Protege+.`,
    'Iniciá sesión con tu cuenta, la misma que usás acá.',
    'Elegí "Este es un dispositivo protegido".',
    `Seleccioná el perfil de ${name}.`,
    'Ingresá tu PIN de seguridad para confirmar.',
  ];

  const handleCopy = async () => {
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      setFeedback('Copiamos el código.');
    } catch {
      setFeedback('No pudimos copiar el código. Anotalo a mano.');
    }
  };

  const handleShare = async () => {
    if (!code) return;
    const message = shareMessage(name, code);
    try {
      await Share.share({ message, title: 'Código de BA Protege+' });
    } catch (error) {
      // La persona cerró el menú de compartir del navegador: no hay nada que avisar.
      if (error instanceof Error && error.name === 'AbortError') return;
      // En navegadores sin "Compartir", el mensaje queda copiado para pegarlo.
      try {
        await Clipboard.setStringAsync(message);
        setFeedback('Copiamos el mensaje con el código para que lo pegues donde quieras.');
      } catch {
        setFeedback('No pudimos compartir el código. Copialo o anotalo a mano.');
      }
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Código de vinculación</Text>

        {code ? (
          <>
            <Text
              style={styles.codeText}
              selectable
              testID="link-code"
              accessibilityLabel={`Código de vinculación: ${code.split('').join(' ')}`}
            >
              {code}
            </Text>
            {timeLeft ? <Text style={styles.codeHint}>Vence en {timeLeft}</Text> : null}

            <View style={styles.codeActions}>
              <View style={styles.codeAction}>
                <AppButton
                  title="Copiar"
                  variant="secondary"
                  onPress={handleCopy}
                  accessibilityLabel="Copiar el código"
                />
              </View>
              <View style={styles.codeAction}>
                <AppButton
                  title="Compartir"
                  variant="secondary"
                  onPress={handleShare}
                  accessibilityLabel="Compartir el código"
                />
              </View>
            </View>
            {feedback ? (
              <Text style={styles.feedback} accessibilityLiveRegion="polite">
                {feedback}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.codeMissing}>
            {expired
              ? 'Este código venció. Generá uno nuevo para vincular el celular.'
              : 'No hay un código vigente para este perfil.'}
          </Text>
        )}

        {onNewCode ? (
          <View style={styles.newCode}>
            <AppButton
              title="Generar un código nuevo"
              variant={code ? 'tertiary' : 'primary'}
              onPress={onNewCode}
              loading={newCodeLoading}
            />
          </View>
        ) : null}
      </View>

      <StepList steps={codeSteps} />

      <Pressable
        onPress={() => setShowLoginSteps((visible) => !visible)}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: showLoginSteps }}
        hitSlop={8}
      >
        <Text style={styles.toggleText}>Prefiero iniciar sesión en su celular</Text>
        <Ionicons
          name={showLoginSteps ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.text}
        />
      </Pressable>

      {showLoginSteps ? <StepList steps={loginSteps} /> : null}
    </View>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <View style={styles.card}>
      {steps.map((step, index) => (
        <View key={step} style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.onBrand,
  },
  stepText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    paddingTop: 2,
  },
  codeCard: {
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    borderWidth: 2,
    borderColor: colors.brand,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  codeLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  codeText: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 5,
    color: colors.text,
    textAlign: 'center',
  },
  codeHint: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  codeMissing: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  codeActions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  codeAction: {
    flex: 1,
  },
  feedback: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
  },
  newCode: {
    alignSelf: 'stretch',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  toggleText: {
    ...typography.label,
    textDecorationLine: 'underline',
  },
});
