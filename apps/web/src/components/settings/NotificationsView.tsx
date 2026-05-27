'use client'

import { useState } from 'react'
import {
  Bell, Moon, Mail, ArrowUpDown, Wallet, CalendarClock,
  Target, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationChannelsModal } from './NotificationChannelsModal'
import { QuietHoursModal } from './QuietHoursModal'
import { EmailDigestModal } from './EmailDigestModal'

// ── Toggle ────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#6C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1623]',
        checked ? 'bg-[#6C3AED]' : 'bg-[#1E2B42]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ── Notification row ──────────────────────────────────────────────

function NotifRow({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  description,
  checked,
  onChange,
  last = false,
}: {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  last?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-4 py-3.5', !last && 'border-b border-[#1A2640]')}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#A8B4CC] leading-tight">{label}</p>
        <p className="text-[11px] text-[#5A6A85] mt-0.5 leading-relaxed">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// ── Section header with "Enable all" ─────────────────────────────

function SectionHeader({
  label,
  description,
  allEnabled,
  onToggleAll,
}: {
  label: string
  description: string
  allEnabled: boolean
  onToggleAll: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#1E2B42]">
      <div>
        <p className="text-[14px] font-semibold text-white leading-tight">{label}</p>
        <p className="text-[12px] text-[#5A6A85] mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-[12px] text-[#5A6A85]">Enable all</span>
        <Toggle checked={allEnabled} onChange={onToggleAll} />
      </div>
    </div>
  )
}

// ── Tab card ──────────────────────────────────────────────────────

function TabCard({
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: React.ElementType
  label: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all flex-1',
        active
          ? 'bg-[rgba(108,58,237,0.12)] border-[rgba(108,58,237,0.35)]'
          : 'bg-[#0F1623] border-[#1E2B42] hover:bg-[#131C2E] hover:border-[#2A3A54]',
      )}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
          active ? 'bg-[rgba(108,58,237,0.2)]' : 'bg-[#131C2E]',
        )}
      >
        <Icon size={16} className={active ? 'text-[#A78BFA]' : 'text-[#5A6A85]'} />
      </div>
      <div className="min-w-0">
        <p className={cn('text-[13px] font-semibold leading-tight', active ? 'text-white' : 'text-[#A8B4CC]')}>
          {label}
        </p>
        <p className="text-[11px] text-[#5A6A85] mt-0.5 leading-tight">{description}</p>
      </div>
    </button>
  )
}

// ── Push notification items ───────────────────────────────────────

const PUSH_ITEMS = [
  { id: 'transactions',   icon: ArrowUpDown,   iconColor: '#60A5FA', iconBg: 'rgba(59,130,246,0.12)',  label: 'Transactions',       description: 'Get notified about new transactions and updates.' },
  { id: 'budgets',        icon: Wallet,        iconColor: '#34D399', iconBg: 'rgba(34,197,94,0.12)',   label: 'Budget & Envelopes', description: 'Alerts for budget limits, overspending, and envelope updates.' },
  { id: 'bills',          icon: CalendarClock, iconColor: '#FBBF24', iconBg: 'rgba(245,158,11,0.12)',  label: 'Bills & Reminders',  description: 'Reminders for upcoming bills and scheduled payments.' },
  { id: 'goals',          icon: Target,        iconColor: '#C084FC', iconBg: 'rgba(168,85,247,0.12)',  label: 'Goals',              description: 'Updates on your goal progress and achievements.' },
  { id: 'accountAlerts',  icon: Building2,     iconColor: '#FB923C', iconBg: 'rgba(249,115,22,0.12)',  label: 'Account Alerts',     description: 'Important alerts about your accounts and balances.' },
]

// ── Email notification items ──────────────────────────────────────

const EMAIL_ITEMS = [
  { id: 'weeklySummary',  icon: Mail, iconColor: '#34D399', iconBg: 'rgba(34,197,94,0.12)',  label: 'Weekly summary',  description: 'A weekly overview of your spending and progress.' },
  { id: 'monthlySummary', icon: Mail, iconColor: '#C084FC', iconBg: 'rgba(168,85,247,0.12)', label: 'Monthly summary', description: 'A detailed summary at the end of each month.' },
  { id: 'productUpdates', icon: Bell, iconColor: '#60A5FA', iconBg: 'rgba(59,130,246,0.12)', label: 'Product updates',  description: 'News about new features and improvements.' },
]

type NotifKey = 'transactions' | 'budgets' | 'bills' | 'goals' | 'accountAlerts' | 'weeklySummary' | 'monthlySummary' | 'productUpdates'

// ── Main view ─────────────────────────────────────────────────────

