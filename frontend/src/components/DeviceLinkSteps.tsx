// Ayudas de la pantalla "Código de vinculación": compartir el código (un ícono
// dentro de la tarjeta del código) y un desplegable con los pasos para vincular el
// celular del menor, con el código o iniciando sesión en ese celular.
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Text } from './ThemedText';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { linkWebUrl } from '../appLinks';
import { colors, radius, spacing, typography } from '../theme';

/**
 * Mensaje para mandarle a quien tenga el celular del menor. Nunca incluye el PIN.
 * El enlace abre una página web que ofrece abrir la app con el código o
 * descargarla: vincular desde el navegador no bloquea nada.
 */
export function shareMessage(name: string, code: string): string {
  return (
    `Para proteger el celular de ${name} con BA Protege+: en su celular, abrí la app, ` +
    `tocá «Vincular con un código» y escribí ${code}. ` +
    `Si todavía no tiene la app, desde este enlace la descargás o la abrís con el ` +
    `código ya escrito: ${linkWebUrl(code)}`
  );
}

/**
 * Ícono "Compartir" dentro de la tarjeta del código (Figma no tiene botones
 * aparte). Abre el menú de compartir del sistema; donde no hay, copia el mensaje
 * con el código. Lo que pasó se avisa con `onFeedback`, en una línea chica.
 */
export function LinkCodeShareButton({
  name,
  code,
  onFeedback,
}: {
  name: string;
  code: string;
  onFeedback: (message: string) => void;
}) {
  const handleShare = async () => {
    const message = shareMessage(name, code);
    try {
      await Share.share({ message, title: 'Código de BA Protege+' });
    } catch (error) {
      // La persona cerró el menú de compartir del navegador: no hay nada que avisar.
      if (error instanceof Error && error.name === 'AbortError') return;
      // En navegadores sin "Compartir", el mensaje queda copiado para pegarlo.
      try {
        await Clipboard.setStringAsync(message);
        onFeedback('Copiamos el mensaje con el código para que lo pegues donde quieras.');
      } catch {
        onFeedback('No pudimos compartir el código. Anotalo a mano.');
      }
    }
  };

  return (
    <Pressable
      onPress={handleShare}
      style={({ pressed }) => [styles.shareButton, pressed && styles.actionPressed]}
      accessibilityRole="button"
      accessibilityLabel="Compartir el código"
      hitSlop={8}
    >
      <Ionicons name="share-social-outline" size={20} color={colors.text} />
    </Pressable>
  );
}

interface DeviceLinkStepsProps {
  /** Nombre del perfil (quién usa el celular protegido). */
  name: string;
}

/**
 * Desplegable "¿Cómo se vincula?" con los pasos para usar el código y, aparte,
 * los pasos para vincular iniciando sesión con la cuenta del adulto.
 */
export default function DeviceLinkSteps({ name }: DeviceLinkStepsProps) {
  const [open, setOpen] = useState(false);
  const [showLoginSteps, setShowLoginSteps] = useState(false);

  const codeSteps = [
    `En el celular de ${name}, abrí BA Protege+.`,
    'Tocá «Vincular con un código».',
    'Escribí este código.',
    'Ingresá tu PIN de seguridad.',
  ];
  const loginSteps = [
    `En el celular de ${name}, instalá BA Protege+.`,
    'Iniciá sesión con tu cuenta, la misma que usás acá.',
    'Elegí «Este es un dispositivo protegido».',
    `Seleccioná el perfil de ${name}.`,
    'Ingresá tu PIN de seguridad para confirmar.',
  ];

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => setOpen((visible) => !visible)}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={8}
      >
        <Ionicons name="help-circle-outline" size={18} color={colors.text} />
        <Text style={styles.toggleText}>¿Cómo vinculo el celular?</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} />
      </Pressable>

      {open ? (
        <>
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
        </>
      ) : null}
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
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.background,
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
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    backgroundColor: colors.brandSoft,
  },
});
