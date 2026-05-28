'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Calendar, ChevronDown, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  CheckCircle, Building2, PiggyBank, CreditCard, Wallet, TrendingUp,
  Info, AlertTriangle, ArrowRight,
} from 'lucide-react'
import { mockAccounts, mockEnvelopes } from '@/mock/data'
import { formatCurrency, cn } from '@/lib/utils'
import type { Transaction, TransactionType, AccountType } from '@/types'

/* ── helpers ──────────────────────────────────────────────── */

function formatInputDate(dateStr: string): string {
  const d = new Date(dateStr + 'T09:42:00')
  return d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

const ACCOUNT_TYPE_META: Record<AccountType, { icon: React.ReactNode; color: string }> = {
  checking:   { icon: <Building2 size={13} />,  color: '#3B82F6' },
  savings:    { icon: <PiggyBank size={13} />,   color: '#22C55E' },
  credit:     { icon: <CreditCard size={13} />,  color: '#F87171' },
  cash:       { icon: <Wallet size={13} />,       color: '#F59E0B' },
  investment: { icon: <TrendingUp size={13} />,  color: '#8B5CF6' },
}

const TX_TYPES: { value: TransactionType; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { value: 'expense',  label: 'Expense',  icon: <ArrowDownLeft  size={13} strokeWidth={2.5} />, color: '#F87171', bg: 'rgba(239,68,68,0.12)' },
  { value: 'income',   label: 'Income',   icon: <ArrowUpRight   size={13} strokeWidth={2.5} />, color: '#4ADE80', bg: 'rgba(34,197,94,0.12)' },
  { value: 'transfer', label: 'Transfer', icon: <ArrowLeftRight size={13} strokeWidth={2.5} />, color: '#7DD3FC', bg: 'rgba(99,179,237,0.12)' },
]

/* ── shared input/label styles ───────────────────────────── */
const labelCls = 'block mb-1.5 text-xs font-medium text-[#7A8BA8]'
const inputCls = [
  'w-full py-2.5 px-3 text-sm text-white bg-[#0D1525]',
  'border border-[#1E2B42] rounded-lg',
  'placeholder:text-[#2A3A54]',
  'focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED]',
  'transition-all',
].join(' ')
const selectTriggerCls = [
  'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm',
  'bg-[#0D1525] border border-[#1E2B42] rounded-lg',
  'hover:border-[#2A3A54] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40',
  'transition-all',
].join(' ')

/* ── small reusable pieces ───────────────────────────────── */

function ImpactLine({ label, value, highlight }: { label: string; value: string; highlight?: 'red' | 'green' | 'white' }) {
  const color =
    highlight === 'red'   ? 'text-[#F87171]' :
    highlight === 'green' ? 'text-[#4ADE80]' :
    'text-[#E8EEF8]'
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[#7A8BA8]">{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums', color)}>{value}</span>
    </div>
  )
}

/* ── main props ──────────────────────────────────────────── */

interface Props {
  tx: Transaction | null
  open: boolean
  onClose: () => void
  onSave?: (updated: Transaction) => void
}

/* ── component ────────────────────────────────────────────── */

export function EditTransactionModal({ tx, open, onClose, onSave }: Props) {

  /* form state */
  const [txType,    setTxType]    = useState<TransactionType>('expense')
  const [date,      setDate]      = useState('')
  const [payee,     setPayee]     = useState('')
  const [accountId, setAccountId] = useState('')
  const [envId,     setEnvId]     = useState('')
  const [amount,    setAmount]    = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)

  /* dropdown open states */
  const [typeOpen,    setTypeOpen]    = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [envOpen,     setEnvOpen]     = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  /* populate form when tx changes */
  useEffect(() => {
    if (!tx) return
    setTxType(tx.type)
    setDate(formatInputDate(tx.date))
    setPayee(tx.payee)
    setAccountId(tx.accountId)
    setEnvId(tx.envelopeId ?? '')
    setAmount(Math.abs(tx.amount).toFixed(2))
    setTransferTo('')
    setNotes(tx.memo ?? '')
  }, [tx])

  /* ESC to close */
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  /* close all dropdowns on outside click */
  const closeDropdowns = useCallback(() => {
    setTypeOpen(false); setAccountOpen(false); setEnvOpen(false); setTransferOpen(false)
  }, [])

  if (!tx) return null

  /* derived */
  const numericAmount = parseFloat(amount.replace(/,/g, '')) || 0
  const isExpense  = txType === 'expense'
  const isIncome   = txType === 'income'
  const isTransfer = txType === 'transfer'

  const selectedAccount  = mockAccounts.find(a => a.id === accountId) ?? mockAccounts[0]
  const selectedEnvelope = mockEnvelopes.find(e => e.id === envId) ?? null
  const selectedTransferAccount = mockAccounts.find(a => a.id === transferTo) ?? null
  const accMeta = ACCOUNT_TYPE_META[selectedAccount.type]

  const signedAmount = isIncome ? numericAmount : -numericAmount
  const accountBefore = selectedAccount.balance - signedAmount
  const accountAfter  = selectedAccount.balance
  const realAccountBefore = accountBefore
  const realAccountAfter  = accountBefore + signedAmount

  const envBefore = selectedEnvelope ? selectedEnvelope.available + (isExpense ? numericAmount : 0) : 0
  const envAfter  = selectedEnvelope ? selectedEnvelope.available : 0

  const isOverspent = isExpense && selectedEnvelope && envAfter < 0
  const typeMeta = TX_TYPES.find(t => t.value === txType)!

  const amountDisplayColor =
    isIncome   ? 'text-[#4ADE80]' :
    isExpense  ? 'text-[#F87171]' :
    tx.amount >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    onSave?.({ ...tx!, type: txType, payee, accountId, envelopeId: envId || undefined, amount: signedAmount, memo: notes || undefined })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => { closeDropdowns(); onClose() }}
          />

          {/* Centering shell */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Edit Transaction"
              className="relative w-full max-w-[1100px] rounded-2xl border border-[#1A2A40] bg-[#080E1C]/98 backdrop-blur-2xl shadow-[0_0_100px_rgba(108,58,237,0.22),0_40px_80px_rgba(0,0,0,0.8)] my-auto"
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => { e.stopPropagation(); closeDropdowns() }}
            >
              {/* Top glow */}
              <div className="absolute top-0 inset-x-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-[#6C3AED]/45 to-transparent" />
              {/* Side glows */}
              <div className="absolute inset-y-0 left-0 w-px rounded-l-2xl bg-gradient-to-b from-transparent via-[#6C3AED]/15 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-px rounded-r-2xl bg-gradient-to-b from-transparent via-[#6C3AED]/15 to-transparent" />

              <div className="p-6 pb-0">

                {/* ── Header ───────────────────────────────── */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">

                    {/* Amount */}
                    <div className={cn('text-[2.6rem] font-bold tabular-nums leading-none shrink-0 mt-0.5', amountDisplayColor)}>
                      {isIncome ? '+' : '−'}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                    </div>

                    {/* Merchant */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                        style={{ backgroundColor: tx.payeeColor ?? '#1E2B42' }}
                      >
                        {tx.payee[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xl font-semibold text-[#E8EEF8] leading-tight truncate">{tx.payee}</p>
                        {tx.memo && <p className="text-sm text-[#5A6A85] mt-0.5 truncate">{tx.memo}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Title + close */}
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                    <button
                      onClick={onClose}
                      aria-label="Close"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5A6A85] hover:text-white hover:bg-[#1E2B42] transition-colors"
                    >
                      <X size={16} />
                    </button>
                    <h2 className="text-xs font-semibold text-[#5A6A85] uppercase tracking-wider">Edit Transaction</h2>
                  </div>
                </div>

                {/* Metadata row */}
                <div className="flex items-center gap-3 flex-wrap mb-5">
                  <div className="flex items-center gap-1.5 text-sm text-[#7A8BA8]">
                    <Calendar size={13} className="text-[#3A4A60]" />
                    <span>{formatInputDate(tx.date)}</span>
                  </div>
                  <span className="text-[#1E2B42] select-none">|</span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: typeMeta.bg, color: typeMeta.color }}
                  >
                    {typeMeta.icon} {typeMeta.label}
                  </span>
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

                <div className="h-px bg-[#111B2D] mb-5" />

                {/* ── Main 2-column body ───────────────────── */}
                <div className="flex gap-5">

                  {/* LEFT — form */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#E8EEF8] mb-4">Transaction Details</h3>

                    {/* Row 1: Type + Date */}
                    <div className="grid grid-cols-2 gap-3 mb-4">

                      {/* Transaction Type */}
                      <div className="relative">
                        <label className={labelCls}>Transaction Type</label>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setTypeOpen(o => !o); setAccountOpen(false); setEnvOpen(false); setTransferOpen(false) }}
                          className={selectTriggerCls}
                        >
                          <span
                            className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                            style={{ backgroundColor: typeMeta.bg, color: typeMeta.color }}
                          >
                            {typeMeta.icon}
                          </span>
                          <span className="flex-1 text-left text-white">{typeMeta.label}</span>
                          <ChevronDown size={13} className="text-[#5A6A85] shrink-0" />
                        </button>
                        {typeOpen && (
                          <div className="absolute top-full left-0 mt-1 w-full rounded-lg border border-[#1A2640] bg-[#0D1B2E] shadow-xl z-30 py-1 overflow-hidden">
                            {TX_TYPES.map(t => (
                              <button
                                key={t.value}
                                onClick={e => { e.stopPropagation(); setTxType(t.value); setTypeOpen(false) }}
                                className={cn(
                                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                                  txType === t.value ? 'bg-[#6C3AED]/15 text-white' : 'text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white',
                                )}
                              >
                                <span className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: t.bg, color: t.color }}>
                                  {t.icon}
                                </span>
                                {t.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <div>
                        <label className={labelCls}>Date</label>
                        <button type="button" className={selectTriggerCls}>
                          <Calendar size={13} className="text-[#5A6A85] shrink-0" />
                          <span className="flex-1 text-left text-white text-sm">{date || formatInputDate(tx.date)}</span>
                          <ChevronDown size={13} className="text-[#5A6A85] shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* Payee / Note */}
                    <div className="mb-4">
                      <label className={labelCls}>Payee / Note</label>
                      <input
                        type="text"
                        value={payee}
                        onChange={e => setPayee(e.target.value)}
                        placeholder="e.g. Starbucks Coffee"
                        className={inputCls}
                      />
                    </div>

                    {/* Row 2: Account + Envelope */}
                    <div className="grid grid-cols-2 gap-3 mb-4">

                      {/* Account */}
                      <div className="relative">
                        <label className={labelCls}>Account</label>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setAccountOpen(o => !o); setTypeOpen(false); setEnvOpen(false); setTransferOpen(false) }}
                          className={selectTriggerCls}
                        >
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${accMeta.color}22`, color: accMeta.color }}
                          >
                            {accMeta.icon}
                          </div>
                          <span className="flex-1 text-left text-white text-sm truncate">
                            {selectedAccount.institution ?? selectedAccount.name}
                            <span className="text-[#5A6A85] ml-1 text-xs capitalize">({selectedAccount.type})</span>
                          </span>
                          <ChevronDown size={13} className="text-[#5A6A85] shrink-0" />
                        </button>
                        {accountOpen && (
                          <div className="absolute top-full left-0 mt-1 w-64 rounded-lg border border-[#1A2640] bg-[#0D1B2E] shadow-xl z-30 py-1 overflow-hidden">
                            {mockAccounts.map(acc => {
                              const meta = ACCOUNT_TYPE_META[acc.type]
                              return (
                                <button
                                  key={acc.id}
                                  onClick={e => { e.stopPropagation(); setAccountId(acc.id); setAccountOpen(false) }}
                                  className={cn(
                                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                                    accountId === acc.id ? 'bg-[#6C3AED]/15 text-white' : 'text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white',
                                  )}
                                >
                                  <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>
                                    {meta.icon}
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className="text-sm text-white leading-tight">{acc.institution ?? acc.name}</p>
                                    <p className="text-xs text-[#5A6A85] capitalize">{acc.type} · {formatCurrency(acc.balance)}</p>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Envelope / Category */}
                      {!isTransfer && (
                        <div className="relative">
                          <label className={labelCls}>Envelope / Category</label>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setEnvOpen(o => !o); setTypeOpen(false); setAccountOpen(false); setTransferOpen(false) }}
                            className={selectTriggerCls}
                          >
                            {selectedEnvelope ? (
                              <>
                                <div
                                  className="w-6 h-6 rounded flex items-center justify-center text-xs shrink-0"
                                  style={{ backgroundColor: `${selectedEnvelope.color}30` }}
                                >
                                  {selectedEnvelope.icon}
                                </div>
                                <span className="flex-1 text-left text-white text-sm truncate">{selectedEnvelope.name}</span>
                              </>
                            ) : (
                              <span className="flex-1 text-left text-[#2A3A54] text-sm">Select category</span>
                            )}
                            <ChevronDown size={13} className="text-[#5A6A85] shrink-0" />
                          </button>
                          {envOpen && (
                            <div className="absolute top-full left-0 mt-1 w-64 rounded-lg border border-[#1A2640] bg-[#0D1B2E] shadow-xl z-30 py-1 max-h-56 overflow-y-auto">
                              {mockEnvelopes.map(env => (
                                <button
                                  key={env.id}
                                  onClick={e => { e.stopPropagation(); setEnvId(env.id); setEnvOpen(false) }}
                                  className={cn(
                                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                                    envId === env.id ? 'bg-[#6C3AED]/15 text-white' : 'text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white',
                                  )}
                                >
                                  <div className="w-5 h-5 rounded flex items-center justify-center text-[11px] shrink-0" style={{ backgroundColor: `${env.color}30` }}>
                                    {env.icon}
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className="text-sm text-white leading-tight">{env.name}</p>
                                    <p className="text-xs text-[#5A6A85]">Available: {formatCurrency(env.available)}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="mb-4">
                      <label className={labelCls}>Amount</label>
                      <div className="relative flex items-center bg-[#0D1525] border border-[#1E2B42] rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#6C3AED]/40 focus-within:border-[#6C3AED] transition-all">
                        <span className="text-base text-[#5A6A85] font-light mr-2 shrink-0">₹</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={amount}
                          onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder="0.00"
                          className="flex-1 bg-transparent text-base font-semibold text-white focus:outline-none tabular-nums"
                        />
                      </div>
                    </div>

                    {/* Transfer Account (optional) */}
                    <div className="mb-4">
                      <label className={labelCls}>Transfer Account <span className="font-normal text-[#2A3A54]">(optional)</span></label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setTransferOpen(o => !o); setTypeOpen(false); setAccountOpen(false); setEnvOpen(false) }}
                          className={cn(selectTriggerCls, 'text-[#2A3A54]')}
                        >
                          <span className="flex-1 text-left text-sm">
                            {selectedTransferAccount
                              ? <span className="text-white">{selectedTransferAccount.institution ?? selectedTransferAccount.name}</span>
                              : 'Select account (optional)'}
                          </span>
                          <ArrowRight size={13} className="text-[#2A3A54] shrink-0" />
                        </button>
                        {transferOpen && (
                          <div className="absolute top-full left-0 mt-1 w-64 rounded-lg border border-[#1A2640] bg-[#0D1B2E] shadow-xl z-30 py-1 overflow-hidden">
                            <button
                              onClick={e => { e.stopPropagation(); setTransferTo(''); setTransferOpen(false) }}
                              className="w-full text-left px-3 py-2 text-sm text-[#5A6A85] hover:bg-[#131C2E] hover:text-white transition-colors"
                            >
                              None
                            </button>
                            {mockAccounts.filter(a => a.id !== accountId).map(acc => {
                              const meta = ACCOUNT_TYPE_META[acc.type]
                              return (
                                <button
                                  key={acc.id}
                                  onClick={e => { e.stopPropagation(); setTransferTo(acc.id); setTransferOpen(false) }}
                                  className={cn(
                                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                                    transferTo === acc.id ? 'bg-[#6C3AED]/15 text-white' : 'text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white',
                                  )}
                                >
                                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>
                                    {meta.icon}
                                  </div>
                                  <span>{acc.institution ?? acc.name}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="mb-2">
                      <label className={labelCls}>Notes <span className="font-normal text-[#2A3A54]">(optional)</span></label>
                      <div className="relative">
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value.slice(0, 200))}
                          placeholder="Add a note..."
                          rows={3}
                          className={cn(inputCls, 'resize-none')}
                        />
                        <span className="absolute right-3 bottom-2.5 text-[10px] text-[#2A3A54] tabular-nums">
                          {notes.length} / 200
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vertical divider */}
                  <div className="w-px bg-[#111B2D] mx-1 self-stretch" />

                  {/* RIGHT — Financial Impact */}
                  <div className="w-[300px] shrink-0">
                    <h3 className="text-sm font-semibold text-[#E8EEF8] mb-4">Financial Impact</h3>

                    {/* Account Impact */}
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-[#A8B4CC] mb-2">
                        Account Impact{' '}
                        <span className="font-normal text-[#5A6A85]">
                          ({selectedAccount.institution ?? selectedAccount.name})
                        </span>
                      </p>
                      <div className="bg-[#080E1C] border border-[#141F32] rounded-xl px-4 py-1 divide-y divide-[#111B2D]">
                        <ImpactLine label="Balance Before" value={formatCurrency(realAccountBefore)} />
                        <ImpactLine
                          label="Change"
                          value={`${signedAmount >= 0 ? '+' : ''}${formatCurrency(signedAmount)}`}
                          highlight={signedAmount >= 0 ? 'green' : 'red'}
                        />
                        <ImpactLine
                          label="Balance After"
                          value={formatCurrency(realAccountAfter)}
                          highlight={realAccountAfter >= 0 ? undefined : 'red'}
                        />
                      </div>
                    </div>

                    {/* Envelope Impact */}
                    {!isTransfer && selectedEnvelope && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-[#A8B4CC] mb-2">
                          Envelope Impact{' '}
                          <span className="font-normal text-[#5A6A85]">({selectedEnvelope.name})</span>
                        </p>
                        <div className="bg-[#080E1C] border border-[#141F32] rounded-xl px-4 py-1 divide-y divide-[#111B2D]">
                          <ImpactLine label="Envelope Balance Before" value={formatCurrency(envBefore)} />
                          <ImpactLine
                            label="Transaction Amount"
                            value={`${isExpense ? '−' : '+'}${formatCurrency(numericAmount)}`}
                            highlight={isExpense ? 'red' : 'green'}
                          />
                          <ImpactLine
                            label="Envelope Balance After"
                            value={formatCurrency(envAfter)}
                            highlight={envAfter >= 0 ? 'green' : 'red'}
                          />
                        </div>
                      </div>
                    )}

                    {/* Validation card */}
                    <div className={cn(
                      'flex gap-2.5 p-3 rounded-xl border',
                      isOverspent
                        ? 'bg-[rgba(239,68,68,0.07)] border-[rgba(239,68,68,0.2)]'
                        : 'bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.15)]',
                    )}>
                      {isOverspent
                        ? <AlertTriangle size={14} className="text-[#F87171] shrink-0 mt-0.5" />
                        : <Info size={14} className="text-[#4ADE80] shrink-0 mt-0.5" />}
                      <div>
                        <p className={cn('text-sm font-semibold leading-tight', isOverspent ? 'text-[#F87171]' : 'text-[#4ADE80]')}>
                          {isOverspent ? 'Envelope overspent' : 'No issues detected'}
                        </p>
                        <p className="text-xs text-[#5A6A85] mt-0.5 leading-relaxed">
                          {isOverspent
                            ? 'This transaction exceeds the allocated envelope balance.'
                            : 'This transaction is within the allocated envelope balance.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Footer ──────────────────────────────────── */}
              <div className="flex items-center justify-between px-6 py-4 mt-5 border-t border-[#111B2D]">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-medium text-[#A8B4CC] bg-transparent border border-[#1E2B42] rounded-xl hover:bg-[#131C2E] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-all"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2.5">
                  {/* Save Changes */}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-[#131C2E] border border-[#2A3A54] rounded-xl hover:bg-[#1A2640] hover:border-[#3A4A64] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>

                  {/* Save & Next */}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#6C3AED] to-[#8B5CF6] hover:from-[#7C4AFF] hover:to-[#9C6FFF] shadow-[0_0_20px_rgba(108,58,237,0.4)] hover:shadow-[0_0_28px_rgba(108,58,237,0.55)] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/50 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save & Next'}
                    <ArrowRight size={14} />
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
