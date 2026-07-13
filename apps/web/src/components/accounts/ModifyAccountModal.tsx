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
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Building2,
  PiggyBank,
  CreditCard,
  Wallet,
  Landmark,
  ChevronDown,
  Info,
  RefreshCw,
  Archive,
  CalendarDays,
  Lock,
  Timer,
} from "lucide-react";
import { useAccounts } from "@/hooks/use-accounts";
import { patchAccount } from "@/lib/api/accounts";
import { invalidateBudgetData } from "@/lib/query-keys";
import { formatCurrency, formatRelativeDate, cn } from "@/lib/utils";
import type { AccountType } from "@/types";

/* ── types ────────────────────────────────────────────── */

export interface ModifyAccountModalProps {
  open: boolean;
  onClose: () => void;
  accountId: number;
  budgetId: number;
}

/* ── constants ────────────────────────────────────────── */

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: React.ElementType }[] = [
  { type: "checking", label: "Checking", icon: Building2 },
  { type: "savings", label: "Savings", icon: PiggyBank },
  { type: "credit", label: "Credit Card", icon: CreditCard },
  { type: "cash", label: "Cash", icon: Wallet },
  { type: "loan", label: "Loan", icon: Landmark },
];

const TYPE_META: Record<AccountType, { icon: React.ElementType; color: string; bg: string }> = {
  checking: { icon: Building2, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  savings: { icon: PiggyBank, color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  credit: { icon: CreditCard, color: "#F87171", bg: "rgba(248,113,113,0.12)" },
  cash: { icon: Wallet, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  loan: { icon: Landmark, color: "#EC4899", bg: "rgba(236,72,153,0.12)" },
};

/* ── sub-components ───────────────────────────────────── */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-200 focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none",
        checked
          ? "bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] shadow-[0_0_12px_rgba(108,58,237,0.5)]"
          : "bg-[#1A2540]",
      )}
    >
      <span
        className="inline-block rounded-full bg-white shadow transition-transform duration-200"
        style={{
          width: 18,
          height: 18,
          transform: checked ? "translateX(22px)" : "translateX(3px)",
        }}
      />
    </button>
  );
}

function AccountAvatar({ type: _type }: { type: AccountType }) {
  return (
    <div className="flex-shrink-0">
      <div
        className="flex h-[110px] w-[110px] items-center justify-center rounded-full"
        style={{
          background: "linear-gradient(145deg, #1E4A8A 0%, #1A3A7A 40%, #0F2255 100%)",
          border: "3px solid rgba(59,130,246,0.3)",
          boxShadow:
            "0 0 32px rgba(59,130,246,0.28), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <Building2
          size={44}
          strokeWidth={1.4}
          style={{ color: "#DBEAFE", filter: "drop-shadow(0 2px 6px rgba(59,130,246,0.5))" }}
        />
      </div>
    </div>
  );
}

function BalanceSummaryCard({
  currentBalance,
  clearedBalance,
  lastReconciled,
}: {
  currentBalance: number;
  clearedBalance: number;
  lastReconciled: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, rgba(108,58,237,0.07) 0%, rgba(11,17,32,0.98) 100%)",
        border: "1px solid rgba(108,58,237,0.32)",
        boxShadow: "0 0 24px rgba(108,58,237,0.1), inset 0 1px 0 rgba(108,58,237,0.1)",
      }}
    >
      {/* 3-column stats */}
      <div className="grid grid-cols-3 divide-x divide-[#1A2540]">
        {/* Current Balance */}
        <div className="px-5 py-4">
          <p className="mb-1.5 text-xs font-medium text-[#5A6A85]">Current Balance</p>
          <p
            className={cn(
              "text-xl leading-tight font-bold tabular-nums",
              currentBalance >= 0 ? "text-white" : "text-[#F87171]",
            )}
          >
            {currentBalance < 0 ? "−" : ""}
            {formatCurrency(Math.abs(currentBalance))}
          </p>
        </div>

        {/* Cleared Balance */}
        <div className="px-5 py-4">
          <p className="mb-1.5 text-xs font-medium text-[#5A6A85]">Cleared Balance</p>
          <p
            className={cn(
              "text-xl leading-tight font-bold tabular-nums",
              clearedBalance >= 0 ? "text-white" : "text-[#F87171]",
            )}
          >
            {clearedBalance < 0 ? "−" : ""}
            {formatCurrency(Math.abs(clearedBalance))}
          </p>
        </div>

        {/* Last Reconciled */}
        <div className="flex items-start justify-between px-5 py-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-[#5A6A85]">Last Reconciled</p>
            <p className="text-xl leading-tight font-bold text-white">{lastReconciled}</p>
          </div>
          <CalendarDays size={18} className="mt-1 flex-shrink-0 text-[#3D4E6A]" />
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-2.5 border-t border-[#1A2540] px-5 py-3">
        <Info size={13} className="flex-shrink-0 text-[#4A5A75]" />
        <p className="text-xs leading-relaxed text-[#4A5A75]">
          Balances are calculated from transactions and cannot be edited directly.
        </p>
      </div>
    </div>
  );
}

