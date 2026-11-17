import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../../../../src/components/AppHeader";
import AppInput from "../../../../src/components/AppInput";
import AppButton from "../../../../src/components/AppButton";
import AppAlert from "../../../../src/components/AppAlert";
import ConfirmModal from "../../../../src/components/ConfirmModal";
import ScreenState from "../../../../src/components/ScreenState";
import { useAsyncResource } from "../../../../src/hooks/useAsyncResource";
import {
  addCustomDomain,
  getBlocklist,
  removeCustomDomain,
  type BlocklistItem,
} from "../../../../src/services/blocklistService";
import { errorMessage } from "../../../../src/services/api";
import { formatDate } from "../../../../src/utils/date";
import { colors, radius, spacing, typography } from "../../../../src/theme";

/** Deja solo el nombre del sitio: sin protocolo, ruta, puerto ni "www.". */
function cleanDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

const DOMAIN_PATTERN = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : formatDate(date);
}

export default function SitiosScreen() {
  const { data, loading, error, reload } = useAsyncResource(() => getBlocklist(), []);

  const [domain, setDomain] = useState("");
  const [domainError, setDomainError] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; variant: "success" | "error" } | null>(
    null,
  );
  const [toRemove, setToRemove] = useState<BlocklistItem | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [showOfficial, setShowOfficial] = useState(false);

  const { official, custom } = useMemo(() => {
    const items = data?.blocklist ?? [];
    return {
      official: items
        .filter((item) => item.type === "LOTBA_OFFICIAL")
        .sort((a, b) => a.domain.localeCompare(b.domain)),
      custom: items
        .filter((item) => item.type === "CUSTOM")
        .sort((a, b) => a.domain.localeCompare(b.domain)),
    };
  }, [data]);

  const handleAdd = async () => {
    const value = cleanDomain(domain);
    if (!value) {
      setDomainError("Ingresá un sitio web, por ejemplo sitio.com.");
      return;
    }
    if (!DOMAIN_PATTERN.test(value)) {
      setDomainError("Revisá el sitio: tiene que tener la forma sitio.com.");
      return;
    }
    if ((data?.blocklist ?? []).some((item) => item.domain === value)) {
      setDomainError("Ese sitio ya está en la lista de bloqueo.");
      return;
    }

    setDomainError(undefined);
    setAdding(true);
    setFeedback(null);
    try {
      const item = await addCustomDomain(value);
      setDomain("");
      setFeedback({ message: `Agregamos ${item.domain} a tu lista.`, variant: "success" });
      await reload();
    } catch (err) {
      setFeedback({
        message: errorMessage(err, "No pudimos agregar el sitio. Intentá de nuevo."),
        variant: "error",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await removeCustomDomain(toRemove.id);
      setFeedback({ message: `Quitamos ${toRemove.domain} de tu lista.`, variant: "success" });
      setToRemove(null);
      await reload();
    } catch (err) {
      setRemoveError(errorMessage(err, "No pudimos quitar el sitio. Intentá de nuevo."));
    } finally {
      setRemoving(false);
    }
  };

  const status = data?.status;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppHeader title="Sitios bloqueados" />

          {!data || !status ? (
            <ScreenState loading={loading} error={error} onRetry={reload} />
          ) : (
            <>
              {/* Listado oficial de LOTBA */}
              <View style={styles.officialCard}>
                <View style={styles.officialHeader}>
                  <View style={styles.badge}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.onBrand} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>Listado oficial de LOTBA</Text>
                    <Text style={styles.cardText}>
                      Sitios de apuestas online no autorizados. Se aplica en todos tus
                      dispositivos y no se puede modificar desde la app.
                    </Text>
                  </View>
                </View>

                <View style={styles.stats}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{status.totalOfficial}</Text>
                    <Text style={styles.statLabel}>sitios oficiales</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{status.version}</Text>
                    <Text style={styles.statLabel}>período</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{formatUpdated(status.lastUpdated)}</Text>
                    <Text style={styles.statLabel}>última actualización</Text>
                  </View>
                </View>

                {status.source ? (
                  <Text style={styles.source}>Fuente: {status.source}</Text>
                ) : null}

                {official.length > 0 ? (
                  <Pressable
                    onPress={() => setShowOfficial((value) => !value)}
                    style={styles.toggle}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showOfficial ? "Ocultar sitios oficiales" : "Ver sitios oficiales"
                    }
                    accessibilityState={{ expanded: showOfficial }}
                  >
                    <Text style={styles.toggleText}>
                      {showOfficial ? "Ocultar sitios oficiales" : "Ver sitios oficiales"}
                    </Text>
                    <Ionicons
                      name={showOfficial ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.text}
                    />
                  </Pressable>
                ) : null}

                {showOfficial ? (
                  <View style={styles.officialList}>
                    {official.map((item) => (
                      <View key={item.id} style={styles.officialRow}>
                        <Ionicons name="lock-closed-outline" size={14} color={colors.textSubtle} />
                        <Text style={styles.officialDomain}>{item.domain}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              {/* Sitios agregados por el adulto */}
              <Text style={styles.sectionTitle}>Tus sitios agregados</Text>
              <Text style={styles.sectionText}>
                Si encontrás otro sitio de apuestas que no está en el listado oficial, podés
                sumarlo. Se bloquea en todos los dispositivos de tu cuenta.
              </Text>

              <View style={styles.addCard}>
                <AppInput
                  label="Sitio web"
                  placeholder="Por ejemplo, sitio.com"
                  value={domain}
                  onChangeText={(value) => {
                    setDomain(value);
                    setDomainError(undefined);
                  }}
                  keyboardType="url"
                  error={domainError}
                />
                <AppButton title="Agregar sitio" onPress={handleAdd} loading={adding} />
              </View>

              {feedback ? <AppAlert message={feedback.message} variant={feedback.variant} /> : null}

              {custom.length === 0 ? (
                <ScreenState
                  isEmpty
                  emptyTitle="Todavía no agregaste sitios"
                  emptyText="Los dominios que sumes van a aparecer acá y los vas a poder quitar cuando quieras."
                />
              ) : (
                <View style={styles.customList}>
                  {custom.map((item) => (
                    <View key={item.id} style={styles.customRow}>
                      <Ionicons name="globe-outline" size={18} color={colors.textMuted} />
                      <Text style={styles.customDomain} numberOfLines={1}>
                        {item.domain}
                      </Text>
                      <Pressable
                        onPress={() => {
                          setRemoveError(null);
                          setToRemove(item);
                        }}
                        style={styles.removeButton}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar ${item.domain}`}
                      >
                        <Ionicons name="close" size={18} color={colors.danger} />
                        <Text style={styles.removeText}>Quitar</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={!!toRemove}
        title="¿Quitar este sitio?"
        message={
          toRemove
            ? `${toRemove.domain} va a dejar de estar bloqueado en tus dispositivos.`
            : undefined
        }
        confirmLabel="Quitar sitio"
        onConfirm={handleRemove}
        onCancel={() => setToRemove(null)}
        destructive
        busy={removing}
        error={removeError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  officialCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  officialHeader: {
    flexDirection: "row",
    gap: spacing.md,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    ...typography.subtitle,
    marginBottom: spacing.xs,
  },
  cardText: {
    ...typography.body,
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    ...typography.label,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  statLabel: {
    ...typography.caption,
    textAlign: "center",
  },
  source: {
    ...typography.caption,
    color: colors.textMuted,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    minHeight: 44,
  },
  toggleText: {
    ...typography.label,
  },
  officialList: {
    gap: spacing.sm,
  },
  officialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  officialDomain: {
    ...typography.body,
    color: colors.text,
  },
  sectionTitle: {
    ...typography.subtitle,
    marginBottom: spacing.xs,
  },
  sectionText: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  addCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.sm,
  },
  customList: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  customDomain: {
    flex: 1,
    ...typography.label,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
  },
  removeText: {
    color: colors.dangerText,
    fontWeight: "700",
    fontSize: 13,
  },
});
