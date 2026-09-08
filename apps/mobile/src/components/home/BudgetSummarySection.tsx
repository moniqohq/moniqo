import { StyleSheet, View } from 'react-native';
import { Skeleton, ErrorState } from '@/components/ui';
import { radius, spacing } from '@/theme';
import { formatMonthLabel } from '@/utils/format';
import type { Account, BudgetSummary, DashboardStats } from '@/types/domain';
import { AllocatedCard } from './AllocatedCard';
import { BalanceCard } from './BalanceCard';
import { SpendingCard } from './SpendingCard';

interface AsyncSection<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface BudgetSummarySectionProps {
  accounts: AsyncSection<Account[]>;
  stats: AsyncSection<DashboardStats>;
  summary: AsyncSection<BudgetSummary>;
}

export function BudgetSummarySection({ accounts, stats, summary }: BudgetSummarySectionProps) {
  const isLoading = accounts.loading || stats.loading || summary.loading;
  const error = accounts.error ?? stats.error ?? summary.error;

  if (error) {
    return (
      <ErrorState
        message="Couldn't load your budget summary."
        onRetry={() => {
          accounts.refetch();
          stats.refetch();
          summary.refetch();
        }}
      />
    );
  }

  if (isLoading || !accounts.data || !stats.data || !summary.data) {
    return (
      <View style={styles.row}>
        <Skeleton width="31%" height={140} borderRadius={radius.lg} />
        <Skeleton width="31%" height={140} borderRadius={radius.lg} />
        <Skeleton width="31%" height={140} borderRadius={radius.lg} />
      </View>
    );
  }

  const totalBalance = accounts.data.reduce((sum, account) => sum + account.balance, 0);

  return (
    <View style={styles.row}>
      <BalanceCard totalBalance={totalBalance} trendPercent={stats.data.monthly_savings} />
      <AllocatedCard totalAllocated={summary.data.total_allocated} monthLabel={formatMonthLabel(summary.data.month)} />
      <SpendingCard totalSpent={summary.data.total_spent} totalAllocated={summary.data.total_allocated} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
