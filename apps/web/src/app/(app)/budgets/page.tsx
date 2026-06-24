import { PageHeader } from "@/components/shared/PageHeader";

export default function StubPage() {
  return (
    <div className="p-6">
      <PageHeader title="Coming Soon" description="This section is under construction" />
      <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E2B42] bg-[#0F1623]">
        <p className="text-sm text-[#5A6A85]">Under construction.</p>
      </div>
    </div>
  );
}
