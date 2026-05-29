'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Building2, PiggyBank, CreditCard, Wallet, Landmark,
  CalendarDays, ChevronDown, Info, AlertCircle,
  CheckCircle2, MinusCircle, Shield, Timer, FileText, Star,
  Plus, Sparkles, Lock, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── types ────────────────────────────────────────────── */

type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'loan'

export interface AddAccountModalProps {
  open: boolean
  onClose: () => void
}

/* ── constants ────────────────────────────────────────── */

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: React.ElementType }[] = [
  { type: 'checking', label: 'Checking',    icon: Building2  },
  { type: 'savings',  label: 'Savings',     icon: PiggyBank  },
  { type: 'credit',   label: 'Credit Card', icon: CreditCard },
  { type: 'cash',     label: 'Cash',        icon: Wallet     },
  { type: 'loan',     label: 'Loan',        icon: Landmark   },
]

const TYPE_INFO: Record<AccountType, { title: string; description: string }> = {
  checking: { title: 'Everyday spending and income account.',      description: 'Ideal for salary deposits, bills, and day-to-day purchases.' },
  savings:  { title: 'Long-term savings and emergency fund.',      description: 'Earn interest and grow your savings over time.' },
  credit:   { title: 'Credit card balance and payment tracking.',  description: 'Monitor your credit limit, spending, and due payments.' },
  cash:     { title: 'Physical cash and petty cash management.',   description: 'Track cash in hand, wallets, and small day-to-day expenses.' },
  loan:     { title: 'Loan, mortgage, and debt tracking.',         description: 'Monitor outstanding balance and scheduled repayments.' },
}

const TYPE_COLORS: Record<AccountType, { icon: string; bg: string }> = {
  checking: { icon: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  savings:  { icon: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  credit:   { icon: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  cash:     { icon: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  loan:     { icon: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
}

/* ── ToggleSwitch ─────────────────────────────────────── */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40',
        checked
          ? 'bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] shadow-[0_0_12px_rgba(108,58,237,0.5)]'
          : 'bg-[#1E2B42]',
      )}
    >
      <span
        className="inline-block rounded-full bg-white shadow transition-transform duration-200"
        style={{ width: 18, height: 18, transform: checked ? 'translateX(22px)' : 'translateX(3px)' }}
      />
    </button>
  )
}

/* ── AccountTypeCard ──────────────────────────────────── */

function AccountTypeCard({ type, label, icon: Icon, selected, onClick }: {
  type: AccountType; label: string; icon: React.ElementType; selected: boolean; onClick: () => void
}) {
  const colors = TYPE_COLORS[type]
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex-1 flex flex-col items-center gap-1.5 py-3 px-1.5 rounded-xl border transition-all duration-200 focus:outline-none',
        selected
          ? 'border-[#6C3AED] bg-[#120A24] shadow-[0_0_18px_rgba(108,58,237,0.32),inset_0_1px_0_rgba(108,58,237,0.2)]'
          : 'border-[#1E2B42] bg-[#0D1525] hover:border-[#3A4A62] hover:bg-[#111B2D] hover:shadow-[0_0_10px_rgba(108,58,237,0.1)]',
      )}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          backgroundColor: selected ? colors.bg : 'rgba(255,255,255,0.04)',
          color: selected ? colors.icon : '#4A5A75',
        }}
      >
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <span className={cn('text-[11px] font-medium leading-tight text-center', selected ? 'text-[#C4B5FD]' : 'text-[#5A6A85]')}>
        {label}
      </span>
    </motion.button>
  )
}

/* ── ToggleSettingRow ─────────────────────────────────── */

