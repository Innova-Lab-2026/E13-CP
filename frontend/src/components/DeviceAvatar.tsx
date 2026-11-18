// Avatar de persona de color para cada perfil protegido (Figma: círculo rosa,
// naranja, etc. con el ícono de persona). El color sale del id del perfil, así
// cada dispositivo conserva el suyo en todas las pantallas.
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme';

/** Fondo suave + ícono saturado. Todos con contraste suficiente sobre el fondo. */
export const AVATAR_PALETTE = [
  { background: '#FFD9EC', icon: '#E2559B' }, // rosa
  { background: '#FDE3B8', icon: '#D98200' }, // naranja
  { background: '#D6E9FF', icon: '#2F6FD6' }, // azul
  { background: '#E6DDFB', icon: '#7451D1' }, // violeta
  { background: '#CDEFE6', icon: '#14876E' }, // verde agua
] as const;

export function avatarColors(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

interface DeviceAvatarProps {
  /** Id del perfil (o el nombre si no hay id): define el color. */
  seed: string;
  size?: number;
}

export default function DeviceAvatar({ seed, size = 36 }: DeviceAvatarProps) {
  const palette = avatarColors(seed);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, backgroundColor: palette.background },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ionicons name="person-circle" size={Math.round(size * 0.72)} color={palette.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
