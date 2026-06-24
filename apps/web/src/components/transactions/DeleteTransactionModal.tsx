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
import { X, Trash2, AlertTriangle } from "lucide-react";
import type { Transaction } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";

function formatPreviewDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  tx: Transaction | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteTransactionModal({ tx, open, onClose, onConfirm, loading = false }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!tx) return null;

  const typeLabel = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
  const previewDate = formatPreviewDate(tx.date);

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
              className="bg-[#080E1A]/98 relative w-full max-w-[640px] rounded-2xl border border-[#1E2B42] shadow-[0_0_60px_rgba(239,68,68,0.08),0_24px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
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
                  {/* Danger icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#EF4444]/40 bg-[#EF4444]/10 shadow-[0_0_16px_rgba(239,68,68,0.2)]">
                    <Trash2 size={18} className="text-[#F87171]" />
                  </div>

                  {/* Title */}
                  <h2 className="flex-1 text-lg font-semibold tracking-tight text-[#E8EEF8]">
                    Delete Transaction
                  </h2>

                  {/* Close */}
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5A6A85] transition-colors hover:bg-[#1E2B42] hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* ── Warning ──────────────────────────── */}
                <p className="mb-5 text-sm leading-relaxed text-[#7A8BA8]">
                  Are you sure you want to delete this transaction?{" "}
                  <span className="text-[#A8B4CC]">
                    This action cannot be undone. The transaction will be permanently removed and
                    its financial impact will be reversed.
                  </span>
                </p>

                {/* ── Transaction preview card ──────────── */}
                <div className="mb-6 flex items-center gap-4 rounded-xl border border-[#1E2B42] bg-[#0D1626] px-4 py-3.5">
                  {/* Merchant avatar */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: tx.payeeColor ?? "#1E2B42" }}
                  >
                    {tx.payee[0]}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight text-[#E8EEF8]">
                      {tx.payee}
                    </p>
                    <p className="mt-0.5 text-xs text-[#5A6A85]">
                      {previewDate} <span className="text-[#2A3A54]">•</span> {typeLabel}
                    </p>
                  </div>

                  {/* Amount */}
                  <div
                    className={cn(
                      "shrink-0 text-xl font-bold tabular-nums",
                      tx.type === "income"
                        ? "text-[#4ADE80]"
                        : tx.type === "transfer"
                          ? tx.amount >= 0
                            ? "text-[#4ADE80]"
                            : "text-[#F87171]"
                          : "text-[#F87171]",
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
                      "inline-flex items-center gap-2 rounded-lg border border-[#1E2B42] px-5 py-2.5 text-sm font-medium text-[#A8B4CC]",
                      "bg-[#0D1626]/80 hover:border-[#2A3A54] hover:bg-[#1A2640] hover:text-white",
                      "transition-all focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={onConfirm}
                    disabled={loading}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white",
                      "border border-[#EF4444]/30 bg-gradient-to-r from-[#B91C1C] to-[#DC2626]",
                      "shadow-[0_0_20px_rgba(239,68,68,0.3)]",
                      "hover:from-[#C82828] hover:to-[#EF4444] hover:shadow-[0_0_28px_rgba(239,68,68,0.45)]",
                      "transition-all focus:outline-none focus:ring-2 focus:ring-[#EF4444]/40",
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
  );
}
