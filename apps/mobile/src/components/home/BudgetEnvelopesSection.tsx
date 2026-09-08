import { Card, EmptyState, ErrorState, SectionHeader } from '@/components/ui';
import type { BudgetEnvelope } from '@/types/domain';
import { EnvelopeListSkeleton } from './EnvelopeListSkeleton';
import { EnvelopeRow } from './EnvelopeRow';

interface BudgetEnvelopesSectionProps {
  data: BudgetEnvelope[] | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onViewAll?: () => void;
}

export function BudgetEnvelopesSection({ data, loading, error, onRetry, onViewAll }: BudgetEnvelopesSectionProps) {
  return (
    <>
      <SectionHeader title="Budget Envelopes" onViewAll={onViewAll} />
      <Card>
        {error ? (
          <ErrorState message="Couldn't load your budget envelopes." onRetry={onRetry} />
        ) : loading || !data ? (
          <EnvelopeListSkeleton rows={2} />
        ) : data.length === 0 ? (
          <EmptyState message="No budget envelopes yet" />
        ) : (
          data.map((envelope, index) => (
            <EnvelopeRow key={envelope.id} envelope={envelope} isLast={index === data.length - 1} />
          ))
        )}
      </Card>
    </>
  );
}