function ToggleSettingRow({ icon: Icon, iconColor, iconBg, title, description, checked, onChange, badge }: {
  icon: React.ElementType; iconColor: string; iconBg: string
  title: string; description: string; checked: boolean
  onChange: (v: boolean) => void; badge?: string
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 bg-[#0D1525] border border-[#1E2B42] rounded-xl hover:border-[#2A3A54] transition-colors">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: iconBg, color: iconColor }}>
        <Icon size={16} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">{title}</p>
        {description && <p className="text-xs text-[#7A8BA8] mt-0.5 leading-relaxed">{description}</p>}
        {badge && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-[#A78BFA] bg-[#1E1030] border border-[#3D2870] px-2 py-0.5 rounded-full">
            <Star size={8} fill="#A78BFA" />{badge}
          </span>
        )}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  )
}

/* ── PreviewPanel ─────────────────────────────────────── */

function PreviewRow({ label, enabled, enabledText, enabledDesc, disabledText, disabledDesc }: {
  label: string; enabled: boolean
  enabledText: string; enabledDesc: string
  disabledText: string; disabledDesc: string
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-[#8A9BB5] mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {enabled
          ? <CheckCircle2 size={14} className="text-[#22C55E]" />
          : <MinusCircle  size={14} className="text-[#3D4E65]" />
        }
        <span className={cn('text-sm font-semibold', enabled ? 'text-[#4ADE80]' : 'text-[#4A5A75]')}>
          {enabled ? enabledText : disabledText}
        </span>
      </div>
      <p className="text-[10px] text-[#8A9BB5] mt-0.5 leading-relaxed">
        {enabled ? enabledDesc : disabledDesc}
      </p>
    </div>
  )
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function PreviewPanel({ accountName, accountType, initialBalance, balanceDate, includeInBudget, reconciliation, immutability }: {
  accountName: string; accountType: AccountType; initialBalance: string
  balanceDate: string; includeInBudget: boolean; reconciliation: boolean; immutability: boolean
}) {
  const TypeIcon = ACCOUNT_TYPES.find(t => t.type === accountType)?.icon ?? Building2
  const label    = ACCOUNT_TYPES.find(t => t.type === accountType)?.label ?? 'Account'
  const numBal   = parseFloat(initialBalance.replace(/,/g, '')) || 0
  const balStr   = `₹${numBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const colors   = TYPE_COLORS[accountType]
  const rgb      = hexToRgb(colors.icon)

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #111C30 0%, #0D1525 60%, #0B1120 100%)',
        border: `1px solid rgba(${rgb},0.15)`,
        boxShadow: `0 0 0 1px rgba(${rgb},0.1), inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Subtle top radial highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px rounded-t-2xl pointer-events-none"
        style={{ background: `linear-gradient(to right, transparent, rgba(${rgb},0.4), transparent)` }}
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <p className="text-sm font-bold text-white">Account preview</p>
      </div>

      {/* Identity */}
      <div className="flex flex-col items-center pt-5 pb-4 px-4 gap-2 border-b border-white/[0.05]">
        <motion.div
          key={accountType}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 300 }}
          className="w-[60px] h-[60px] rounded-full flex items-center justify-center"
          style={{
            backgroundColor: colors.bg,
            border: `2px solid rgba(${rgb},0.45)`,
            boxShadow: `0 0 28px rgba(${rgb},0.45), inset 0 1px 0 rgba(255,255,255,0.1)`,
          }}
        >
          <TypeIcon size={26} strokeWidth={1.5} style={{ color: colors.icon }} />
        </motion.div>
        <div className="text-center">
          <p className="text-base font-bold text-white mt-1">
            {accountName.trim() || `${label} Account`}
          </p>
          <span
            className="inline-block mt-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{
              color: colors.icon,
              backgroundColor: colors.bg,
              border: `1px solid rgba(${rgb},0.35)`,
            }}
          >
            New account
          </span>
        </div>
      </div>

      {/* Info rows */}
      <div className="px-4 pt-3 pb-1 space-y-3">
        {/* Initial balance */}
        <div>
          <p className="text-[11px] font-medium text-[#8A9BB5] mb-0.5">Initial balance</p>
          <motion.p
            key={balStr}
            initial={{ opacity: 0.7, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className={cn('text-xl font-bold tabular-nums', numBal < 0 ? 'text-[#F87171]' : 'text-[#4ADE80]')}
          >
            {balStr}
          </motion.p>
          <p className="text-[10px] text-[#4A5A75] mt-0.5">As of {balanceDate}</p>
        </div>

        <div className="h-px bg-white/[0.05]" />

        <PreviewRow
          label="Included in budget"
          enabled={includeInBudget}
          enabledText="Yes" enabledDesc="Affects available cash and allocations"
          disabledText="No"  disabledDesc="Tracked separately from budget"
        />

        <div className="h-px bg-white/[0.05]" />

        <PreviewRow
          label="Reconciliation"
          enabled={reconciliation}
          enabledText="Enabled"  enabledDesc="Statement tracking and cleared balances"
          disabledText="Disabled" disabledDesc="Reconciliation not active"
        />

        <div className="h-px bg-white/[0.05]" />

        <PreviewRow
          label="Immutability"
          enabled={immutability}
          enabledText="Enabled"  enabledDesc="Transactions locked and cannot be deleted"
          disabledText="Disabled" disabledDesc="Transactions can be modified"
        />
      </div>

      {/* Security notes */}
      <div
        className="mx-3 mt-3 mb-3 px-3 py-2.5 rounded-xl space-y-2"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div className="flex items-start gap-2">
          <Shield size={11} className="text-[#6C3AED] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#8A9BB5] leading-relaxed">Accounts belong to this budget.</p>
        </div>
        <div className="flex items-start gap-2">
          <RefreshCw size={11} className="text-[#22C55E] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#8A9BB5] leading-relaxed">Unspent balance carries over to the next month.</p>
        </div>
        {immutability && (
          <div className="flex items-start gap-2">
            <Lock size={11} className="text-[#EC4899] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#8A9BB5] leading-relaxed">All transactions are permanent and cannot be deleted.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main modal ───────────────────────────────────────── */

export function AddAccountModal({ open, onClose }: AddAccountModalProps) {
  const [accountName,     setAccountName]     = useState('')
  const [accountType,     setAccountType]     = useState<AccountType>('checking')
  const [initialBalance,  setInitialBalance]  = useState('')
  const [balanceDate]                         = useState('May 15, 2026')
  const [includeInBudget, setIncludeInBudget] = useState(true)
  const [reconciliation,  setReconciliation]  = useState(true)
  const [immutability,    setImmutability]    = useState(false)
  const [notes,           setNotes]           = useState('')
  const [nameError,       setNameError]       = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  const handleCreate = () => {
    if (!accountName.trim()) { setNameError(true); return }
    onClose()
  }

  const handleReset = () => {
    setAccountName(''); setAccountType('checking'); setInitialBalance('')
    setIncludeInBudget(true); setReconciliation(true); setImmutability(false)
    setNotes(''); setNameError(false)
  }

  const typeInfo   = TYPE_INFO[accountType]
  const TypeIcon   = ACCOUNT_TYPES.find(t => t.type === accountType)?.icon ?? Building2
  const typeColors = TYPE_COLORS[accountType]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 30, stiffness: 380 }}
              className="relative w-full max-w-[800px] bg-[#0B1120] border border-[#1A2540] rounded-2xl overflow-hidden my-auto shadow-[0_0_0_1px_rgba(108,58,237,0.12),0_32px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(108,58,237,0.08)]"
              onClick={e => e.stopPropagation()}
              role="dialog" aria-modal="true" aria-label="Add Account"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6C3AED]/40 to-transparent" />

              {/* ── Header ── */}
              <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#111B2D]">
                <div>
                  <h2 className="text-[1.35rem] font-bold text-white leading-tight">Add Account</h2>
                  <p className="text-sm text-[#4A5A75] mt-0.5">Create a financial account inside this budget</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1200] border border-[#3A2A00] rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                    <span className="text-xs font-medium text-amber-400 whitespace-nowrap">Unsaved changes</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#4A5A75] hover:text-white hover:bg-[#1A2540] transition-colors focus:outline-none"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* ── Body (scrollable) ── */}
              <div className="flex gap-5 px-6 py-4 max-h-[calc(100vh-160px)] overflow-y-auto">

                {/* LEFT COLUMN */}
                <div className="flex-1 min-w-0 space-y-4">

                  {/* Section label */}
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7A8BA8]">
                    Account identity
                  </p>

                  {/* Account name */}
                  <div className="-mt-1">
                    <label className="block mb-1.5 text-sm font-medium text-[#C8D4E4]">Account name</label>
                    <div className="relative">
                      {nameError && (
                        <AlertCircle size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F87171] pointer-events-none" />
                      )}
                      <input
                        value={accountName}
                        onChange={e => { setAccountName(e.target.value); if (e.target.value.trim()) setNameError(false) }}
                        placeholder="e.g., HDFC Salary Account"
                        className={cn(
                          'w-full py-2.5 text-sm text-white bg-[#0D1525] rounded-xl placeholder:text-[#2A3A54] focus:outline-none transition-all',
                          nameError
                            ? 'pl-10 pr-3 border border-[#F87171]/60 ring-2 ring-[#F87171]/20'
                            : 'px-3 border border-[#1E2B42] focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED]',
                        )}
                      />
                    </div>
                    {nameError && (
                      <p className="mt-1.5 text-xs text-[#F87171] flex items-center gap-1">
                        <AlertCircle size={11} />Account name is required
                      </p>
                    )}
                  </div>

                  {/* Account type */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-[#C8D4E4]">Account type</label>
                    <div className="flex gap-2">
                      {ACCOUNT_TYPES.map(({ type, label, icon }) => (
                        <AccountTypeCard
                          key={type} type={type} label={label} icon={icon}
                          selected={accountType === type} onClick={() => setAccountType(type)}
                        />
                      ))}
                    </div>

                    <motion.div
                      key={accountType}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
                      className="flex items-start gap-3 mt-2 px-3.5 py-2.5 bg-[#0D1525] border border-[#1E2B42] rounded-xl"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: typeColors.bg, color: typeColors.icon }}
                      >
                        <TypeIcon size={14} strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#E8EEF8] leading-tight">{typeInfo.title}</p>
                        <p className="text-xs text-[#5C6E8A] mt-0.5 leading-relaxed">{typeInfo.description}</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Initial balance */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(108,58,237,0.07) 0%, rgba(13,16,32,0.95) 100%)',
                      border: '1px solid rgba(108,58,237,0.28)',
                      boxShadow: '0 0 24px rgba(108,58,237,0.1), inset 0 1px 0 rgba(108,58,237,0.1)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-[#1A0E30] border border-[#3D2870] flex items-center justify-center">
                        <Info size={12} className="text-[#8B5CF6]" />
                      </div>
                      <p className="text-sm font-semibold text-white">Initial balance</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1.5 text-xs font-medium text-[#A8B4CC]">Initial balance</label>
                        <div className="relative flex items-center bg-[#0B1120] border border-[#1A2540] rounded-xl focus-within:ring-2 focus-within:ring-[#6C3AED]/40 focus-within:border-[#6C3AED] transition-all">
                          <span className="pl-3 pr-1 text-sm text-[#4A5A75] flex-shrink-0">₹</span>
                          <input
                            type="text" inputMode="decimal"
                            value={initialBalance}
                            onChange={e => setInitialBalance(e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder="0.00"
                            className="flex-1 py-2.5 pr-3 text-sm text-white bg-transparent placeholder:text-[#2A3A54] focus:outline-none tabular-nums"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-medium text-[#A8B4CC]">As of date</label>
                        <button className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#0B1120] border border-[#1A2540] rounded-xl hover:border-[#2A3A54] transition-colors text-sm focus:outline-none">
                          <CalendarDays size={13} className="text-[#4A5A75] flex-shrink-0" />
                          <span className="flex-1 text-left text-white text-sm">{balanceDate}</span>
                          <ChevronDown size={12} className="text-[#4A5A75] flex-shrink-0" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-start gap-2">
                      <Sparkles size={12} className="text-[#7C3AED] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-[#A8B4CC] leading-relaxed">
                          An opening balance transaction will be created automatically.
                        </p>
                        <p className="text-[10px] text-[#4A5A75] mt-0.5">
                          Balances are calculated from transactions and cannot be edited directly.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Settings rows */}
                  <div className="space-y-2">
                    <ToggleSettingRow
                      icon={Timer}
                      iconColor="#8B5CF6" iconBg="rgba(139,92,246,0.12)"
                      title="Include in budget"
                      description="On-budget accounts affect available cash calculations."
                      checked={includeInBudget} onChange={setIncludeInBudget}
                    />
                    <ToggleSettingRow
                      icon={FileText}
                      iconColor="#6C3AED" iconBg="rgba(108,58,237,0.12)"
                      title="Enable reconciliation workflow"
                      description="Track cleared balances and reconcile statements."
                      checked={reconciliation} onChange={setReconciliation}
                      badge="Recommended"
                    />
                    <ToggleSettingRow
                      icon={Lock}
                      iconColor="#EC4899" iconBg="rgba(236,72,153,0.12)"
                      title="Lock transactions (Prevent editing)"
                      description="Prevent future edits or deletions to transactions for this account."
                      checked={immutability} onChange={setImmutability}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-[#C8D4E4]">
                      Notes <span className="font-normal text-[#3D4E65]">(optional)</span>
                    </label>
                    <div className="relative">
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value.slice(0, 200))}
                        placeholder="Optional notes about this account…"
                        rows={3}
                        className="w-full py-2.5 px-3 text-sm text-white bg-[#0D1525] border border-[#252F42] rounded-xl placeholder:text-[#2A3A54] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED] transition-all resize-none"
                      />
                      <span className="absolute right-3 bottom-2.5 text-[10px] text-[#2A3A54] tabular-nums">
                        {notes.length} / 200
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN — preview */}
                <div className="w-[215px] flex-shrink-0 relative">
                  <PreviewPanel
                    accountName={accountName} accountType={accountType}
                    initialBalance={initialBalance} balanceDate={balanceDate}
                    includeInBudget={includeInBudget} reconciliation={reconciliation}
                    immutability={immutability}
                  />
                </div>
              </div>

              {/* ── Footer ── */}
              <div
                className="flex items-center justify-between px-6 py-3.5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
              >
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-sm font-semibold text-[#A8B4CC] bg-transparent border border-[#1A2540] rounded-xl hover:bg-[#0D1525] hover:text-white focus:outline-none transition-all"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-5 py-2 text-sm font-semibold text-[#A8B4CC] bg-transparent border border-[#1A2540] rounded-xl hover:bg-[#0D1525] hover:text-white focus:outline-none transition-all"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] hover:from-[#6C3AED] hover:to-[#7C4AFF] shadow-[0_0_24px_rgba(108,58,237,0.45)] hover:shadow-[0_0_32px_rgba(108,58,237,0.6)] focus:outline-none focus:ring-4 focus:ring-[#6C3AED]/30 transition-all"
                  >
                    <Plus size={15} />Create Account
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
