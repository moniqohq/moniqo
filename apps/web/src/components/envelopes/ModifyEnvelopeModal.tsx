'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Heart, Star, Circle, ShieldCheck,
  ShoppingBasket, Info, RefreshCw, CheckCircle2,
  ChevronUp, ChevronDown, Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── types ───────────────────────────────────────────────── */

type Nature = 'Want' | 'Should' | 'Need' | 'Must'

export interface ModifyEnvelopeModalProps {
  open: boolean
  onClose: () => void
  envelopeId?: string
}

/* ── helpers ─────────────────────────────────────────────── */

function fmtPreview(amount: number): string {
  return (
    '₹' +
    new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  )
}

function parseAmount(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

/* ── nature config ───────────────────────────────────────── */

const NATURE_OPTIONS: {
  value: Nature
  label: string
  icon: React.ElementType
  description: string
  iconColor: string
  iconBg: string
  selectedBorder: string
  selectedBg: string
  selectedShadow: string
}[] = [
  {
    value: 'Want',
    label: 'Want',
    icon: Heart,
    description: 'Discretionary lifestyle spending',
    iconColor: '#F87171',
    iconBg: 'rgba(248,113,113,0.15)',
    selectedBorder: '#F87171',
    selectedBg: 'rgba(248,113,113,0.07)',
    selectedShadow:
      '0 0 16px rgba(248,113,113,0.25), inset 0 1px 0 rgba(248,113,113,0.1)',
  },
  {
    value: 'Should',
    label: 'Should',
    icon: Star,
    description: 'Recommended recurring spending',
    iconColor: '#FBBF24',
    iconBg: 'rgba(251,191,36,0.15)',
    selectedBorder: '#FBBF24',
    selectedBg: 'rgba(251,191,36,0.07)',
    selectedShadow:
      '0 0 16px rgba(251,191,36,0.25), inset 0 1px 0 rgba(251,191,36,0.1)',
  },
  {
    value: 'Need',
    label: 'Need',
    icon: Circle,
    description: 'Essential living category',
    iconColor: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.15)',
    selectedBorder: '#6C3AED',
    selectedBg: 'rgba(108,58,237,0.1)',
    selectedShadow:
      '0 0 20px rgba(108,58,237,0.4), inset 0 1px 0 rgba(108,58,237,0.15)',
  },
  {
    value: 'Must',
    label: 'Must',
    icon: ShieldCheck,
    description: 'Mandatory obligation',
    iconColor: '#4ADE80',
    iconBg: 'rgba(74,222,128,0.15)',
    selectedBorder: '#4ADE80',
    selectedBg: 'rgba(74,222,128,0.07)',
    selectedShadow:
      '0 0 16px rgba(74,222,128,0.25), inset 0 1px 0 rgba(74,222,128,0.1)',
  },
]

/* ── NatureCard ──────────────────────────────────────────── */

function NatureCard({
  option,
  selected,
  onClick,
}: {
  option: (typeof NATURE_OPTIONS)[number]
  selected: boolean
  onClick: () => void
}) {
  const Icon = option.icon
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      aria-pressed={selected}
      className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl border transition-all duration-200 focus:outline-none"
      style={
        selected
          ? {
              borderColor: option.selectedBorder,
              backgroundColor: option.selectedBg,
              boxShadow: option.selectedShadow,
            }
          : {
              borderColor: '#1E2B42',
              backgroundColor: '#0D1525',
            }
      }
    >
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200"
        style={{
          backgroundColor: option.iconBg,
          color: option.iconColor,
          opacity: selected ? 1 : 0.55,
        }}
      >
        <Icon size={13} strokeWidth={selected ? 2 : 1.8} />
      </div>
      <span
        className="text-sm font-medium transition-all duration-200 whitespace-nowrap"
        style={{ color: option.iconColor, opacity: selected ? 1 : 0.6 }}
      >
        {option.label}
      </span>
    </motion.button>
  )
}

/* ── AllocationInput ─────────────────────────────────────── */

function AllocationInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  const step = () => {
    const n = parseAmount(value)
    onChange(
      new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n + 100),
    )
  }
  const stepDown = () => {
    const n = Math.max(0, parseAmount(value) - 100)
    onChange(
      new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n),
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm font-semibold text-white">
          Allocated amount <span className="text-[#F87171]">*</span>
        </label>
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="w-5 h-5 flex items-center justify-center text-[#4A5A75] hover:text-[#8B9AB8] transition-colors focus:outline-none"
          >
            <Info size={14} />
          </button>
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-6 bottom-0.5 z-30 w-56 p-3 rounded-xl text-xs text-[#A8B4CC] leading-relaxed"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(13,27,46,0.98) 0%, rgba(11,17,32,0.98) 100%)',
                  border: '1px solid rgba(30,43,66,0.9)',
                  boxShadow:
                    '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(108,58,237,0.08)',
                }}
              >
                Allocated amounts move available cash into this envelope.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div
        className="flex items-stretch bg-[#0D1525] border border-[#1E2B42] rounded-xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-[#6C3AED]/40 focus-within:border-[#6C3AED]"
      >
        {/* ₹ prefix */}
        <div className="flex items-center justify-center w-12 border-r border-[#1E2B42] flex-shrink-0">
          <span className="text-sm font-medium text-[#A8B4CC]">₹</span>
        </div>

        {/* Amount field */}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
          className="flex-1 py-3.5 px-3.5 text-base font-bold text-white bg-transparent placeholder:text-[#4A5A75] focus:outline-none tabular-nums min-w-0"
        />

        {/* Stepper */}
        <div className="flex flex-col border-l border-[#1E2B42] flex-shrink-0">
          <button
            type="button"
            onClick={step}
            className="flex-1 w-10 flex items-center justify-center text-[#6B7A94] hover:text-white hover:bg-[#1A2540] border-b border-[#1E2B42] transition-colors focus:outline-none"
          >
            <ChevronUp size={12} />
          </button>
          <button
            type="button"
            onClick={stepDown}
            className="flex-1 w-10 flex items-center justify-center text-[#6B7A94] hover:text-white hover:bg-[#1A2540] transition-colors focus:outline-none"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      <p className="mt-1.5 text-xs text-[#7A8BA8]">
        Money assigned from To Be Budgeted.
      </p>
    </div>
  )
}

/* ── EnvelopePreviewCard ─────────────────────────────────── */

