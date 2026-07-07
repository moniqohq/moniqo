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

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, Loader2 } from "lucide-react";
import { createBudget } from "@/lib/api/budget";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";

export interface CreateBudgetModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateBudgetModal({ open, onClose, onCreated }: CreateBudgetModalProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setActiveBudget = useUIStore((s) => s.setActiveBudget);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setNotes("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createBudget({ title: trimmed, notes: notes.trim() || undefined });
      setActiveBudget(created.id);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create budget");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="w-full max-w-md rounded-2xl border border-[#1A2640] bg-[#0A1120] shadow-2xl shadow-black/60"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#131E30] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6C3AED] shadow-sm shadow-[#6C3AED]/40">
                  <Wallet size={15} className="text-white" strokeWidth={2} />
                </span>
                <h2 className="text-[15px] font-semibold text-white">New Budget</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium tracking-wide text-[#5A6A85] uppercase">
                  Budget name <span className="text-[#F87171]">*</span>
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Household Budget"
                  maxLength={120}
                  className={cn(
                    "w-full rounded-lg border bg-[#0F1623] px-3.5 py-2.5 text-sm text-white transition-all placeholder:text-[#2A3A54]",
                    "focus:ring-2 focus:outline-none",
                    error
                      ? "border-[#F87171]/50 focus:border-[#F87171]/70 focus:ring-[#F87171]/20"
                      : "border-[#1E2B42] focus:border-[#6C3AED] focus:ring-[#6C3AED]/25",
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium tracking-wide text-[#5A6A85] uppercase">
                  Notes <span className="text-[#3A4A60]">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a short description…"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[#1E2B42] bg-[#0F1623] px-3.5 py-2.5 text-sm text-white transition-all placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/25 focus:outline-none"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-[#F87171]/10 px-3.5 py-2.5 text-sm text-[#F87171]">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-[#1E2B42] px-4 py-2 text-sm text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all",
                    "bg-[#6C3AED] shadow-sm shadow-[#6C3AED]/30 hover:bg-[#7C4AFF] focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Create Budget
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
