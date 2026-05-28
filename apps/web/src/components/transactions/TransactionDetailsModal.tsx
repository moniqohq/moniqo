'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Building2, Tag, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  TrendingUp, FileText, User, Calendar, Hash, PiggyBank,
  CreditCard, Wallet, Edit2, Copy, CheckCircle, Trash2,
} from 'lucide-react'
import type { Transaction, AccountType } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { mockUser, mockAccounts } from '@/mock/data'

function formatModalDate(dateStr: string): string {
  const d = new Date(dateStr + 'T09:42:00')
  return d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

const ACCOUNT_TYPE_META: Record<AccountType, { icon: React.ReactNode; color: string }> = {
  checking:   { icon: <Building2 size={14} />,  color: '#3B82F6' },
  savings:    { icon: <PiggyBank size={14} />,   color: '#22C55E' },
  credit:     { icon: <CreditCard size={14} />,  color: '#F87171' },
  cash:       { icon: <Wallet size={14} />,       color: '#F59E0B' },
  investment: { icon: <TrendingUp size={14} />,  color: '#8B5CF6' },
}

interface Props {
  tx: Transaction | null
  open: boolean
  onClose: () => void
}

export function TransactionDetailsModal({ tx, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!tx) return null

  const isExpense  = tx.type === 'expense'
  const isIncome   = tx.type === 'income'
  const isTransfer = tx.type === 'transfer'

  const amountColor =
    isIncome   ? 'text-[#4ADE80]'
    : isExpense ? 'text-[#F87171]'
    : tx.amount >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'

  const acc     = mockAccounts.find(a => a.id === tx.accountId)
  const accMeta = acc ? ACCOUNT_TYPE_META[acc.type] : ACCOUNT_TYPE_META.checking

  const balanceBefore = (tx.runningBalance ?? 0) - tx.amount
  const balanceAfter  = tx.runningBalance ?? 0

  const formattedDate = formatModalDate(tx.date)

  const txNum = parseInt(tx.id.replace(/\D/g, '') || '1')
  const txId  = `TXN-${(new Date(tx.date).getTime() + txNum * 1000)}`

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Centering shell */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Transaction Details"
              className="relative w-full max-w-[1040px] rounded-2xl border border-[#1E2B42] bg-[#0A1220]/97 backdrop-blur-2xl shadow-[0_0_80px_rgba(108,58,237,0.18),0_30px_60px_rgba(0,0,0,0.7)] my-auto"
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Top glow line */}
              <div className="absolute top-0 inset-x-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-[#6C3AED]/35 to-transparent" />

              <div className="p-6">

                {/* ── Header ─────────────────────────────────── */}
                <div className="flex items-start gap-5 mb-4">

                  {/* Amount */}
                  <div className={cn('text-[2.25rem] font-bold tabular-nums leading-none mt-1 shrink-0', amountColor)}>
                    {tx.amount >= 0 ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                  </div>

                  {/* Merchant */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                      style={{ backgroundColor: tx.payeeColor ?? '#1E2B42' }}
                    >
                      {tx.payee[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-semibold text-[#E8EEF8] leading-tight truncate">{tx.payee}</p>
                      {tx.memo && (
                        <p className="text-sm text-[#5A6A85] mt-0.5 truncate">{tx.memo}</p>
                      )}
                    </div>
                  </div>

                  {/* Close */}
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5A6A85] hover:text-white hover:bg-[#1E2B42] transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Date + badges */}
                <div className="flex items-center gap-3 flex-wrap mb-5">
                  <div className="flex items-center gap-1.5 text-sm text-[#7A8BA8]">
                    <Calendar size={13} className="text-[#3A4A60]" />
                    <span>{formattedDate}</span>
                  </div>

                  <span className="text-[#1E2B42] select-none">|</span>

                  {/* Type badge */}
                  {isExpense && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(239,68,68,0.12)] text-[#F87171]">
                      <ArrowDownLeft size={11} strokeWidth={2.5} /> Expense
                    </span>
                  )}
                  {isIncome && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(34,197,94,0.12)] text-[#4ADE80]">
                      <ArrowUpRight size={11} strokeWidth={2.5} /> Income
                    </span>
                  )}
                  {isTransfer && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(99,179,237,0.12)] text-[#7DD3FC]">
                      <ArrowLeftRight size={11} strokeWidth={2.5} /> Transfer
                    </span>
                  )}

                  {/* Status badge */}
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                    tx.cleared
                      ? 'bg-[rgba(34,197,94,0.08)] text-[#4ADE80] border-[rgba(34,197,94,0.2)]'
                      : 'bg-[rgba(245,158,11,0.08)] text-[#FCD34D] border-[rgba(245,158,11,0.2)]',
                  )}>
                    {tx.cleared && <CheckCircle size={11} strokeWidth={2} />}
                    {tx.cleared ? 'Cleared' : 'Pending'}
                  </span>
                </div>

                <div className="h-px bg-[#141F32] mb-5" />

                {/* ── Main content ───────────────────────────── */}
                <div className="flex gap-0 mb-5">

                  {/* Left: Financial Details + Budget Impact */}
                  <div className="flex-1 min-w-0">

                    <h3 className="text-sm font-semibold text-[#E8EEF8] mb-4">Financial Details</h3>

                    {/* 2-col detail grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5 pr-6">

                      {/* Column 1 */}
                      <div className="space-y-5">

                        {/* Account */}
                        <DetailRow
                          icon={<div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accMeta.color}1A`, color: accMeta.color }}>{accMeta.icon}</div>}
                          label="Account"
                          value={tx.accountInstitution ?? tx.accountName}
                        />

                        {/* Envelope */}
                        <DetailRow
                          icon={
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                              style={{ backgroundColor: tx.envelopeColor ? `${tx.envelopeColor}2A` : '#1A2640', color: tx.envelopeColor ?? '#5A6A85' }}
                            >
                              {tx.envelopeIcon ?? <Tag size={14} />}
                            </div>
                          }
                          label="Envelope / Category"
                          value={tx.envelopeName ?? '—'}
                        />

                        {/* Transaction Type */}
                        <DetailRow
                          icon={
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{
                                backgroundColor: isExpense ? 'rgba(239,68,68,0.12)' : isIncome ? 'rgba(34,197,94,0.12)' : 'rgba(99,179,237,0.12)',
                                color: isExpense ? '#F87171' : isIncome ? '#4ADE80' : '#7DD3FC',
                              }}
                            >
                              {isExpense ? <ArrowDownLeft size={14} strokeWidth={2.5} /> : isIncome ? <ArrowUpRight size={14} strokeWidth={2.5} /> : <ArrowLeftRight size={14} strokeWidth={2.5} />}
                            </div>
                          }
                          label="Transaction Type"
                          value={tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        />
                      </div>

                      {/* Column 2 */}
                      <div className="space-y-5">

                        {/* Transfer Account */}
                        <DetailRow
                          icon={<IconBox><ArrowLeftRight size={14} /></IconBox>}
                          label="Transfer Account"
                          value="—"
                        />

                        {/* Running Balance */}
                        <DetailRow
                          icon={<IconBox><TrendingUp size={14} /></IconBox>}
                          label="Running Balance After Transaction"
                          value={tx.runningBalance !== undefined ? formatCurrency(tx.runningBalance) : '—'}
                        />

                        {/* Notes */}
                        <DetailRow
                          icon={<IconBox><FileText size={14} /></IconBox>}
                          label="Notes"
                          value={tx.memo ?? '—'}
                        />
                      </div>
                    </div>

                    {/* Budget Impact */}
                    <div className="mt-6 pr-6">
                      <div className="h-px bg-[#141F32] mb-4" />
                      <h3 className="text-sm font-semibold text-[#E8EEF8] mb-4">Budget Impact</h3>

                      <div className="flex items-center gap-3">
                        <ImpactCard label="Envelope Balance Before">
                          <span className="text-xl font-bold text-[#E8EEF8] tabular-nums">{formatCurrency(balanceBefore)}</span>
                        </ImpactCard>

                        <span className="text-xl font-bold text-[#3A4A60] shrink-0">−</span>

                        <ImpactCard label="Transaction Amount">
                          <span className={cn('text-xl font-bold tabular-nums', amountColor)}>
                            {tx.amount >= 0 ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                          </span>
                        </ImpactCard>

                        <span className="text-xl font-bold text-[#3A4A60] shrink-0">=</span>

                        <ImpactCard label="Envelope Balance After">
                          <span className={cn('text-xl font-bold tabular-nums', balanceAfter >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
                            {formatCurrency(balanceAfter)}
                          </span>
                        </ImpactCard>
                      </div>
                    </div>
                  </div>

                  {/* Vertical divider */}
                  <div className="w-px bg-[#141F32] mx-6 self-stretch" />

                  {/* Right: Metadata */}
                  <div className="w-[260px] shrink-0">
                    <h3 className="text-sm font-semibold text-[#E8EEF8] mb-4">Metadata</h3>
                    <div className="space-y-4">

                      {/* Created by */}
                      <DetailRow
                        icon={<div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#6C3AED]/20 text-[#8B5CF6]"><User size={14} /></div>}
                        label="Created by"
                        value={mockUser.name}
                      />

                      {/* Created at */}
                      <DetailRow
                        icon={<IconBox><Calendar size={14} /></IconBox>}
                        label="Created at"
                        value={formattedDate}
                      />

                      {/* Updated at */}
                      <DetailRow
                        icon={<IconBox><Calendar size={14} /></IconBox>}
                        label="Updated at"
                        value={formattedDate}
                      />

                      {/* Transaction ID */}
                      <div className="flex items-start gap-3">
                        <IconBox><Hash size={14} /></IconBox>
                        <div>
                          <p className="text-xs text-[#5A6A85] mb-0.5">Transaction ID</p>
                          <p className="text-xs font-mono text-[#A8B4CC] break-all">{txId}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Action buttons ─────────────────────────── */}
                <div className="h-px bg-[#141F32] mb-4" />
                <div className="flex items-center gap-2.5">
                  <ActionBtn>
                    <Edit2 size={14} /> Edit
                  </ActionBtn>
                  <ActionBtn>
                    <Copy size={14} /> Duplicate
                  </ActionBtn>
                  <ActionBtn className="border-[#22C55E]/30 text-[#4ADE80] hover:bg-[#22C55E]/10 hover:border-[#22C55E]/50 focus:ring-[#22C55E]/30">
                    <CheckCircle size={14} /> Mark Reconciled
                  </ActionBtn>
                  <ActionBtn className="ml-auto border-[#EF4444]/30 text-[#F87171] hover:bg-[#EF4444]/10 hover:border-[#EF4444]/50 focus:ring-[#EF4444]/30">
                    <Trash2 size={14} /> Delete
                  </ActionBtn>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ── Small reusable pieces ─────────────────────────────── */

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#131D30] text-[#5A6A85]">
      {children}
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-[#5A6A85] mb-0.5">{label}</p>
        <p className="text-sm font-medium text-[#E8EEF8] break-words">{value}</p>
      </div>
    </div>
  )
}

function ImpactCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 rounded-xl border border-[#1E2B42] bg-[#080E1A] px-4 py-3">
      <p className="text-xs text-[#5A6A85] mb-2 leading-tight">{label}</p>
      {children}
    </div>
  )
}

function ActionBtn({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1E2B42] text-sm font-medium text-[#A8B4CC]',
        'hover:bg-[#1A2640] hover:text-white hover:border-[#2A3A54]',
        'focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-all',
        className,
      )}
    >
      {children}
    </button>
  )
}
