'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Search, ChevronDown, CalendarDays, Info } from 'lucide-react'
import { mockAccounts, mockEnvelopes } from '@/mock/data'
import { formatCurrency, cn } from '@/lib/utils'
import type { TransactionType } from '@/types'

interface AddTransactionModalProps {
  open: boolean
  onClose: () => void
}

const tabs: { type: TransactionType; label: string; icon: React.ReactNode }[] = [
  { type: 'expense',  label: 'Expense',  icon: <ArrowDownLeft  size={14} /> },
  { type: 'income',   label: 'Income',   icon: <ArrowUpRight   size={14} /> },
  { type: 'transfer', label: 'Transfer', icon: <ArrowLeftRight size={14} /> },
]

/* Flowbite label */
const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block mb-2 text-sm font-medium text-[#A8B4CC]">{children}</label>
)

/* Flowbite input */
const inputCls = [
  'w-full py-2.5 px-3 text-sm text-white bg-[#131C2E]',
  'border border-[#1E2B42] rounded-lg',
  'placeholder:text-[#2A3A54]',
  'focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED]',
  'transition-all',
].join(' ')

/* Flowbite select-like trigger */
const selectCls = [
  'w-full flex items-center gap-3 px-3 py-2.5 text-sm',
  'bg-[#131C2E] border border-[#1E2B42] rounded-lg',
  'hover:border-[#2A3A54]',
  'focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40',
  'transition-colors',
].join(' ')

