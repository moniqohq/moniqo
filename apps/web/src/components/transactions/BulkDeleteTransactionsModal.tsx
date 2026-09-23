/*
 * Moniqo is a personal finance management application designed to help users
 * track, manage, and optimize their financial activities.
 *
 * Copyright (C) 2026 Moniqo <support@moniqo.in>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, AlertTriangle, Lock } from "lucide-react";
import type { Transaction } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";

function formatPreviewDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const PREVIEW_LIMIT = 8;

interface Props {
  /** Rows the user selected and that are eligible to be deleted. */
  transactions: Transaction[];
  /** Selected rows excluded because their account is locked (is_immutable). */
  lockedTransactions: Transaction[];
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  error?: string | null;
}

/**
 * Plural sibling of DeleteTransactionModal — same shell (backdrop, escape
 * key, scroll lock, action buttons) but summarizes many rows instead of
 * previewing one.
 */
export function BulkDeleteTransactionsModal({
  transactions,
  lockedTransactions,
  open,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, loading]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (transactions.length === 0 && lockedTransactions.length === 0) return null;

  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const preview = transactions.slice(0, PREVIEW_LIMIT);
  const remaining = transactions.length - preview.length;
  const hasTransfer = transactions.some((t) => t.type === "transfer");

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
            onClick={() => !loading && onClose()}
          />

          {/* Centering shell */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Delete Transactions"
              className="relative w-full max-w-[640px] rounded-2xl border border-[#1E2B42] bg-[#080E1A]/98 shadow-[0_0_60px_rgba(239,68,68,0.08),0_24px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 340 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top glow line */}
              <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-[#EF4444]/25 to-transparent" />

              <div className="p-6">
                {/* ── Header ───────────────────────────── */}
                <div className="mb-5 flex items-center gap-4 border-b border-[#141F32] pb-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#EF4444]/40 bg-[#EF4444]/10 shadow-[0_0_16px_rgba(239,68,68,0.2)]">
                    <Trash2 size={18} className="text-[#F87171]" />
                  </div>

                  <h2 className="flex-1 text-lg font-semibold tracking-tight text-[#E8EEF8]">
                    Delete {transactions.length}{" "}
                    {transactions.length === 1 ? "Transaction" : "Transactions"}
                  </h2>

                  <button
                    onClick={onClose}
                    disabled={loading}
                    aria-label="Close"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5A6A85] transition-colors hover:bg-[#1E2B42] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* ── Warning ──────────────────────────── */}
                <p className="mb-5 text-sm leading-relaxed text-[#7A8BA8]">
                  Are you sure you want to delete {transactions.length}{" "}
                  {transactions.length === 1 ? "transaction" : "transactions"} totalling{" "}
                  <span className="font-medium text-[#A8B4CC]">{formatCurrency(total)}</span>?{" "}
                  <span className="text-[#A8B4CC]">
                    This action cannot be undone. Their financial impact on accounts and envelopes
                    will be reversed.
                  </span>
                  {hasTransfer && (
                    <>
                      {" "}
                      <span className="text-[#F59E0B]">
                        Deleting a transfer also removes its matching leg on the other account.
                      </span>
                    </>
                  )}
                </p>

                {/* ── Transaction preview list ──────────── */}
                {preview.length > 0 && (
                  <div className="mb-4 max-h-56 overflow-y-auto rounded-xl border border-[#1E2B42] bg-[#0D1626]">
                    {preview.map((tx, i) => (
                      <div
                        key={tx.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5",
                          i > 0 && "border-t border-[#141F32]",
                        )}
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: "#1E2B42" }}
                        >
                          {tx.payee[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm leading-tight font-medium text-[#E8EEF8]">
                            {tx.payee}
                          </p>
                          <p className="mt-0.5 text-xs text-[#5A6A85]">
                            {formatPreviewDate(tx.date)}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "shrink-0 text-sm font-semibold tabular-nums",
                            tx.amount >= 0 ? "text-[#4ADE80]" : "text-[#F87171]",
                          )}
                        >
                          {tx.amount >= 0
                            ? `+${formatCurrency(tx.amount)}`
                            : formatCurrency(tx.amount)}
                        </div>
                      </div>
                    ))}
                    {remaining > 0 && (
                      <div className="border-t border-[#141F32] px-4 py-2 text-xs text-[#5A6A85]">
                        +{remaining} more
                      </div>
                    )}
                  </div>
                )}

                {/* ── Locked / skipped rows ──────────────── */}
                {lockedTransactions.length > 0 && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#1E2B42] bg-[#0D1626] px-4 py-3 text-sm text-[#7A8BA8]">
                    <Lock size={14} className="mt-0.5 shrink-0 text-[#5A6A85]" />
                    <span>
                      {lockedTransactions.length}{" "}
                      {lockedTransactions.length === 1 ? "transaction" : "transactions"} will be
                      skipped because their account is locked.
                    </span>
                  </div>
                )}

                {/* ── Error ────────────────────────────── */}
                {error && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#FCA5A5]">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* ── Action buttons ────────────────────── */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border border-[#1E2B42] px-5 py-2.5 text-sm font-medium text-[#A8B4CC]",
                      "bg-[#0D1626]/80 hover:border-[#2A3A54] hover:bg-[#1A2640] hover:text-white",
                      "transition-all focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={onConfirm}
                    disabled={loading || transactions.length === 0}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white",
                      "border border-[#EF4444]/30 bg-gradient-to-r from-[#B91C1C] to-[#DC2626]",
                      "shadow-[0_0_20px_rgba(239,68,68,0.3)]",
                      "hover:from-[#C82828] hover:to-[#EF4444] hover:shadow-[0_0_28px_rgba(239,68,68,0.45)]",
                      "transition-all focus:ring-2 focus:ring-[#EF4444]/40 focus:outline-none",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                  >
                    {loading ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Deleting…
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        Delete {transactions.length}
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
  );
}
