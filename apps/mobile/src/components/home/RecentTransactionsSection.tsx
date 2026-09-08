import { Card, EmptyState, ErrorState, SectionHeader } from '@/components/ui';
import type { Transaction } from '@/types/domain';
import { RowListSkeleton } from './RowListSkeleton';
import { TransactionRow } from './TransactionRow';

interface RecentTransactionsSectionProps {
  data: Transaction[] | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onViewAll?: () => void;
  onPressTransaction?: (transaction: Transaction) => void;
}

export function RecentTransactionsSection({
  data,
  loading,
  error,
  onRetry,
  onViewAll,
  onPressTransaction,
}: RecentTransactionsSectionProps) {
  return (
    <>
      <SectionHeader title="Recent Transactions" onViewAll={onViewAll} />
      <Card>
        {error ? (
          <ErrorState message="Couldn't load your transactions." onRetry={onRetry} />
        ) : loading || !data ? (
          <RowListSkeleton rows={4} />
        ) : data.length === 0 ? (
          <EmptyState message="No transactions yet" />
        ) : (
          data.map((transaction, index) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              onPress={onPressTransaction}
              isLast={index === data.length - 1}
            />
          ))
        )}
      </Card>
    </>
  );
}
