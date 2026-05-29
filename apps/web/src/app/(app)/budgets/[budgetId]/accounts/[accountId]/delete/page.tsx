import { DeleteAccountView } from '@/components/accounts/DeleteAccountView'

export const metadata = { title: 'Delete Account — Moniqo' }

interface Props {
  params: Promise<{ budgetId: string; accountId: string }>
}

export default async function DeleteAccountPage({ params }: Props) {
  const { budgetId, accountId } = await params
  return <DeleteAccountView budgetId={budgetId} accountId={accountId} />
}
