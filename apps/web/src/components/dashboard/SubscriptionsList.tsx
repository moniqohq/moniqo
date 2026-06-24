import { mockSubscriptions } from "@/mock/data";
import { formatCurrency } from "@/lib/utils";

export function SubscriptionsList() {
  const total = mockSubscriptions.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-1">
        {mockSubscriptions.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[#131C2E]"
          >
            {/* Icon */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold"
              style={{ background: sub.bgColor, color: sub.initialsColor }}
            >
              {sub.initials}
            </div>

            {/* Name + amount */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-white">{sub.name}</p>
              <p className="text-[11px] text-[#5A6A85]">{formatCurrency(sub.amount)} / month</p>
            </div>

            {/* Badge */}
            <span
              className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium"
              style={{ color: "#00E6B4", background: "rgba(0,230,180,0.12)" }}
            >
              Active
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div
        className="mx-4 mb-4 mt-2 rounded-xl px-4 py-3 text-center"
        style={{ background: "rgba(30,43,66,0.6)" }}
      >
        <p className="text-[13px] font-semibold text-white">{formatCurrency(total)} / month</p>
      </div>
    </div>
  );
}
