// Botón con borde punteado "+ Agregar dispositivo" que aparece debajo de la lista
// de dispositivos, en Mis dispositivos y en el inicio (Figma).
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './ThemedText';
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
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  pressed: {
    backgroundColor: colors.brandSoft,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
});
