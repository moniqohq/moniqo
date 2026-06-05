'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, AlertTriangle, Trash2, FileClock, Receipt, ArrowLeftRight,
  Check, Building2, PiggyBank, CreditCard, Wallet, TrendingUp, Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccountType } from '@/types'

const TYPE_META: Record<AccountType, { icon: React.ReactNode; label: string; color: string }> = {
  checking:   { icon: <Building2 size={18} />, label: 'Checking',    color: '#3B82F6' },
  savings:    { icon: <PiggyBank  size={18} />, label: 'Savings',    color: '#22C55E' },
  credit:     { icon: <CreditCard size={18} />, label: 'Credit Card',color: '#F87171' },
  cash:       { icon: <Wallet     size={18} />, label: 'Cash',       color: '#F59E0B' },
  investment: { icon: <TrendingUp size={18} />, label: 'Investment', color: '#8B5CF6' },
  loan:       { icon: <Landmark   size={18} />, label: 'Loan',       color: '#EC4899' },
}

function ConsequenceRow({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
        <Icon size={15} className="text-[#EF4444]" />
      </div>
      <span className="text-sm text-[#A8B4CC] leading-snug">{label}</span>
    </div>
  )
}

export interface ForceDeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: { id: string; name: string; type: AccountType }
}

export function ForceDeleteAccountDialog({ open, onOpenChange, account }: ForceDeleteAccountDialogProps) {
  const [understood,   setUnderstood]  = useState(false)
  const [confirmText,  setConfirmText] = useState('')
  const [loading,      setLoading]     = useState(false)
  const [done,         setDone]        = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const canDelete = understood && confirmText === 'DELETE'
  const typeMeta  = TYPE_META[account.type]

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      setUnderstood(false)
      setConfirmText('')
      setLoading(false)
      setDone(false)
    } else {
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open])
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleDelete() {
    if (!canDelete) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setDone(true)
      setTimeout(() => onOpenChange(false), 900)
    }, 1200)
  }

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
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-[480px] bg-[#0B1120] border border-[#1A2540] rounded-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-[#1A2540]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${typeMeta.color}20`, color: typeMeta.color }}
                  >
                    {typeMeta.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Delete Account</h2>
                    <p className="text-xs text-[#5A6A85] mt-0.5">{account.name} · {typeMeta.label}</p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="text-[#5A6A85] hover:text-white transition-colors p-1 rounded-lg hover:bg-[#1A2540]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Warning banner */}
              <div className="mx-5 mt-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
                <AlertTriangle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#FCA5A5] leading-relaxed">
                  This action is <span className="font-bold">permanent and irreversible</span>. All data associated with this account will be permanently erased.
                </p>
              </div>

              {/* Consequences */}
              <div className="mx-5 mt-4 px-4 border border-[#1A2540] rounded-xl bg-[#060C18] divide-y divide-[#1A2540]">
                <ConsequenceRow icon={Receipt}        label="All transaction history will be permanently deleted" />
                <ConsequenceRow icon={FileClock}      label="Scheduled and recurring transactions will be removed" />
                <ConsequenceRow icon={ArrowLeftRight} label="Transfer links to other accounts will be severed" />
              </div>

              {/* Understand checkbox */}
              <div className="mx-5 mt-4">
                <button
                  onClick={() => setUnderstood(u => !u)}
                  className="flex items-center gap-3 w-full text-left group"
                >
                  <div className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    understood
                      ? 'bg-[#EF4444] border-[#EF4444]'
                      : 'border-[#2A3A54] group-hover:border-[#EF4444]/50',
                  )}>
                    {understood && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm text-[#A8B4CC]">
                    I understand this action cannot be undone
                  </span>
                </button>
              </div>

              {/* Confirm text */}
              <div className="mx-5 mt-4">
                <label className="block text-xs text-[#5A6A85] mb-1.5">
                  Type <span className="font-bold text-[#F87171]">DELETE</span> to confirm
                </label>
                <input
                  ref={inputRef}
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 text-sm bg-[#060C18] border border-[#1A2540] rounded-lg text-white placeholder:text-[#2A3A54] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/30 focus:border-[#EF4444] transition-all font-mono"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-5 mt-2">
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 text-sm font-medium text-[#A8B4CC] rounded-lg border border-[#1A2540] hover:border-[#2A3A54] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!canDelete || loading || done}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all',
                    canDelete && !loading && !done
                      ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-[0_0_16px_rgba(239,68,68,0.35)] hover:shadow-[0_0_24px_rgba(239,68,68,0.5)]'
                      : 'bg-[#1A2540] text-[#3A4A60] cursor-not-allowed',
                  )}
                >
                  {done ? (
                    <><Check size={14} /> Deleted</>
                  ) : loading ? (
                    <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
                  ) : (
                    <><Trash2 size={14} /> Delete Account</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
