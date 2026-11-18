// `Text` y `TextInput` con la tipografía de la app (Inter, como en el Figma).
// Se usan en lugar de los de react-native: el peso sale de `fontWeight`, porque
// todas las variantes de Inter se cargan bajo la familia "Inter" (ver src/fonts.ts).
// Si una pantalla pone su propia `fontFamily`, esa gana. Con React 19 `ref` llega
// como una prop más y pasa tal cual al componente de react-native.
import type { ComponentProps } from "react";
import { Text as RNText, TextInput as RNTextInput } from "react-native";
import { fonts } from "../theme";

const BASE = { fontFamily: fonts.family };

export function Text({ style, ...props }: ComponentProps<typeof RNText>) {
  return <RNText {...props} style={[BASE, style]} />;
}

export function TextInput({ style, ...props }: ComponentProps<typeof RNTextInput>) {
  return <RNTextInput {...props} style={[BASE, style]} />;
}
