'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Building2, PiggyBank, CreditCard, Wallet, TrendingUp, Landmark,
  ChevronDown, Info, RefreshCw, Archive, CalendarDays, Lock, Timer,
} from 'lucide-react'
import { mockAccounts } from '@/mock/data'
import { formatCurrency, cn } from '@/lib/utils'
import type { AccountType } from '@/types'

/* ── types ────────────────────────────────────────────── */

export interface ModifyAccountModalProps {
  open: boolean
  onClose: () => void
  accountId: string
}

/* ── constants ────────────────────────────────────────── */

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: React.ElementType }[] = [
  { type: 'checking',   label: 'Checking',    icon: Building2  },
  { type: 'savings',    label: 'Savings',     icon: PiggyBank  },
  { type: 'credit',     label: 'Credit Card', icon: CreditCard },
  { type: 'cash',       label: 'Cash',        icon: Wallet     },
  { type: 'investment', label: 'Investment',  icon: TrendingUp },
  { type: 'loan',       label: 'Loan',        icon: Landmark   },
]

const TYPE_META: Record<AccountType, { icon: React.ElementType; color: string; bg: string }> = {
  checking:   { icon: Building2,  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  savings:    { icon: PiggyBank,  color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  credit:     { icon: CreditCard, color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  cash:       { icon: Wallet,     color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  investment: { icon: TrendingUp, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  loan:       { icon: Landmark,   color: '#EC4899', bg: 'rgba(236,72,153,0.12)'  },
}

/* ── sub-components ───────────────────────────────────── */

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
          : 'bg-[#1A2540]',
      )}
    >
      <span
        className="inline-block rounded-full bg-white shadow transition-transform duration-200"
        style={{
          width: 18,
          height: 18,
          transform: checked ? 'translateX(22px)' : 'translateX(3px)',
        }}
      />
    </button>
  )
}

function AccountAvatar({ type }: { type: AccountType }) {
  return (
    <div className="flex-shrink-0">
      <div
        className="w-[110px] h-[110px] rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(145deg, #1E4A8A 0%, #1A3A7A 40%, #0F2255 100%)',
          border: '3px solid rgba(59,130,246,0.3)',
          boxShadow: '0 0 32px rgba(59,130,246,0.28), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <Building2
          size={44}
          strokeWidth={1.4}
          style={{ color: '#DBEAFE', filter: 'drop-shadow(0 2px 6px rgba(59,130,246,0.5))' }}
        />
      </div>
    </div>
  )
}

function BalanceSummaryCard({
  currentBalance,
  clearedBalance,
  lastReconciled,
}: {
  currentBalance: number
  clearedBalance: number
  lastReconciled: string
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(108,58,237,0.07) 0%, rgba(11,17,32,0.98) 100%)',
        border: '1px solid rgba(108,58,237,0.32)',
        boxShadow: '0 0 24px rgba(108,58,237,0.1), inset 0 1px 0 rgba(108,58,237,0.1)',
      }}
    >
      {/* 3-column stats */}
      <div className="grid grid-cols-3 divide-x divide-[#1A2540]">
        {/* Current Balance */}
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-[#5A6A85] mb-1.5">Current Balance</p>
          <p className={cn(
            'text-xl font-bold tabular-nums leading-tight',
            currentBalance >= 0 ? 'text-white' : 'text-[#F87171]',
          )}>
            {currentBalance < 0 ? '−' : ''}{formatCurrency(Math.abs(currentBalance))}
          </p>
        </div>

        {/* Cleared Balance */}
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-[#5A6A85] mb-1.5">Cleared Balance</p>
          <p className={cn(
            'text-xl font-bold tabular-nums leading-tight',
            clearedBalance >= 0 ? 'text-white' : 'text-[#F87171]',
          )}>
            {clearedBalance < 0 ? '−' : ''}{formatCurrency(Math.abs(clearedBalance))}
          </p>
        </div>

        {/* Last Reconciled */}
        <div className="px-5 py-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[#5A6A85] mb-1.5">Last Reconciled</p>
            <p className="text-xl font-bold text-white leading-tight">{lastReconciled}</p>
          </div>
          <CalendarDays size={18} className="text-[#3D4E6A] mt-1 flex-shrink-0" />
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-t border-[#1A2540]">
        <Info size={13} className="text-[#4A5A75] flex-shrink-0" />
        <p className="text-xs text-[#4A5A75] leading-relaxed">
          Balances are calculated from transactions and cannot be edited directly.
        </p>
      </div>
    </div>
  )
}

function AccountSettingsRow({
  reconciliation,
  setReconciliation,
}: {
  reconciliation: boolean
  setReconciliation: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-4 bg-[#0D1525] border border-[#1E2B42] rounded-xl hover:border-[#2A3A54] transition-colors">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'rgba(108,58,237,0.15)', color: '#8B5CF6' }}
      >
        <RefreshCw size={18} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">
          Enable reconciliation workflow
        </p>
        <p className="text-xs text-[#7A8BA8] mt-0.5">
          Track cleared balances and reconcile statements.
        </p>
      </div>
      <ToggleSwitch checked={reconciliation} onChange={setReconciliation} />
    </div>
  )
}

function ArchiveAccountCard({ onArchive }: { onArchive: () => void }) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(180,83,9,0.12) 0%, rgba(11,17,32,0.95) 100%)',
        border: '1px solid rgba(217,119,6,0.3)',
        boxShadow: '0 0 20px rgba(180,83,9,0.08), inset 0 1px 0 rgba(245,158,11,0.06)',
      }}
    >
      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: 'rgba(217,119,6,0.15)',
          border: '1px solid rgba(217,119,6,0.25)',
          boxShadow: '0 0 14px rgba(180,83,9,0.2)',
        }}
      >
        <Archive size={20} strokeWidth={1.8} className="text-amber-500" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">Archive Account</p>
        <p className="text-xs text-[#7A6A4A] mt-0.5 leading-relaxed">
          Archived accounts remain in reports and historical transactions but can no longer accept new transactions.
        </p>
      </div>

      {/* Button */}
      <button
        onClick={onArchive}
        className="flex-shrink-0 px-4 py-2 text-sm font-semibold text-amber-500 border border-amber-700/60 rounded-lg hover:bg-amber-500/10 hover:border-amber-500/80 focus:outline-none transition-all"
      >
        Archive Account
      </button>
    </div>
  )
}