function EnvelopePreviewCard({
  title,
  nature,
  allocated,
  spent,
}: {
  title: string
  nature: Nature | ''
  allocated: number
  spent: number
}) {
  const remaining = allocated - spent
  const pct = allocated > 0 ? (spent / allocated) * 100 : 0
  const isHealthy = pct <= 80
  const isWarning = pct > 80 && pct <= 100
  const isOver = pct > 100

  const natureOpt = NATURE_OPTIONS.find(o => o.value === nature)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:
          'linear-gradient(160deg, rgba(17,25,45,0.98) 0%, rgba(10,16,30,0.98) 100%)',
        border: '1px solid rgba(30,43,66,0.9)',
        boxShadow:
          '0 0 0 1px rgba(108,58,237,0.06), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Preview header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#111B2D] text-center">
        <p className="text-xs font-semibold text-[#5A6A85] uppercase tracking-wider mb-4">
          Envelope preview
        </p>

        {/* Icon badge */}
        <div className="flex justify-center mb-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background:
                'linear-gradient(145deg, #5B21B6 0%, #4C1D95 60%, #3B1480 100%)',
              border: '2px solid rgba(108,58,237,0.5)',
              boxShadow:
                '0 0 32px rgba(108,58,237,0.5), 0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <ShoppingBasket
              size={28}
              strokeWidth={1.6}
              style={{
                color: '#E0D0FF',
                filter: 'drop-shadow(0 2px 4px rgba(108,58,237,0.5))',
              }}
            />
          </div>
        </div>

        {/* Envelope name */}
        <h3
          className="text-xl font-bold text-white leading-tight mb-2"
          style={{ textShadow: '0 1px 8px rgba(108,58,237,0.15)' }}
        >
          {title || 'Envelope'}
        </h3>

        {/* Nature badge */}
        {natureOpt ? (
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: natureOpt.iconBg,
              color: natureOpt.iconColor,
              border: `1px solid ${natureOpt.iconColor}30`,
            }}
          >
            {nature}
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#1A2540] text-[#5A6A85] border border-[#1E2B42]">
            Unclassified
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="divide-y divide-[#111B2D]">
        {/* Allocated */}
        <div className="px-5 py-3.5">
          <p className="text-xs text-[#5A6A85] mb-0.5">Allocated amount</p>
          <p className="text-lg font-bold text-white tabular-nums">
            {fmtPreview(allocated)}
          </p>
        </div>

        {/* Spent */}
        <div className="px-5 py-3.5">
          <p className="text-xs text-[#5A6A85] mb-0.5">Spent amount</p>
          <p className="text-lg font-bold text-white tabular-nums">
            {fmtPreview(spent)}
          </p>
        </div>

        {/* Remaining */}
        <div className="px-5 py-3.5">
          <p className="text-xs text-[#5A6A85] mb-0.5">Remaining</p>
          <p
            className={cn(
              'text-xl font-bold tabular-nums',
              isOver
                ? 'text-[#F87171]'
                : remaining > 0
                  ? 'text-[#4ADE80]'
                  : 'text-[#A8B4CC]',
            )}
            style={
              !isOver && remaining > 0
                ? { textShadow: '0 0 20px rgba(74,222,128,0.4)' }
                : {}
            }
          >
            {fmtPreview(Math.abs(remaining))}
          </p>
        </div>

        {/* Status */}
        <div className="px-5 py-3.5">
          <p className="text-xs text-[#5A6A85] mb-2">Status</p>
          {isOver ? (
            <>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-1"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(239,68,68,0.15) 100%)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#F87171',
                }}
              >
                <X size={12} />
                Overspent
              </span>
              <p className="text-xs text-[#7A8BA8]">Over budget</p>
            </>
          ) : isWarning ? (
            <>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-1"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(245,158,11,0.15) 100%)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  color: '#FBBF24',
                }}
              >
                <CheckCircle2 size={12} />
                Warning
              </span>
              <p className="text-xs text-[#7A8BA8]">Getting close</p>
            </>
          ) : (
            <>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-1"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(34,197,94,0.25) 0%, rgba(34,197,94,0.15) 100%)',
                  border: '1px solid rgba(34,197,94,0.4)',
                  color: '#4ADE80',
                  boxShadow: '0 0 12px rgba(34,197,94,0.15)',
                }}
              >
                <CheckCircle2 size={12} />
                Healthy
              </span>
              <p className="text-xs text-[#7A8BA8]">On track</p>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-t border-[#111B2D]">
        <RefreshCw size={12} className="text-[#4A5A75] flex-shrink-0" />
        <p className="text-xs text-[#4A5A75] leading-relaxed">
          Updates in real time as you edit values.
        </p>
      </div>
    </div>
  )
}

/* ── EnvelopeInfoCard ────────────────────────────────────── */

function EnvelopeInfoCard() {
  return (
    <div
      className="flex items-start gap-3.5 p-4 rounded-xl"
      style={{
        background:
          'linear-gradient(135deg, rgba(108,58,237,0.06) 0%, rgba(11,17,32,0.95) 100%)',
        border: '1px solid rgba(108,58,237,0.28)',
        boxShadow:
          '0 0 20px rgba(108,58,237,0.08), inset 0 1px 0 rgba(108,58,237,0.08)',
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: 'rgba(108,58,237,0.2)',
          border: '1px solid rgba(108,58,237,0.35)',
          boxShadow: '0 0 12px rgba(108,58,237,0.2)',
        }}
      >
        <Info size={14} className="text-[#8B5CF6]" />
      </div>
      <div>
        <p className="text-xs text-[#8B9AB8] leading-relaxed">
          Spending is calculated from transactions and cannot be edited
          directly.
        </p>
        <p className="text-xs text-[#8B9AB8] leading-relaxed mt-1">
          Historical transactions remain unchanged when modifying envelopes.
        </p>
      </div>
    </div>
  )
}

/* ── ModifyEnvelopeModal ─────────────────────────────────── */

