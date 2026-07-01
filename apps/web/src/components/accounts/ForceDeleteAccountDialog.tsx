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
import {
  X,
  AlertTriangle,
  Trash2,
  FileClock,
  Receipt,
  ArrowLeftRight,
  Check,
  Building2,
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/types";

const TYPE_META: Record<AccountType, { icon: React.ReactNode; label: string; color: string }> = {
  checking: { icon: <Building2 size={18} />, label: "Checking", color: "#3B82F6" },
  savings: { icon: <PiggyBank size={18} />, label: "Savings", color: "#22C55E" },
  credit: { icon: <CreditCard size={18} />, label: "Credit Card", color: "#F87171" },
  cash: { icon: <Wallet size={18} />, label: "Cash", color: "#F59E0B" },
  investment: { icon: <TrendingUp size={18} />, label: "Investment", color: "#8B5CF6" },
  loan: { icon: <Landmark size={18} />, label: "Loan", color: "#EC4899" },
};

function ConsequenceRow({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
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

export interface ForceDeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: { id: string; name: string; type: AccountType };
}

export function ForceDeleteAccountDialog({
  open,
  onOpenChange,
  account,
}: ForceDeleteAccountDialogProps) {
  const [understood, setUnderstood] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canDelete = understood && confirmText === "DELETE";
  const typeMeta = TYPE_META[account.type];

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      setUnderstood(false);
      setConfirmText("");
      setLoading(false);
      setDone(false);
    } else {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleDelete() {
    if (!canDelete) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
      setTimeout(() => onOpenChange(false), 900);
    }, 1200);
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
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="pointer-events-auto w-full max-w-[480px] overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[#1A2540] p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${typeMeta.color}20`, color: typeMeta.color }}
                  >
                    {typeMeta.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Delete Account</h2>
                    <p className="mt-0.5 text-xs text-[#5A6A85]">
                      {account.name} · {typeMeta.label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-1 text-[#5A6A85] transition-colors hover:bg-[#1A2540] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Warning banner */}
              <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-4 py-3">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-[#EF4444]" />
                <p className="text-xs leading-relaxed text-[#FCA5A5]">
                  This action is <span className="font-bold">permanent and irreversible</span>. All
                  data associated with this account will be permanently erased.
                </p>
              </div>

              {/* Consequences */}
              <div className="mx-5 mt-4 divide-y divide-[#1A2540] rounded-xl border border-[#1A2540] bg-[#060C18] px-4">
                <ConsequenceRow
                  icon={Receipt}
                  label="All transaction history will be permanently deleted"
                />
                <ConsequenceRow
                  icon={FileClock}
                  label="Scheduled and recurring transactions will be removed"
                />
                <ConsequenceRow
                  icon={ArrowLeftRight}
                  label="Transfer links to other accounts will be severed"
                />
              </div>

              {/* Understand checkbox */}
              <div className="mx-5 mt-4">
                <button
                  onClick={() => setUnderstood((u) => !u)}
                  className="group flex w-full items-center gap-3 text-left"
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all",
                      understood
                        ? "border-[#EF4444] bg-[#EF4444]"
                        : "border-[#2A3A54] group-hover:border-[#EF4444]/50",
                    )}
                  >
                    {understood && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm text-[#A8B4CC]">
                    I understand this action cannot be undone
                  </span>
                </button>
              </div>

              {/* Confirm text */}
              <div className="mx-5 mt-4">
                <label className="mb-1.5 block text-xs text-[#5A6A85]">
                  Type <span className="font-bold text-[#F87171]">DELETE</span> to confirm
                </label>
                <input
                  ref={inputRef}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-lg border border-[#1A2540] bg-[#060C18] px-3 py-2 font-mono text-sm text-white transition-all placeholder:text-[#2A3A54] focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/30 focus:outline-none"
                />
              </div>

              {/* Footer */}
              <div className="mt-2 flex items-center justify-end gap-2 p-5">
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg border border-[#1A2540] px-4 py-2 text-sm font-medium text-[#A8B4CC] transition-colors hover:border-[#2A3A54] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!canDelete || loading || done}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                    canDelete && !loading && !done
                      ? "bg-[#EF4444] text-white shadow-[0_0_16px_rgba(239,68,68,0.35)] hover:bg-[#DC2626] hover:shadow-[0_0_24px_rgba(239,68,68,0.5)]"
                      : "cursor-not-allowed bg-[#1A2540] text-[#3A4A60]",
                  )}
                >
                  {done ? (
                    <>
                      <Check size={14} /> Deleted
                    </>
                  ) : loading ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />{" "}
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Delete Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
