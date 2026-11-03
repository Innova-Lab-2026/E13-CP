import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

type ScreenStateProps = {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Texto cuando no hay datos. Si se omite, no se muestra estado vacío. */
  emptyTitle?: string;
  emptyText?: string;
  isEmpty?: boolean;
};

/**
 * Estado de carga, error o vacío de una pantalla que consulta la API.
 * Devuelve null cuando hay datos para mostrar.
 */
export default function ScreenState({
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyText,
  isEmpty,
}: ScreenStateProps) {
  if (loading) {
    return (
      <View style={styles.container} accessibilityLabel="Cargando">
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.card]}>
        <Text style={styles.title}>No pudimos cargar la información</Text>
        <Text style={styles.text}>{error}</Text>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            style={styles.retry}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (isEmpty && emptyTitle) {
    return (
      <View style={[styles.container, styles.card]}>
        <Text style={styles.title}>{emptyTitle}</Text>
        {emptyText ? <Text style={styles.text}>{emptyText}</Text> : null}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    textAlign: "center",
  },
  text: {
    ...typography.body,
    textAlign: "center",
  },
  retry: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  retryText: {
    color: colors.onBrand,
    fontWeight: "700",
  },
});
