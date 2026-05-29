'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, AlertTriangle, Trash2, FileClock, Receipt, ChartColumn, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Types ────────────────────────────────────────────────── */
export interface ForceDeleteEnvelopeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  envelope: { id: number; title: string }
  budgetId: number
}

/* ── Consequence row ──────────────────────────────────────── */
function ConsequenceRow({
  icon: Icon,
  label,
}: {
  icon: React.ElementType
  label: string
}) {
  return (
    <div className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(239,68,68,0.12)' }}
      >
        <Icon size={15} className="text-[#EF4444]" />
      </div>
      <span className="text-sm text-[#A8B4CC] leading-snug">{label}</span>
    </div>
  )
}

/* ── Main dialog ──────────────────────────────────────────── */
export function ForceDeleteEnvelopeDialog({
  open,
  onOpenChange,
  envelope,
  budgetId,
}: ForceDeleteEnvelopeDialogProps) {
  const [understood, setUnderstood] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const canDelete = understood && confirmText === 'DELETE'

  /* Reset state when dialog opens/closes */
  useEffect(() => {
    if (!open) {
      setUnderstood(false)
      setConfirmText('')
      setLoading(false)
      setError(null)
    }
  }, [open])

  /* ESC + body scroll lock */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, loading, onOpenChange])

  async function handleForceDelete() {
    if (!canDelete || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/v1/budgets/${budgetId}/envelopes/${envelope.id}/force`,
        { method: 'DELETE' },
      )
      const body = await res.json()
      if (!res.ok || !body.success) {
        throw new Error(body.msg || 'Failed to delete envelope.')
      }
      onOpenChange(false)
      /* Caller is responsible for refreshing the envelope list */
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected server error.')
      setLoading(false)
    }
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
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
            onClick={() => { if (!loading) onOpenChange(false) }}
          />

          {/* Dialog wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 360 }}
              className="relative w-full max-w-[560px] bg-[#080C18] rounded-3xl my-auto"
              style={{
                border: '1px solid rgba(239,68,68,0.25)',
                boxShadow:
                  '0 0 0 1px rgba(239,68,68,0.08), 0 40px 100px rgba(0,0,0,0.85), 0 0 80px rgba(239,68,68,0.06)',
              }}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Force Delete Envelope"
              aria-describedby="force-delete-desc"
            >
              {/* Top red accent line */}
              <div className="absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-[#EF4444]/40 to-transparent" />

              {/* Close button */}
              <button
                type="button"
                disabled={loading}
                onClick={() => onOpenChange(false)}
                aria-label="Close dialog"
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-[#5A6A85] hover:text-[#E8EEF8] hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X size={16} />
              </button>

              {/* Content */}
              <div className="px-7 pt-8 pb-7 flex flex-col gap-5">

                {/* Warning icon */}
                <div className="flex justify-center">
                  <div
                    className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
                    style={{
                      border: '2px solid #EF4444',
                      background: 'rgba(239,68,68,0.08)',
                      boxShadow: '0 0 32px rgba(239,68,68,0.18)',
                    }}
                  >
                    <AlertTriangle size={30} className="text-[#EF4444]" />
                  </div>
                </div>

                {/* Title + subtitle */}
                <div className="text-center flex flex-col gap-1.5">
                  <h2 className="text-[22px] font-bold text-[#E8EEF8] leading-tight tracking-tight">
                    Force delete this envelope?
                  </h2>
                  <p className="text-[15px] text-[#6A7A94]">
                    This action{' '}
                    <span className="text-[#EF4444] font-semibold">cannot be undone.</span>
                  </p>
                </div>

                {/* Description */}
                <p
                  id="force-delete-desc"
                  className="text-center text-[14px] text-[#7A8BA8] leading-relaxed"
                >
                  Force deleting{' '}
                  <span className="text-[#EF4444] font-semibold">
                    &ldquo;{envelope.title}&rdquo;
                  </span>{' '}
                  will permanently remove the envelope and{' '}
                  <span className="text-[#EF4444] font-semibold">ALL</span>{' '}
                  associated data.
                </p>

                {/* Consequences panel */}
                <div
                  className="rounded-2xl px-5 py-4 flex flex-col divide-y"
                  style={{
                    background: 'rgba(15,22,35,0.8)',
                    border: '1px solid rgba(239,68,68,0.14)',
                  }}
                >
                  <ConsequenceRow icon={FileClock}    label="All allocation history will be deleted" />
                  <div style={{ borderTop: '1px solid rgba(30,43,66,0.6)' }}>
                    <ConsequenceRow icon={Receipt}    label="All linked transactions will be permanently removed" />
                  </div>
                  <div style={{ borderTop: '1px solid rgba(30,43,66,0.6)' }}>
                    <ConsequenceRow icon={ChartColumn} label="Spending history and reports will be affected" />
                  </div>
                  <div style={{ borderTop: '1px solid rgba(30,43,66,0.6)' }}>
                    <ConsequenceRow icon={Trash2}     label="This action is irreversible" />
                  </div>
                </div>

                {/* Error alert */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="rounded-xl px-4 py-3 text-sm text-[#F87171] flex items-start gap-2.5"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
                      role="alert"
                    >
                      <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Confirmation section */}
                <div className="flex flex-col gap-3.5">
                  {/* Checkbox row */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={understood}
                    disabled={loading}
                    onClick={() => setUnderstood(v => !v)}
                    className="flex items-start gap-3 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Custom checkbox */}
                    <div
                      className={cn(
                        'mt-0.5 w-[18px] h-[18px] rounded-[5px] flex-shrink-0 flex items-center justify-center border transition-all',
                        understood
                          ? 'bg-[#EF4444] border-[#EF4444]'
                          : 'bg-transparent border-[#2A3A54] group-hover:border-[#EF4444]/50',
                      )}
                    >
                      {understood && <Check size={11} strokeWidth={3} className="text-white" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] text-[#A8B4CC] leading-snug">
                        I understand that this action is permanent and cannot be undone.
                      </span>
                      <span className="text-[13px] text-[#6A7A94]">
                        Type{' '}
                        <span className="text-[#EF4444] font-semibold">DELETE</span>{' '}
                        to confirm.
                      </span>
                    </div>
                  </button>

                  {/* Confirmation input */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    disabled={loading}
                    aria-label="Type DELETE to confirm"
                    autoComplete="off"
                    spellCheck={false}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl text-sm transition-all outline-none placeholder:text-[#2A3A54] text-[#E8EEF8]',
                      'bg-[#0D1525] border disabled:opacity-50 disabled:cursor-not-allowed',
                      confirmText === 'DELETE'
                        ? 'border-[#EF4444]/50 ring-2 ring-[#EF4444]/10'
                        : 'border-[#1A2540] focus:border-[#EF4444]/40 focus:ring-2 focus:ring-[#EF4444]/10',
                    )}
                    onPaste={e => e.preventDefault()}
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between px-7 py-5 border-t"
                style={{ borderColor: 'rgba(30,43,66,0.6)' }}
              >
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onOpenChange(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#A8B4CC] border border-[#1E2B42] hover:border-[#2A3A54] hover:text-[#E8EEF8] hover:bg-white/[0.03] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!canDelete || loading}
                  onClick={handleForceDelete}
                  aria-disabled={!canDelete || loading}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                    canDelete && !loading
                      ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-lg shadow-red-900/30 cursor-pointer'
                      : 'bg-[#EF4444]/20 text-[#EF4444]/40 cursor-not-allowed',
                  )}
                >
                  <Trash2 size={15} />
                  {loading ? 'Deleting…' : 'Force Delete Envelope'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
