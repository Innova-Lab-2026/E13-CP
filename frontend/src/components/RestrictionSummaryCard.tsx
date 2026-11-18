// Tarjeta resumen del detalle por dispositivo (Figma "Detalle por dispositivo"):
// estado de la protección arriba y, debajo, métricas grandes (edad, webs
// bloqueadas en la semana).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../theme';

export interface MetricItem {
  label?: string;
  value: string | number;
  unit?: string;
  sublabel?: string;
  isDanger?: boolean;
  /** Texto para el lector de pantalla de esta métrica. */
  accessibilityLabel?: string;
}

export type SummaryTone = 'success' | 'warning' | 'danger';

interface RestrictionSummaryCardProps {
  statusText?: string;
  /** Atajo viejo: true = success, false = danger. `tone` tiene prioridad. */
  isProtected?: boolean;
  tone?: SummaryTone;
  metrics: MetricItem[];
}

const TONES = {
  success: { color: colors.successText, icon: colors.success, name: 'checkmark-circle-outline' },
  warning: { color: colors.warningText, icon: colors.warning, name: 'alert-circle-outline' },
  danger: { color: colors.dangerText, icon: colors.danger, name: 'pause-circle-outline' },
} as const;

export default function RestrictionSummaryCard({
  statusText = 'Protección activa',
  isProtected = true,
  tone,
  metrics,
}: RestrictionSummaryCardProps) {
  const config = TONES[tone ?? (isProtected ? 'success' : 'danger')];

  return (
    <View style={styles.card}>
      {statusText ? (
        <View style={styles.statusHeaderRow}>
          <Ionicons name={config.name} size={24} color={config.icon} />
          <Text style={[styles.statusTitle, { color: config.color }]} accessibilityRole="header">
            {statusText}
          </Text>
        </View>
      ) : null}

      {metrics.length > 0 ? (
        <View style={styles.metricsRow}>
          {metrics.map((metric, index) => (
            <View
              key={`${metric.sublabel ?? metric.label ?? ''}-${index}`}
              style={styles.metricColumn}
              accessible
              accessibilityLabel={
                metric.accessibilityLabel ??
                [metric.sublabel, `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`, metric.label]
                  .filter(Boolean)
                  .join(' ')
              }
            >
              {metric.sublabel ? <Text style={styles.metricSublabel}>{metric.sublabel}</Text> : null}

              <View style={styles.valueRow}>
                <Text
                  style={[styles.metricValue, metric.isDanger && styles.metricValueDanger]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {metric.value}
                </Text>
                {metric.unit ? <Text style={styles.metricUnit}>{metric.unit}</Text> : null}
              </View>

              {metric.label ? <Text style={styles.metricLabel}>{metric.label}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
    gap: spacing.md,
    ...shadow.card,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  metricSublabel: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  metricValue: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '800',
    color: colors.text,
  },
  metricUnit: {
    fontSize: 14,
    color: colors.textMuted,
  },
  metricValueDanger: {
    color: colors.danger,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
