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
import { X, Pencil, Loader2 } from "lucide-react";
import { patchBudget } from "@/lib/api/budget";
import { cn } from "@/lib/utils";
import type { Budget } from "@/types";

export interface EditBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
  onSaved: (budget: Budget) => void;
}

export function EditBudgetDialog({ open, onOpenChange, budget, onSaved }: EditBudgetDialogProps) {
  const [title, setTitle] = useState(budget.name);
  const [notes, setNotes] = useState(budget.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setTitle(budget.name);
      setNotes(budget.notes ?? "");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, budget]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleClose() {
    if (submitting) return;
    onOpenChange(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await patchBudget(budget.id, {
        title: trimmedTitle,
        notes: notes.trim() || null,
      });
      onSaved({
        id: updated.id,
        name: updated.title,
        notes: updated.notes ?? undefined,
        createdAt: updated.created_at,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update budget");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) handleClose();
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
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#131E30] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6C3AED] shadow-sm shadow-[#6C3AED]/40">
                  <Pencil size={14} className="text-white" strokeWidth={2} />
                </span>
                <h2 className="text-[15px] font-semibold text-white">Edit Budget</h2>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
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
                  onClick={handleClose}
                  disabled={submitting}
                  className="rounded-lg border border-[#1E2B42] px-4 py-2 text-sm text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