export function AddTransactionModal({ open, onClose }: AddTransactionModalProps) {
  const [txType, setTxType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [payee, setPayee] = useState('')
  const [selectedAccount] = useState(mockAccounts[0])
  const [selectedEnvelope] = useState(mockEnvelopes[0])
  const [date] = useState('May 15, 2024')
  const [memo, setMemo] = useState('')

  const numericAmount = parseFloat(amount.replace(/,/g, '')) || 0
  const availableAfter = selectedEnvelope.available - numericAmount
  const accountAfter   = selectedAccount.balance - numericAmount

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value.replace(/[^0-9.]/g, ''))
  }

  const numberToWords = (n: number): string => {
    if (!n) return ''
    const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
                   'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
                   'seventeen', 'eighteen', 'nineteen']
    const tens  = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
    if (n < 20) return units[n]
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + units[n % 10] : ''}`
    if (n < 1000) return `${units[Math.floor(n / 100)]} hundred${n % 100 ? ' ' + numberToWords(n % 100) : ''}`
    if (n < 100000) return `${numberToWords(Math.floor(n / 1000))} thousand${n % 1000 ? ' ' + numberToWords(n % 1000) : ''}`
    return `${numberToWords(Math.floor(n / 100000))} lakh${n % 100000 ? ' ' + numberToWords(n % 100000) : ''}`
  }

  const wordsLabel = numericAmount ? `${numberToWords(Math.floor(numericAmount))} rupees` : ''

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal — Flowbite: rounded-lg shadow-xl */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-[760px] bg-[#0F1623] border border-[#1E2B42] rounded-lg shadow-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#1E2B42]">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {txType === 'expense' ? 'Add Expense' : txType === 'income' ? 'Add Income' : 'Add Transfer'}
                  </h3>
                  <p className="text-sm text-[#5A6A85] mt-0.5">
                    {txType === 'expense' ? 'Record a spending transaction'
                      : txType === 'income' ? 'Record an income transaction'
                      : 'Move money between accounts'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[#5A6A85] hover:text-white hover:bg-[#1E2B42] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Type tabs — Flowbite tab group */}
              <div className="px-6 pt-5 pb-4">
                <div className="inline-flex w-full bg-[#131C2E] border border-[#1E2B42] rounded-lg p-1 gap-1">
                  {tabs.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => setTxType(type)}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30',
                        txType === type
                          ? 'bg-[#6C3AED] text-white shadow-sm'
                          : 'text-[#5A6A85] hover:text-[#A8B4CC]',
                      )}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="flex gap-5 px-6 pb-5">
                {/* Left — form */}
                <div className="flex-1 space-y-4 min-w-0">

                  {/* Account */}
                  <div>
                    <Label>Account</Label>
                    <button className={selectCls}>
                      <div className="w-8 h-8 rounded-lg bg-[#1E2B42] flex items-center justify-center flex-shrink-0 text-sm">
                        🏦
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-white">{selectedAccount.name}</p>
                        <p className="text-xs text-[#5A6A85]">
                          Available {formatCurrency(selectedAccount.balance)}
                        </p>
                      </div>
                      <ChevronDown size={14} className="text-[#5A6A85] flex-shrink-0" />
                    </button>
                  </div>

                  {/* Payee */}
                  <div>
                    <Label>Payee</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search size={13} className="text-[#5A6A85]" />
                      </div>
                      <input
                        value={payee}
                        onChange={e => setPayee(e.target.value)}
                        placeholder="BigBasket"
                        className={cn(inputCls, 'pl-9 pr-8')}
                      />
                      {payee && (
                        <button
                          onClick={() => setPayee('')}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#5A6A85] hover:text-white"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category / Envelope */}
                  {txType !== 'transfer' && (
                    <div>
                      <Label>Category / Envelope</Label>
                      <button className={selectCls}>
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                          style={{ background: `${selectedEnvelope.color}25` }}
                        >
                          {selectedEnvelope.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-white">{selectedEnvelope.name}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                          </div>
                          <p className="text-xs text-[#5A6A85]">Monthly Budget</p>
                        </div>
                        <ChevronDown size={14} className="text-[#5A6A85] flex-shrink-0" />
                      </button>
                    </div>
                  )}

                  {/* Amount — Flowbite-style large input */}
                  <div>
                    <Label>Amount</Label>
                    <div className="relative flex items-baseline gap-2 bg-[#131C2E] border border-[#1E2B42] rounded-lg px-4 py-3 focus-within:ring-2 focus-within:ring-[#6C3AED]/40 focus-within:border-[#6C3AED] transition-all">
                      <span className="text-xl text-[#5A6A85] font-light">₹</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="0"
                        className="flex-1 bg-transparent text-3xl font-semibold text-white focus:outline-none tabular-nums tracking-tight"
                      />
                      <span className="text-lg text-[#5A6A85] font-light self-baseline">
                        .{(numericAmount % 1).toFixed(2).slice(2) || '00'}
                      </span>
                    </div>
                    {wordsLabel && (
                      <p className="mt-1.5 text-xs text-[#5A6A85] px-1 capitalize">{wordsLabel}</p>
                    )}
                  </div>

                  {/* Date + Memo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Date</Label>
                      <button className={selectCls}>
                        <CalendarDays size={13} className="text-[#5A6A85] flex-shrink-0" />
                        <span className="text-sm text-white flex-1 text-left">{date}</span>
                        <ChevronDown size={13} className="text-[#5A6A85] flex-shrink-0" />
                      </button>
                    </div>
                    <div>
                      <Label>Memo <span className="font-normal text-[#2A3A54]">(optional)</span></Label>
                      <div className="relative">
                        <input
                          value={memo}
                          onChange={e => setMemo(e.target.value.slice(0, 200))}
                          placeholder="Weekly grocery shopping"
                          className={inputCls}
                        />
                        <span className="absolute right-2.5 bottom-1.5 text-[10px] text-[#2A3A54]">
                          {memo.length}/200
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right — Transaction summary */}
                {txType !== 'transfer' && (
                  <div className="w-[260px] flex-shrink-0 space-y-3">
                    {/* Flowbite card */}
                    <div className="bg-[#131C2E] border border-[#1E2B42] rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-white mb-3">Transaction Summary</h4>

                      {/* Envelope */}
                      <div className="mb-3 pb-3 border-b border-[#1E2B42]">
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                            style={{ background: `${selectedEnvelope.color}25` }}
                          >
                            {selectedEnvelope.icon}
                          </div>
                          <span className="text-sm font-medium text-[#A8B4CC]">
                            {selectedEnvelope.name}
                          </span>
                        </div>
                        <dl className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-[#5A6A85]">Monthly Budget</dt>
                            <dd className="text-white font-medium">{formatCurrency(selectedEnvelope.monthlyBudget)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-[#5A6A85]">Available before</dt>
                            <dd className="text-white font-medium">{formatCurrency(selectedEnvelope.available)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-[#5A6A85]">This expense</dt>
                            <dd className="text-[#F87171] font-medium">
                              {numericAmount ? `- ${formatCurrency(numericAmount)}` : '—'}
                            </dd>
                          </div>
                          <div className="flex justify-between pt-1.5 border-t border-[#1E2B42]">
                            <dt className="text-[#5A6A85]">Available after</dt>
                            <dd className={cn('font-semibold', availableAfter < 0 ? 'text-[#F87171]' : 'text-[#4ADE80]')}>
                              {formatCurrency(availableAfter)}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {/* Account */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-[#1E2B42] flex items-center justify-center text-xs">
                            🏦
                          </div>
                          <span className="text-sm font-medium text-[#A8B4CC]">{selectedAccount.name}</span>
                        </div>
                        <dl className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-[#5A6A85]">Current balance</dt>
                            <dd className="text-white font-medium">{formatCurrency(selectedAccount.balance)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-[#5A6A85]">After this expense</dt>
                            <dd className="text-white font-medium">{formatCurrency(accountAfter)}</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Info note — Flowbite alert-style */}
                      <div className="flex gap-2 p-3 bg-[#0F1623] border border-[#1E2B42] rounded-lg">
                        <Info size={12} className="text-[#6C3AED] flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-[#5A6A85] leading-relaxed">
                          This expense will be deducted from your selected category.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E2B42]">
                <div className="flex items-center gap-2 text-xs text-[#2A3A54]">
                  Press Enter to save
                  <kbd className="bg-[#131C2E] border border-[#1E2B42] rounded px-1.5 py-0.5 font-mono text-[10px]">
                    Enter
                  </kbd>
                </div>
                <div className="flex items-center gap-2">
                  {/* Flowbite secondary button */}
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-medium text-[#A8B4CC] bg-transparent border border-[#1E2B42] rounded-lg hover:bg-[#131C2E] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-colors"
                  >
                    Cancel
                  </button>
                  {/* Flowbite primary button */}
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#6C3AED] rounded-lg hover:bg-[#7C4AFF] focus:outline-none focus:ring-4 focus:ring-[#6C3AED]/30 transition-colors">
                    <span className="text-sm">💾</span>
                    Save Transaction
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
