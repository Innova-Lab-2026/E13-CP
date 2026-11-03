import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../../../src/components/AppHeader";
import ScreenState from "../../../../src/components/ScreenState";
import HistoryCard from "../../../../src/components/historial/HistoryCard";
import HistoryFilters, {
  type HistoryCategory,
} from "../../../../src/components/historial/HistoryFilters";
import { useAsyncResource } from "../../../../src/hooks/useAsyncResource";
import {
  getHistoryEvents,
  type HistoryEvent,
} from "../../../../src/services/historyService";
import { colors, spacing, typography } from "../../../../src/theme";

type EventGroup = { label: string; events: HistoryEvent[] };

/** Agrupa por `date` ("Hoy", "Ayer", dd/mm/aaaa) respetando el orden en que llegan. */
function groupByDate(events: HistoryEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];
  const byLabel = new Map<string, EventGroup>();
  for (const event of events) {
    let group = byLabel.get(event.date);
    if (!group) {
      group = { label: event.date, events: [] };
      byLabel.set(event.date, group);
      groups.push(group);
    }
    group.events.push(event);
  }
  return groups;
}

export default function HistorialScreen() {
  const router = useRouter();
  const { device: routeDevice } = useLocalSearchParams<{
    device?: string | string[];
  }>();
  const deviceParam = Array.isArray(routeDevice) ? routeDevice[0] : routeDevice;

  const [selectedCategory, setSelectedCategory] =
    useState<HistoryCategory>("all");
  // Puede ser "all", el nombre del perfil o su id (según desde dónde se llegue).
  const [userFilter, setUserFilter] = useState(deviceParam ?? "all");
  // Flecha para volver solo si se llegó desde otra pantalla (por ejemplo, una alerta).
  const [showBack, setShowBack] = useState(false);

  // El filtro que llega por parámetro se aplica una vez y se limpia de la URL,
  // así al volver a tocar la pestaña Historial no queda filtrada ni con flecha.
  useEffect(() => {
    if (!deviceParam) return;
    setUserFilter(deviceParam);
    setShowBack(router.canGoBack());
    router.setParams({ device: undefined });
  }, [deviceParam, router]);

  useFocusEffect(
    useCallback(() => {
      return () => setShowBack(false);
    }, []),
  );

  const { data, loading, error, reload } = useAsyncResource(
    () => getHistoryEvents(),
    [],
  );
  const events = useMemo(() => data ?? [], [data]);

  const selectedUser = useMemo(() => {
    if (userFilter === "all") return "all";
    const byId = events.find((event) => event.deviceId === userFilter);
    return byId ? byId.device : userFilter;
  }, [events, userFilter]);

  const users = useMemo(() => {
    const names = new Set(events.map((event) => event.device));
    if (selectedUser !== "all") names.add(selectedUser);
    return [...names].sort((a, b) => a.localeCompare(b, "es"));
  }, [events, selectedUser]);

  // Si el filtro es un id de perfil (llega desde una alerta), se filtra por id
  // para no mezclar dos perfiles con el mismo nombre.
  const filterById = useMemo(
    () => userFilter !== "all" && events.some((event) => event.deviceId === userFilter),
    [events, userFilter],
  );

  const groups = useMemo(() => {
    const filtered = events.filter(
      (event) =>
        (selectedCategory === "all" || event.category === selectedCategory) &&
        (selectedUser === "all" ||
          (filterById ? event.deviceId === userFilter : event.device === selectedUser)),
    );
    return groupByDate(filtered);
  }, [events, selectedCategory, selectedUser, filterById, userFilter]);

  const hasFilters = selectedCategory !== "all" || selectedUser !== "all";

  const openEvent = (event: HistoryEvent) =>
    router.push({
      pathname: "/(main)/(tabs)/historial/[historyId]",
      params: { historyId: event.id },
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Historial"
          hideBack={!showBack}
          onBackPress={() => {
            setShowBack(false);
            router.back();
          }}
        />
        <Text style={styles.subtitle}>
          Revisá la actividad reciente de los dispositivos que acompañás.
        </Text>

        {data === undefined ? (
          <ScreenState loading={loading} error={error} onRetry={reload} />
        ) : (
          <>
            {/* Si falla una recarga mantenemos lo último que se cargó y avisamos. */}
            <ScreenState error={error} onRetry={reload} />
            <HistoryFilters
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              users={users}
              selectedUser={selectedUser}
              onUserChange={setUserFilter}
            />
          </>
        )}

        {data !== undefined ? (
          groups.length === 0 ? (
            <ScreenState
              isEmpty
              emptyTitle={
                hasFilters
                  ? "No hay actividad con estos filtros"
                  : "Todavía no hay actividad"
              }
              emptyText={
                hasFilters
                  ? "Probá con otra categoría o elegí Todos para ver toda la actividad."
                  : "Cuando un dispositivo protegido registre un bloqueo o un cambio, lo vas a ver acá."
              }
            />
          ) : (
            groups.map((group) => (
              <View key={group.label} style={styles.section}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  {group.label}
                </Text>
                {group.events.map((event) => (
                  <HistoryCard
                    key={event.id}
                    variant={event.variant}
                    title={event.title}
                    description={event.description}
                    time={event.time}
                    device={event.device}
                    onPress={() => openEvent(event)}
                  />
                ))}
              </View>
            ))
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle,
    marginBottom: spacing.md,
  },
});
