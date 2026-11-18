// `Text` y `TextInput` con la tipografía de la app (Inter, como en el Figma).
// Se usan en lugar de los de react-native. Si una pantalla pone su propia
// `fontFamily`, esa gana. Con React 19 `ref` llega como una prop más y pasa tal
// cual al componente de react-native.
//
// - Web: todas las variantes de Inter se cargan bajo la familia "Inter" y el
//   navegador elige la variante según `fontWeight`.
// - Android: elegir la variante por `fontWeight` dentro de una sola familia no es
//   confiable en todas las versiones (puede caer a la regular o a una negrita
//   sintética). Cada peso se registra con su propio nombre (src/fonts.ts) y acá se
//   elige ese nombre según el `fontWeight` del estilo.
import type { ComponentProps } from "react";
import {
  Platform,
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { fonts } from "../theme";
import { interFamilyForWeight } from "../fontWeights";

const BASE = { fontFamily: fonts.family };
const IS_WEB = Platform.OS === "web";

/** En Android, la familia de Inter que corresponde al peso pedido. */
function nativeWeightStyle(style: StyleProp<TextStyle>): TextStyle | null {
  if (IS_WEB) return null;
  const flat = StyleSheet.flatten(style) ?? {};
  // Una pantalla con su propia familia la conserva.
  if (flat.fontFamily && flat.fontFamily !== fonts.family) return null;
  return { fontFamily: interFamilyForWeight(flat.fontWeight), fontWeight: "normal" };
}

export function Text({ style, ...props }: ComponentProps<typeof RNText>) {
  return <RNText {...props} style={[BASE, style, nativeWeightStyle(style)]} />;
}

export function TextInput({ style, ...props }: ComponentProps<typeof RNTextInput>) {
  return <RNTextInput {...props} style={[BASE, style, nativeWeightStyle(style)]} />;
}