function AccountSettingsRow({
  reconciliation,
  setReconciliation,
}: {
  reconciliation: boolean;
  setReconciliation: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#1E2B42] bg-[#0D1525] px-4 py-4 transition-colors hover:border-[#2A3A54]">
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: "rgba(108,58,237,0.15)", color: "#8B5CF6" }}
      >
        <RefreshCw size={18} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-tight font-semibold text-white">
          Enable reconciliation workflow
        </p>
        <p className="mt-0.5 text-xs text-[#7A8BA8]">
          Track cleared balances and reconcile statements.
        </p>
      </div>
      <ToggleSwitch checked={reconciliation} onChange={setReconciliation} />
    </div>
  );
}

function ArchiveAccountCard({ onArchive }: { onArchive: () => void }) {
  return (
    <div
      className="flex items-center gap-4 rounded-xl px-5 py-4"
      style={{
        background: "linear-gradient(135deg, rgba(180,83,9,0.12) 0%, rgba(11,17,32,0.95) 100%)",
        border: "1px solid rgba(217,119,6,0.3)",
        boxShadow: "0 0 20px rgba(180,83,9,0.08), inset 0 1px 0 rgba(245,158,11,0.06)",
      }}
    >
      {/* Icon */}
      <div
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
        style={{
          background: "rgba(217,119,6,0.15)",
          border: "1px solid rgba(217,119,6,0.25)",
          boxShadow: "0 0 14px rgba(180,83,9,0.2)",
        }}
      >
        <Archive size={20} strokeWidth={1.8} className="text-amber-500" />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-tight font-semibold text-white">Archive Account</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#7A6A4A]">
          Archived accounts remain in reports and historical transactions but can no longer accept
          new transactions.
        </p>
      </div>

      {/* Button */}
      <button
        onClick={onArchive}
        className="flex-shrink-0 rounded-lg border border-amber-700/60 px-4 py-2 text-sm font-semibold text-amber-500 transition-all hover:border-amber-500/80 hover:bg-amber-500/10 focus:outline-none"
      >
        Archive Account
      </button>
    </div>
  );
}

/* ── main modal ───────────────────────────────────────── */

