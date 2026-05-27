'use client'

import { useState } from 'react'
import {
  Globe, X, Info,
  Send, ArrowUpDown, Wallet, CalendarClock, Building2,
  Shield, Pencil, RefreshCw, Eye, EyeOff,
  Copy, Trash2, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'

// ── Webhook event groups ───────────────────────────────────────────

const WEBHOOK_EVENT_GROUPS = [
  { id: 'transactions',   icon: ArrowUpDown,   iconColor: '#60A5FA', iconBg: 'rgba(59,130,246,0.12)',  label: 'Transactions',       description: 'New transactions, updated transactions, and refunds.' },
  { id: 'budgets',        icon: Wallet,        iconColor: '#34D399', iconBg: 'rgba(34,197,94,0.12)',   label: 'Budget & Envelopes', description: 'Overspending alerts and envelope updates.' },
  { id: 'bills',          icon: CalendarClock, iconColor: '#FBBF24', iconBg: 'rgba(245,158,11,0.12)',  label: 'Bills & Reminders',  description: 'Upcoming bills and scheduled payment reminders.' },
  { id: 'accountAlerts',  icon: Building2,     iconColor: '#F87171', iconBg: 'rgba(239,68,68,0.12)',   label: 'Account Alerts',     description: 'Balance updates, low balance, and account changes.' },
  { id: 'securityEvents', icon: Shield,        iconColor: '#A78BFA', iconBg: 'rgba(108,58,237,0.12)', label: 'Security Events',    description: 'Login alerts, 2FA changes, and security updates.' },
]

// ── Toggle ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#6C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1520]',
        checked ? 'bg-[#6C3AED]' : 'bg-[#1E2B42]',
      )}
    >
      <span className={cn(
        'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200',
        checked ? 'translate-x-4' : 'translate-x-0',
      )} />
    </button>
  )
}

// ── Checkbox ────────────────────────────────────────────────────────

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'w-4 h-4 rounded shrink-0 border transition-all duration-200 flex items-center justify-center',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3AED]',
        'focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1623]',
        checked
          ? 'bg-[#6C3AED] border-[#6C3AED]'
          : 'bg-transparent border-[#2A3A54] hover:border-[#4A5A74]',
      )}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden="true">
          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

// ── WebhookConfigModal ──────────────────────────────────────────────