export function NotificationsView() {
  const [activeTab, setActiveTab] = useState<'channels' | 'digest'>('channels')
  const [showChannelsModal, setShowChannelsModal] = useState(false)
  const [showQuietHoursModal, setShowQuietHoursModal] = useState(false)
  const [showEmailDigestModal, setShowEmailDigestModal] = useState(false)
  const [settings, setSettings] = useState<Record<NotifKey, boolean>>({
    transactions:   true,
    budgets:        true,
    bills:          true,
    goals:          true,
    accountAlerts:  true,
    weeklySummary:  true,
    monthlySummary: true,
    productUpdates: true,
  })

  function set(key: NotifKey, val: boolean) {
    setSettings(s => ({ ...s, [key]: val }))
  }

  const pushKeys: NotifKey[] = ['transactions', 'budgets', 'bills', 'goals', 'accountAlerts']
  const emailKeys: NotifKey[] = ['weeklySummary', 'monthlySummary', 'productUpdates']

  const allPushOn  = pushKeys.every(k  => settings[k])
  const allEmailOn = emailKeys.every(k => settings[k])

  function setAll(keys: NotifKey[], val: boolean) {
    setSettings(s => {
      const next = { ...s }
      keys.forEach(k => { next[k] = val })
      return next
    })
  }

  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">

      {/* ── Card heading ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2B42]">
        <div>
          <h2 className="text-[14px] font-semibold text-white">Notifications</h2>
          <p className="text-[12px] text-[#5A6A85] mt-0.5">Choose what you want to be notified about and how.</p>
        </div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(108,58,237,0.12)' }}>
          <Bell size={18} style={{ color: '#A78BFA' }} />
        </div>
      </div>

      <div className="p-5 flex flex-col gap-5">

        {/* ── Tab cards ────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <TabCard icon={Bell}  label="Configure webhook" description="Set up and manage your webhook endpoint" active={activeTab === 'channels'} onClick={() => { setActiveTab('channels'); setShowChannelsModal(true) }} />
          <TabCard icon={Moon}  label="Quiet hours"           description="Set times to pause notifications"       active={false}                   onClick={() => setShowQuietHoursModal(true)} />
          <TabCard icon={Mail}  label="Email digest"          description="Manage summary emails"                  active={activeTab === 'digest'}   onClick={() => { setActiveTab('digest'); setShowEmailDigestModal(true) }} />
        </div>

        {activeTab === 'channels' && (
          <>
            {/* ── Push Notifications ───────────────────────────────── */}
            <div className="bg-[#0A1020] border border-[#1A2640] rounded-xl p-5 flex flex-col gap-0">
              <SectionHeader
                label="Push Notifications"
                description="Receive alerts on this device."
                allEnabled={allPushOn}
                onToggleAll={v => setAll(pushKeys, v)}
              />
              <div className="mt-1">
                {PUSH_ITEMS.map((item, i) => (
                  <NotifRow
                    key={item.id}
                    icon={item.icon}
                    iconColor={item.iconColor}
                    iconBg={item.iconBg}
                    label={item.label}
                    description={item.description}
                    checked={settings[item.id as NotifKey]}
                    onChange={v => set(item.id as NotifKey, v)}
                    last={i === PUSH_ITEMS.length - 1}
                  />
                ))}
              </div>
            </div>

            {/* ── Email Notifications ──────────────────────────────── */}
            <div className="bg-[#0A1020] border border-[#1A2640] rounded-xl p-5 flex flex-col gap-0">
              <SectionHeader
                label="Email Notifications"
                description="Receive updates and summaries in your inbox."
                allEnabled={allEmailOn}
                onToggleAll={v => setAll(emailKeys, v)}
              />
              <div className="mt-1">
                {EMAIL_ITEMS.map((item, i) => (
                  <NotifRow
                    key={item.id}
                    icon={item.icon}
                    iconColor={item.iconColor}
                    iconBg={item.iconBg}
                    label={item.label}
                    description={item.description}
                    checked={settings[item.id as NotifKey]}
                    onChange={v => set(item.id as NotifKey, v)}
                    last={i === EMAIL_ITEMS.length - 1}
                  />
                ))}
              </div>
            </div>
          </>
        )}


      </div>

      <NotificationChannelsModal open={showChannelsModal} onClose={() => { setShowChannelsModal(false); setActiveTab('channels') }} />
      <QuietHoursModal open={showQuietHoursModal} onClose={() => setShowQuietHoursModal(false)} />
      <EmailDigestModal open={showEmailDigestModal} onClose={() => { setShowEmailDigestModal(false); setActiveTab('channels') }} />

    </div>
  )
}
