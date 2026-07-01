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

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
  Landmark,
  ChevronDown,
  Plus,
  Archive,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { Account, AccountType } from "@/types";

interface Props {
  accounts: Account[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const TYPE_META: Record<AccountType, { icon: React.ReactNode; color: string; bg: string }> = {
  checking: { icon: <Building2 size={14} />, color: "#3B82F6", bg: "rgba(59,130,246,0.15)" },
  savings: { icon: <PiggyBank size={14} />, color: "#22C55E", bg: "rgba(34,197,94,0.15)" },
  credit: { icon: <CreditCard size={14} />, color: "#F87171", bg: "rgba(239,68,68,0.15)" },
  cash: { icon: <Wallet size={14} />, color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
  investment: { icon: <TrendingUp size={14} />, color: "#8B5CF6", bg: "rgba(139,92,246,0.15)" },
  loan: { icon: <Landmark size={14} />, color: "#EC4899", bg: "rgba(236,72,153,0.15)" },
};

const GROUPS: { label: string; types: AccountType[] }[] = [
  { label: "Cash & Checking", types: ["checking", "cash"] },
  { label: "Savings", types: ["savings"] },
  { label: "Credit Cards", types: ["credit"] },
  { label: "Loans", types: ["loan"] },
  { label: "Investments", types: ["investment"] },
];

function AccountRow({
  account,
  selected,
  onSelect,
}: {
  account: Account;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = TYPE_META[account.type];
  const negative = account.balance < 0;
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all",
        selected
          ? "border border-[rgba(108,58,237,0.35)] bg-[rgba(108,58,237,0.12)] shadow-[0_0_12px_rgba(108,58,237,0.15)]"
          : "border border-transparent hover:border-[#1A2540] hover:bg-[#0D1525]",
      )}
    >
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: meta.bg, color: meta.color }}
      >
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className={cn(
              "truncate text-xs font-semibold",
              selected ? "text-[#C4B5FD]" : "text-[#D1D9E8] group-hover:text-white",
            )}
          >
            {account.name}
          </p>
          {account.archived && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-[#252F45] bg-[#1A2540] px-1.5 py-0.5 text-[9px] font-semibold text-[#5A6A85]">
              <Archive size={8} />
              Archived
            </span>
          )}
        </div>
        {account.institution && (
          <p className="truncate text-[10px] text-[#5A6A85]">{account.institution}</p>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            negative ? "text-[#F87171]" : "text-[#D1D9E8]",
          )}
        >
          {formatCurrency(account.balance)}
        </span>
        <span
          className={cn(
            "h-1.5 w-1.5 flex-shrink-0 rounded-full",
            negative ? "bg-[#EF4444]" : "bg-[#22C55E]",
          )}
        />
      </div>
    </button>
  );
}

function AccountGroup({
  label,
  accounts,
  selectedId,
  onSelect,
  archived,
}: {
  label: string;
  accounts: Account[];
  selectedId: string;
  onSelect: (id: string) => void;
  archived?: boolean;
}) {
  const [open, setOpen] = useState(true);
  if (accounts.length === 0) return null;
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center justify-between px-1 py-1.5"
      >
        <span
          className={cn(
            "text-[10px] font-bold tracking-widest uppercase transition-colors",
            archived ? "text-[#3A4A60]" : "text-[#5A6A85]",
          )}
        >
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-[#1A2540] bg-[#0D1525] px-1.5 py-0.5 text-[10px] font-semibold text-[#5A6A85]">
            {accounts.length}
          </span>
          <ChevronDown
            size={12}
            className={cn("text-[#5A6A85] transition-transform", open ? "" : "-rotate-90")}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-0.5 overflow-hidden"
          >
            {accounts.map((acc) => (
              <AccountRow
                key={acc.id}
                account={acc}
                selected={acc.id === selectedId}
                onSelect={() => onSelect(acc.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AccountNavPanel({ accounts, selectedId, onSelect }: Props) {
  const activeAccounts = accounts.filter((a) => !a.archived);
  const archivedAccounts = accounts.filter((a) => a.archived);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120]">
      <div className="border-b border-[#1A2540] px-4 pt-4 pb-3">
        <h3 className="text-sm font-bold text-white">Accounts</h3>
        <p className="mt-0.5 text-xs text-[#5A6A85]">
          {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {GROUPS.map(({ label, types }) => {
          const groupAccounts = activeAccounts.filter((a) => types.includes(a.type));
          return (
            <AccountGroup
              key={label}
              label={label}
              accounts={groupAccounts}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          );
        })}

        {archivedAccounts.length > 0 && (
          <AccountGroup
            label="Archived"
            accounts={archivedAccounts}
            selectedId={selectedId}
            onSelect={onSelect}
            archived
          />
        )}

        {accounts.length === 0 && (
          <div className="px-2 py-8 text-center">
            <p className="text-xs text-[#3A4A60]">No accounts to display</p>
          </div>
        )}
      </div>

      <div className="border-t border-[#1A2540] p-3">
        <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(108,58,237,0.4)] px-3 py-2.5 text-xs font-semibold text-[#7C3AED] transition-all hover:border-[rgba(108,58,237,0.6)] hover:bg-[rgba(108,58,237,0.08)] hover:shadow-[0_0_12px_rgba(108,58,237,0.15)]">
          <Plus size={13} />
          Create New Account
        </button>
      </div>
    </div>
  );
}