export function NotificationChannelsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [enabled, setEnabled] = useState(true)
  const [showSecret, setShowSecret] = useState(false)
  const [eventGroups, setEventGroups] = useState<Record<string, boolean>>({
    transactions:   true,
    budgets:        true,
    bills:          true,
    accountAlerts:  true,
    securityEvents: true,
  })

  const allSelected = Object.values(eventGroups).every(Boolean)
  const MOCK_SECRET = 'whsec_k9mXp2rLqT8vNcJdAeYfUbW4sGhRn6oI'

  function toggleGroup(id: string, v: boolean) {
    setEventGroups(prev => ({ ...prev, [id]: v }))
  }

  function selectAll(v: boolean) {
    setEventGroups(Object.fromEntries(Object.keys(eventGroups).map(k => [k, v])))
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] sm:max-w-[780px] min-w-0 p-0 bg-[#0D1520] border-[#1E2B42] overflow-hidden gap-0 rounded-xl"
      >
        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-[#1E2B42]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[rgba(249,115,22,0.12)]">
            <Globe size={18} className="text-[#FB923C]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold text-white leading-tight">Configure webhook</p>
            <p className="text-[12px] text-[#5A6A85] mt-0.5">Manage your webhook endpoint and delivery settings.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5A6A85] hover:text-[#A8B4CC] hover:bg-[#1E2B42] transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(100vh - 220px)' }}>

          {/* Enable toggle */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#1E2B42]">
            <div>
              <p className="text-[13px] font-semibold text-white leading-tight">Enable webhooks</p>
              <p className="text-[12px] text-[#5A6A85] mt-1 leading-relaxed max-w-sm">
                Send real-time event notifications to your webhook endpoints.
              </p>
            </div>
            <Toggle checked={enabled} onChange={setEnabled} />
          </div>

          {/* Webhook endpoints */}
          <div className={cn('py-4 border-b border-[#1E2B42]', !enabled && 'opacity-40 pointer-events-none')}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-[13px] font-semibold text-white">Endpoints</p>
                <p className="text-[11px] text-[#5A6A85] mt-0.5">
                  We&apos;ll send a POST request to these URLs when events occur.
                </p>
              </div>
              <button className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium shrink-0',
                'bg-[#6C3AED] text-white hover:bg-[#7C4AFD] transition-all',
              )}>
                <Plus size={12} />
                Add endpoint
              </button>
            </div>

            <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-[#0F1623] border border-[#1E2B42]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[rgba(108,58,237,0.2)]">
                <span className="text-[10px] font-bold text-[#A78BFA] tracking-wide">WH</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white leading-tight">Moniqo Integration</p>
                <p className="text-[11px] text-[#5A6A85] mt-0.5 truncate">
                  https://api.moniqointegrations.com/webhook
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="px-2 py-0.5 rounded-md bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.2)]">
                  <span className="text-[11px] font-semibold text-[#22C55E]">Active</span>
                </div>
                <button className="flex items-center gap-1 text-[12px] text-[#A8B4CC] hover:text-white transition-colors">
                  <Pencil size={12} />
                  Edit
                </button>
                <button className="flex items-center gap-1 text-[12px] text-[#F87171] hover:text-[#FCA5A5] transition-colors">
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Secret token */}
          <div className={cn('py-4 border-b border-[#1E2B42]', !enabled && 'opacity-40 pointer-events-none')}>
            <div className="flex items-center justify-between gap-4 mb-1">
              <div>
                <p className="text-[13px] font-semibold text-white">Secret token</p>
                <p className="text-[11px] text-[#5A6A85] mt-0.5">
                  Use this token to verify that requests are coming from Moniqo.
                </p>
              </div>
              <button className="flex items-center gap-1.5 text-[12px] font-medium text-[#A78BFA] hover:text-[#C4B5FD] transition-colors">
                <RefreshCw size={12} />
                Regenerate
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#0F1623] border border-[#1E2B42] min-w-0">
                <span className="text-[15px] text-[#A8B4CC] tracking-[0.15em] select-none truncate">
                  {showSecret ? MOCK_SECRET : '••••••••••••••••••••••••••••••'}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setShowSecret(v => !v)}
                    className="p-1 text-[#5A6A85] hover:text-[#A8B4CC] transition-colors"
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(MOCK_SECRET)}
                    className="p-1 text-[#5A6A85] hover:text-[#A8B4CC] transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#5A6A85] mt-2">Keep this token secure. Do not share it publicly.</p>
          </div>

          {/* Events to send */}
          <div className={cn('py-4', !enabled && 'opacity-40 pointer-events-none')}>
            <div className="flex items-center justify-between gap-4 mb-1">
              <div>
                <p className="text-[13px] font-semibold text-white">Events to send</p>
                <p className="text-[11px] text-[#5A6A85] mt-0.5">
                  Choose which events should trigger webhook notifications.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#5A6A85]">Select all</span>
                <Checkbox checked={allSelected} onChange={selectAll} />
              </div>
            </div>

            <div>
              {WEBHOOK_EVENT_GROUPS.map((group, i) => {
                const Icon = group.icon
                return (
                  <div
                    key={group.id}
                    className={cn(
                      'flex items-center gap-3 py-3',
                      i < WEBHOOK_EVENT_GROUPS.length - 1 && 'border-b border-[#1A2640]',
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: group.iconBg }}
                    >
                      <Icon size={14} style={{ color: group.iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#A8B4CC] leading-tight">{group.label}</p>
                      <p className="text-[11px] text-[#5A6A85] mt-0.5">{group.description}</p>
                    </div>
                    <Checkbox
                      checked={eventGroups[group.id]}
                      onChange={v => toggleGroup(group.id, v)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-[#1E2B42]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#131C2E] border border-[#1E2B42]">
              <Info size={11} className="text-[#5A6A85]" />
            </div>
            <p className="text-[12px] text-[#A8B4CC] leading-tight">Changes are saved automatically.</p>
          </div>
          <button className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-medium',
            'border border-[#2A3A54] text-[#A8B4CC] bg-transparent',
            'hover:border-[rgba(108,58,237,0.4)] hover:text-white hover:bg-[rgba(108,58,237,0.08)]',
            'hover:shadow-[0_0_12px_rgba(108,58,237,0.12)] transition-all duration-200',
          )}>
            <Send size={12} />
            Test webhook
          </button>
        </div>

      </DialogContent>
    </Dialog>
  )
}
