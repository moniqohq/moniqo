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
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Search,
  ChevronDown,
  CalendarDays,
  Info,
  TrendingUp,
  Save,
  Building2,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import { mockAccounts, mockEnvelopes } from "@/mock/data";
import { formatCurrency, cn } from "@/lib/utils";
import type { TransactionType } from "@/types";

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
}

/* ── helpers ─────────────────────────────────────────────── */

function numberToWords(n: number): string {
  if (!n || n <= 0) return "";
  const units = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  if (n < 20) return units[n];
  if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? " " + units[n % 10] : ""}`;
  if (n < 1000)
    return `${units[Math.floor(n / 100)]} hundred${n % 100 ? " " + numberToWords(n % 100) : ""}`;
  if (n < 100000)
    return `${numberToWords(Math.floor(n / 1000))} thousand${n % 1000 ? " " + numberToWords(n % 1000) : ""}`;
  return `${numberToWords(Math.floor(n / 100000))} lakh${n % 100000 ? " " + numberToWords(n % 100000) : ""}`;
}

/* ── shared styles ───────────────────────────────────────── */

const inputCls = [
  "w-full py-2.5 px-3 text-sm text-white bg-[#0D1525]",
  "border border-[#1E2B42] rounded-xl",
  "placeholder:text-[#2A3A54]",
  "focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40 focus:border-[#6C3AED]",
  "transition-all",
].join(" ");

const fieldLabel = "block mb-2 text-sm font-medium text-[#A8B4CC]";

/* ── component ───────────────────────────────────────────── */

export function AddTransactionModal({
  open,
  onClose,
  defaultType = "expense",
}: AddTransactionModalProps) {
  /* core state */
  const [txType, setTxType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState("");
  const [payee, setPayee] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(mockAccounts[0]);
  const [selectedEnvelope, setSelectedEnvelope] = useState(mockEnvelopes[0]);
  const [date] = useState("May 15, 2026");
  const [memo, setMemo] = useState("");

  /* expense dropdowns */
  const [accountOpen, setAccountOpen] = useState(false);
  const [envelopeOpen, setEnvelopeOpen] = useState(false);

  /* transfer state */
  const [fromAccountId, setFromAccountId] = useState(mockAccounts[0].id);
  const [toAccountId, setToAccountId] = useState(mockAccounts[1].id);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const closeAll = () => {
    setAccountOpen(false);
    setEnvelopeOpen(false);
    setFromOpen(false);
    setToOpen(false);
  };

  /* keyboard + scroll lock */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setTxType(defaultType);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, defaultType]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* derived */
  const numericAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const isExpense = txType === "expense";
  const isIncome = txType === "income";
  const isTransfer = txType === "transfer";

  const availableBefore = selectedEnvelope.available;
  const availableAfter = selectedEnvelope.available - numericAmount;
  const acctAfterExpense = selectedAccount.balance - numericAmount;
  const acctAfterIncome = selectedAccount.balance + numericAmount;

  const fromAccount = mockAccounts.find((a) => a.id === fromAccountId) ?? mockAccounts[0];
  const toAccount = mockAccounts.find((a) => a.id === toAccountId) ?? mockAccounts[1];
  const fromAfter = fromAccount.balance - numericAmount;
  const toAfter = toAccount.balance + numericAmount;

  const wordsLabel = numericAmount ? `${numberToWords(Math.floor(numericAmount))} rupees` : "";

  /* amount display split: integer vs decimal */
  const [rawInt, rawDec] = amount.split(".");
  const displayInt = rawInt ? Number(rawInt).toLocaleString("en-IN") : "";
  const displayDec = rawDec !== undefined ? rawDec.slice(0, 2).padEnd(2, "0") : "";

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9.]/g, "");
    const parts = v.split(".");
    setAmount(parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : v);
  };

  /* tab active classes */
  const tabCls = (type: TransactionType) => {
    if (txType !== type) return "text-[#5A6A85] hover:text-[#A8B4CC] bg-transparent";
    if (type === "income") return "bg-[#166534] text-white shadow-inner";
    if (type === "transfer") return "bg-[#1D4ED8] text-white shadow-inner";
    return "bg-gradient-to-r from-[#4F46E5] to-[#6C3AED] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]";
  };

  const tabs = [
    {
      type: "expense" as TransactionType,
      label: "Expense",
      icon: <ArrowDownLeft size={15} strokeWidth={2.5} />,
    },
    {
      type: "income" as TransactionType,
      label: "Income",
      icon: <ArrowUpRight size={15} strokeWidth={2.5} />,
    },
    {
      type: "transfer" as TransactionType,
      label: "Transfer",
      icon: <ArrowLeftRight size={15} strokeWidth={2.5} />,
    },
  ];

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

          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 30, stiffness: 380 }}
              className={cn(
                "relative my-auto w-full overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120]",
                "shadow-[0_0_0_1px_rgba(108,58,237,0.12),0_32px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(108,58,237,0.08)]",
                isTransfer ? "max-w-[950px]" : "max-w-[780px]",
              )}
              onClick={(e) => {
                e.stopPropagation();
                closeAll();
              }}
              role="dialog"
              aria-modal="true"
              aria-label={isExpense ? "Add Expense" : isIncome ? "Add Income" : "Transfer Money"}
            >
              {/* Subtle top glow */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6C3AED]/35 to-transparent" />

              {/* ── Header ──────────────────────────────── */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-[1.4rem] leading-tight font-bold text-white">
                    {isTransfer ? "Transfer Money" : isExpense ? "Add Expense" : "Add Income"}
                  </h2>
                  <p className="mt-0.5 text-sm text-[#4A5A75]">
                    {isTransfer
                      ? "Move money between accounts"
                      : isExpense
                        ? "Record a spending transaction"
                        : "Record incoming money"}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A5A75] transition-colors hover:bg-[#1A2540] hover:text-white focus:outline-none"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ── Tab Switcher ─────────────────────────── */}
              <div className="px-6 pb-5">
                <div className="flex w-full overflow-hidden rounded-xl border border-[#1A2540] bg-[#0D1525]">
                  {tabs.map(({ type, label, icon }, i) => (
                    <button
                      key={type}
                      onClick={() => setTxType(type)}
                      className={cn(
                        "inline-flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-all focus:outline-none",
                        i > 0 && "border-l border-[#1A2540]",
                        tabCls(type),
                      )}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Body ────────────────────────────────── */}
              <div className="flex gap-5 px-6 pb-0">
                {/* LEFT COLUMN */}
                <div className="min-w-0 flex-1 space-y-4">
                  {isTransfer ? (
                    /* ── Transfer form ── */
                    <>
                      {/* From Account */}
                      <div>
                        <label className={fieldLabel}>From Account</label>
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="flex w-full items-center gap-3 rounded-xl border border-[#1A2540] bg-[#0D1525] px-4 py-3 transition-colors hover:border-[#2A3A54] focus:outline-none"
                            onClick={() => {
                              setFromOpen((o) => !o);
                              setToOpen(false);
                            }}
                          >
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#1E3A5F]">
                              <Building2 size={16} className="text-[#3B82F6]" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm leading-tight font-semibold text-white">
                                {fromAccount.institution ?? fromAccount.name}
                              </p>
                              <p className="mt-0.5 text-xs text-[#4A5A75]">
                                Available balance&nbsp;{formatCurrency(fromAccount.balance)}
                              </p>
                            </div>
                            <ChevronDown size={15} className="flex-shrink-0 text-[#4A5A75]" />
                          </button>
                          {fromOpen && (
                            <div className="absolute top-full left-0 z-30 mt-1 w-full overflow-hidden rounded-xl border border-[#1A2640] bg-[#0D1B2E] py-1.5 shadow-xl">
                              {mockAccounts
                                .filter((a) => a.id !== toAccountId)
                                .map((acc) => (
                                  <button
                                    key={acc.id}
                                    onClick={() => {
                                      setFromAccountId(acc.id);
                                      setFromOpen(false);
                                    }}
                                    className={cn(
                                      "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                      fromAccountId === acc.id
                                        ? "bg-[#1D4ED8]/15 text-white"
                                        : "text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white",
                                    )}
                                  >
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1E3A5F]">
                                      <Building2 size={14} className="text-[#3B82F6]" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm text-white">
                                        {acc.institution ?? acc.name}
                                      </p>
                                      <p className="text-xs text-[#5A6A85]">
                                        {formatCurrency(acc.balance)}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* To Account */}
                      <div>
                        <label className={fieldLabel}>To Account</label>
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="flex w-full items-center gap-3 rounded-xl border border-[#1A2540] bg-[#0D1525] px-4 py-3 transition-colors hover:border-[#2A3A54] focus:outline-none"
                            onClick={() => {
                              setToOpen((o) => !o);
                              setFromOpen(false);
                            }}
                          >
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#2A1A4A]">
                              <Building2 size={16} className="text-[#7C3AED]" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm leading-tight font-semibold text-white">
                                {toAccount.institution ?? toAccount.name}
                              </p>
                              <p className="mt-0.5 text-xs text-[#4A5A75]">
                                Available balance&nbsp;{formatCurrency(toAccount.balance)}
                              </p>
                            </div>
                            <ChevronDown size={15} className="flex-shrink-0 text-[#4A5A75]" />
                          </button>
                          {toOpen && (
                            <div className="absolute top-full left-0 z-30 mt-1 w-full overflow-hidden rounded-xl border border-[#1A2640] bg-[#0D1B2E] py-1.5 shadow-xl">
                              {mockAccounts
                                .filter((a) => a.id !== fromAccountId)
                                .map((acc) => (
                                  <button
                                    key={acc.id}
                                    onClick={() => {
                                      setToAccountId(acc.id);
                                      setToOpen(false);
                                    }}
                                    className={cn(
                                      "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                      toAccountId === acc.id
                                        ? "bg-[#1D4ED8]/15 text-white"
                                        : "text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white",
                                    )}
                                  >
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#2A1A4A]">
                                      <Building2 size={14} className="text-[#7C3AED]" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm text-white">
                                        {acc.institution ?? acc.name}
                                      </p>
                                      <p className="text-xs text-[#5A6A85]">
                                        {formatCurrency(acc.balance)}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Transfer Flow */}
                      <div className="flex items-center gap-3 rounded-xl border border-[#1A2540] bg-[#0D1525] px-4 py-3">
                        <div className="flex flex-shrink-0 items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E3A5F]">
                            <Building2 size={16} className="text-[#3B82F6]" />
                          </div>
                          <div>
                            <p className="text-sm leading-tight font-semibold text-white">
                              {fromAccount.institution ?? fromAccount.name}
                            </p>
                            <p className="text-xs text-[#4A5A75] tabular-nums">
                              {formatCurrency(fromAccount.balance)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-1 items-center">
                          <div className="flex-1 border-t-2 border-dashed border-[#1A2540]" />
                          <div className="mx-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] shadow-[0_0_12px_rgba(29,78,216,0.45)]">
                            <ArrowRight size={13} className="text-white" />
                          </div>
                          <div className="flex-1 border-t-2 border-dashed border-[#1A2540]" />
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2A1A4A]">
                            <Building2 size={16} className="text-[#7C3AED]" />
                          </div>
                          <div>
                            <p className="text-sm leading-tight font-semibold text-white">
                              {toAccount.institution ?? toAccount.name}
                            </p>
                            <p className="text-xs text-[#4A5A75] tabular-nums">
                              {formatCurrency(toAccount.balance)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className={fieldLabel}>Amount</label>
                        <div className="relative flex items-center rounded-xl border border-[#1A2540] bg-[#0D1525] px-5 py-4 transition-all focus-within:border-[#1D4ED8] focus-within:ring-2 focus-within:ring-[#1D4ED8]/40">
                          <span className="mr-4 flex-shrink-0 text-2xl text-[#4A5A75]">₹</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={handleAmountChange}
                            placeholder="0.00"
                            className="flex-1 bg-transparent text-right text-[2.4rem] leading-none font-bold text-white tabular-nums focus:outline-none"
                            aria-label="Amount"
                          />
                        </div>
                        {wordsLabel && (
                          <p className="mt-1.5 px-1 text-xs text-[#4A5A75] capitalize italic">
                            {wordsLabel}
                          </p>
                        )}
                      </div>

                      {/* Date + Memo */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={fieldLabel}>Date</label>
                          <button className="flex w-full items-center gap-2.5 rounded-xl border border-[#1A2540] bg-[#0D1525] px-4 py-2.5 text-sm transition-colors hover:border-[#2A3A54] focus:outline-none">
                            <CalendarDays size={14} className="flex-shrink-0 text-[#4A5A75]" />
                            <span className="flex-1 text-left text-white">{date}</span>
                            <ChevronDown size={13} className="flex-shrink-0 text-[#4A5A75]" />
                          </button>
                        </div>
                        <div>
                          <label className={fieldLabel}>
                            Memo <span className="font-normal text-[#2A3A54]">(optional)</span>
                          </label>
                          <div className="relative">
                            <textarea
                              value={memo}
                              onChange={(e) => setMemo(e.target.value.slice(0, 200))}
                              placeholder="Monthly savings transfer"
                              rows={3}
                              className={cn(inputCls, "resize-none")}
                              aria-label="Memo"
                            />
                            <span className="absolute right-3 bottom-2.5 text-[10px] text-[#2A3A54] tabular-nums">
                              {memo.length} / 200
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* ── Expense / Income form ── */
                    <>
                      {/* Account selector */}
                      <div>
                        <label className={fieldLabel}>Account</label>
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="flex w-full items-center gap-3 rounded-xl border border-[#1A2540] bg-[#0D1525] px-4 py-3 transition-colors hover:border-[#2A3A54] focus:outline-none"
                            onClick={() => {
                              setAccountOpen((o) => !o);
                              setEnvelopeOpen(false);
                            }}
                          >
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#1E2B42]">
                              <Building2 size={16} className="text-[#7A8BA8]" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm leading-tight font-semibold text-white">
                                {selectedAccount.institution ?? selectedAccount.name}
                              </p>
                              <p className="mt-0.5 text-xs text-[#4A5A75]">
                                Available balance&nbsp;{formatCurrency(selectedAccount.balance)}
                              </p>
                            </div>
                            <ChevronDown size={15} className="flex-shrink-0 text-[#4A5A75]" />
                          </button>
                          {accountOpen && (
                            <div className="absolute top-full left-0 z-30 mt-1 w-full overflow-hidden rounded-xl border border-[#1A2640] bg-[#0D1B2E] py-1.5 shadow-xl">
                              {mockAccounts.map((acc) => (
                                <button
                                  key={acc.id}
                                  onClick={() => {
                                    setSelectedAccount(acc);
                                    setAccountOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                    selectedAccount.id === acc.id
                                      ? "bg-[#6C3AED]/15 text-white"
                                      : "text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white",
                                  )}
                                >
                                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1E2B42]">
                                    <Building2 size={14} className="text-[#7A8BA8]" />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm text-white">
                                      {acc.institution ?? acc.name}
                                    </p>
                                    <p className="text-xs text-[#5A6A85] capitalize">
                                      {acc.type} · {formatCurrency(acc.balance)}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payee */}
                      <div>
                        <label className={fieldLabel}>
                          {isIncome ? "Income Source / Payee" : "Payee"}
                        </label>
                        <div className="relative">
                          <Search
                            size={14}
                            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#4A5A75]"
                          />
                          <input
                            value={payee}
                            onChange={(e) => setPayee(e.target.value)}
                            placeholder={
                              isIncome ? "Employer, client, refund source..." : "BigBasket"
                            }
                            className="w-full rounded-xl border border-[#1A2540] bg-[#0D1525] py-2.5 pr-9 pl-10 text-sm text-white transition-all placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none"
                          />
                          {payee && (
                            <button
                              onClick={() => setPayee("")}
                              className="absolute top-1/2 right-3 -translate-y-1/2 text-[#4A5A75] transition-colors hover:text-white"
                              aria-label="Clear"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category / Envelope — expense only */}
                      {isExpense && (
                        <div>
                          <label className={fieldLabel}>Category / Envelope</label>
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="flex w-full items-center gap-3 rounded-xl border border-[#1A2540] bg-[#0D1525] px-4 py-3 transition-colors hover:border-[#2A3A54] focus:outline-none"
                              onClick={() => {
                                setEnvelopeOpen((o) => !o);
                                setAccountOpen(false);
                              }}
                            >
                              <div
                                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base"
                                style={{ background: `${selectedEnvelope.color}30` }}
                              >
                                {selectedEnvelope.icon}
                              </div>
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-semibold text-white">
                                    {selectedEnvelope.name}
                                  </span>
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                                </div>
                                <p className="mt-0.5 text-xs text-[#4A5A75]">Monthly Budget</p>
                              </div>
                              <ChevronDown size={15} className="flex-shrink-0 text-[#4A5A75]" />
                            </button>
                            {envelopeOpen && (
                              <div className="absolute top-full left-0 z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#1A2640] bg-[#0D1B2E] py-1.5 shadow-xl">
                                {mockEnvelopes.map((env) => (
                                  <button
                                    key={env.id}
                                    onClick={() => {
                                      setSelectedEnvelope(env);
                                      setEnvelopeOpen(false);
                                    }}
                                    className={cn(
                                      "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                      selectedEnvelope.id === env.id
                                        ? "bg-[#6C3AED]/15 text-white"
                                        : "text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white",
                                    )}
                                  >
                                    <div
                                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-sm"
                                      style={{ background: `${env.color}30` }}
                                    >
                                      {env.icon}
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm text-white">{env.name}</p>
                                      <p className="text-xs text-[#5A6A85]">
                                        Available: {formatCurrency(env.available)}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Amount — large display */}
                      <div>
                        <label className={fieldLabel}>Amount</label>
                        <div className="flex items-center rounded-xl border border-[#1A2540] bg-[#0D1525] px-5 py-4 transition-all focus-within:border-[#6C3AED] focus-within:ring-2 focus-within:ring-[#6C3AED]/40">
                          <span className="mr-4 flex-shrink-0 text-2xl text-[#4A5A75]">₹</span>
                          <div className="flex flex-1 items-baseline justify-end">
                            {displayInt || displayDec ? (
                              <>
                                <span className="text-[2.6rem] leading-none font-bold text-white tabular-nums">
                                  {displayInt || "0"}
                                </span>
                                <span className="text-[2.6rem] leading-none font-bold text-white tabular-nums">
                                  .{displayDec || "00"}
                                </span>
                              </>
                            ) : (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={handleAmountChange}
                                placeholder="0.00"
                                className="flex-1 bg-transparent text-right text-[2.6rem] leading-none font-bold text-white tabular-nums placeholder:text-[#1E2B42] focus:outline-none"
                                aria-label="Amount"
                              />
                            )}
                            {/* hidden real input for editing when value present */}
                            {(displayInt || displayDec) && (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={handleAmountChange}
                                className="pointer-events-none absolute h-0 w-0 opacity-0"
                                aria-hidden="true"
                                tabIndex={-1}
                              />
                            )}
                          </div>
                        </div>
                        {wordsLabel && (
                          <p className="mt-1.5 px-1 text-xs leading-relaxed text-[#4A5A75] capitalize italic">
                            {wordsLabel}
                          </p>
                        )}
                      </div>

                      {/* Date + Memo — side by side */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={fieldLabel}>Date</label>
                          <button className="flex w-full items-center gap-2.5 rounded-xl border border-[#1A2540] bg-[#0D1525] px-4 py-2.5 text-sm transition-colors hover:border-[#2A3A54] focus:outline-none">
                            <CalendarDays size={14} className="flex-shrink-0 text-[#4A5A75]" />
                            <span className="flex-1 text-left text-white">{date}</span>
                            <ChevronDown size={13} className="flex-shrink-0 text-[#4A5A75]" />
                          </button>
                        </div>
                        <div>
                          <label className={fieldLabel}>
                            Memo <span className="font-normal text-[#2A3A54]">(optional)</span>
                          </label>
                          <div className="relative">
                            <textarea
                              value={memo}
                              onChange={(e) => setMemo(e.target.value.slice(0, 200))}
                              placeholder={
                                isIncome ? "Salary for May 2026..." : "Weekly grocery shopping"
                              }
                              rows={3}
                              className={cn(inputCls, "resize-none text-sm")}
                              aria-label="Memo"
                            />
                            <span className="absolute right-3 bottom-2.5 text-[10px] text-[#2A3A54] tabular-nums">
                              {memo.length} / 200
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Income notice */}
                      {isIncome && (
                        <div className="flex gap-2.5 rounded-xl border border-[#1A2540] bg-[#0D1525] px-4 py-3">
                          <Info size={13} className="mt-0.5 flex-shrink-0 text-amber-400" />
                          <p className="text-sm leading-relaxed text-[#A8B4CC]">
                            This income will be added to{" "}
                            <span className="font-semibold text-[#4ADE80]">To Be Budgeted</span>
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* RIGHT COLUMN */}

                {/* ── Transfer Summary ── */}
                {isTransfer && (
                  <div className="w-[272px] flex-shrink-0">
                    <div className="space-y-3 rounded-xl border border-[#1A2540] bg-[#0D1525] p-4">
                      <h4 className="text-sm font-bold text-white">Transfer Summary</h4>

                      <div className="rounded-xl border border-[#1A2540] bg-[#0B1120] p-3.5">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#1E3A5F]">
                            <Building2 size={13} className="text-[#3B82F6]" />
                          </div>
                          <span className="truncate text-sm font-semibold text-white">
                            {fromAccount.institution ?? fromAccount.name}
                          </span>
                        </div>
                        <dl className="space-y-1.5">
                          <SummaryRow
                            label="Current Balance"
                            value={formatCurrency(fromAccount.balance)}
                          />
                          <SummaryRow
                            label="After Transfer"
                            value={formatCurrency(fromAfter)}
                            animate
                          />
                          <div className="border-t border-[#1A2540] pt-1.5">
                            <SummaryRow
                              label="Change"
                              value={numericAmount > 0 ? `-${formatCurrency(numericAmount)}` : "—"}
                              color="red"
                              animate
                            />
                          </div>
                        </dl>
                      </div>

                      <div className="flex justify-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2A4A6A] bg-[#1E3A5F] shadow-[0_0_10px_rgba(29,78,216,0.3)]">
                          <ArrowDown size={14} className="text-[#3B82F6]" />
                        </div>
                      </div>

                      <div className="rounded-xl border border-[#1A2540] bg-[#0B1120] p-3.5">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#2A1A4A]">
                            <Building2 size={13} className="text-[#7C3AED]" />
                          </div>
                          <span className="truncate text-sm font-semibold text-white">
                            {toAccount.institution ?? toAccount.name}
                          </span>
                        </div>
                        <dl className="space-y-1.5">
                          <SummaryRow
                            label="Current Balance"
                            value={formatCurrency(toAccount.balance)}
                          />
                          <SummaryRow
                            label="After Transfer"
                            value={formatCurrency(toAfter)}
                            animate
                          />
                          <div className="border-t border-[#1A2540] pt-1.5">
                            <SummaryRow
                              label="Change"
                              value={numericAmount > 0 ? `+${formatCurrency(numericAmount)}` : "—"}
                              color="green"
                              animate
                            />
                          </div>
                        </dl>
                      </div>

                      <div className="flex gap-2 rounded-xl border border-[#1A2540] bg-[#0B1120] px-3 py-2.5">
                        <Info size={13} className="mt-0.5 flex-shrink-0 text-[#3B82F6]" />
                        <p className="text-xs leading-relaxed text-[#A8B4CC]">
                          Transfers do not affect budget categories.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Expense / Income Summary ── */}
                {!isTransfer && (
                  <div className="w-[272px] flex-shrink-0">
                    {isIncome ? (
                      /* Income summary */
                      <div className="space-y-3 rounded-xl border border-[#1A2540] bg-[#0D1525] p-4">
                        <h4 className="text-sm font-bold text-white">Income Summary</h4>

                        <div className="rounded-xl border border-[#1A2540] bg-[#0B1120] p-3.5">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#1E2B42]">
                              <Building2 size={13} className="text-[#7A8BA8]" />
                            </div>
                            <span className="truncate text-sm font-semibold text-white">
                              {selectedAccount.institution ?? selectedAccount.name}
                            </span>
                          </div>
                          <dl className="space-y-1.5">
                            <SummaryRow
                              label="Current Balance"
                              value={formatCurrency(selectedAccount.balance)}
                            />
                            <SummaryRow
                              label="After Income"
                              value={formatCurrency(acctAfterIncome)}
                              animate
                            />
                            <div className="flex items-center justify-between border-t border-[#1A2540] pt-1.5">
                              <div className="flex items-center gap-1.5">
                                <TrendingUp size={11} className="text-[#4ADE80]" />
                                <span className="text-xs text-[#4A5A75]">To Be Budgeted</span>
                              </div>
                              <motion.span
                                key={numericAmount}
                                initial={{ opacity: 0.6, y: -2 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className="text-xs font-semibold text-[#4ADE80] tabular-nums"
                              >
                                {numericAmount > 0 ? `+${formatCurrency(numericAmount)}` : "—"}
                              </motion.span>
                            </div>
                          </dl>
                        </div>

                        <div className="flex gap-2 rounded-xl border border-[#1A2540] bg-[#0B1120] px-3 py-2.5">
                          <Info size={13} className="mt-0.5 flex-shrink-0 text-amber-400" />
                          <p className="text-xs leading-relaxed text-[#A8B4CC]">
                            Income increases your To Be Budgeted balance.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Expense summary — matches reference exactly */
                      <div className="space-y-3 rounded-xl border border-[#1A2540] bg-[#0D1525] p-4">
                        <h4 className="text-sm font-bold text-white">Transaction Summary</h4>

                        {/* Category block */}
                        <div className="rounded-xl border border-[#1A2540] bg-[#0B1120] p-3.5">
                          {/* Category header */}
                          <div className="mb-3 flex items-center gap-2.5">
                            <div
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-base"
                              style={{ background: `${selectedEnvelope.color}30` }}
                            >
                              {selectedEnvelope.icon}
                            </div>
                            <div>
                              <p className="text-sm leading-tight font-semibold text-white">
                                Category: {selectedEnvelope.name}
                              </p>
                              <p className="text-xs text-[#4A5A75]">Monthly Budget</p>
                            </div>
                          </div>

                          {/* Category rows */}
                          <dl className="space-y-2">
                            <div className="flex items-center justify-between">
                              <dt className="text-xs text-[#4A5A75]">Monthly Budget</dt>
                              <dd className="text-xs font-semibold text-white tabular-nums">
                                {formatCurrency(selectedEnvelope.monthlyBudget)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-xs text-[#4A5A75]">Available before</dt>
                              <dd className="text-xs font-semibold text-white tabular-nums">
                                {formatCurrency(availableBefore)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-xs text-[#4A5A75]">This expense</dt>
                              <motion.dd
                                key={numericAmount + "exp"}
                                initial={{ opacity: 0.6, y: -2 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className="text-xs font-semibold text-[#F87171] tabular-nums"
                              >
                                {numericAmount > 0 ? `−${formatCurrency(numericAmount)}` : "—"}
                              </motion.dd>
                            </div>

                            {/* Dashed separator */}
                            <div className="my-1 border-t border-dashed border-[#1A2540]" />

                            <div className="flex items-center justify-between">
                              <dt className="text-xs text-[#4A5A75]">Available after</dt>
                              <motion.dd
                                key={availableAfter}
                                initial={{ opacity: 0.6, y: -2 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className={cn(
                                  "text-sm font-bold tabular-nums",
                                  availableAfter < 0 ? "text-[#F87171]" : "text-[#4ADE80]",
                                )}
                              >
                                {formatCurrency(availableAfter)}
                              </motion.dd>
                            </div>
                          </dl>
                        </div>

                        {/* Account block */}
                        <div className="rounded-xl border border-[#1A2540] bg-[#0B1120] p-3.5">
                          <div className="mb-3 flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#1E2B42]">
                              <Building2 size={14} className="text-[#7A8BA8]" />
                            </div>
                            <p className="text-sm leading-tight font-semibold text-white">
                              Account: {selectedAccount.institution ?? selectedAccount.name}
                            </p>
                          </div>
                          <dl className="space-y-2">
                            <div className="flex items-center justify-between">
                              <dt className="text-xs text-[#4A5A75]">Current balance</dt>
                              <dd className="text-xs font-semibold text-white tabular-nums">
                                {formatCurrency(selectedAccount.balance)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-xs text-[#4A5A75]">After this expense</dt>
                              <motion.dd
                                key={acctAfterExpense}
                                initial={{ opacity: 0.6, y: -2 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className="text-xs font-semibold text-white tabular-nums"
                              >
                                {formatCurrency(acctAfterExpense)}
                              </motion.dd>
                            </div>
                          </dl>
                        </div>

                        {/* Info notice */}
                        <div className="flex gap-2 rounded-xl border border-[#1A2540] bg-[#0B1120] px-3 py-2.5">
                          <Info size={13} className="mt-0.5 flex-shrink-0 text-[#6C3AED]" />
                          <p className="text-xs leading-relaxed text-[#A8B4CC]">
                            This expense will be deducted from your selected category.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Footer ──────────────────────────────── */}
              <div className="mt-5 flex items-center justify-between border-t border-[#111B2D] px-6 py-4">
                {/* Keyboard hint */}
                <div className="flex items-center gap-2 text-xs text-[#4A5A75]">
                  <span>Press Enter to save</span>
                  <kbd className="inline-flex items-center rounded-md border border-[#1A2540] bg-[#0D1525] px-2 py-0.5 font-mono text-xs text-[#7A8BA8] shadow-sm">
                    Enter
                  </kbd>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="rounded-xl border border-[#1A2540] bg-transparent px-6 py-2.5 text-sm font-semibold text-[#A8B4CC] transition-all hover:bg-[#0D1525] hover:text-white focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all focus:ring-4 focus:outline-none",
                      isTransfer
                        ? "bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] shadow-[0_0_20px_rgba(29,78,216,0.4)] hover:from-[#2563EB] hover:to-[#3B82F6] hover:shadow-[0_0_28px_rgba(29,78,216,0.55)] focus:ring-[#1D4ED8]/30"
                        : "bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] shadow-[0_0_20px_rgba(108,58,237,0.4)] hover:from-[#6C3AED] hover:to-[#7C4AFF] hover:shadow-[0_0_28px_rgba(108,58,237,0.55)] focus:ring-[#6C3AED]/30",
                    )}
                  >
                    <Save size={15} />
                    {isIncome ? "Save Income" : isExpense ? "Save Transaction" : "Save Transfer"}
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

/* ── SummaryRow helper ────────────────────────────────────── */

function SummaryRow({
  label,
  value,
  color,
  animate: shouldAnimate,
}: {
  label: string;
  value: string;
  color?: "red" | "green";
  animate?: boolean;
}) {
  const textCls =
    color === "red" ? "text-[#F87171]" : color === "green" ? "text-[#4ADE80]" : "text-white";

  const content = <dd className={cn("text-xs font-semibold tabular-nums", textCls)}>{value}</dd>;

  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-[#4A5A75]">{label}</dt>
      {shouldAnimate ? (
        <motion.div
          key={value}
          initial={{ opacity: 0.6, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {content}
        </motion.div>
      ) : (
        content
      )}
    </div>
  );
}
