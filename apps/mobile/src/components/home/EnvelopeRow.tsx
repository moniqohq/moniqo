import { StyleSheet, Text, View } from 'react-native';
import { IconChip, ProgressBar } from '@/components/ui';
import { getCategoryIcon } from '@/constants/icons';
import { colors, spacing, typography } from '@/theme';
import { formatWholeCurrency } from '@/utils/format';
import type { BudgetEnvelope } from '@/types/domain';

interface EnvelopeRowProps {
  envelope: BudgetEnvelope;
  isLast?: boolean;
}

export function EnvelopeRow({ envelope, isLast }: EnvelopeRowProps) {
  const percent = envelope.allocated_amt > 0 ? Math.round((envelope.spent_amt / envelope.allocated_amt) * 100) : 0;

  return (
    <View style={[styles.container, !isLast && styles.divider]}>
      <View style={styles.header}>
        <IconChip spec={getCategoryIcon(envelope.title)} size={36} />
        <View style={styles.info}>
          <Text style={styles.title}>{envelope.title}</Text>
          <Text style={styles.subtitle}>
            {formatWholeCurrency(envelope.spent_amt)} of {formatWholeCurrency(envelope.allocated_amt)}
          </Text>
        </View>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <ProgressBar
        progress={percent / 100}
        accessibilityLabel={`${envelope.title}, ${percent} percent spent`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    ...typography.caption,
    color: colors.mutedForeground,
  },
  percent: {
    ...typography.label,
    color: colors.foreground,
  },
});
