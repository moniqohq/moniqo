'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeleteGoalTarget {
  id: string
  title: string
  icon: string
  targetAmount: number
  savedAmount: number
  progressPercentage: number
  contributionCount: number
}

export interface DeleteGoalDialogProps {
  open: boolean
  goal: DeleteGoalTarget | null
  onClose: () => void
  onDeleted?: (id: string) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-IN')
}

// ─── DeleteGoalHero ───────────────────────────────────────────────────────────

function DeleteGoalHero() {
  return (
    <div className="flex flex-col items-center gap-5">
      {/* Icon */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <motion.div
          className="absolute rounded-full border border-[#EF4444]/30"
          style={{ inset: -16 }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Mid pulse ring */}
        <motion.div
          className="absolute rounded-full border border-[#EF4444]/20"
          style={{ inset: -8 }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />

        {/* Red glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(239,68,68,0.25) 0%, transparent 70%)',
            filter: 'blur(12px)',
            inset: -20,
          }}
        />

        {/* Main icon circle */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
          className="relative w-[120px] h-[120px] rounded-full flex items-center justify-center z-10"
          style={{
            background: 'linear-gradient(145deg, #1A0808 0%, #2D0A0A 100%)',
            border: '2px solid rgba(239,68,68,0.4)',
            boxShadow: '0 0 30px rgba(239,68,68,0.3), 0 0 60px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <Trash2 size={44} className="text-[#EF4444]" strokeWidth={1.5} />
        </motion.div>
      </div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35 }}
        className="text-center space-y-2"
      >
        <h2 className="text-[28px] font-bold text-white leading-tight">
          Delete Goal{' '}
          <span className="text-[#EF4444]">Permanently</span>?
        </h2>
        <div className="space-y-1">
          <p className="text-[15px] font-semibold text-[#F87171]">
            This action cannot be undone.
          </p>
          <p className="text-[14px] text-[#7A8BA8] leading-relaxed max-w-[480px] mx-auto">
            All goal data, contributions, and history will be permanently removed.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

// ─── DeleteGoalSummaryCard ────────────────────────────────────────────────────

function DeleteGoalSummaryCard({ goal }: { goal: DeleteGoalTarget }) {
  const isCompleted = goal.progressPercentage >= 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.35 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #130808 0%, #1A0D0D 100%)',
        borderColor: 'rgba(239,68,68,0.2)',
        boxShadow: '0 0 0 1px rgba(239,68,68,0.08)',
      }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        {/* Left: icon + info */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-[22px] flex-shrink-0"
            style={{
              background: 'linear-gradient(145deg, #2D1A0D, #3D2010)',
              border: '1px solid rgba(239,68,68,0.25)',
              boxShadow: '0 0 12px rgba(239,68,68,0.15)',
            }}
          >
            {goal.icon}
          </div>
          <div>
            <p className="text-[16px] font-bold text-white">{goal.title}</p>
            <p className="text-[13px] text-[#5A6A85] mt-0.5">
              Target: ₹{fmt(goal.targetAmount)}
            </p>
          </div>
        </div>

        {/* Right: progress */}
        <div className="text-right flex-shrink-0">
          <p className={cn('text-[22px] font-bold leading-none', isCompleted ? 'text-[#22C55E]' : 'text-[#E8EEF8]')}>
            {goal.progressPercentage}%
          </p>
          {isCompleted ? (
            <div className="flex items-center gap-1 justify-end mt-1">
              <CheckCircle2 size={12} className="text-[#22C55E]" />
              <span className="text-[12px] text-[#22C55E] font-medium">Completed</span>
            </div>
          ) : (
            <p className="text-[12px] text-[#5A6A85] mt-0.5">
              ₹{fmt(goal.savedAmount)} saved
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-4">
        <div className="h-2 bg-[#1A0A0A] rounded-full overflow-hidden border border-[#2A1010]">
          <div
            className="h-full rounded-full transition-none"
            style={{
              width: `${Math.min(goal.progressPercentage, 100)}%`,
              background: isCompleted
                ? 'linear-gradient(90deg, #16A34A, #22C55E)'
                : 'linear-gradient(90deg, #9B1C1C, #EF4444)',
              boxShadow: isCompleted
                ? '0 0 8px rgba(34,197,94,0.4)'
                : '0 0 8px rgba(239,68,68,0.4)',
            }}
          />
        </div>
      </div>
    </motion.div>
  )
}

// ─── DeleteGoalWarningCard ────────────────────────────────────────────────────

function DeleteGoalWarningCard({ contributionCount }: { contributionCount: number }) {
  if (contributionCount === 0) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.3 }}
      className="flex gap-3.5 rounded-xl p-4"
      style={{
        background: 'rgba(245,158,11,0.07)',
        border: '1px solid rgba(245,158,11,0.3)',
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'rgba(245,158,11,0.12)' }}
      >
        <AlertTriangle size={18} className="text-[#F59E0B]" />
      </div>
      <div>
        <p className="text-[13.5px] font-semibold text-[#FCD34D] leading-snug">
          This goal has transactions and contributions.
        </p>
        <p className="text-[13px] text-[#A8894A] mt-1 leading-relaxed">
          These will be permanently deleted along with the goal.
        </p>
      </div>
    </motion.div>
  )
}

// ─── DeleteGoalConfirmationInput ──────────────────────────────────────────────

function DeleteGoalConfirmationInput({
  value, onChange, disabled, error,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
  error: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65, duration: 0.3 }}
      className="space-y-2.5"
    >
      <p className="text-[13.5px] text-[#A8B4CC] leading-relaxed">
        To continue, type{' '}
        <span className="font-bold text-[#EF4444] font-mono tracking-widest">DELETE</span>
        {' '}in the box below.
      </p>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Type DELETE"
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'w-full h-12 px-4 rounded-xl border text-[15px] font-mono font-semibold tracking-widest text-white bg-[#0D0808] placeholder:text-[#3A2020] placeholder:font-normal placeholder:tracking-normal focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed',
            value === 'DELETE'
              ? 'border-[#22C55E]/60 ring-2 ring-[#22C55E]/20 bg-[#040D08]'
              : error
                ? 'border-[#EF4444]/70 ring-2 ring-[#EF4444]/20'
                : 'border-[#2A1010] hover:border-[#4A1A1A] focus:border-[#EF4444]/60 focus:ring-2 focus:ring-[#EF4444]/20',
          )}
        />
        {value === 'DELETE' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <CheckCircle2 size={18} className="text-[#22C55E]" />
          </motion.div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[12px] text-[#F87171] flex items-center gap-1.5"
          >
            <AlertTriangle size={11} />
            Please type DELETE to confirm.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── DeleteGoalActions ────────────────────────────────────────────────────────

function DeleteGoalActions({
  confirmed, deleting, onCancel, onDelete,
}: {
  confirmed: boolean
  deleting: boolean
  onCancel: () => void
  onDelete: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.75, duration: 0.3 }}
      className="flex gap-3 pt-1"
    >
      {/* Cancel */}
      <button
        type="button"
        onClick={onCancel}
        disabled={deleting}
        className="flex-1 h-12 rounded-xl text-[14px] font-medium text-[#7A8BA8] border border-[#1E2B42] bg-[#0D1525] hover:text-white hover:border-[#2A3A54] hover:bg-[#111B2D] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>

      {/* Delete */}
      <motion.button
        type="button"
        onClick={onDelete}
        disabled={!confirmed || deleting}
        whileHover={confirmed && !deleting ? { scale: 1.02 } : {}}
        whileTap={confirmed && !deleting ? { scale: 0.97 } : {}}
        className={cn(
          'flex-1 h-12 rounded-xl text-[14px] font-bold text-white flex items-center justify-center gap-2.5 transition-all focus:outline-none',
          confirmed && !deleting
            ? 'cursor-pointer'
            : 'opacity-40 cursor-not-allowed',
        )}
        style={confirmed && !deleting ? {
          background: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 50%, #EF4444 100%)',
          boxShadow: '0 4px 20px rgba(239,68,68,0.45), 0 0 0 1px rgba(255,100,100,0.15) inset',
        } : {
          background: 'linear-gradient(135deg, #3A1212 0%, #4A1515 100%)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        {deleting ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
            Deleting Goal…
          </>
        ) : (
          <>
            <Trash2 size={15} strokeWidth={2} />
            Delete Goal Permanently
          </>
        )}
      </motion.button>
    </motion.div>
  )
}

// ─── DeleteSuccessToast / ErrorToast ──────────────────────────────────────────

function Toast({ show, type, message }: { show: boolean; type: 'success' | 'error'; message: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl shadow-black/50',
            type === 'success'
              ? 'bg-[#0B1A10] border-[#22C55E]/30'
              : 'bg-[#1A0808] border-[#EF4444]/30',
          )}
        >
          <div className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center',
            type === 'success' ? 'bg-[#22C55E]/15' : 'bg-[#EF4444]/15',
          )}>
            {type === 'success'
              ? <CheckCircle2 size={12} className="text-[#22C55E]" />
              : <AlertTriangle size={12} className="text-[#EF4444]" />
            }
          </div>
          <span className={cn(
            'text-[13px] font-medium',
            type === 'success' ? 'text-[#4ADE80]' : 'text-[#FCA5A5]',
          )}>
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── DeleteGoalDialog (main) ──────────────────────────────────────────────────

