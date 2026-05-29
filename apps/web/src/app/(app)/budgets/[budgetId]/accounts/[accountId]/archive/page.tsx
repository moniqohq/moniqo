import { ArchiveAccountView } from '@/components/accounts/ArchiveAccountView'

export const metadata = { title: 'Archive Account — Moniqo' }

interface Props {
  params: Promise<{ budgetId: string; accountId: string }>
}

export default async function ArchiveAccountPage({ params }: Props) {
  const { budgetId, accountId } = await params
  return <ArchiveAccountView budgetId={budgetId} accountId={accountId} />
}