export function ModifyAccountModal({
  open,
  onClose,
  accountId,
  budgetId,
}: ModifyAccountModalProps) {
  const queryClient = useQueryClient();
  const { data: accounts } = useAccounts(budgetId);
  const account = accounts.find((a) => a.id === accountId);

  const [accountName, setAccountName] = useState(account?.name ?? "");
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? "");
  const [institution, setInstitution] = useState(account?.institution ?? "");
  const [accountType, setAccountType] = useState<AccountType>(account?.type ?? "checking");
  const [typeOpen, setTypeOpen] = useState(false);
  const [includeInBudget, setIncludeInBudget] = useState(account?.isOnBudget ?? true);
  const [reconciliation, setReconciliation] = useState(account?.requiresRecon ?? true);
  const [lockTransactions, setLockTransactions] = useState(account?.isImmutable ?? false);
  const [notes, setNotes] = useState(account?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* reset form whenever the modal opens with a new account */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open && account) {
      setAccountName(account.name);
      setAccountNumber(account.accountNumber ?? "");
      setInstitution(account.institution ?? "");
      setAccountType(account.type);
      setIncludeInBudget(account.isOnBudget);
      setReconciliation(account.requiresRecon);
      setLockTransactions(account.isImmutable);
      setNotes(account.notes ?? "");
      setError(null);
    }
  }, [open, account]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* keyboard + scroll lock */
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

  const handleReset = () => {
    if (!account) return;
    setAccountName(account.name);
    setAccountNumber(account.accountNumber ?? "");
    setInstitution(account.institution ?? "");
    setAccountType(account.type);
    setIncludeInBudget(account.isOnBudget);
    setReconciliation(account.requiresRecon);
    setLockTransactions(account.isImmutable);
    setNotes(account.notes ?? "");
  };

  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    setError(null);
    try {
      await patchAccount(budgetId, accountId, {
        name: accountName,
        requires_recon: reconciliation,
        is_on_budget: includeInBudget,
        is_immutable: lockTransactions,
        notes: notes || null,
        account_number: accountNumber.trim() || null,
        institution: institution.trim() || null,
      });
      invalidateBudgetData(queryClient, budgetId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  };

  const handleArchive = () => {
    // TODO: wire to archive action (PATCH archived: true)
    onClose();
  };

  const TypeIcon = TYPE_META[accountType]?.icon ?? Building2;
  const typeColor = TYPE_META[accountType]?.color ?? "#3B82F6";

  /* derived balance figures */
  const clearedBalance = account?.clearedBalance ?? 0;
  const lastReconciled = account?.lastReconciledAt
    ? formatRelativeDate(account.lastReconciledAt)
    : "Never";

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
              className="relative my-auto w-full max-w-[780px] overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120] shadow-[0_0_0_1px_rgba(108,58,237,0.12),0_32px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(108,58,237,0.08)]"
              onClick={(e) => {
                e.stopPropagation();
                setTypeOpen(false);
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Modify Account"
            >
              {/* Top glow line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6C3AED]/40 to-transparent" />

              {/* ── Header ── */}
              <div className="flex items-start justify-between border-b border-[#111B2D] px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-[1.4rem] leading-tight font-bold text-white">
                    Modify Account
                  </h2>
                  <p className="mt-0.5 text-sm text-[#4A5A75]">
                    Update account details and preferences
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
              <div className="space-y-5 px-6 py-5">
                {/* Top section — avatar + form fields */}
                <div className="flex items-start gap-6">
                  <AccountAvatar type={accountType} />

                  <div className="min-w-0 flex-1 space-y-4">
                    {/* Account Name */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#A8B4CC]">
                        Account Name
                      </label>
                      <input
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="w-full rounded-xl border border-[#1E2B42] bg-[#0D1525] px-3.5 py-2.5 text-sm text-white transition-all placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none"
                      />
                    </div>

                    {/* Account Number */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#A8B4CC]">
                        Account Number{" "}
                        <span className="font-normal text-[#3D4E65]">(optional)</span>
                      </label>
                      <input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g., 1234567890"
                        className="w-full rounded-xl border border-[#1E2B42] bg-[#0D1525] px-3.5 py-2.5 text-sm text-white transition-all placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none"
                      />
                    </div>

                    {/* Institution */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#A8B4CC]">
                        Institution <span className="font-normal text-[#3D4E65]">(optional)</span>
                      </label>
                      <input
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="e.g., HDFC Bank"
                        className="w-full rounded-xl border border-[#1E2B42] bg-[#0D1525] px-3.5 py-2.5 text-sm text-white transition-all placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none"
                      />
                    </div>

                    {/* Account Type */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#A8B4CC]">
                        Account Type
                      </label>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setTypeOpen((o) => !o)}
                          className="flex w-full items-center gap-3 rounded-xl border border-[#1E2B42] bg-[#0D1525] px-3.5 py-2.5 transition-all hover:border-[#2A3A54] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none"
                        >
                          <div
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: TYPE_META[accountType].bg, color: typeColor }}
                          >
                            <TypeIcon size={15} strokeWidth={1.8} />
                          </div>
                          <span className="flex-1 text-left text-sm font-medium text-white">
                            {ACCOUNT_TYPES.find((t) => t.type === accountType)?.label}
                          </span>
                          <ChevronDown
                            size={15}
                            className={cn(
                              "text-[#4A5A75] transition-transform",
                              typeOpen && "rotate-180",
                            )}
                          />
                        </button>

                        {typeOpen && (
                          <div className="absolute top-full left-0 z-30 mt-1 w-full overflow-hidden rounded-xl border border-[#1A2640] bg-[#0D1B2E] py-1.5 shadow-xl">
                            {ACCOUNT_TYPES.map(({ type, label, icon: Icon }) => {
                              const meta = TYPE_META[type];
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    setAccountType(type);
                                    setTypeOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                    accountType === type
                                      ? "bg-[#6C3AED]/12 text-white"
                                      : "text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white",
                                  )}
                                >
                                  <div
                                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                                    style={{ backgroundColor: meta.bg, color: meta.color }}
                                  >
                                    <Icon size={14} strokeWidth={1.8} />
                                  </div>
                                  <span>{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance summary */}
                <BalanceSummaryCard
                  currentBalance={account?.balance ?? 0}
                  clearedBalance={clearedBalance}
                  lastReconciled={lastReconciled}
                />

                {/* Account Settings */}
                <div>
                  <p className="mb-3 text-sm font-bold text-white">Account Settings</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 rounded-xl border border-[#1E2B42] bg-[#0D1525] px-4 py-4 transition-colors hover:border-[#2A3A54]">
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}
                      >
                        <Timer size={18} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-tight font-semibold text-white">
                          Include in budget
                        </p>
                        <p className="mt-0.5 text-xs text-[#7A8BA8]">
                          On-budget accounts affect available cash calculations.
                        </p>
                      </div>
                      <ToggleSwitch checked={includeInBudget} onChange={setIncludeInBudget} />
                    </div>
                    <AccountSettingsRow
                      reconciliation={reconciliation}
                      setReconciliation={setReconciliation}
                    />
                    <div className="flex items-center gap-4 rounded-xl border border-[#1E2B42] bg-[#0D1525] px-4 py-4 transition-colors hover:border-[#2A3A54]">
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: "rgba(236,72,153,0.12)", color: "#EC4899" }}
                      >
                        <Lock size={18} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-tight font-semibold text-white">
                          Lock transactions (Prevent editing)
                        </p>
                        <p className="mt-0.5 text-xs text-[#7A8BA8]">
                          Prevent future edits or deletions to transactions for this account.
                        </p>
                      </div>
                      <ToggleSwitch checked={lockTransactions} onChange={setLockTransactions} />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#A8B4CC]">
                    Notes <span className="font-normal text-[#2A3A54]">(optional)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, 300))}
                      placeholder="Optional notes about this account…"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-[#1E2B42] bg-[#0D1525] px-3.5 py-2.5 text-sm text-white transition-all placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none"
                    />
                    <span className="absolute right-3.5 bottom-2.5 text-[10px] text-[#2A3A54] tabular-nums">
                      {notes.length} / 300
                    </span>
                  </div>
                </div>

                {/* Archive */}
                <ArchiveAccountCard onArchive={handleArchive} />
              </div>

              {/* ── Footer ── */}
              <div className="flex flex-col gap-2 border-t border-[#111B2D] px-6 py-4">
                {error && <p className="text-xs text-[#EF4444]">{error}</p>}
                <div className="flex items-center justify-between">
                  <button
                    onClick={onClose}
                    className="rounded-xl bg-transparent px-5 py-2.5 text-sm font-semibold text-[#A8B4CC] transition-all hover:bg-[#0D1525] hover:text-white focus:outline-none"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleReset}
                      disabled={saving}
                      className="rounded-xl border border-[#1A2540] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#A8B4CC] transition-all hover:bg-[#0D1525] hover:text-white focus:outline-none disabled:opacity-50"
                    >
                      Reset Changes
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(108,58,237,0.4)] transition-all hover:from-[#6C3AED] hover:to-[#7C4AFF] hover:shadow-[0_0_28px_rgba(108,58,237,0.55)] focus:ring-4 focus:ring-[#6C3AED]/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? <RefreshCw size={15} className="animate-spin" /> : null}
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
