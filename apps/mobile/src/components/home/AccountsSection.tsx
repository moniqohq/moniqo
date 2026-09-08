import { Card, EmptyState, ErrorState, SectionHeader } from '@/components/ui';
import type { Account } from '@/types/domain';
import { AccountRow } from './AccountRow';
import { RowListSkeleton } from './RowListSkeleton';

interface AccountsSectionProps {
  data: Account[] | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onViewAll?: () => void;
  onPressAccount?: (account: Account) => void;
}

export function AccountsSection({ data, loading, error, onRetry, onViewAll, onPressAccount }: AccountsSectionProps) {
  return (
    <>
      <SectionHeader title="Accounts" onViewAll={onViewAll} />
      <Card>
        {error ? (
          <ErrorState message="Couldn't load your accounts." onRetry={onRetry} />
        ) : loading || !data ? (
          <RowListSkeleton rows={4} />
        ) : data.length === 0 ? (
          <EmptyState message="No accounts yet" />
        ) : (
          data.map((account, index) => (
            <AccountRow key={account.id} account={account} onPress={onPressAccount} isLast={index === data.length - 1} />
          ))
        )}
      </Card>
    </>
  );
}
