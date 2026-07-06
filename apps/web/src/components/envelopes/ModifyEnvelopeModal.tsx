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
import {
  X,
  Heart,
  Star,
  Circle,
  ShieldCheck,
  ShoppingBasket,
  Info,
  RefreshCw,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── types ───────────────────────────────────────────────── */

type Nature = "Want" | "Should" | "Need" | "Must";

import type { BudgetEnvelope } from "@/types";

export interface ModifyEnvelopeModalProps {
  open: boolean;
  onClose: () => void;
  envelope: BudgetEnvelope;
  budgetId: number;
  onUpdated: () => void;
}

/* ── helpers ─────────────────────────────────────────────── */

function fmtPreview(amount: number): string {
  return (
    "₹" +
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  );
}

function parseAmount(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

/* ── nature config ───────────────────────────────────────── */

const NATURE_OPTIONS: {
  value: Nature;
  label: string;
  icon: React.ElementType;
  description: string;
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
    description: "Discretionary lifestyle spending",
    iconColor: "#F87171",
    iconBg: "rgba(248,113,113,0.15)",
    selectedBorder: "#F87171",
    selectedBg: "rgba(248,113,113,0.07)",
    selectedShadow: "0 0 16px rgba(248,113,113,0.25), inset 0 1px 0 rgba(248,113,113,0.1)",
  },
  {
    value: "Should",
    label: "Should",
    icon: Star,
    description: "Recommended recurring spending",
    iconColor: "#FBBF24",
    iconBg: "rgba(251,191,36,0.15)",
    selectedBorder: "#FBBF24",
    selectedBg: "rgba(251,191,36,0.07)",
    selectedShadow: "0 0 16px rgba(251,191,36,0.25), inset 0 1px 0 rgba(251,191,36,0.1)",
  },
  {
    value: "Need",
    label: "Need",
    icon: Circle,
    description: "Essential living category",
    iconColor: "#8B5CF6",
    iconBg: "rgba(139,92,246,0.15)",
    selectedBorder: "#6C3AED",
    selectedBg: "rgba(108,58,237,0.1)",
    selectedShadow: "0 0 20px rgba(108,58,237,0.4), inset 0 1px 0 rgba(108,58,237,0.15)",
  },
  {
    value: "Must",
    label: "Must",
    icon: ShieldCheck,
    description: "Mandatory obligation",
    iconColor: "#4ADE80",
    iconBg: "rgba(74,222,128,0.15)",
    selectedBorder: "#4ADE80",
    selectedBg: "rgba(74,222,128,0.07)",
    selectedShadow: "0 0 16px rgba(74,222,128,0.25), inset 0 1px 0 rgba(74,222,128,0.1)",
  },
];

/* ── NatureCard ──────────────────────────────────────────── */

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
      aria-pressed={selected}
      className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 transition-all duration-200 focus:outline-none"
      style={
        selected
          ? {
              borderColor: option.selectedBorder,
              backgroundColor: option.selectedBg,
              boxShadow: option.selectedShadow,
            }
          : {
              borderColor: "#1E2B42",
              backgroundColor: "#0D1525",
            }
      }
    >
      <div
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-all duration-200"
        style={{
          backgroundColor: option.iconBg,
          color: option.iconColor,
          opacity: selected ? 1 : 0.55,
        }}
      >
        <Icon size={13} strokeWidth={selected ? 2 : 1.8} />
      </div>
      <span
        className="text-sm font-medium whitespace-nowrap transition-all duration-200"
        style={{ color: option.iconColor, opacity: selected ? 1 : 0.6 }}
      >
        {option.label}
      </span>
    </motion.button>
  );
}

/* ── AllocationInput ─────────────────────────────────────── */

function AllocationInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const step = () => {
    const n = parseAmount(value);
    onChange(
      new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n + 100),
    );
  };
  const stepDown = () => {
    const n = Math.max(0, parseAmount(value) - 100);
    onChange(
      new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n),
    );
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <label className="text-sm font-semibold text-white">
          Allocated amount <span className="text-[#F87171]">*</span>
        </label>
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="flex h-5 w-5 items-center justify-center text-[#4A5A75] transition-colors hover:text-[#8B9AB8] focus:outline-none"
          >
            <Info size={14} />
          </button>
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-0.5 left-6 z-30 w-56 rounded-xl p-3 text-xs leading-relaxed text-[#A8B4CC]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(13,27,46,0.98) 0%, rgba(11,17,32,0.98) 100%)",
                  border: "1px solid rgba(30,43,66,0.9)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(108,58,237,0.08)",
                }}
              >
                Allocated amounts move available cash into this envelope.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-stretch overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0D1525] transition-all focus-within:border-[#6C3AED] focus-within:ring-2 focus-within:ring-[#6C3AED]/40">
        {/* ₹ prefix */}
        <div className="flex w-12 flex-shrink-0 items-center justify-center border-r border-[#1E2B42]">
          <span className="text-sm font-medium text-[#A8B4CC]">₹</span>
        </div>

        {/* Amount field */}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
          className="min-w-0 flex-1 bg-transparent px-3.5 py-3.5 text-base font-bold text-white tabular-nums placeholder:text-[#4A5A75] focus:outline-none"
        />

        {/* Stepper */}
        <div className="flex flex-shrink-0 flex-col border-l border-[#1E2B42]">
          <button
            type="button"
            onClick={step}
            className="flex w-10 flex-1 items-center justify-center border-b border-[#1E2B42] text-[#6B7A94] transition-colors hover:bg-[#1A2540] hover:text-white focus:outline-none"
          >
            <ChevronUp size={12} />
          </button>
          <button
            type="button"
            onClick={stepDown}
            className="flex w-10 flex-1 items-center justify-center text-[#6B7A94] transition-colors hover:bg-[#1A2540] hover:text-white focus:outline-none"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      <p className="mt-1.5 text-xs text-[#7A8BA8]">Money assigned from To Be Budgeted.</p>
    </div>
  );
}

/* ── EnvelopePreviewCard ─────────────────────────────────── */