export function ModifyEnvelopeModal({
  open,
  onClose,
}: ModifyEnvelopeModalProps) {
  const [title, setTitle] = useState('Groceries')
  const [allocatedRaw, setAllocatedRaw] = useState('8,000.00')
  const [nature, setNature] = useState<Nature | ''>('Need')
  const [description, setDescription] = useState('')

  const allocatedNum = parseAmount(allocatedRaw)
  const MOCK_SPENT = 5200

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const handleReset = () => {
    setTitle('Groceries')
    setAllocatedRaw('8,000.00')
    setNature('Need')
    setDescription('')
  }

  const handleSave = () => {
    onClose()
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
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Dialog wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 30, stiffness: 380 }}
              className="relative w-full max-w-[920px] bg-[#0B1120] border border-[#1A2540] rounded-2xl overflow-hidden my-auto shadow-[0_0_0_1px_rgba(108,58,237,0.12),0_32px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(108,58,237,0.08)]"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Modify Envelope"
            >
              {/* Top accent glow */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6C3AED]/40 to-transparent" />

              {/* ── Header ── */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#111B2D]">
                <div>
                  <h2 className="text-[1.4rem] font-bold text-white leading-tight">
                    Modify Envelope
                  </h2>
                  <p className="text-sm text-[#4A5A75] mt-0.5">
                    Update allocation settings for this category
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
              <div className="flex gap-6 px-6 py-5 max-h-[calc(100vh-180px)] overflow-y-auto">

                {/* Left — form */}
                <div className="flex-1 min-w-0 space-y-5">

                  {/* Envelope title */}
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-white">
                      Envelope title <span className="text-[#F87171]">*</span>
                    </label>
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g., Groceries"
                      className="w-full py-3 px-3.5 text-sm text-white bg-[#0D1525] border border-[#1E2B42] rounded-xl placeholder:text-[#4A5A75] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED] transition-all"
                    />
                    <p className="mt-1.5 text-xs text-[#7A8BA8]">
                      A clear name for this spending category.
                    </p>
                  </div>

                  {/* Allocated amount */}
                  <AllocationInput
                    value={allocatedRaw}
                    onChange={setAllocatedRaw}
                  />

                  {/* Nature */}
                  <div>
                    <label className="block mb-3 text-sm font-semibold text-white">
                      Nature{' '}
                      <span className="font-normal text-[#5A6A85]">
                        (optional)
                      </span>
                    </label>

                    {/* Cards */}
                    <div className="grid grid-cols-4 gap-2">
                      {NATURE_OPTIONS.map(opt => (
                        <NatureCard
                          key={opt.value}
                          option={opt}
                          selected={nature === opt.value}
                          onClick={() =>
                            setNature(
                              nature === opt.value ? '' : opt.value,
                            )
                          }
                        />
                      ))}
                    </div>

                    {/* Descriptions row */}
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {NATURE_OPTIONS.map(opt => (
                        <p
                          key={opt.value}
                          className="text-[11px] text-[#5A6A85] text-center leading-snug px-1"
                        >
                          {opt.description}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-white">
                      Description{' '}
                      <span className="font-normal text-[#5A6A85]">
                        (optional)
                      </span>
                    </label>
                    <div className="relative">
                      <textarea
                        value={description}
                        onChange={e =>
                          setDescription(e.target.value.slice(0, 140))
                        }
                        placeholder="Optional notes about this envelope…"
                        rows={4}
                        className="w-full py-3 px-3.5 text-sm text-white bg-[#0D1525] border border-[#1E2B42] rounded-xl placeholder:text-[#4A5A75] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED] transition-all resize-none"
                      />
                      <span className="absolute right-3.5 bottom-3 text-[11px] text-[#5A6A85] tabular-nums pointer-events-none">
                        {description.length} / 140
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#7A8BA8]">
                      Visible only inside this budget.
                    </p>
                  </div>

                  {/* Info panel */}
                  <EnvelopeInfoCard />
                </div>

                {/* Right — preview */}
                <div className="w-72 flex-shrink-0 sticky top-0 self-start">
                  <EnvelopePreviewCard
                    title={title}
                    nature={nature}
                    allocated={allocatedNum}
                    spent={MOCK_SPENT}
                  />
                </div>
              </div>

              {/* ── Footer ── */}
              <div
                className="flex items-center px-6 py-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-semibold text-[#A8B4CC] bg-transparent border border-[#1A2540] rounded-xl hover:bg-[#0D1525] hover:text-white focus:outline-none transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] hover:from-[#6C3AED] hover:to-[#7C4AFF] shadow-[0_0_20px_rgba(108,58,237,0.4)] hover:shadow-[0_0_32px_rgba(108,58,237,0.6)] focus:outline-none focus:ring-4 focus:ring-[#6C3AED]/30 transition-all"
                  >
                    <Save size={14} />
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