export function DeleteGoalDialog({ open, goal, onClose, onDeleted }: DeleteGoalDialogProps) {
  const [confirmText, setConfirmText]   = useState('')
  const [showError,   setShowError]     = useState(false)
  const [deleting,    setDeleting]      = useState(false)
  const [toastType,   setToastType]     = useState<'success' | 'error'>('success')
  const [toastMsg,    setToastMsg]      = useState('')
  const [showToast,   setShowToast]     = useState(false)

  const confirmed = confirmText === 'DELETE'

  // Reset on open
  useEffect(() => {
    if (open) {
      setConfirmText('')
      setShowError(false)
      setDeleting(false)
    }
  }, [open])

  // Keyboard / scroll lock
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [open, onClose, deleting])

  const showToastMsg = (type: 'success' | 'error', msg: string) => {
    setToastType(type); setToastMsg(msg); setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleDelete = async () => {
    if (!confirmed) { setShowError(true); return }
    setDeleting(true)
    try {
      await new Promise<void>((res, rej) =>
        setTimeout(() => (Math.random() > 0.1 ? res() : rej()), 1000)
      )
      onDeleted?.(goal!.id)
      onClose()
      showToastMsg('success', 'Goal deleted successfully.')
    } catch {
      setDeleting(false)
      showToastMsg('error', 'Unable to delete goal. Please try again.')
    }
  }

  const handleClose = () => {
    if (deleting) return
    onClose()
  }

  return (
    <>
      <AnimatePresence>
        {open && goal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md"
              onClick={handleClose}
            />

            {/* Container */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 14 }}
                transition={{ type: 'spring', damping: 28, stiffness: 360 }}
                style={{ maxWidth: 560, width: '100%' }}
                className="relative my-auto rounded-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Delete goal permanently"
              >
                {/* Background */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, #0D0808 0%, #0A0A10 50%, #080C14 100%)',
                  }}
                />

                {/* Red glow — top center */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{
                    width: 400, height: 250,
                    background: 'radial-gradient(ellipse, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.04) 50%, transparent 70%)',
                    filter: 'blur(2px)',
                  }}
                />

                {/* Subtle red border */}
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ border: '1px solid rgba(239,68,68,0.18)' }}
                />

                {/* Top danger accent line */}
                <div
                  className="absolute inset-x-0 top-0 h-px pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)' }}
                />

                {/* Close button */}
                <button
                  onClick={handleClose}
                  disabled={deleting}
                  className="absolute top-4 right-4 z-20 w-8 h-8 rounded-lg bg-[#1A0808] border border-[#2A1010] flex items-center justify-center text-[#5A6A85] hover:text-white hover:bg-[#2A1010] hover:border-[#4A1818] transition-all disabled:opacity-40 focus:outline-none"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>

                {/* Content */}
                <div className="relative z-10 px-8 pt-10 pb-7 space-y-5">
                  {/* Hero */}
                  <DeleteGoalHero />

                  {/* Goal summary */}
                  <DeleteGoalSummaryCard goal={goal} />

                  {/* Amber warning */}
                  <DeleteGoalWarningCard contributionCount={goal.contributionCount} />

                  {/* Divider */}
                  <div
                    className="h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.15), transparent)' }}
                  />

                  {/* Confirmation input */}
                  <DeleteGoalConfirmationInput
                    value={confirmText}
                    onChange={v => { setConfirmText(v); if (showError) setShowError(false) }}
                    disabled={deleting}
                    error={showError && !confirmed}
                  />

                  {/* Actions */}
                  <DeleteGoalActions
                    confirmed={confirmed}
                    deleting={deleting}
                    onCancel={handleClose}
                    onDelete={handleDelete}
                  />
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <Toast show={showToast} type={toastType} message={toastMsg} />
    </>
  )
}
