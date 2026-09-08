import type { PropsWithChildren } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Card, IconChip } from '@/components/ui';
import type { IconSpec } from '@/constants/icons';
import { colors, spacing, typography } from '@/theme';

interface SummaryCardProps {
  icon: IconSpec;
  label: string;
  amount: string;
  accessibilityLabel: string;
}

export function SummaryCard({ icon, label, amount, accessibilityLabel, children }: PropsWithChildren<SummaryCardProps>) {
  return (
    <Card style={styles.card} accessibilityLabel={accessibilityLabel}>
      <IconChip spec={icon} size={36} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
        {amount}
      </Text>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  label: {
    ...typography.label,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  amount: {
    ...typography.title,
    fontSize: 15,
    color: colors.foreground,
  },
});
