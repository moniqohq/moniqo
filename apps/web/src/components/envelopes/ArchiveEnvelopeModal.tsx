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
  Archive,
  ShoppingCart,
  AlertTriangle,
  Wallet,
  ArrowRight,
  ArrowLeftRight,
  Clock,
  BarChart2,
  Eye,
  Lock,
  Info,
  ChevronDown,
  Search,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

import type { BudgetEnvelope } from "@/types";

/* ── Types ────────────────────────────────────────────────── */
export interface ArchiveEnvelopeModalProps {
  open: boolean;
  onClose: () => void;
  envelope: BudgetEnvelope;
  budgetId: number;
  envelopes: BudgetEnvelope[];
  onDeleted: () => void;
}

type ReassignOption = "budgeted" | "envelope";

/* ── Envelope search dropdown ─────────────────────────────── */
function EnvelopeSearchSelect({
  value,
  onChange,
  disabled,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = options.filter(
    (e) => !query || e.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={ref} className="relative mt-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all",
          disabled
            ? "cursor-not-allowed border-[#111B2D] bg-[#080E1A] text-[#2A3A54]"
            : open
              ? "border-[#6C3AED]/50 bg-[#0D1525] text-white ring-2 ring-[#6C3AED]/20"
              : "border-[#1A2540] bg-[#0D1525] text-[#7A8BA8] hover:border-[#2A3A54]",
        )}
      >
        <div className="flex items-center gap-2">
          <Search size={13} className="flex-shrink-0 text-[#3A4A60]" />
          <span className={value ? "text-white" : ""}>{value || "Search active envelopes..."}</span>
        </div>
        <ChevronDown
          size={15}
          className={cn("text-[#5A6A85] transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-xl border border-[#1A2540] bg-[#0D1B2E] shadow-xl"
          >
            <div className="border-b border-[#111B2D] p-2">
              <div className="relative">
                <Search
                  size={12}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-[#3A4A60]"
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-lg border border-[#1A2540] bg-[#060C18] py-2 pr-3 pl-8 text-xs text-white placeholder:text-[#2A3A54] focus:outline-none"
                />
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-[#3A4A60]">No envelopes found</p>
              ) : (
                filtered.map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => {
                      onChange(env);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "w-full px-4 py-2.5 text-left text-sm transition-colors",
                      env === value
                        ? "bg-[#6C3AED]/20 text-white"
                        : "text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white",
                    )}
                  >
                    {env}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main modal ───────────────────────────────────────────── */
export function ArchiveEnvelopeModal({
  open,
  onClose,
  envelope,
  budgetId,
  envelopes,
  onDeleted,
}: ArchiveEnvelopeModalProps) {
  const [option, setOption] = useState<ReassignOption>("budgeted");
  const [targetEnv, setTargetEnv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ESC + body lock */
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

  const remaining = envelope.allocated_amt - envelope.spent_amt;
  const allocated = envelope.allocated_amt;
  const spent = envelope.spent_amt;
  const otherEnvelopeTitles = envelopes
    .filter((e) => e.id !== envelope.id)
    .map((e) => e.title);
  const toLabel = option === "budgeted" ? "To Be Budgeted" : targetEnv || "—";

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/budgets/${budgetId}/envelopes/${envelope.id}`,
        { method: "DELETE" },
      );
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.msg || "Failed to archive envelope.");
      onDeleted();
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
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Dialog wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 360 }}
              className="relative my-auto flex w-full max-w-[960px] flex-col overflow-hidden rounded-3xl bg-[#080C18]"
              style={{
                border: "1px solid rgba(108,58,237,0.22)",
                boxShadow:
                  "0 0 0 1px rgba(108,58,237,0.1), 0 40px 100px rgba(0,0,0,0.8), 0 0 80px rgba(108,58,237,0.08)",
                maxHeight: "calc(100vh - 32px)",
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Archive Envelope"
            >
              {/* Top purple accent line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6C3AED]/50 to-transparent" />

              {/* ── Header ─────────────────────────────────── */}
              <div className="flex flex-shrink-0 items-center justify-between border-b border-[#111B2D] px-7 pt-6 pb-5">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      background:
                        "radial-gradient(135deg, rgba(108,58,237,0.35) 0%, rgba(108,58,237,0.15) 100%)",
                      color: "#A78BFA",
                      border: "1px solid rgba(108,58,237,0.3)",
                      boxShadow: "0 0 24px rgba(108,58,237,0.2)",
                    }}
                  >
                    <Archive size={22} />
                  </div>
                  <div>
                    <h2 className="text-[1.35rem] leading-tight font-bold text-white">
                      Archive Envelope
                    </h2>
                    <p className="mt-0.5 text-sm text-[#6B7A94]">
                      Archived envelopes remain available in reports and transaction history.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#5A6A85] transition-colors hover:bg-[#1A2540] hover:text-white"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ── Scrollable content ──────────────────────── */}
              <div className="flex-1 space-y-4 overflow-y-auto px-7 py-5">
                {/* ── Envelope summary card ────────────────── */}
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: "linear-gradient(135deg, #0D1628 0%, #0B1220 100%)",
                    border: "1px solid #1A2540",
                  }}
                >
                  <div className="mb-5 flex items-start gap-5">
                    {/* Icon */}
                    <div
                      className="flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center rounded-2xl"
                      style={{
                        background:
                          "radial-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.07) 100%)",
                        color: "#4ADE80",
                        border: "1px solid rgba(34,197,94,0.2)",
                        boxShadow: "0 0 24px rgba(34,197,94,0.12)",
                      }}
                    >
                      <ShoppingCart size={26} />
                    </div>

                    {/* Name + badge */}
                    <div className="pt-0.5">
                      <div className="mb-0.5 flex flex-wrap items-center gap-3">
                        <span className="text-[22px] font-bold text-white">{envelope.title}</span>
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{
                            background: "rgba(108,58,237,0.15)",
                            color: "#A78BFA",
                            border: "1px solid rgba(108,58,237,0.3)",
                          }}
                        >
                          <ShieldCheck size={11} />
                          Historical data preserved
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-xl border border-[#1A2540] sm:grid-cols-5">
                    {[
                      {
                        label: "Available",
                        value: formatCurrency(remaining),
                        valueColor: "#4ADE80",
                        sub: `${formatCurrency(allocated)} allocated - ${formatCurrency(spent)} spent`,
                      },
                      {
                        label: "Allocated",
                        value: formatCurrency(allocated),
                        valueColor: "#E8EEF8",
                        sub: "",
                      },
                      {
                        label: "Spent",
                        value: formatCurrency(spent),
                        valueColor: "#F87171",
                        sub: "",
                      },
                      { label: "Transactions", value: "24", valueColor: "#A78BFA", sub: "" },
                      {
                        label: "Last activity",
                        value: "May 15, 2024",
                        valueColor: "#E8EEF8",
                        sub: "3 days ago",
                      },
                    ].map((m, i, arr) => (
                      <div
                        key={m.label}
                        className={cn(
                          "bg-[#080E1A] px-4 py-4",
                          i < arr.length - 1 && "border-r border-[#1A2540]",
                        )}
                      >
                        <p className="mb-1.5 text-[11px] text-[#5A6A85]">{m.label}</p>
                        <p
                          className="text-[18px] leading-tight font-bold tabular-nums"
                          style={{ color: m.valueColor }}
                        >
                          {m.value}
                        </p>
                        {m.sub && (
                          <p className="mt-1 text-[11px] leading-snug text-[#3A4A60]">{m.sub}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Warning / reassignment panel ─────────── */}
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(180,83,9,0.04) 100%)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    boxShadow: "0 0 30px rgba(245,158,11,0.05)",
                  }}
                >
                  <div className="mb-4 flex items-start gap-3.5">
                    <div
                      className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}
                    >
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <p className="mb-1 text-[15px] font-bold text-[#F59E0B]">
                        Remaining funds must be reassigned
                      </p>
                      <p className="text-sm leading-relaxed text-[#8A9AB5]">
                        To preserve accurate budget totals, remaining money must be moved before
                        archiving this envelope.
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-between pt-4"
                    style={{ borderTop: "1px solid rgba(245,158,11,0.15)" }}
                  >
                    <span className="text-sm text-[#8A9AB5]">Remaining balance to reassign</span>
                    <span
                      className="text-[22px] font-bold tabular-nums"
                      style={{ color: "#F59E0B" }}
                    >
                      ₹
                      {new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(
                        remaining,
                      )}
                    </span>
                  </div>
                </div>

                {/* ── Reassignment options ──────────────────── */}
                <div className="space-y-2.5">
                  {/* Option 1 — To Be Budgeted */}
                  <button
                    type="button"
                    onClick={() => setOption("budgeted")}
                    className="w-full rounded-2xl p-4 text-left transition-all"
                    style={
                      option === "budgeted"
                        ? {
                            background: "rgba(108,58,237,0.08)",
                            border: "1px solid rgba(108,58,237,0.5)",
                            boxShadow: "0 0 24px rgba(108,58,237,0.12)",
                          }
                        : {
                            background: "#0B1120",
                            border: "1px solid #1A2540",
                          }
                    }
                  >
                    <div className="flex items-center gap-4">
                      {/* Radio */}
                      <div
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all"
                        style={
                          option === "budgeted"
                            ? { borderColor: "#7C4AFF", background: "#7C4AFF" }
                            : { borderColor: "#2A3A54", background: "transparent" }
                        }
                      >
                        {option === "budgeted" && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>

                      {/* Icon */}
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: "rgba(108,58,237,0.15)", color: "#A78BFA" }}
                      >
                        <Wallet size={18} />
                      </div>

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2.5">
                          <span className="text-sm font-semibold text-white">
                            Move funds to &ldquo;To Be Budgeted&rdquo;
                          </span>
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              background: "rgba(34,197,94,0.15)",
                              color: "#4ADE80",
                              border: "1px solid rgba(34,197,94,0.25)",
                            }}
                          >
                            Recommended
                          </span>
                        </div>
                        <p className="text-xs text-[#5A6A85]">
                          Funds will be returned to your available budget.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Option 2 — Another envelope */}
                  <div
                    className="cursor-pointer rounded-2xl p-4 transition-all"
                    style={
                      option === "envelope"
                        ? {
                            background: "rgba(108,58,237,0.08)",
                            border: "1px solid rgba(108,58,237,0.5)",
                            boxShadow: "0 0 24px rgba(108,58,237,0.12)",
                          }
                        : {
                            background: "#0B1120",
                            border: "1px solid #1A2540",
                          }
                    }
                    onClick={() => setOption("envelope")}
                  >
                    <div className="flex items-center gap-4">
                      {/* Radio */}
                      <div
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all"
                        style={
                          option === "envelope"
                            ? { borderColor: "#7C4AFF", background: "#7C4AFF" }
                            : { borderColor: "#2A3A54", background: "transparent" }
                        }
                      >
                        {option === "envelope" && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>

                      {/* Icon */}
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: "rgba(59,130,246,0.12)", color: "#60A5FA" }}
                      >
                        <ArrowLeftRight size={18} />
                      </div>

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <p className="mb-0.5 text-sm font-semibold text-white">
                          Move funds to another envelope
                        </p>
                        <p className="text-xs text-[#5A6A85]">
                          Select an active envelope to receive the remaining funds.
                        </p>
                      </div>
                    </div>

                    {/* Dropdown — only visible, but interaction works regardless */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <EnvelopeSearchSelect
                        value={targetEnv}
                        onChange={setTargetEnv}
                        disabled={option !== "envelope"}
                        options={otherEnvelopeTitles}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Transfer preview card ─────────────────── */}
                <div
                  className="rounded-2xl px-6 py-5"
                  style={{ background: "#0D1525", border: "1px solid #1A2540" }}
                >
                  <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                    {/* From */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                        style={{
                          background: "rgba(34,197,94,0.12)",
                          color: "#4ADE80",
                          border: "1px solid rgba(34,197,94,0.18)",
                        }}
                      >
                        <ShoppingCart size={20} />
                      </div>
                      <div>
                        <p className="mb-0.5 text-[11px] text-[#5A6A85]">From</p>
                        <p className="text-base font-bold text-white">{envelope.title}</p>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight size={22} className="flex-shrink-0 text-[#3A4A60]" />

                    {/* To */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                        style={{
                          background: "rgba(108,58,237,0.15)",
                          color: "#A78BFA",
                          border: "1px solid rgba(108,58,237,0.2)",
                        }}
                      >
                        <Wallet size={20} />
                      </div>
                      <div>
                        <p className="mb-0.5 text-[11px] text-[#5A6A85]">To</p>
                        <p className="max-w-[180px] truncate text-base font-bold text-white">
                          {toLabel}
                        </p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="ml-auto flex-shrink-0 text-right">
                      <p className="mb-0.5 text-[11px] text-[#5A6A85]">Amount</p>
                      <p
                        className="text-[22px] font-bold tabular-nums"
                        style={{ color: "#4ADE80" }}
                      >
                        ₹
                        {new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(
                          remaining,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Historical data preservation card ──────── */}
                <div
                  className="overflow-hidden rounded-2xl"
                  style={{ background: "#0D1525", border: "1px solid #1A2540" }}
                >
                  {/* Top section */}
                  <div className="flex items-start gap-3.5 border-b border-[#111B2D] px-5 py-4">
                    <div
                      className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "rgba(108,58,237,0.12)", color: "#A78BFA" }}
                    >
                      <Clock size={16} />
                    </div>
                    <p className="pt-1 text-sm leading-relaxed text-[#A8B4CC]">
                      Past transactions will remain unchanged to preserve reports, balances, and
                      reconciliation accuracy.
                    </p>
                  </div>

                  {/* 3-column feature grid */}
                  <div className="grid grid-cols-3 divide-x divide-[#111B2D]">
                    {[
                      { icon: <BarChart2 size={15} />, label: "Reports remain accurate" },
                      { icon: <Eye size={15} />, label: "Historical spending remains visible" },
                      {
                        icon: <Lock size={15} />,
                        label: "New transactions cannot use archived envelopes",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-col items-center gap-2 px-4 py-4 text-center"
                      >
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ background: "rgba(108,58,237,0.1)", color: "#7C6AED" }}
                        >
                          {item.icon}
                        </div>
                        <p className="text-[11px] leading-snug text-[#5A6A85]">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* end scrollable content */}

              {/* ── Sticky footer ──────────────────────────── */}
              <div
                className="flex flex-shrink-0 items-center justify-between gap-4 px-7 py-4"
                style={{
                  borderTop: "1px solid #111B2D",
                  background:
                    "linear-gradient(0deg, rgba(6,10,20,0.95) 0%, rgba(8,12,24,0.9) 100%)",
                }}
              >
                {/* Notice */}
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: "rgba(108,58,237,0.15)", color: "#A78BFA" }}
                  >
                    <Info size={13} />
                  </div>
                  <p className="text-xs leading-snug text-[#7A8BA8]">
                    This envelope will become read-only and hidden from active budgeting.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-shrink-0 items-center gap-3">
                  {error && <p className="text-sm text-[#F87171]">{error}</p>}
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-[#1A2540] bg-[#0D1525] px-5 py-2.5 text-sm font-medium text-[#C8D4E8] transition-all hover:border-[#2A3A54] hover:bg-[#111B2D]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, #6C3AED 0%, #7C4AFF 100%)",
                      boxShadow: "0 0 20px rgba(108,58,237,0.4)",
                    }}
                  >
                    <Archive size={15} />
                    {loading ? "Archiving…" : "Archive Envelope"}
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
