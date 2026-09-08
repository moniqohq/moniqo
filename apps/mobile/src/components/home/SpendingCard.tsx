import { StyleSheet, Text, View } from 'react-native';
import { ChartColumn } from 'lucide-react-native';
import { ProgressBar } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import { formatCurrency } from '@/utils/format';
import { SummaryCard } from './SummaryCard';

interface SpendingCardProps {
  totalSpent: number;
  totalAllocated: number;
}

export function SpendingCard({ totalSpent, totalAllocated }: SpendingCardProps) {
  const percent = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  return (
    <SummaryCard
      icon={{ Icon: ChartColumn, background: colors.primary }}
      label="Total Spent"
      amount={formatCurrency(totalSpent)}
      accessibilityLabel={`Total spent ${formatCurrency(totalSpent)}, ${percent} percent of budget`}
    >
      <View style={styles.footer}>
        <Text style={styles.caption}>{percent}% of budget</Text>
        <ProgressBar progress={percent / 100} accessibilityLabel="Percent of budget spent" />
      </View>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.xs,
  },
  caption: {
    ...typography.caption,
    color: colors.mutedForeground,
  },
});
