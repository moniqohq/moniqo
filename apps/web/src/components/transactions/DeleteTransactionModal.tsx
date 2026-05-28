'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import type { Transaction } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'

function formatPreviewDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Props {
  tx: Transaction | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

export function DeleteTransactionModal({ tx, open, onClose, onConfirm, loading = false }: Props) {
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

  const typeLabel = tx.type.charAt(0).toUpperCase() + tx.type.slice(1)
  const previewDate = formatPreviewDate(tx.date)

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
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Centering shell */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Delete Transaction"
              className="relative w-full max-w-[640px] rounded-2xl border border-[#1E2B42] bg-[#080E1A]/98 backdrop-blur-2xl shadow-[0_0_60px_rgba(239,68,68,0.08),0_24px_48px_rgba(0,0,0,0.7)]"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Top glow line */}
              <div className="absolute top-0 inset-x-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-[#EF4444]/25 to-transparent" />

              <div className="p-6">

                {/* ── Header ───────────────────────────── */}
                <div className="flex items-center gap-4 mb-5 pb-5 border-b border-[#141F32]">

                  {/* Danger icon */}
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 border border-[#EF4444]/40 bg-[#EF4444]/10 shadow-[0_0_16px_rgba(239,68,68,0.2)]">
                    <Trash2 size={18} className="text-[#F87171]" />
                  </div>

                  {/* Title */}
                  <h2 className="flex-1 text-lg font-semibold text-[#E8EEF8] tracking-tight">
                    Delete Transaction
                  </h2>

                  {/* Close */}
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5A6A85] hover:text-white hover:bg-[#1E2B42] transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* ── Warning ──────────────────────────── */}
                <p className="text-sm text-[#7A8BA8] leading-relaxed mb-5">
                  Are you sure you want to delete this transaction?{' '}
                  <span className="text-[#A8B4CC]">
                    This action cannot be undone. The transaction will be permanently removed and its financial impact will be reversed.
                  </span>
                </p>

                {/* ── Transaction preview card ──────────── */}
                <div className="rounded-xl border border-[#1E2B42] bg-[#0D1626] px-4 py-3.5 mb-6 flex items-center gap-4">
                  {/* Merchant avatar */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: tx.payeeColor ?? '#1E2B42' }}
                  >
                    {tx.payee[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#E8EEF8] leading-tight truncate">
                      {tx.payee}
                    </p>
                    <p className="text-xs text-[#5A6A85] mt-0.5">
                      {previewDate} <span className="text-[#2A3A54]">•</span> {typeLabel}
                    </p>
                  </div>

                  {/* Amount */}
                  <div
                    className={cn(
                      'text-xl font-bold tabular-nums shrink-0',
                      tx.type === 'income'
                        ? 'text-[#4ADE80]'
                        : tx.type === 'transfer'
                          ? (tx.amount >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]')
                          : 'text-[#F87171]',
                    )}
                  >
                    {tx.amount >= 0 ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                  </div>
                </div>

                {/* ── Action buttons ────────────────────── */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className={cn(
                      'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#1E2B42] text-sm font-medium text-[#A8B4CC]',
                      'bg-[#0D1626]/80 hover:bg-[#1A2640] hover:text-white hover:border-[#2A3A54]',
                      'focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-all',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={onConfirm}
                    disabled={loading}
                    className={cn(
                      'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white',
                      'bg-gradient-to-r from-[#B91C1C] to-[#DC2626] border border-[#EF4444]/30',
                      'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
                      'hover:from-[#C82828] hover:to-[#EF4444] hover:shadow-[0_0_28px_rgba(239,68,68,0.45)]',
                      'focus:outline-none focus:ring-2 focus:ring-[#EF4444]/40 transition-all',
                      'disabled:opacity-60 disabled:cursor-not-allowed',
                    )}
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Deleting…
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        Delete Transaction
                      </>
                    )}
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
