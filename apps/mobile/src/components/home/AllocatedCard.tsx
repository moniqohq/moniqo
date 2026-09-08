import { StyleSheet, Text } from 'react-native';
import { PieChart } from 'lucide-react-native';
import { colors, typography } from '@/theme';
import { formatCurrency } from '@/utils/format';
import { SummaryCard } from './SummaryCard';

interface AllocatedCardProps {
  totalAllocated: number;
  monthLabel: string;
}

export function AllocatedCard({ totalAllocated, monthLabel }: AllocatedCardProps) {
  return (
    <SummaryCard
      icon={{ Icon: PieChart, background: colors.primary }}
      label="Total Allocated"
      amount={formatCurrency(totalAllocated)}
      accessibilityLabel={`Total allocated ${formatCurrency(totalAllocated)} for ${monthLabel}`}
    >
      <Text style={styles.caption}>for {monthLabel}</Text>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  caption: {
    ...typography.caption,
    color: colors.mutedForeground,
  },
});
