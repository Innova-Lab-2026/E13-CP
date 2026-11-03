// Botón con borde punteado "+ Añadir dispositivo" que aparece debajo de la lista
// de dispositivos, en Mis dispositivos y en el inicio.
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

interface AddDeviceButtonProps {
  onPress: () => void;
}

export default function AddDeviceButton({ onPress }: AddDeviceButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Agregar dispositivo"
    >
      <Ionicons name="add" size={20} color={colors.text} />
      <Text style={styles.text}>Agregar dispositivo</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.backgroundWarm,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.brandSoft,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
});
