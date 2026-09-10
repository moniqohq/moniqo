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

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Archive, Receipt, Trash2, Loader2 } from "lucide-react";
import { deleteBudget } from "@/lib/api/budget";
import { cn } from "@/lib/utils";
import type { Budget } from "@/types";

function ConsequenceRow({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ background: "rgba(239,68,68,0.12)" }}
      >
        <Icon size={15} className="text-[#EF4444]" />
      </div>
      <span className="text-sm leading-snug text-[#A8B4CC]">{label}</span>
    </div>
  );
}

export interface DeleteBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
  onDeleted: (budgetId: number) => void;
  isOnlyBudget: boolean;
}

export function DeleteBudgetDialog({
  open,
  onOpenChange,
  budget,
  onDeleted,
  isOnlyBudget,
}: DeleteBudgetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await deleteBudget(budget.id);
      onDeleted(budget.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete budget");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center p-4"
          >
            <div
              className="pointer-events-auto w-full max-w-[440px] overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 border-b border-[#1A2540] p-5">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "#EF444420", color: "#EF4444" }}
                >
                  <Trash2 size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Delete Budget</h2>
                  <p className="mt-0.5 text-xs text-[#5A6A85]">{budget.name}</p>
                </div>
              </div>

              {isOnlyBudget ? (
                <>
                  <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-4 py-3">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-[#EF4444]" />
                    <p className="text-xs leading-relaxed text-[#FCA5A5]">
                      At least one budget is required. Create a new budget before deleting this
                      one.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 p-5">
                    <button
                      onClick={() => onOpenChange(false)}
                      className="rounded-lg border border-[#1A2540] px-4 py-2 text-sm font-medium text-[#A8B4CC] transition-colors hover:border-[#2A3A54] hover:text-white"
                    >
                      Got it
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-4 py-3">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-[#EF4444]" />
                    <p className="text-xs leading-relaxed text-[#FCA5A5]">
                      This budget and everything in it will become inaccessible.
                    </p>
                  </div>

                  <div className="mx-5 mt-4 divide-y divide-[#1A2540] rounded-xl border border-[#1A2540] bg-[#060C18] px-4">
                    <ConsequenceRow
                      icon={Archive}
                      label="Envelopes and accounts will be archived"
                    />
                    <ConsequenceRow
                      icon={Receipt}
                      label="Transaction history is preserved but no longer reachable"
                    />
                  </div>

                  {error && (
                    <p className="mx-5 mt-4 rounded-lg bg-[#F87171]/10 px-3.5 py-2.5 text-sm text-[#F87171]">
                      {error}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-end gap-2 p-5">
                    <button
                      onClick={() => onOpenChange(false)}
                      disabled={loading}
                      className="rounded-lg border border-[#1A2540] px-4 py-2 text-sm font-medium text-[#A8B4CC] transition-colors hover:border-[#2A3A54] hover:text-white disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                        loading
                          ? "cursor-not-allowed bg-[#1A2540] text-[#3A4A60]"
                          : "bg-[#EF4444] text-white shadow-[0_0_16px_rgba(239,68,68,0.35)] hover:bg-[#DC2626] hover:shadow-[0_0_24px_rgba(239,68,68,0.5)]",
                      )}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Deleting…
                        </>
                      ) : (
                        <>
                          <Trash2 size={14} /> Delete Budget
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
