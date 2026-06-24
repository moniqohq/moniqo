import { ReconcileAccountView } from "@/components/accounts/ReconcileAccountView";

export const metadata = { title: "Reconcile Account — Moniqo" };

interface Props {
  params: Promise<{ budgetId: string; accountId: string }>;
}

export default async function ReconcileAccountPage({ params }: Props) {
  const { budgetId, accountId } = await params;
  return <ReconcileAccountView budgetId={budgetId} accountId={accountId} />;
}
