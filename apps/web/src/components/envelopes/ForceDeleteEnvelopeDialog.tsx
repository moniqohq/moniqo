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
import { X, AlertTriangle, Trash2, FileClock, Receipt, ChartColumn, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { forceDeleteEnvelope } from "@/lib/api/envelopes";

/* ── Types ────────────────────────────────────────────────── */
export interface ForceDeleteEnvelopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelope: { id: number; title: string };
  budgetId: number;
}

/* ── Consequence row ──────────────────────────────────────── */
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

/* ── Main dialog ──────────────────────────────────────────── */
export function ForceDeleteEnvelopeDialog({
  open,
  onOpenChange,
  envelope,
  budgetId,
}: ForceDeleteEnvelopeDialogProps) {
  const [understood, setUnderstood] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canDelete = understood && confirmText === "DELETE";

  /* Reset state when dialog opens/closes */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      setUnderstood(false);
      setConfirmText("");
      setLoading(false);
      setError(null);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* ESC + body scroll lock */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, loading, onOpenChange]);

  async function handleForceDelete() {
    if (!canDelete || loading) return;
    setLoading(true);
    setError(null);
    try {
      await forceDeleteEnvelope(budgetId, envelope.id);
      onOpenChange(false);
      /* Caller is responsible for refreshing the envelope list */
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected server error.");
      setLoading(false);
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
            onClick={() => {
              if (!loading) onOpenChange(false);
            }}
          />

          {/* Dialog wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 360 }}
              className="relative my-auto w-full max-w-[560px] rounded-3xl bg-[#080C18]"
              style={{
                border: "1px solid rgba(239,68,68,0.25)",
                boxShadow:
                  "0 0 0 1px rgba(239,68,68,0.08), 0 40px 100px rgba(0,0,0,0.85), 0 0 80px rgba(239,68,68,0.06)",
              }}
              onClick={(e) => e.stopPropagation()}
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
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-[#5A6A85] transition-colors hover:bg-white/5 hover:text-[#E8EEF8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X size={16} />
              </button>

              {/* Content */}
              <div className="flex flex-col gap-5 px-7 pt-8 pb-7">
                {/* Warning icon */}
                <div className="flex justify-center">
                  <div
                    className="flex h-[72px] w-[72px] items-center justify-center rounded-full"
                    style={{
                      border: "2px solid #EF4444",
                      background: "rgba(239,68,68,0.08)",
                      boxShadow: "0 0 32px rgba(239,68,68,0.18)",
                    }}
                  >
                    <AlertTriangle size={30} className="text-[#EF4444]" />
                  </div>
                </div>

                {/* Title + subtitle */}
                <div className="flex flex-col gap-1.5 text-center">
                  <h2 className="text-[22px] leading-tight font-bold tracking-tight text-[#E8EEF8]">
                    Force delete this envelope?
                  </h2>
                  <p className="text-[15px] text-[#6A7A94]">
                    This action{" "}
                    <span className="font-semibold text-[#EF4444]">cannot be undone.</span>
                  </p>
                </div>

                {/* Description */}
                <p
                  id="force-delete-desc"
                  className="text-center text-[14px] leading-relaxed text-[#7A8BA8]"
                >
                  Force deleting{" "}
                  <span className="font-semibold text-[#EF4444]">
                    &ldquo;{envelope.title}&rdquo;
                  </span>{" "}
                  will permanently remove the envelope and{" "}
                  <span className="font-semibold text-[#EF4444]">ALL</span> associated data.
                </p>

                {/* Consequences panel */}
                <div
                  className="flex flex-col divide-y rounded-2xl px-5 py-4"
                  style={{
                    background: "rgba(15,22,35,0.8)",
                    border: "1px solid rgba(239,68,68,0.14)",
                  }}
                >
                  <ConsequenceRow icon={FileClock} label="All allocation history will be deleted" />
                  <div style={{ borderTop: "1px solid rgba(30,43,66,0.6)" }}>
                    <ConsequenceRow
                      icon={Receipt}
                      label="All linked transactions will be permanently removed"
                    />
                  </div>
                  <div style={{ borderTop: "1px solid rgba(30,43,66,0.6)" }}>
                    <ConsequenceRow
                      icon={ChartColumn}
                      label="Spending history and reports will be affected"
                    />
                  </div>
                  <div style={{ borderTop: "1px solid rgba(30,43,66,0.6)" }}>
                    <ConsequenceRow icon={Trash2} label="This action is irreversible" />
                  </div>
                </div>

                {/* Error alert */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm text-[#F87171]"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.18)",
                      }}
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
                    onClick={() => setUnderstood((v) => !v)}
                    className="group flex items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {/* Custom checkbox */}
                    <div
                      className={cn(
                        "mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] border transition-all",
                        understood
                          ? "border-[#EF4444] bg-[#EF4444]"
                          : "border-[#2A3A54] bg-transparent group-hover:border-[#EF4444]/50",
                      )}
                    >
                      {understood && <Check size={11} strokeWidth={3} className="text-white" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] leading-snug text-[#A8B4CC]">
                        I understand that this action is permanent and cannot be undone.
                      </span>
                      <span className="text-[13px] text-[#6A7A94]">
                        Type <span className="font-semibold text-[#EF4444]">DELETE</span> to
                        confirm.
                      </span>
                    </div>
                  </button>

                  {/* Confirmation input */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    disabled={loading}
                    aria-label="Type DELETE to confirm"
                    autoComplete="off"
                    spellCheck={false}
                    className={cn(
                      "w-full rounded-xl px-4 py-3 text-sm text-[#E8EEF8] transition-all outline-none placeholder:text-[#2A3A54]",
                      "border bg-[#0D1525] disabled:cursor-not-allowed disabled:opacity-50",
                      confirmText === "DELETE"
                        ? "border-[#EF4444]/50 ring-2 ring-[#EF4444]/10"
                        : "border-[#1A2540] focus:border-[#EF4444]/40 focus:ring-2 focus:ring-[#EF4444]/10",
                    )}
                    onPaste={(e) => e.preventDefault()}
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between border-t px-7 py-5"
                style={{ borderColor: "rgba(30,43,66,0.6)" }}
              >
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl border border-[#1E2B42] px-5 py-2.5 text-sm font-medium text-[#A8B4CC] transition-all hover:border-[#2A3A54] hover:bg-white/[0.03] hover:text-[#E8EEF8] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!canDelete || loading}
                  onClick={handleForceDelete}
                  aria-disabled={!canDelete || loading}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
                    canDelete && !loading
                      ? "cursor-pointer bg-[#EF4444] text-white shadow-lg shadow-red-900/30 hover:bg-[#DC2626]"
                      : "cursor-not-allowed bg-[#EF4444]/20 text-[#EF4444]/40",
                  )}
                >
                  <Trash2 size={15} />
                  {loading ? "Deleting…" : "Force Delete Envelope"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
