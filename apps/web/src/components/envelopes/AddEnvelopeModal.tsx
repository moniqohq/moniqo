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
import { X, Plus, Heart, Star, Target, ShieldCheck, ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { createEnvelope } from "@/lib/api/envelopes";

/* ── types ────────────────────────────────────────────── */

type Nature = "Want" | "Should" | "Need" | "Must";

export interface AddEnvelopeModalProps {
  open: boolean;
  onClose: () => void;
  budgetId: number;
  onCreated: () => void;
}

/* ── nature config ────────────────────────────────────── */

const NATURE_OPTIONS: {
  value: Nature;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  selectedBorder: string;
  selectedBg: string;
  selectedShadow: string;
}[] = [
  {
    value: "Want",
    label: "Want",
    icon: Heart,
    iconColor: "#F87171",
    iconBg: "rgba(248,113,113,0.15)",
    selectedBorder: "#F87171",
    selectedBg: "#1A0A0A",
    selectedShadow: "0 0 16px rgba(248,113,113,0.28), inset 0 1px 0 rgba(248,113,113,0.15)",
  },
  {
    value: "Should",
    label: "Should",
    icon: Star,
    iconColor: "#FBBF24",
    iconBg: "rgba(251,191,36,0.15)",
    selectedBorder: "#FBBF24",
    selectedBg: "#1A1400",
    selectedShadow: "0 0 16px rgba(251,191,36,0.28), inset 0 1px 0 rgba(251,191,36,0.15)",
  },
  {
    value: "Need",
    label: "Need",
    icon: Target,
    iconColor: "#FCD34D",
    iconBg: "rgba(252,211,77,0.15)",
    selectedBorder: "#FCD34D",
    selectedBg: "#191600",
    selectedShadow: "0 0 16px rgba(252,211,77,0.28), inset 0 1px 0 rgba(252,211,77,0.15)",
  },
  {
    value: "Must",
    label: "Must",
    icon: ShieldCheck,
    iconColor: "#4ADE80",
    iconBg: "rgba(74,222,128,0.15)",
    selectedBorder: "#4ADE80",
    selectedBg: "#091A0F",
    selectedShadow: "0 0 16px rgba(74,222,128,0.28), inset 0 1px 0 rgba(74,222,128,0.15)",
  },
];

/* ── NatureCard ───────────────────────────────────────── */

function NatureCard({
  option,
  selected,
  onClick,
}: {
  option: (typeof NATURE_OPTIONS)[number];
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = option.icon;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className="flex flex-1 items-center gap-2.5 rounded-xl border px-3 py-3 transition-all duration-200 focus:outline-none"
      style={
        selected
          ? {
              borderColor: option.selectedBorder,
              backgroundColor: option.selectedBg,
              boxShadow: option.selectedShadow,
            }
          : undefined
      }
      aria-pressed={selected}
    >
      <div
        className={cn(
          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200",
          !selected && "border-[#1E2B42] bg-[#0D1525] hover:border-[#3A4A62]",
        )}
        style={{
          backgroundColor: option.iconBg,
          color: option.iconColor,
          opacity: selected ? 1 : 0.5,
        }}
      >
        <Icon size={15} strokeWidth={selected ? 2 : 1.8} />
      </div>
      <span
        className="text-sm font-medium transition-all duration-200"
        style={{ color: option.iconColor, opacity: selected ? 1 : 0.55 }}
      >
        {option.label}
      </span>
    </motion.button>
  );
}

/* ── NatureSelect ─────────────────────────────────────── */

function NatureSelect({
  value,
  onChange,
}: {
  value: Nature | "";
  onChange: (v: Nature | "") => void;
}) {
  const [open, setOpen] = useState(false);

  const selected = NATURE_OPTIONS.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-[#1E2B42] bg-[#0D1525] px-3 py-3 text-sm transition-all focus:outline-none",
          open ? "border-[#6C3AED] ring-2 ring-[#6C3AED]/40" : "hover:border-[#2A3A54]",
        )}
      >
        {selected ? (
          <span className="text-white">{selected.label}</span>
        ) : (
          <span className="text-[#4A5A75]">Select nature</span>
        )}
        <ChevronDown
          size={15}
          className={cn("text-[#6B7A94] transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0D1B2E] py-1 shadow-xl"
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-[#7A8BA8] transition-colors hover:bg-[#131C2E] hover:text-[#C8D4E4]"
            >
              — None —
            </button>
            {NATURE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                  opt.value === value
                    ? "bg-[#6C3AED]/15 text-white"
                    : "text-[#7A8BA8] hover:bg-[#131C2E] hover:text-[#C8D4E4]",
                )}
              >
                <opt.icon size={14} style={{ color: opt.iconColor }} strokeWidth={1.8} />
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main modal ───────────────────────────────────────── */

export function AddEnvelopeModal({ open, onClose, budgetId, onCreated }: AddEnvelopeModalProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [nature, setNature] = useState<Nature | "">("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

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
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Dialog wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 30, stiffness: 380 }}
              className="relative my-auto w-full max-w-[740px] overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120] shadow-[0_0_0_1px_rgba(108,58,237,0.12),0_32px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(108,58,237,0.08)]"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Add Envelope"
            >
              {/* Top accent line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6C3AED]/40 to-transparent" />

              {/* ── Header ── */}
              <div className="flex items-start justify-between border-b border-[#111B2D] px-6 pt-5 pb-4">
                <div>
                  <h2 className="text-[1.35rem] leading-tight font-bold text-white">
                    Add Envelope
                  </h2>
                  <p className="mt-0.5 text-sm text-[#6B7A94]">
                    Create a new envelope inside this budget
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7A94] transition-colors hover:bg-[#1A2540] hover:text-white focus:outline-none"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ── Body ── */}
              <div className="max-h-[calc(100vh-180px)] space-y-5 overflow-y-auto px-6 py-5">
                {/* Title */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-white">
                    Title <span className="text-[#F87171]">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Groceries"
                    className="w-full rounded-xl border border-[#1E2B42] bg-[#0D1525] px-3.5 py-3 text-sm text-white transition-all placeholder:text-[#4A5A75] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none"
                  />
                  <p className="mt-1.5 text-xs text-[#9AAABF]">
                    A short, clear name for this envelope.
                  </p>
                </div>

                {/* Allocated amount */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-white">
                    Allocated amount (₹) <span className="text-[#F87171]">*</span>
                  </label>
                  <div className="flex items-center overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0D1525] transition-all focus-within:border-[#6C3AED] focus-within:ring-2 focus-within:ring-[#6C3AED]/40">
                    <div className="flex h-[52px] w-12 flex-shrink-0 items-center justify-center border-r border-[#1E2B42]">
                      <span className="text-sm font-medium text-[#A8B4CC]">₹</span>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="0.00"
                      className="flex-1 bg-transparent px-3.5 py-3 text-sm text-white tabular-nums placeholder:text-[#4A5A75] focus:outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-[#9AAABF]">
                    Set the amount you want to allocate to this envelope.
                  </p>
                </div>

                {/* Nature */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-white">
                    Nature <span className="font-normal text-[#5A6A85]">(optional)</span>
                  </label>

                  <NatureSelect value={nature} onChange={setNature} />

                  <p className="mt-1.5 text-xs text-[#9AAABF]">
                    Choose how this envelope fits your spending priorities.
                  </p>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[#7C4AFF] transition-colors hover:text-[#9C6AFF]"
                  >
                    Learn more
                    <ExternalLink size={11} />
                  </a>

                  {/* Nature cards */}
                  <div className="mt-3 flex gap-2">
                    {NATURE_OPTIONS.map((opt) => (
                      <NatureCard
                        key={opt.value}
                        option={opt}
                        selected={nature === opt.value}
                        onClick={() => setNature(nature === opt.value ? "" : opt.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-white">
                    Description <span className="font-normal text-[#5A6A85]">(optional)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 140))}
                      placeholder="Add a description (optional)..."
                      rows={4}
                      className="w-full resize-none rounded-xl border border-[#1E2B42] bg-[#0D1525] px-3.5 py-3 text-sm text-white transition-all placeholder:text-[#4A5A75] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-3 bottom-3 text-[11px] text-[#5A6A85] tabular-nums">
                      {description.length} / 140
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#9AAABF]">
                    Add any notes or details about this envelope.
                  </p>
                </div>
              </div>

              {/* ── Footer ── */}
              <div
                className="flex items-center justify-end gap-3 px-6 py-3.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#1A2540] bg-transparent px-5 py-2 text-sm font-semibold text-[#A8B4CC] transition-all hover:bg-[#0D1525] hover:text-white focus:outline-none"
                >
                  Cancel
                </button>
                {error && <p className="text-sm text-[#F87171]">{error}</p>}
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    const allocatedAmt = parseFloat(amount);
                    if (!title.trim() || isNaN(allocatedAmt) || allocatedAmt < 0) return;
                    setLoading(true);
                    setError(null);
                    try {
                      await createEnvelope(budgetId, {
                        title: title.trim(),
                        allocated_amt: allocatedAmt,
                        description: description.trim() || undefined,
                      });
                      onCreated();
                      onClose();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Unexpected error.");
                      setLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] px-6 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(108,58,237,0.45)] transition-all hover:from-[#6C3AED] hover:to-[#7C4AFF] hover:shadow-[0_0_32px_rgba(108,58,237,0.6)] focus:ring-4 focus:ring-[#6C3AED]/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={15} />
                  {loading ? "Creating…" : "Create Envelope"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