function EnvelopePreviewCard({
  title,
  nature,
  allocated,
  spent,
}: {
  title: string;
  nature: Nature | "";
  allocated: number;
  spent: number;
}) {
  const remaining = allocated - spent;
  const pct = allocated > 0 ? (spent / allocated) * 100 : 0;
  const isWarning = pct > 80 && pct <= 100;
  const isOver = pct > 100;

  const natureOpt = NATURE_OPTIONS.find((o) => o.value === nature);

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(160deg, rgba(17,25,45,0.98) 0%, rgba(10,16,30,0.98) 100%)",
        border: "1px solid rgba(30,43,66,0.9)",
        boxShadow:
          "0 0 0 1px rgba(108,58,237,0.06), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      {/* Preview header */}
      <div className="border-b border-[#111B2D] px-5 pt-5 pb-4 text-center">
        <p className="mb-4 text-xs font-semibold tracking-wider text-[#5A6A85] uppercase">
          Envelope preview
        </p>

        {/* Icon badge */}
        <div className="mb-3 flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(145deg, #5B21B6 0%, #4C1D95 60%, #3B1480 100%)",
              border: "2px solid rgba(108,58,237,0.5)",
              boxShadow:
                "0 0 32px rgba(108,58,237,0.5), 0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <ShoppingBasket
              size={28}
              strokeWidth={1.6}
              style={{
                color: "#E0D0FF",
                filter: "drop-shadow(0 2px 4px rgba(108,58,237,0.5))",
              }}
            />
          </div>
        </div>

        {/* Envelope name */}
        <h3
          className="mb-2 text-xl leading-tight font-bold text-white"
          style={{ textShadow: "0 1px 8px rgba(108,58,237,0.15)" }}
        >
          {title || "Envelope"}
        </h3>

        {/* Nature badge */}
        {natureOpt ? (
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: natureOpt.iconBg,
              color: natureOpt.iconColor,
              border: `1px solid ${natureOpt.iconColor}30`,
            }}
          >
            {nature}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-[#1E2B42] bg-[#1A2540] px-3 py-1 text-xs font-semibold text-[#5A6A85]">
            Unclassified
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="divide-y divide-[#111B2D]">
        {/* Allocated */}
        <div className="px-5 py-3.5">
          <p className="mb-0.5 text-xs text-[#5A6A85]">Allocated amount</p>
          <p className="text-lg font-bold text-white tabular-nums">{fmtPreview(allocated)}</p>
        </div>

        {/* Spent */}
        <div className="px-5 py-3.5">
          <p className="mb-0.5 text-xs text-[#5A6A85]">Spent amount</p>
          <p className="text-lg font-bold text-white tabular-nums">{fmtPreview(spent)}</p>
        </div>

        {/* Remaining */}
        <div className="px-5 py-3.5">
          <p className="mb-0.5 text-xs text-[#5A6A85]">Remaining</p>
          <p
            className={cn(
              "text-xl font-bold tabular-nums",
              isOver ? "text-[#F87171]" : remaining > 0 ? "text-[#4ADE80]" : "text-[#A8B4CC]",
            )}
            style={!isOver && remaining > 0 ? { textShadow: "0 0 20px rgba(74,222,128,0.4)" } : {}}
          >
            {fmtPreview(Math.abs(remaining))}
          </p>
        </div>

        {/* Status */}
        <div className="px-5 py-3.5">
          <p className="mb-2 text-xs text-[#5A6A85]">Status</p>
          {isOver ? (
            <>
              <span
                className="mb-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(239,68,68,0.15) 100%)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  color: "#F87171",
                }}
              >
                <X size={12} />
                Overspent
              </span>
              <p className="text-xs text-[#7A8BA8]">Over budget</p>
            </>
          ) : isWarning ? (
            <>
              <span
                className="mb-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(245,158,11,0.15) 100%)",
                  border: "1px solid rgba(245,158,11,0.4)",
                  color: "#FBBF24",
                }}
              >
                <CheckCircle2 size={12} />
                Warning
              </span>
              <p className="text-xs text-[#7A8BA8]">Getting close</p>
            </>
          ) : (
            <>
              <span
                className="mb-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(34,197,94,0.25) 0%, rgba(34,197,94,0.15) 100%)",
                  border: "1px solid rgba(34,197,94,0.4)",
                  color: "#4ADE80",
                  boxShadow: "0 0 12px rgba(34,197,94,0.15)",
                }}
              >
                <CheckCircle2 size={12} />
                Healthy
              </span>
              <p className="text-xs text-[#7A8BA8]">On track</p>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-[#111B2D] px-5 py-3.5">
        <RefreshCw size={12} className="flex-shrink-0 text-[#4A5A75]" />
        <p className="text-xs leading-relaxed text-[#4A5A75]">
          Updates in real time as you edit values.
        </p>
      </div>
    </div>
  );
}

/* ── EnvelopeInfoCard ────────────────────────────────────── */

function EnvelopeInfoCard() {
  return (
    <div
      className="flex items-start gap-3.5 rounded-xl p-4"
      style={{
        background: "linear-gradient(135deg, rgba(108,58,237,0.06) 0%, rgba(11,17,32,0.95) 100%)",
        border: "1px solid rgba(108,58,237,0.28)",
        boxShadow: "0 0 20px rgba(108,58,237,0.08), inset 0 1px 0 rgba(108,58,237,0.08)",
      }}
    >
      <div
        className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
        style={{
          background: "rgba(108,58,237,0.2)",
          border: "1px solid rgba(108,58,237,0.35)",
          boxShadow: "0 0 12px rgba(108,58,237,0.2)",
        }}
      >
        <Info size={14} className="text-[#8B5CF6]" />
      </div>
      <div>
        <p className="text-xs leading-relaxed text-[#8B9AB8]">
          Spending is calculated from transactions and cannot be edited directly.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#8B9AB8]">
          Historical transactions remain unchanged when modifying envelopes.
        </p>
      </div>
    </div>
  );
}

/* ── ModifyEnvelopeModal ─────────────────────────────────── */

