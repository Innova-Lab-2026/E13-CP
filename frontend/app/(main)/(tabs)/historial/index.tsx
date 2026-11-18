// Historial (Figma "Historial" e "Historial por dispositivo").
// Con ?device=<id o nombre> muestra solo ese perfil: "Historial de Sofía", con
// flecha atrás, sin filtros y sin repetir el nombre en las tarjetas.
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../../../src/components/AppHeader";
import ScreenState from "../../../../src/components/ScreenState";
import HistoryEventList from "../../../../src/components/historial/HistoryEventList";
import HistoryFilters, {
  type HistoryDeviceOption,
  type HistoryTab,
} from "../../../../src/components/historial/HistoryFilters";
import { useAsyncResource } from "../../../../src/hooks/useAsyncResource";
import { getDevices } from "../../../../src/services/deviceService";
import {
  getHistoryEvents,
  type HistoryCategory,
  type HistoryEvent,
} from "../../../../src/services/historyService";
import { colors, spacing } from "../../../../src/theme";

type Listener = (event: string, callback: () => void) => () => void;

export default function HistorialScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { device: routeDevice } = useLocalSearchParams<{
    device?: string | string[];
  }>();
  const deviceParam = Array.isArray(routeDevice) ? routeDevice[0] : routeDevice;

  const [tab, setTab] = useState<HistoryTab>("all");
  const [category, setCategory] = useState<HistoryCategory>("blocked");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  // Perfil que llegó por parámetro (id o nombre): la pantalla queda en "Historial de <nombre>".
  const [focusDevice, setFocusDevice] = useState<string | null>(deviceParam ?? null);

  // El parámetro se aplica una vez y se limpia de la URL, así al volver a tocar
  // la pestaña Historial no queda filtrada.
  useEffect(() => {
    if (!deviceParam) return;
    setFocusDevice(deviceParam);
    router.setParams({ device: undefined });
  }, [deviceParam, router]);

  // Tocar la pestaña Historial vuelve al historial completo.
  useEffect(() => {
    const parent = navigation.getParent() as unknown as { addListener?: Listener } | undefined;
    if (!parent?.addListener) return;
    return parent.addListener("tabPress", () => setFocusDevice(null));
  }, [navigation]);

  const { data, loading, error, reload } = useAsyncResource(
    () => Promise.all([getHistoryEvents(), getDevices()]),
    [],
  );
  const events = useMemo(() => data?.[0] ?? [], [data]);

  const deviceOptions = useMemo<HistoryDeviceOption[]>(() => {
    const byId = new Map<string, string>();
    for (const device of data?.[1] ?? []) byId.set(device.id, device.name);
    for (const event of events) if (!byId.has(event.deviceId)) byId.set(event.deviceId, event.device);
    return [...byId]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [data, events]);

  // El parámetro puede ser el id del perfil o su nombre (según desde dónde se llegue).
  const focused = useMemo(() => {
    if (!focusDevice) return null;
    const match =
      deviceOptions.find((option) => option.id === focusDevice) ??
      deviceOptions.find((option) => option.name === focusDevice);
    return match ?? { id: null, name: focusDevice };
  }, [focusDevice, deviceOptions]);

  // Sin elección, "Por dispositivo" arranca en el perfil con la actividad más reciente
  // (los eventos llegan de lo más nuevo a lo más viejo).
  const isOption = (id: string | null | undefined) =>
    !!id && deviceOptions.some((option) => option.id === id);
  const activeDeviceId = isOption(selectedDeviceId)
    ? selectedDeviceId
    : isOption(events[0]?.deviceId)
      ? events[0].deviceId
      : (deviceOptions[0]?.id ?? null);
  const activeDeviceName = deviceOptions.find((option) => option.id === activeDeviceId)?.name;

  const visibleEvents = useMemo(() => {
    const byDevice = (id: string | null, name: string) => (event: HistoryEvent) =>
      id ? event.deviceId === id : event.device === name;
    if (focused) return events.filter(byDevice(focused.id, focused.name));
    if (tab === "category") return events.filter((event) => event.category === category);
    if (tab === "device") {
      return activeDeviceId ? events.filter((event) => event.deviceId === activeDeviceId) : [];
    }
    return events;
  }, [events, focused, tab, category, activeDeviceId]);

  const openEvent = useCallback(
    (event: HistoryEvent) =>
      router.push({
        pathname: "/(main)/(tabs)/historial/[historyId]",
        params: { historyId: event.id },
      }),
    [router],
  );

  const handleBack = () => {
    setFocusDevice(null);
    if (router.canGoBack()) router.back();
  };

  const singleDeviceName = focused?.name ?? (tab === "device" ? activeDeviceName : undefined);
  const empty = emptyCopy(singleDeviceName, !focused && tab === "category");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && data !== undefined}
            onRefresh={reload}
            tintColor={colors.text}
          />
        }
      >
        <AppHeader
          title={focused ? `Historial de ${focused.name}` : "Historial"}
          hideBack={!focused}
          onBackPress={handleBack}
        />

        {data === undefined ? (
          <ScreenState loading={loading} error={error} onRetry={reload} />
        ) : (
          <>
            {/* Si falla una recarga mantenemos lo último que se cargó y avisamos. */}
            <ScreenState error={error} onRetry={reload} />
            {!focused ? (
              <HistoryFilters
                tab={tab}
                onTabChange={setTab}
                category={category}
                onCategoryChange={setCategory}
                devices={deviceOptions}
                selectedDeviceId={activeDeviceId}
                onDeviceChange={setSelectedDeviceId}
              />
            ) : null}

            {visibleEvents.length === 0 ? (
              <ScreenState isEmpty emptyTitle={empty.title} emptyText={empty.text} />
            ) : (
              <HistoryEventList
                events={visibleEvents}
                onPressEvent={openEvent}
                hideDeviceName={!!singleDeviceName}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function emptyCopy(deviceName: string | undefined, byCategory: boolean) {
  if (deviceName) {
    return {
      title: `Todavía no hay actividad de ${deviceName}`,
      text: `Cuando el celular de ${deviceName} registre un bloqueo o un cambio, lo vas a ver acá.`,
    };
  }
  if (byCategory) {
    return {
      title: "No hay actividad en esta categoría",
      text: "Probá con otra categoría o elegí Todos para ver toda la actividad.",
    };
  }
  return {
    title: "Todavía no hay actividad",
    text: "Cuando un dispositivo protegido registre un bloqueo o un cambio, lo vas a ver acá.",
  };
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
});
