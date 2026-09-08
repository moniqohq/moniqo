import { StyleSheet, Text, View } from 'react-native';
import { TrendingUp, Wallet } from 'lucide-react-native';
import { colors, typography } from '@/theme';
import { formatCurrency } from '@/utils/format';
import { SummaryCard } from './SummaryCard';

interface BalanceCardProps {
  totalBalance: number;
  trendPercent: number;
}

export function BalanceCard({ totalBalance, trendPercent }: BalanceCardProps) {
  const isPositive = trendPercent >= 0;
  return (
    <SummaryCard
      icon={{ Icon: Wallet, background: colors.primary }}
      label="Total Balance"
      amount={formatCurrency(totalBalance)}
      accessibilityLabel={`Total balance ${formatCurrency(totalBalance)}, ${isPositive ? 'up' : 'down'} ${Math.abs(trendPercent)} percent versus last month`}
    >
      <View style={styles.trendRow}>
        <TrendingUp size={13} color={isPositive ? colors.success : colors.destructive} />
        <Text style={[styles.trendText, { color: isPositive ? colors.success : colors.destructive }]}>
          {isPositive ? '↑' : '↓'} {Math.abs(trendPercent)}%
        </Text>
      </View>
      <Text style={styles.caption}>vs last month</Text>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    ...typography.caption,
    fontWeight: '600',
  },
  caption: {
    ...typography.caption,
    color: colors.mutedForeground,
  },
});