export function ModifyEnvelopeModal({
  open,
  onClose,
  envelope,
  budgetId,
  onUpdated,
}: ModifyEnvelopeModalProps) {
  const [title, setTitle] = useState(envelope.name);
  const [allocatedRaw, setAllocatedRaw] = useState(
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      envelope.allocated,
    ),
  );
  const [nature, setNature] = useState<Nature | "">("");
  const [description, setDescription] = useState(envelope.description ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allocatedNum = parseAmount(allocatedRaw);
  const MOCK_SPENT = envelope.spent;

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

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/budgets/${budgetId}/envelopes/${envelope.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          allocated_amt: allocatedNum,
          description: description.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.msg || "Failed to save changes.");
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setLoading(false);
    }
  };

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
              className="relative my-auto w-full max-w-[920px] overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120] shadow-[0_0_0_1px_rgba(108,58,237,0.12),0_32px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(108,58,237,0.08)]"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Modify Envelope"
            >
              {/* Top accent glow */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6C3AED]/40 to-transparent" />

              {/* ── Header ── */}
              <div className="flex items-start justify-between border-b border-[#111B2D] px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-[1.4rem] leading-tight font-bold text-white">
                    Modify Envelope
                  </h2>
                  <p className="mt-0.5 text-sm text-[#4A5A75]">
                    Update allocation settings for this category
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-full border border-[#3A2A00] bg-[#1A1200] px-3 py-1.5">
                    <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-amber-400" />
                    <span className="text-xs font-medium whitespace-nowrap text-amber-400">
                      Unsaved changes
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A5A75] transition-colors hover:bg-[#1A2540] hover:text-white focus:outline-none"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* ── Body ── */}
              <div className="flex max-h-[calc(100vh-180px)] gap-6 overflow-y-auto px-6 py-5">
                {/* Left — form */}
                <div className="min-w-0 flex-1 space-y-5">
                  {/* Envelope title */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-white">
                      Envelope title <span className="text-[#F87171]">*</span>
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Groceries"
                      className="w-full rounded-xl border border-[#1E2B42] bg-[#0D1525] px-3.5 py-3 text-sm text-white transition-all placeholder:text-[#4A5A75] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none"
                    />
                    <p className="mt-1.5 text-xs text-[#7A8BA8]">
                      A clear name for this spending category.
                    </p>
                  </div>

                  {/* Allocated amount */}
                  <AllocationInput value={allocatedRaw} onChange={setAllocatedRaw} />

                  {/* Nature */}
                  <div>
                    <label className="mb-3 block text-sm font-semibold text-white">
                      Nature <span className="font-normal text-[#5A6A85]">(optional)</span>
                    </label>

                    {/* Cards */}
                    <div className="grid grid-cols-4 gap-2">
                      {NATURE_OPTIONS.map((opt) => (
                        <NatureCard
                          key={opt.value}
                          option={opt}
                          selected={nature === opt.value}
                          onClick={() => setNature(nature === opt.value ? "" : opt.value)}
                        />
                      ))}
                    </div>

                    {/* Descriptions row */}
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {NATURE_OPTIONS.map((opt) => (
                        <p
                          key={opt.value}
                          className="px-1 text-center text-[11px] leading-snug text-[#5A6A85]"
                        >
                          {opt.description}
                        </p>
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
                        placeholder="Optional notes about this envelope…"
                        rows={4}
                        className="w-full resize-none rounded-xl border border-[#1E2B42] bg-[#0D1525] px-3.5 py-3 text-sm text-white transition-all placeholder:text-[#4A5A75] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none"
                      />
                      <span className="pointer-events-none absolute right-3.5 bottom-3 text-[11px] text-[#5A6A85] tabular-nums">
                        {description.length} / 140
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#7A8BA8]">
                      Visible only inside this budget.
                    </p>
                  </div>

                  {/* Info panel */}
                  <EnvelopeInfoCard />
                </div>

                {/* Right — preview */}
                <div className="sticky top-0 w-72 flex-shrink-0 self-start">
                  <EnvelopePreviewCard
                    title={title}
                    nature={nature}
                    allocated={allocatedNum}
                    spent={MOCK_SPENT}
                  />
                </div>
              </div>

              {/* ── Footer ── */}
              <div
                className="flex items-center px-6 py-4"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="ml-auto flex items-center gap-3">
                  {error && <p className="text-sm text-[#F87171]">{error}</p>}
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-[#1A2540] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#A8B4CC] transition-all hover:bg-[#0D1525] hover:text-white focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(108,58,237,0.4)] transition-all hover:from-[#6C3AED] hover:to-[#7C4AFF] hover:shadow-[0_0_32px_rgba(108,58,237,0.6)] focus:ring-4 focus:ring-[#6C3AED]/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={14} />
                    {loading ? "Saving…" : "Save Changes"}
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
