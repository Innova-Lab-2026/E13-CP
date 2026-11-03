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
}

interface RestrictionSummaryCardProps {
  statusText?: string;
  isProtected?: boolean;
  metrics: MetricItem[];
}

export default function RestrictionSummaryCard({
  statusText = 'Protección activa',
  isProtected = true,
  metrics,
}: RestrictionSummaryCardProps) {
  return (
    <View style={styles.card}>
      {statusText ? (
        <View style={styles.statusHeaderRow}>
          <View
            style={[
              styles.statusIcon,
              { backgroundColor: isProtected ? colors.successSoft : colors.dangerSoft },
            ]}
          >
            <Ionicons
              name={isProtected ? 'shield-checkmark' : 'alert-circle'}
              size={18}
              color={isProtected ? colors.success : colors.danger}
            />
          </View>
          <Text
            style={[styles.statusTitle, !isProtected && styles.dangerTitle]}
            accessibilityRole="header"
          >
            {statusText}
          </Text>
        </View>
      ) : null}

      {metrics.length > 0 ? (
        <View style={styles.metricsRow}>
          {metrics.map((metric, index) => (
            <React.Fragment key={`${metric.sublabel ?? metric.label ?? ''}-${index}`}>
              {index > 0 && <View style={styles.verticalDivider} />}
              <View style={styles.metricColumn}>
                {metric.sublabel ? (
                  <Text style={styles.metricSublabel}>{metric.sublabel}</Text>
                ) : null}

                <Text
                  style={[styles.metricValue, metric.isDanger && styles.metricValueDanger]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {metric.value}
                  {metric.unit ? <Text style={styles.metricUnit}> {metric.unit}</Text> : null}
                </Text>

                {metric.label ? <Text style={styles.metricLabel}>{metric.label}</Text> : null}
              </View>
            </React.Fragment>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    gap: spacing.lg,
    ...shadow.card,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.successText,
  },
  dangerTitle: {
    color: colors.dangerText,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  verticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  metricSublabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: colors.textMuted,
  },
  metricValueDanger: {
    color: colors.danger,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
