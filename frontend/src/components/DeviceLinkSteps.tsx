import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface DeviceLinkStepsProps {
  /** Nombre del perfil (quién usa el celular protegido). */
  name: string;
  /** Código de vinculación que devuelve el backend, como referencia. */
  linkCode?: string;
}

/**
 * Pasos para vincular el celular del menor con su perfil.
 * Se usa en "Perfil creado" y en el detalle de un dispositivo pendiente.
 */
export default function DeviceLinkSteps({ name, linkCode }: DeviceLinkStepsProps) {
  const steps = [
    `En el celular de ${name}, instalá BA Protege+.`,
    'Iniciá sesión con tu cuenta, la misma que usás acá.',
    'Elegí "Este es un dispositivo protegido".',
    `Seleccioná el perfil de ${name}.`,
    'Ingresá tu PIN de seguridad para confirmar.',
  ];

  return (
    <View style={styles.wrapper}>
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

      {linkCode ? (
        <View
          style={styles.codeCard}
          accessible
          accessibilityLabel={`Código de vinculación: ${linkCode.split('').join(' ')}`}
        >
          <Text style={styles.codeLabel}>Código de vinculación</Text>
          <Text style={styles.codeText} selectable>
            {linkCode}
          </Text>
          <Text style={styles.codeHint}>
            Tenelo a mano como referencia por si te lo piden durante la vinculación.
          </Text>
        </View>
      ) : null}
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
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  codeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  codeText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    color: colors.text,
  },
  codeHint: {
    ...typography.caption,
    textAlign: 'center',
  },
});
