// Lista de eventos del historial agrupada por día ("Hoy - 17 de noviembre").
// Sirve para el historial completo y para el de un solo dispositivo
// (con `hideDeviceName`, las tarjetas no repiten el nombre del perfil).
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../theme";
import type { HistoryEvent } from "../../services/historyService";
import HistoryCard from "./HistoryCard";
import { formatCardTime, formatRelativeTime, groupByDay } from "./historyFormat";

type HistoryEventListProps = {
  events: HistoryEvent[];
  onPressEvent?: (event: HistoryEvent) => void;
  /** No repite el nombre del perfil en cada tarjeta. */
  hideDeviceName?: boolean;
  /**
   * Con encabezados de día (por defecto). Sin ellos, la hora se muestra
   * relativa ("Hace 5 min", "Ayer - 20:00"), como en el detalle del dispositivo.
   */
  groupByDate?: boolean;
  /** Muestra solo los primeros N eventos. */
  limit?: number;
};

export default function HistoryEventList({
  events,
  onPressEvent,
  hideDeviceName = false,
  groupByDate = true,
  limit,
}: HistoryEventListProps) {
  const visible = useMemo(
    () => (limit !== undefined ? events.slice(0, limit) : events),
    [events, limit],
  );

  const renderCard = (event: HistoryEvent, time: string) => (
    <HistoryCard
      key={event.id}
      variant={event.variant}
      title={event.title}
      description={event.description}
      time={time}
      device={event.device}
      hideDeviceName={hideDeviceName}
      onPress={onPressEvent ? () => onPressEvent(event) : undefined}
    />
  );

  if (!groupByDate) {
    return <View>{visible.map((event) => renderCard(event, formatRelativeTime(event.timestamp)))}</View>;
  }

  const now = new Date();
  return (
    <View>
      {groupByDay(visible, (event) => event.timestamp, now).map((group) => (
        <View key={group.key} style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {group.label}
          </Text>
          {group.items.map((event) => renderCard(event, formatCardTime(event.timestamp, now)))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
});
