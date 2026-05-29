'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Archive, ShoppingCart, AlertTriangle, Wallet,
  ArrowRight, ArrowLeftRight, Clock, BarChart2, Eye,
  Lock, Info, ChevronDown, Search, ShieldCheck,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

/* ── Types ────────────────────────────────────────────────── */
export interface ArchiveEnvelopeModalProps {
  open: boolean
  onClose: () => void
  envelopeId?: string
}

type ReassignOption = 'budgeted' | 'envelope'

const ACTIVE_ENVELOPES = [
  'Rent', 'Utilities', 'Dining Out', 'Shopping', 'Entertainment',
  'Transport', 'Savings – Emergency', 'Health', 'Subscriptions', 'Investments',
]

/* ── Envelope search dropdown ─────────────────────────────── */
function EnvelopeSearchSelect({
  value, onChange, disabled,
}: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = ACTIVE_ENVELOPES.filter(e =>
    !query || e.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div ref={ref} className="relative mt-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(o => !o) }}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl border transition-all',
          disabled
            ? 'bg-[#080E1A] border-[#111B2D] text-[#2A3A54] cursor-not-allowed'
            : open
              ? 'bg-[#0D1525] border-[#6C3AED]/50 ring-2 ring-[#6C3AED]/20 text-white'
              : 'bg-[#0D1525] border-[#1A2540] hover:border-[#2A3A54] text-[#7A8BA8]',
        )}
      >
        <div className="flex items-center gap-2">
          <Search size={13} className="text-[#3A4A60] flex-shrink-0" />
          <span className={value ? 'text-white' : ''}>
            {value || 'Search active envelopes...'}
          </span>
        </div>
        <ChevronDown
          size={15}
          className={cn('text-[#5A6A85] transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-[#1A2540] bg-[#0D1B2E] shadow-xl z-50 overflow-hidden"
          >
            <div className="p-2 border-b border-[#111B2D]">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3A4A60]" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#060C18] border border-[#1A2540] rounded-lg text-white placeholder:text-[#2A3A54] focus:outline-none"
                />
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-xs text-[#3A4A60] text-center">No envelopes found</p>
              ) : filtered.map(env => (
                <button
                  key={env}
                  type="button"
                  onClick={() => { onChange(env); setOpen(false); setQuery('') }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm transition-colors',
                    env === value
                      ? 'bg-[#6C3AED]/20 text-white'
                      : 'text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white',
                  )}
                >
                  {env}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Main modal ───────────────────────────────────────────── */
export function ArchiveEnvelopeModal({ open, onClose, envelopeId }: ArchiveEnvelopeModalProps) {
  const [option,       setOption]       = useState<ReassignOption>('budgeted')
  const [targetEnv,   setTargetEnv]     = useState('')

  /* ESC + body lock */
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

  const remaining   = 5000
  const allocated   = 12000
  const spent       = 7000
  const toLabel     = option === 'budgeted' ? 'To Be Budgeted' : (targetEnv || '—')

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
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Dialog wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 360 }}
              className="relative w-full max-w-[960px] bg-[#080C18] rounded-3xl overflow-hidden my-auto flex flex-col"
              style={{
                border: '1px solid rgba(108,58,237,0.22)',
                boxShadow: '0 0 0 1px rgba(108,58,237,0.1), 0 40px 100px rgba(0,0,0,0.8), 0 0 80px rgba(108,58,237,0.08)',
                maxHeight: 'calc(100vh - 32px)',
              }}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Archive Envelope"
            >
              {/* Top purple accent line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6C3AED]/50 to-transparent" />

              {/* ── Header ─────────────────────────────────── */}
              <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-[#111B2D] flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div
                    className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'radial-gradient(135deg, rgba(108,58,237,0.35) 0%, rgba(108,58,237,0.15) 100%)',
                      color: '#A78BFA',
                      border: '1px solid rgba(108,58,237,0.3)',
                      boxShadow: '0 0 24px rgba(108,58,237,0.2)',
                    }}
                  >
                    <Archive size={22} />
                  </div>
                  <div>
                    <h2 className="text-[1.35rem] font-bold text-white leading-tight">Archive Envelope</h2>
                    <p className="text-sm text-[#6B7A94] mt-0.5">
                      Archived envelopes remain available in reports and transaction history.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#5A6A85] hover:text-white hover:bg-[#1A2540] transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ── Scrollable content ──────────────────────── */}
              <div className="overflow-y-auto flex-1 px-7 py-5 space-y-4">

                {/* ── Envelope summary card ────────────────── */}
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'linear-gradient(135deg, #0D1628 0%, #0B1220 100%)',
                    border: '1px solid #1A2540',
                  }}
                >
                  <div className="flex items-start gap-5 mb-5">
                    {/* Icon */}
                    <div
                      className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'radial-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.07) 100%)',
                        color: '#4ADE80',
                        border: '1px solid rgba(34,197,94,0.2)',
                        boxShadow: '0 0 24px rgba(34,197,94,0.12)',
                      }}
                    >
                      <ShoppingCart size={26} />
                    </div>

                    {/* Name + badge */}
                    <div className="pt-0.5">
                      <div className="flex flex-wrap items-center gap-3 mb-0.5">
                        <span className="text-[22px] font-bold text-white">Groceries</span>
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: 'rgba(108,58,237,0.15)',
                            color: '#A78BFA',
                            border: '1px solid rgba(108,58,237,0.3)',
                          }}
                        >
                          <ShieldCheck size={11} />
                          Historical data preserved
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 border border-[#1A2540] rounded-xl overflow-hidden">
                    {[
                      {
                        label: 'Available',
                        value: formatCurrency(remaining),
                        valueColor: '#4ADE80',
                        sub: `${formatCurrency(allocated)} allocated - ${formatCurrency(spent)} spent`,
                      },
                      { label: 'Allocated',    value: formatCurrency(allocated), valueColor: '#E8EEF8', sub: '' },
                      { label: 'Spent',        value: formatCurrency(spent),     valueColor: '#F87171', sub: '' },
                      { label: 'Transactions', value: '24',                      valueColor: '#A78BFA', sub: '' },
                      { label: 'Last activity', value: 'May 15, 2024',           valueColor: '#E8EEF8', sub: '3 days ago' },
                    ].map((m, i, arr) => (
                      <div
                        key={m.label}
                        className={cn(
                          'px-4 py-4 bg-[#080E1A]',
                          i < arr.length - 1 && 'border-r border-[#1A2540]',
                        )}
                      >
                        <p className="text-[11px] text-[#5A6A85] mb-1.5">{m.label}</p>
                        <p className="text-[18px] font-bold tabular-nums leading-tight" style={{ color: m.valueColor }}>
                          {m.value}
                        </p>
                        {m.sub && (
                          <p className="text-[11px] text-[#3A4A60] mt-1 leading-snug">{m.sub}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Warning / reassignment panel ─────────── */}
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(180,83,9,0.04) 100%)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    boxShadow: '0 0 30px rgba(245,158,11,0.05)',
                  }}
                >
                  <div className="flex items-start gap-3.5 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
                    >
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-[#F59E0B] mb-1">
                        Remaining funds must be reassigned
                      </p>
                      <p className="text-sm text-[#8A9AB5] leading-relaxed">
                        To preserve accurate budget totals, remaining money must be moved before archiving this envelope.
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-between pt-4"
                    style={{ borderTop: '1px solid rgba(245,158,11,0.15)' }}
                  >
                    <span className="text-sm text-[#8A9AB5]">Remaining balance to reassign</span>
                    <span className="text-[22px] font-bold tabular-nums" style={{ color: '#F59E0B' }}>
                      ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(remaining)}
                    </span>
                  </div>
                </div>

                {/* ── Reassignment options ──────────────────── */}
                <div className="space-y-2.5">

                  {/* Option 1 — To Be Budgeted */}
                  <button
                    type="button"
                    onClick={() => setOption('budgeted')}
                    className="w-full text-left rounded-2xl p-4 transition-all"
                    style={option === 'budgeted' ? {
                      background: 'rgba(108,58,237,0.08)',
                      border: '1px solid rgba(108,58,237,0.5)',
                      boxShadow: '0 0 24px rgba(108,58,237,0.12)',
                    } : {
                      background: '#0B1120',
                      border: '1px solid #1A2540',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Radio */}
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all"
                        style={option === 'budgeted'
                          ? { borderColor: '#7C4AFF', background: '#7C4AFF' }
                          : { borderColor: '#2A3A54', background: 'transparent' }}
                      >
                        {option === 'budgeted' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>

                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(108,58,237,0.15)', color: '#A78BFA' }}
                      >
                        <Wallet size={18} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                          <span className="text-sm font-semibold text-white">
                            Move funds to &ldquo;To Be Budgeted&rdquo;
                          </span>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: 'rgba(34,197,94,0.15)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.25)' }}
                          >
                            Recommended
                          </span>
                        </div>
                        <p className="text-xs text-[#5A6A85]">Funds will be returned to your available budget.</p>
                      </div>
                    </div>
                  </button>

                  {/* Option 2 — Another envelope */}
                  <div
                    className="rounded-2xl p-4 transition-all cursor-pointer"
                    style={option === 'envelope' ? {
                      background: 'rgba(108,58,237,0.08)',
                      border: '1px solid rgba(108,58,237,0.5)',
                      boxShadow: '0 0 24px rgba(108,58,237,0.12)',
                    } : {
                      background: '#0B1120',
                      border: '1px solid #1A2540',
                    }}
                    onClick={() => setOption('envelope')}
                  >
                    <div className="flex items-center gap-4">
                      {/* Radio */}
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all"
                        style={option === 'envelope'
                          ? { borderColor: '#7C4AFF', background: '#7C4AFF' }
                          : { borderColor: '#2A3A54', background: 'transparent' }}
                      >
                        {option === 'envelope' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>

                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA' }}
                      >
                        <ArrowLeftRight size={18} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white mb-0.5">Move funds to another envelope</p>
                        <p className="text-xs text-[#5A6A85]">Select an active envelope to receive the remaining funds.</p>
                      </div>
                    </div>

                    {/* Dropdown — only visible, but interaction works regardless */}
                    <div onClick={e => e.stopPropagation()}>
                      <EnvelopeSearchSelect
                        value={targetEnv}
                        onChange={setTargetEnv}
                        disabled={option !== 'envelope'}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Transfer preview card ─────────────────── */}
                <div
                  className="rounded-2xl px-6 py-5"
                  style={{ background: '#0D1525', border: '1px solid #1A2540' }}
                >
                  <div className="flex items-center gap-4 sm:gap-8 flex-wrap">
                    {/* From */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'rgba(34,197,94,0.12)',
                          color: '#4ADE80',
                          border: '1px solid rgba(34,197,94,0.18)',
                        }}
                      >
                        <ShoppingCart size={20} />
                      </div>
                      <div>
                        <p className="text-[11px] text-[#5A6A85] mb-0.5">From</p>
                        <p className="text-base font-bold text-white">Groceries</p>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight size={22} className="text-[#3A4A60] flex-shrink-0" />

                    {/* To */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'rgba(108,58,237,0.15)',
                          color: '#A78BFA',
                          border: '1px solid rgba(108,58,237,0.2)',
                        }}
                      >
                        <Wallet size={20} />
                      </div>
                      <div>
                        <p className="text-[11px] text-[#5A6A85] mb-0.5">To</p>
                        <p className="text-base font-bold text-white truncate max-w-[180px]">{toLabel}</p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="ml-auto text-right flex-shrink-0">
                      <p className="text-[11px] text-[#5A6A85] mb-0.5">Amount</p>
                      <p className="text-[22px] font-bold tabular-nums" style={{ color: '#4ADE80' }}>
                        ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(remaining)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Historical data preservation card ──────── */}
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: '#0D1525', border: '1px solid #1A2540' }}
                >
                  {/* Top section */}
                  <div className="flex items-start gap-3.5 px-5 py-4 border-b border-[#111B2D]">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(108,58,237,0.12)', color: '#A78BFA' }}
                    >
                      <Clock size={16} />
                    </div>
                    <p className="text-sm text-[#A8B4CC] leading-relaxed pt-1">
                      Past transactions will remain unchanged to preserve reports, balances, and reconciliation accuracy.
                    </p>
                  </div>

                  {/* 3-column feature grid */}
                  <div className="grid grid-cols-3 divide-x divide-[#111B2D]">
                    {[
                      { icon: <BarChart2 size={15} />, label: 'Reports remain accurate' },
                      { icon: <Eye       size={15} />, label: 'Historical spending remains visible' },
                      { icon: <Lock      size={15} />, label: 'New transactions cannot use archived envelopes' },
                    ].map(item => (
                      <div key={item.label} className="flex flex-col items-center gap-2 px-4 py-4 text-center">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(108,58,237,0.1)', color: '#7C6AED' }}
                        >
                          {item.icon}
                        </div>
                        <p className="text-[11px] text-[#5A6A85] leading-snug">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>{/* end scrollable content */}

              {/* ── Sticky footer ──────────────────────────── */}
              <div
                className="flex items-center justify-between gap-4 px-7 py-4 flex-shrink-0"
                style={{
                  borderTop: '1px solid #111B2D',
                  background: 'linear-gradient(0deg, rgba(6,10,20,0.95) 0%, rgba(8,12,24,0.9) 100%)',
                }}
              >
                {/* Notice */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(108,58,237,0.15)', color: '#A78BFA' }}
                  >
                    <Info size={13} />
                  </div>
                  <p className="text-xs text-[#7A8BA8] leading-snug">
                    This envelope will become read-only and hidden from active budgeting.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-medium text-[#C8D4E8] bg-[#0D1525] border border-[#1A2540] rounded-xl hover:bg-[#111B2D] hover:border-[#2A3A54] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #6C3AED 0%, #7C4AFF 100%)',
                      boxShadow: '0 0 20px rgba(108,58,237,0.4)',
                    }}
                  >
                    <Archive size={15} />
                    Archive Envelope
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
