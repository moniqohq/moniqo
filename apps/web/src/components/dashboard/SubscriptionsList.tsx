import { mockSubscriptions } from '@/mock/data'
import { formatCurrency } from '@/lib/utils'

export function SubscriptionsList() {
  const total = mockSubscriptions.reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-1 flex-1">
        {mockSubscriptions.map(sub => (
          <div key={sub.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#131C2E] transition-colors">
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold"
              style={{ background: sub.bgColor, color: sub.initialsColor }}
            >
              {sub.initials}
            </div>

            {/* Name + amount */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-white truncate">{sub.name}</p>
              <p className="text-[11px] text-[#5A6A85]">{formatCurrency(sub.amount)} / month</p>
            </div>

            {/* Badge */}
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0"
              style={{ color: '#00E6B4', background: 'rgba(0,230,180,0.12)' }}
            >
              Active
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mx-4 mb-4 mt-2 rounded-xl px-4 py-3 text-center"
        style={{ background: 'rgba(30,43,66,0.6)' }}
      >
        <p className="text-[13px] font-semibold text-white">{formatCurrency(total)} / month</p>
      </div>
    </div>
  )
}
