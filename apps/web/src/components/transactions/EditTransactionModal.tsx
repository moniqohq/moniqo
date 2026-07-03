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

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CheckCircle,
  Building2,
  PiggyBank,
  CreditCard,
  Wallet,
  Landmark,
  Info,
  AlertTriangle,
  ArrowRight,
  Save,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { Transaction, TransactionType, AccountType } from "@/types";
import type { ApiAccount, ApiEnvelope } from "@/lib/api-types";
import { apiFetch } from "@/lib/api";

/* ── helpers ──────────────────────────────────────────────── */

function formatInputDate(dateStr: string): string {
  const d = new Date(dateStr + "T09:42:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const ACCOUNT_TYPE_META: Record<AccountType, { icon: React.ReactNode; color: string }> = {
  checking: { icon: <Building2 size={13} />, color: "#3B82F6" },
  savings: { icon: <PiggyBank size={13} />, color: "#22C55E" },
  credit: { icon: <CreditCard size={13} />, color: "#F87171" },
  cash: { icon: <Wallet size={13} />, color: "#F59E0B" },
  loan: { icon: <Landmark size={13} />, color: "#EC4899" },
};

const TX_TYPES: {
  value: TransactionType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}[] = [
  {
    value: "expense",
    label: "Expense",
    icon: <ArrowDownLeft size={13} strokeWidth={2.5} />,
    color: "#F87171",
    bg: "rgba(239,68,68,0.12)",
  },
  {
    value: "income",
    label: "Income",
    icon: <ArrowUpRight size={13} strokeWidth={2.5} />,
    color: "#4ADE80",
    bg: "rgba(34,197,94,0.12)",
  },
  {
    value: "transfer",
    label: "Transfer",
    icon: <ArrowLeftRight size={13} strokeWidth={2.5} />,
    color: "#7DD3FC",
    bg: "rgba(99,179,237,0.12)",
  },
];

/* ── shared input/label styles ───────────────────────────── */
const labelCls = "block mb-1.5 text-xs font-medium text-[#7A8BA8]";
const inputCls = [
  "w-full py-2.5 px-3 text-sm text-white bg-[#0D1525]",
  "border border-[#1E2B42] rounded-lg",
  "placeholder:text-[#2A3A54]",
  "focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED]",
  "transition-all",
].join(" ");
const selectTriggerCls = [
  "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm",
  "bg-[#0D1525] border border-[#1E2B42] rounded-lg",
  "hover:border-[#2A3A54] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40",
  "transition-all",
].join(" ");

/* ── small reusable pieces ───────────────────────────────── */

function ImpactLine({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "red" | "green" | "white";
}) {
  const color =
    highlight === "red"
      ? "text-[#F87171]"
      : highlight === "green"
        ? "text-[#4ADE80]"
        : "text-[#E8EEF8]";
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[#7A8BA8]">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", color)}>{value}</span>
    </div>
  );
}

/* ── main props ──────────────────────────────────────────── */

interface Props {
  tx: Transaction | null;
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  budgetId?: number | null;
  accounts?: ApiAccount[];
  envelopes?: ApiEnvelope[];
}

/* ── component ────────────────────────────────────────────── */

export function EditTransactionModal({ tx, open, onClose, onSave, budgetId, accounts = [], envelopes = [] }: Props) {
  /* form state */
  const [txType, setTxType] = useState<TransactionType>("expense");
  const [date, setDate] = useState("");
  const [payee, setPayee] = useState("");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [envId, setEnvId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [transferTo, setTransferTo] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  /* dropdown open states */
  const [typeOpen, setTypeOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  /* populate form when tx changes */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!tx) return;
    setTxType(tx.type);
    setDate(formatInputDate(tx.date));
    setPayee(tx.payee);
    setAccountId(tx.accountId);
    setEnvId(tx.envelopeId ?? null);
    setAmount(Math.abs(tx.amount).toFixed(2));
    setTransferTo(tx.transferAccountId ?? null);
    setNotes(tx.memo ?? "");
  }, [tx]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* ESC to close */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /* close all dropdowns on outside click */
  const closeDropdowns = useCallback(() => {
    setTypeOpen(false);
    setAccountOpen(false);
    setEnvOpen(false);
    setTransferOpen(false);
  }, []);

  if (!tx) return null;

  /* derived */
  const numericAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const isExpense = txType === "expense";
  const isIncome = txType === "income";
  const isTransfer = txType === "transfer";

  const selectedAccount = accounts.find((a) => String(a.id) === accountId) ?? accounts[0] ?? null;
  const selectedEnvelope = envelopes.find((e) => String(e.id) === envId) ?? null;
  const selectedTransferAccount = accounts.find((a) => String(a.id) === transferTo) ?? null;
  const accMeta = selectedAccount ? ACCOUNT_TYPE_META[selectedAccount.type as AccountType] ?? ACCOUNT_TYPE_META.checking : ACCOUNT_TYPE_META.checking;

  const signedAmount = isIncome ? numericAmount : -numericAmount;
  const accountBefore = Number(selectedAccount?.balance ?? 0) - signedAmount;
  const _accountAfter = Number(selectedAccount?.balance ?? 0);
  const realAccountBefore = accountBefore;
  const realAccountAfter = accountBefore + signedAmount;

  const envBefore = selectedEnvelope
    ? Number(selectedEnvelope?.spent_amt ?? 0) + (isExpense ? numericAmount : 0)
    : 0;
  const envAfter = selectedEnvelope ? Number(selectedEnvelope?.spent_amt ?? 0) : 0;
  const isOverspent = isExpense && selectedEnvelope && envAfter < 0;
  const typeMeta = TX_TYPES.find((t) => t.value === txType)!;

  const amountDisplayColor = isIncome
    ? "text-[#4ADE80]"
    : isExpense
      ? "text-[#F87171]"
      : tx.amount >= 0
        ? "text-[#4ADE80]"
        : "text-[#F87171]";

  async function handleSave() {
    if (!tx || !budgetId || saving) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        amount: signedAmount,
        date: tx.date,
        memo: notes || undefined,
      };
      if (txType === "transfer") {
        payload.account_id = Number(accountId) || undefined;
        payload.transfer_account_id = Number(transferTo) || undefined;
      } else {
        payload.account_id = Number(accountId) || undefined;
        payload.budget_envelope_id = Number(envId) || null;
      }
      const res = await apiFetch(`/api/v1/budgets/${budgetId}/transactions/${tx.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.msg || "Failed to update transaction.");
      onSave?.();
      onClose();
    } catch {
      // error is surfaced inline in a future iteration
    } finally {
      setSaving(false);
    }  }

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
            transition={{ duration: 0.2 }}
            onClick={() => {
              closeDropdowns();
              onClose();
            }}
          />

          {/* Centering shell */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Edit Transaction"
              className="relative my-auto w-full max-w-[1100px] rounded-2xl border border-[#1A2A40] bg-[#080E1C]/98 shadow-[0_0_100px_rgba(108,58,237,0.22),0_40px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ type: "spring", damping: 28, stiffness: 340 }}
              onClick={(e) => {
                e.stopPropagation();
                closeDropdowns();
              }}
            >
              {/* Top glow */}
              <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-[#6C3AED]/45 to-transparent" />
              {/* Side glows */}
              <div className="absolute inset-y-0 left-0 w-px rounded-l-2xl bg-gradient-to-b from-transparent via-[#6C3AED]/15 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-px rounded-r-2xl bg-gradient-to-b from-transparent via-[#6C3AED]/15 to-transparent" />

              <div className="p-6 pb-0">
                {/* ── Header ───────────────────────────────── */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    {/* Amount */}
                    <div
                      className={cn(
                        "mt-0.5 shrink-0 text-[2.6rem] leading-none font-bold tabular-nums",
                        amountDisplayColor,
                      )}
                    >
                      {isIncome ? "+" : "−"}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
                    </div>

                    {/* Merchant */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                        style={{ backgroundColor: "#1E2B42" }}
                      >
                        {tx.payee[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xl leading-tight font-semibold text-[#E8EEF8]">
                          {tx.payee}
                        </p>
                        {tx.memo && (
                          <p className="mt-0.5 truncate text-sm text-[#5A6A85]">{tx.memo}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Title + close */}
                  <div className="ml-4 flex shrink-0 flex-col items-end gap-2">
                    <button
                      onClick={onClose}
                      aria-label="Close"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5A6A85] transition-colors hover:bg-[#1E2B42] hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Metadata row */}
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm text-[#7A8BA8]">
                    <Calendar size={13} className="text-[#3A4A60]" />
                    <span>{formatInputDate(tx.date)}</span>
                  </div>
                  <span className="text-[#1E2B42] select-none">|</span>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ backgroundColor: typeMeta.bg, color: typeMeta.color }}
                  >
                    {typeMeta.icon} {typeMeta.label}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                      tx.cleared
                        ? "border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] text-[#4ADE80]"
                        : "border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] text-[#FCD34D]",
                    )}
                  >
                    {tx.cleared && <CheckCircle size={11} strokeWidth={2} />}
                    {tx.cleared ? "Cleared" : "Pending"}
                  </span>
                </div>

                <div className="mb-5 h-px bg-[#111B2D]" />

                {/* ── Main 2-column body ───────────────────── */}
                <div className="flex gap-5">
                  {/* LEFT — form */}
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-4 text-sm font-semibold text-[#E8EEF8]">
                      Transaction Details
                    </h3>

                    {/* Row 1: Type + Date */}
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      {/* Transaction Type */}
                      <div className="relative">
                        <label className={labelCls}>Transaction Type</label>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTypeOpen((o) => !o);
                            setAccountOpen(false);
                            setEnvOpen(false);
                            setTransferOpen(false);
                          }}
                          className={selectTriggerCls}
                        >
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                            style={{ backgroundColor: typeMeta.bg, color: typeMeta.color }}
                          >
                            {typeMeta.icon}
                          </span>
                          <span className="flex-1 text-left text-white">{typeMeta.label}</span>
                          <ChevronDown size={13} className="shrink-0 text-[#5A6A85]" />
                        </button>
                        {typeOpen && (
                          <div className="absolute top-full left-0 z-30 mt-1 w-full overflow-hidden rounded-lg border border-[#1A2640] bg-[#0D1B2E] py-1 shadow-xl">
                            {TX_TYPES.map((t) => (
                              <button
                                key={t.value}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTxType(t.value);
                                  setTypeOpen(false);
                                }}
                                className={cn(
                                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                                  txType === t.value
                                    ? "bg-[#6C3AED]/15 text-white"
                                    : "text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white",
                                )}
                              >
                                <span
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                                  style={{ backgroundColor: t.bg, color: t.color }}
                                >
                                  {t.icon}
                                </span>
                                {t.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <div>
                        <label className={labelCls}>Date</label>
                        <button type="button" className={selectTriggerCls}>
                          <Calendar size={13} className="shrink-0 text-[#5A6A85]" />
                          <span className="flex-1 text-left text-sm text-white">
                            {date || formatInputDate(tx.date)}
                          </span>
                          <ChevronDown size={13} className="shrink-0 text-[#5A6A85]" />
                        </button>
                      </div>
                    </div>

                    {/* Payee / Note */}
                    <div className="mb-4">
                      <label className={labelCls}>Payee / Note</label>
                      <input
                        type="text"
                        value={payee}
                        onChange={(e) => setPayee(e.target.value)}
                        placeholder="e.g. Starbucks Coffee"
                        className={inputCls}
                      />
                    </div>

                    {/* Row 2: Account + Envelope */}
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      {/* Account */}
                      <div className="relative">
                        <label className={labelCls}>Account</label>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAccountOpen((o) => !o);
                            setTypeOpen(false);
                            setEnvOpen(false);
                            setTransferOpen(false);
                          }}
                          className={selectTriggerCls}
                        >
                          <div
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                            style={{ backgroundColor: `${accMeta.color}22`, color: accMeta.color }}
                          >
                            {accMeta.icon}
                          </div>
                          <span className="flex-1 truncate text-left text-sm text-white">
                            {selectedAccount?.name ?? "Select account"}                            <span className="ml-1 text-xs text-[#5A6A85] capitalize">
                              ({selectedAccount?.type ?? ""})
                            </span>
                          </span>
                          <ChevronDown size={13} className="shrink-0 text-[#5A6A85]" />
                        </button>
                        {accountOpen && (
                          <div className="absolute top-full left-0 z-30 mt-1 w-64 overflow-hidden rounded-lg border border-[#1A2640] bg-[#0D1B2E] py-1 shadow-xl">
                            {accounts.map((acc) => {
                              const meta = ACCOUNT_TYPE_META[acc.type as AccountType] ?? ACCOUNT_TYPE_META.checking;                              return (
                                <button
                                  key={acc.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAccountId(String(acc.id));
                                    setAccountOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                                    accountId === String(acc.id)
                                      ? "bg-[#6C3AED]/15 text-white"
                                      : "text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white",
                                  )}
                                >
                                  <div
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                                    style={{
                                      backgroundColor: `${meta.color}22`,
                                      color: meta.color,
                                    }}
                                  >
                                    {meta.icon}
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className="text-sm leading-tight text-white">
                                      {acc.name}
                                    </p>                                    <p className="text-xs text-[#5A6A85] capitalize">
                                      {acc.type} · {formatCurrency(Number(acc.balance))}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Envelope / Category */}
                      {!isTransfer && (
                        <div className="relative">
                          <label className={labelCls}>Envelope / Category</label>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEnvOpen((o) => !o);
                              setTypeOpen(false);
                              setAccountOpen(false);
                              setTransferOpen(false);
                            }}
                            className={selectTriggerCls}
                          >
                            {selectedEnvelope ? (
                              <>
                                <div
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs"
                                  style={{ backgroundColor: `${"#6C3AED"}30` }}
                                >
                                  {selectedEnvelope?.title?.[0] ?? "E"}
                                </div>
                                <span className="flex-1 truncate text-left text-sm text-white">
                                  {selectedEnvelope?.title ?? "Select envelope"}                                </span>
                              </>
                            ) : (
                              <span className="flex-1 text-left text-sm text-[#2A3A54]">
                                Select category
                              </span>
                            )}
                            <ChevronDown size={13} className="shrink-0 text-[#5A6A85]" />
                          </button>
                          {envOpen && (
                            <div className="absolute top-full left-0 z-30 mt-1 max-h-56 w-64 overflow-y-auto rounded-lg border border-[#1A2640] bg-[#0D1B2E] py-1 shadow-xl">
                              {envelopes.map((env) => (
                                <button
                                  key={env.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEnvId(String(env.id));
                                    setEnvOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                                    envId === String(env.id)
                                      ? "bg-[#6C3AED]/15 text-white"
                                      : "text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white",
                                  )}
                                >
                                  <div
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px]"
                                    style={{ backgroundColor: `${"#6C3AED"}30` }}
                                  >
                                    {env.title[0]}                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className="text-sm leading-tight text-white">{env.title}</p>
                                    <p className="text-xs text-[#5A6A85]">
                                      Available: {formatCurrency(Number(env.spent_amt))}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="mb-4">
                      <label className={labelCls}>Amount</label>
                      <div className="relative flex items-center rounded-lg border border-[#1E2B42] bg-[#0D1525] px-3 py-2.5 transition-all focus-within:border-[#6C3AED] focus-within:ring-2 focus-within:ring-[#6C3AED]/40">
                        <span className="mr-2 shrink-0 text-base font-light text-[#5A6A85]">₹</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                          placeholder="0.00"
                          className="flex-1 bg-transparent text-base font-semibold text-white tabular-nums focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Transfer Account (optional) */}
                    <div className="mb-4">
                      <label className={labelCls}>
                        Transfer Account{" "}
                        <span className="font-normal text-[#2A3A54]">(optional)</span>
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTransferOpen((o) => !o);
                            setTypeOpen(false);
                            setAccountOpen(false);
                            setEnvOpen(false);
                          }}
                          className={cn(selectTriggerCls, "text-[#2A3A54]")}
                        >
                          <span className="flex-1 text-left text-sm">
                            {selectedTransferAccount ? (
                              <span className="text-white">
                                {selectedTransferAccount?.name ?? "—"}                              </span>
                            ) : (
                              "Select account (optional)"
                            )}
                          </span>
                          <ArrowRight size={13} className="shrink-0 text-[#2A3A54]" />
                        </button>
                        {transferOpen && (
                          <div className="absolute top-full left-0 z-30 mt-1 w-64 overflow-hidden rounded-lg border border-[#1A2640] bg-[#0D1B2E] py-1 shadow-xl">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTransferTo(null);
                                setTransferOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white"
                            >
                              None
                            </button>
                            {accounts
                              .filter((a) => String(a.id) !== accountId)                              .map((acc) => {
                                const meta = ACCOUNT_TYPE_META[acc.type as AccountType] ?? ACCOUNT_TYPE_META.checking;
                                return (
                                  <button
                                    key={acc.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTransferTo(String(acc.id));
                                      setTransferOpen(false);
                                    }}
                                    className={cn(
                                      "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                                      transferTo === String(acc.id)
                                        ? "bg-[#6C3AED]/15 text-white"
                                        : "text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white",
                                    )}
                                  >
                                    <div
                                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                                      style={{
                                        backgroundColor: `${meta.color}22`,
                                        color: meta.color,
                                      }}
                                    >
                                      {meta.icon}
                                    </div>
                                    <span>{acc.name}</span>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="mb-2">
                      <label className={labelCls}>
                        Notes <span className="font-normal text-[#2A3A54]">(optional)</span>
                      </label>
                      <div className="relative">
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                          placeholder="Add a note..."
                          rows={3}
                          className={cn(inputCls, "resize-none")}
                        />
                        <span className="absolute right-3 bottom-2.5 text-[10px] text-[#2A3A54] tabular-nums">
                          {notes.length} / 200
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vertical divider */}
                  <div className="mx-1 w-px self-stretch bg-[#111B2D]" />

                  {/* RIGHT — Financial Impact */}
                  <div className="w-[300px] shrink-0">
                    <h3 className="mb-4 text-sm font-semibold text-[#E8EEF8]">Financial Impact</h3>

                    {/* Account Impact */}
                    <div className="mb-4">
                      <p className="mb-2 text-sm font-semibold text-[#A8B4CC]">
                        Account Impact{" "}
                        <span className="font-normal text-[#5A6A85]">
                          ({selectedAccount?.name ?? "Select account"})                        </span>
                      </p>
                      <div className="divide-y divide-[#111B2D] rounded-xl border border-[#141F32] bg-[#080E1C] px-4 py-1">
                        <ImpactLine
                          label="Balance Before"
                          value={formatCurrency(realAccountBefore)}
                        />
                        <ImpactLine
                          label="Change"
                          value={`${signedAmount >= 0 ? "+" : ""}${formatCurrency(signedAmount)}`}
                          highlight={signedAmount >= 0 ? "green" : "red"}
                        />
                        <ImpactLine
                          label="Balance After"
                          value={formatCurrency(realAccountAfter)}
                          highlight={realAccountAfter >= 0 ? undefined : "red"}
                        />
                      </div>
                    </div>

                    {/* Envelope Impact */}
                    {!isTransfer && selectedEnvelope && (
                      <div className="mb-4">
                        <p className="mb-2 text-sm font-semibold text-[#A8B4CC]">
                          Envelope Impact{" "}
                          <span className="font-normal text-[#5A6A85]">
                            ({selectedEnvelope?.title ?? "Select envelope"})                          </span>
                        </p>
                        <div className="divide-y divide-[#111B2D] rounded-xl border border-[#141F32] bg-[#080E1C] px-4 py-1">
                          <ImpactLine
                            label="Envelope Balance Before"
                            value={formatCurrency(envBefore)}
                          />
                          <ImpactLine
                            label="Transaction Amount"
                            value={`${isExpense ? "−" : "+"}${formatCurrency(numericAmount)}`}
                            highlight={isExpense ? "red" : "green"}
                          />
                          <ImpactLine
                            label="Envelope Balance After"
                            value={formatCurrency(envAfter)}
                            highlight={envAfter >= 0 ? "green" : "red"}
                          />
                        </div>
                      </div>
                    )}

                    {/* Validation card */}
                    <div
                      className={cn(
                        "flex gap-2.5 rounded-xl border p-3",
                        isOverspent
                          ? "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.07)]"
                          : "border-[rgba(34,197,94,0.15)] bg-[rgba(34,197,94,0.06)]",
                      )}
                    >
                      {isOverspent ? (
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#F87171]" />
                      ) : (
                        <Info size={14} className="mt-0.5 shrink-0 text-[#4ADE80]" />
                      )}
                      <div>
                        <p
                          className={cn(
                            "text-sm leading-tight font-semibold",
                            isOverspent ? "text-[#F87171]" : "text-[#4ADE80]",
                          )}
                        >
                          {isOverspent ? "Envelope overspent" : "No issues detected"}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#5A6A85]">
                          {isOverspent
                            ? "This transaction exceeds the allocated envelope balance."
                            : "This transaction is within the allocated envelope balance."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Footer ──────────────────────────────────── */}
              <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-[#111B2D] px-6 py-4">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-[#1E2B42] bg-transparent px-6 py-2.5 text-sm font-medium text-[#A8B4CC] transition-all hover:bg-[#131C2E] hover:text-white focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C3AED] to-[#8B5CF6] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(108,58,237,0.4)] transition-all hover:from-[#7C4AFF] hover:to-[#9C6FFF] hover:shadow-[0_0_28px_rgba(108,58,237,0.55)] focus:ring-2 focus:ring-[#6C3AED]/50 focus:outline-none disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