/* ── main modal ───────────────────────────────────────── */

export function ModifyAccountModal({ open, onClose, accountId }: ModifyAccountModalProps) {
  const account = mockAccounts.find(a => a.id === accountId) ?? mockAccounts[0]

  const [accountName,    setAccountName]    = useState(account.name)
  const [accountType,    setAccountType]    = useState<AccountType>(account.type)
  const [typeOpen,       setTypeOpen]       = useState(false)
  const [includeInBudget,   setIncludeInBudget]   = useState(true)
  const [reconciliation,    setReconciliation]    = useState(true)
  const [lockTransactions,  setLockTransactions]  = useState(false)
  const [notes,             setNotes]             = useState('')

  /* reset form whenever the modal opens with a new account */
  useEffect(() => {
    if (open) {
      setAccountName(account.name)
      setAccountType(account.type)
      setIncludeInBudget(true)
      setReconciliation(true)
      setLockTransactions(false)
      setNotes('')
    }
  }, [open, account.name, account.type])

  /* keyboard + scroll lock */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const handleReset = () => {
    setAccountName(account.name)
    setAccountType(account.type)
    setIncludeInBudget(true)
    setReconciliation(true)
    setLockTransactions(false)
    setNotes('')
  }

  const handleSave = () => {
    // TODO: wire to update action
    onClose()
  }

  const handleArchive = () => {
    // TODO: wire to archive action
    onClose()
  }

  const TypeIcon = TYPE_META[accountType]?.icon ?? Building2
  const typeColor = TYPE_META[accountType]?.color ?? '#3B82F6'

  /* derived balance figures */
  const clearedBalance  = Math.round(account.balance * 0.985)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
              className="relative w-full max-w-[780px] bg-[#0B1120] border border-[#1A2540] rounded-2xl overflow-hidden my-auto shadow-[0_0_0_1px_rgba(108,58,237,0.12),0_32px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(108,58,237,0.08)]"
              onClick={e => { e.stopPropagation(); setTypeOpen(false) }}
              role="dialog"
              aria-modal="true"
              aria-label="Modify Account"
            >
              {/* Top glow line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6C3AED]/40 to-transparent" />

              {/* ── Header ── */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#111B2D]">
                <div>
                  <h2 className="text-[1.4rem] font-bold text-white leading-tight">
                    Modify Account
                  </h2>
                  <p className="text-sm text-[#4A5A75] mt-0.5">
                    Update account details and preferences
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1200] border border-[#3A2A00] rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                    <span className="text-xs font-medium text-amber-400 whitespace-nowrap">
                      Unsaved changes
                    </span>
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

              {/* ── Body ── */}
              <div className="px-6 py-5 space-y-5">

                {/* Top section — avatar + form fields */}
                <div className="flex items-start gap-6">
                  <AccountAvatar type={accountType} />

                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Account Name */}
                    <div>
                      <label className="block mb-2 text-sm font-medium text-[#A8B4CC]">
                        Account Name
                      </label>
                      <input
                        value={accountName}
                        onChange={e => setAccountName(e.target.value)}
                        className="w-full py-2.5 px-3.5 text-sm text-white bg-[#0D1525] border border-[#1E2B42] rounded-xl placeholder:text-[#2A3A54] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED] transition-all"
                      />
                    </div>

                    {/* Account Type */}
                    <div>
                      <label className="block mb-2 text-sm font-medium text-[#A8B4CC]">
                        Account Type
                      </label>
                      <div
                        className="relative"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setTypeOpen(o => !o)}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-[#0D1525] border border-[#1E2B42] rounded-xl hover:border-[#2A3A54] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED] transition-all"
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: TYPE_META[accountType].bg, color: typeColor }}
                          >
                            <TypeIcon size={15} strokeWidth={1.8} />
                          </div>
                          <span className="flex-1 text-left text-sm text-white font-medium">
                            {ACCOUNT_TYPES.find(t => t.type === accountType)?.label}
                          </span>
                          <ChevronDown
                            size={15}
                            className={cn('text-[#4A5A75] transition-transform', typeOpen && 'rotate-180')}
                          />
                        </button>

                        {typeOpen && (
                          <div className="absolute top-full left-0 mt-1 w-full rounded-xl border border-[#1A2640] bg-[#0D1B2E] shadow-xl z-30 py-1.5 overflow-hidden">
                            {ACCOUNT_TYPES.map(({ type, label, icon: Icon }) => {
                              const meta = TYPE_META[type]
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => { setAccountType(type); setTypeOpen(false) }}
                                  className={cn(
                                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                                    accountType === type
                                      ? 'bg-[#6C3AED]/12 text-white'
                                      : 'text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white',
                                  )}
                                >
                                  <div
                                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: meta.bg, color: meta.color }}
                                  >
                                    <Icon size={14} strokeWidth={1.8} />
                                  </div>
                                  <span>{label}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance summary */}
                <BalanceSummaryCard
                  currentBalance={account.balance}
                  clearedBalance={clearedBalance}
                  lastReconciled="3 days ago"
                />

                {/* Account Settings */}
                <div>
                  <p className="text-sm font-bold text-white mb-3">Account Settings</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 px-4 py-4 bg-[#0D1525] border border-[#1E2B42] rounded-xl hover:border-[#2A3A54] transition-colors">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}
                      >
                        <Timer size={18} strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white leading-tight">Include in budget</p>
                        <p className="text-xs text-[#7A8BA8] mt-0.5">
                          On-budget accounts affect available cash calculations.
                        </p>
                      </div>
                      <ToggleSwitch checked={includeInBudget} onChange={setIncludeInBudget} />
                    </div>
                    <AccountSettingsRow
                      reconciliation={reconciliation}
                      setReconciliation={setReconciliation}
                    />
                    <div className="flex items-center gap-4 px-4 py-4 bg-[#0D1525] border border-[#1E2B42] rounded-xl hover:border-[#2A3A54] transition-colors">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(236,72,153,0.12)', color: '#EC4899' }}
                      >
                        <Lock size={18} strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white leading-tight">
                          Lock transactions (Prevent editing)
                        </p>
                        <p className="text-xs text-[#7A8BA8] mt-0.5">
                          Prevent future edits or deletions to transactions for this account.
                        </p>
                      </div>
                      <ToggleSwitch checked={lockTransactions} onChange={setLockTransactions} />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-[#A8B4CC]">
                    Notes{' '}
                    <span className="font-normal text-[#2A3A54]">(optional)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value.slice(0, 300))}
                      placeholder="Optional notes about this account…"
                      rows={3}
                      className="w-full py-2.5 px-3.5 text-sm text-white bg-[#0D1525] border border-[#1E2B42] rounded-xl placeholder:text-[#2A3A54] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED] transition-all resize-none"
                    />
                    <span className="absolute right-3.5 bottom-2.5 text-[10px] text-[#2A3A54] tabular-nums">
                      {notes.length} / 300
                    </span>
                  </div>
                </div>

                {/* Archive */}
                <ArchiveAccountCard onArchive={handleArchive} />
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#111B2D]">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-semibold text-[#A8B4CC] bg-transparent rounded-xl hover:bg-[#0D1525] hover:text-white focus:outline-none transition-all"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 text-sm font-semibold text-[#A8B4CC] bg-transparent border border-[#1A2540] rounded-xl hover:bg-[#0D1525] hover:text-white focus:outline-none transition-all"
                  >
                    Reset Changes
                  </button>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] hover:from-[#6C3AED] hover:to-[#7C4AFF] shadow-[0_0_20px_rgba(108,58,237,0.4)] hover:shadow-[0_0_28px_rgba(108,58,237,0.55)] focus:outline-none focus:ring-4 focus:ring-[#6C3AED]/30 transition-all"
                  >
                    Save Changes
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
