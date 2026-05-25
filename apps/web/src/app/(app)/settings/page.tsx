import { PageHeader } from '@/components/shared/PageHeader'

export default function StubPage() {
  return (
    <div className="p-6">
      <PageHeader title="Coming Soon" description="This section is under construction" />
      <div className="flex items-center justify-center h-64 bg-[#0F1623] border border-[#1E2B42] rounded-xl">
        <p className="text-[#5A6A85] text-sm">Under construction.</p>
      </div>
    </div>
  )
}
