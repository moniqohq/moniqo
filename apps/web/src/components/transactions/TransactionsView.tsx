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

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  Upload,
  ChevronDown,
  MoreVertical,
  Search,
  Grid3x3,
  SlidersHorizontal,
  Square,
  CheckSquare,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Building2,
  CreditCard,
  PiggyBank,
  Wallet,
  Landmark,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, formatCurrencyCompact, formatTableDate, cn } from "@/lib/utils";
import { AddTransactionModal } from "./AddTransactionModal";
import { TransactionDetailsModal } from "./TransactionDetailsModal";
import { DeleteTransactionModal } from "./DeleteTransactionModal";
import { EditTransactionModal } from "./EditTransactionModal";
import { DateRangePicker } from "./DateRangePicker";
import type { DateRange } from "./DateRangePicker";
import type { Transaction, AccountType } from "@/types";
import { API_TO_UI, type ApiAccountType } from "@/lib/adapters/account.adapter";
import { useUIStore } from "@/stores/ui.store";
import { useAccounts } from "@/hooks/useAccounts";
import { useEnvelopes } from "@/hooks/useEnvelopes";
import { useTransactions } from "@/hooks/useTransactions";
import { useRunningBalances } from "@/hooks/useRunningBalances";
import { apiFetch } from "@/lib/api";
import type { ApiAccount, ApiEnvelope } from "@/lib/api-types";
import { isFeatureEnabled } from "@/features/feature-flags";

/* ── Sparkline data — populated from API when analytics endpoint is available ── */
const sparkInflow: { v: number }[] = [];
const sparkOutflow: { v: number }[] = [];
const sparkNet: { v: number }[] = [];
const sparkCount: { v: number }[] = [];

/* ── Tooltip shared across sparklines ── */
function SparkTooltip({
  active,
  payload,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey?: string; name?: string }>;
  formatter: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-[#1E2B42] bg-[#131C2E] px-2 py-1 text-[11px] text-white shadow-xl">
      {formatter(payload[0].value)}
    </div>
  );
}

/* ── Type badge — Flowbite: rounded, px-2.5 py-0.5 text-xs font-medium ── */
function TypeBadge({ type }: { type: Transaction["type"] }) {
  if (type === "expense")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(239,68,68,0.12)] px-3 py-1.5 text-xs font-medium whitespace-nowrap text-[#F87171]">
        <ArrowDownLeft size={12} strokeWidth={2.5} />
        Expense
      </span>
    );
  if (type === "income")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(34,197,94,0.12)] px-3 py-1.5 text-xs font-medium whitespace-nowrap text-[#4ADE80]">
        <ArrowUpRight size={12} strokeWidth={2.5} />
        Income
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(99,179,237,0.12)] px-3 py-1.5 text-xs font-medium whitespace-nowrap text-[#7DD3FC]">
      <ArrowLeftRight size={12} strokeWidth={2.5} />
      Transfer
    </span>
  );
}

/* ── Payee avatar ───────────────────────────────────────── */
function PayeeAvatar({ payee, color }: { payee: string; color?: string }) {
  return (
    <div
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white select-none"
      style={{ backgroundColor: color ?? "#1E2B42" }}
    >
      {payee[0]}
    </div>
  );
}

/* ── Envelope chip ──────────────────────────────────────── */
function EnvelopeChip({ name, icon, color }: { name?: string; icon?: string; color?: string }) {
  if (!name) return <span className="text-sm text-[#2A3A54] select-none">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs"
        style={{ backgroundColor: color ?? "#1E2B42" }}
      >
        {icon ?? name[0]}
      </div>
      <span className="text-sm whitespace-nowrap text-[#A8B4CC]">{name}</span>
    </div>
  );
}

/* ── Transaction row ────────────────────────────────────── */
function TxRow({
  tx,
  index,
  selected,
  onSelect,
  onRowClick,
  accounts,
}: {
  tx: Transaction;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onRowClick: () => void;
  accounts: ApiAccount[];
}) {
  const amountColor =
    tx.type === "income"
      ? "text-[#4ADE80]"
      : tx.type === "transfer"
        ? "text-[#93C5FD]"
        : "text-[#F87171]";

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.018 }}
      onClick={onRowClick}
      className={cn(
        "group cursor-pointer transition-colors hover:bg-[#0D1828]",
        selected && "bg-[rgba(108,58,237,0.05)]",
      )}
    >
      {/* Checkbox */}
      <td className="w-10 py-3 pr-2 pl-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="flex text-[#2A3A54] transition-colors hover:text-[#6C3AED] focus:outline-none"
        >
          {selected ? <CheckSquare size={15} className="text-[#6C3AED]" /> : <Square size={15} />}
        </button>
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-sm whitespace-nowrap text-[#A8B4CC]">
        {formatTableDate(tx.date)}
      </td>

      {/* Payee / Note */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <PayeeAvatar payee={tx.payee || "?"} />
          <div>
            <p className="text-sm leading-tight font-medium text-[#E8EEF8]">{tx.payee}</p>
            {tx.memo && (
              <p className="mt-0.5 text-xs leading-tight whitespace-nowrap text-[#5A6A85]">
                {tx.memo}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <TypeBadge type={tx.type} />
      </td>

      {/* Envelope / Category */}
      <td className="px-4 py-3">
        <EnvelopeChip name={tx.envelopeName} />
      </td>

      {/* Account */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {(() => {
            const acc = accounts.find((a) => a.id === tx.accountId);
            const meta =
              (acc ? ACCOUNT_TYPE_META[API_TO_UI[acc.type as ApiAccountType]] : undefined) ??
              ACCOUNT_TYPE_META.checking;
            return (
              <div
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded"
                style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
              >
                {meta.icon}
              </div>
            );
          })()}
          <div>
            <p className="text-sm leading-tight whitespace-nowrap text-[#A8B4CC]">
              {tx.accountName}
            </p>
          </div>
        </div>
      </td>

      {/* Amount */}
      <td
        className={cn(
          "px-4 py-3 text-right text-sm font-semibold whitespace-nowrap tabular-nums",
          amountColor,
        )}
      >
        <span className="inline-flex items-center justify-end gap-1.5">
          {tx.type === "income"
            ? `+${formatCurrency(tx.amount)}`
            : tx.type === "expense"
              ? `-${formatCurrency(tx.amount)}`
              : formatCurrency(tx.amount)}
          {tx.type === "income" ? (
            <ArrowUp size={13} strokeWidth={2.5} />
          ) : tx.type === "expense" ? (
            <ArrowDown size={13} strokeWidth={2.5} />
          ) : null}
        </span>
      </td>

      {/* Running Balance */}
      <td className="px-4 py-3 text-right text-sm whitespace-nowrap text-[#A8B4CC] tabular-nums">
        {tx.runningBalance != null ? formatCurrency(tx.runningBalance) : "—"}
      </td>

      {/* Actions */}
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <button className="ml-auto flex rounded-lg p-1.5 text-[#5A6A85] transition-all hover:bg-[#1E2B42] hover:text-[#E8EEF8] focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none">
          <MoreVertical size={13} />
        </button>
      </td>
    </motion.tr>
  );
}

/* ── Account type icon ──────────────────────────────────── */
const ACCOUNT_TYPE_META: Record<AccountType, { icon: React.ReactNode; color: string }> = {
  checking: { icon: <Building2 size={11} />, color: "#3B82F6" },
  savings: { icon: <PiggyBank size={11} />, color: "#22C55E" },
  credit: { icon: <CreditCard size={11} />, color: "#F87171" },
  cash: { icon: <Wallet size={11} />, color: "#F59E0B" },
  loan: { icon: <Landmark size={11} />, color: "#EC4899" },
};

/* ── Account filter dropdown (multi-select) ─────────────── */
function AccountFilter({
  value,
  onChange,
  triggerClassName,
  accounts,
}: {
  value: Set<number>;
  onChange: (ids: Set<number>) => void;
  triggerClassName?: string;
  accounts: ApiAccount[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function toggle(id: number) {
    const next = new Set(value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  function triggerLabel() {
    if (value.size === 0) return "All Accounts";
    if (value.size === 1) {
      const acc = accounts.find((a) => a.id === [...value][0]);
      return acc ? acc.name : "All Accounts";
    }
    return `${value.size} Accounts`;
  }

  const firstSelected = value.size === 1 ? accounts.find((a) => a.id === [...value][0]) : null;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(triggerClassName, open && "border-[#6C3AED]/60 text-[#A8B4CC]")}
      >
        {firstSelected && (
          <span
            className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded"
            style={{
              backgroundColor: `${(ACCOUNT_TYPE_META[API_TO_UI[firstSelected.type as ApiAccountType]] ?? ACCOUNT_TYPE_META.checking).color}22`,
            }}
          >
            <span
              style={{
                color: (
                  ACCOUNT_TYPE_META[API_TO_UI[firstSelected.type as ApiAccountType]] ??
                  ACCOUNT_TYPE_META.checking
                ).color,
              }}
            >
              {
                (
                  ACCOUNT_TYPE_META[API_TO_UI[firstSelected.type as ApiAccountType]] ??
                  ACCOUNT_TYPE_META.checking
                ).icon
              }
            </span>
          </span>
        )}
        {value.size > 1 && (
          <span className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#6C3AED] text-[9px] font-bold text-white">
            {value.size}
          </span>
        )}
        {triggerLabel()}
        <ChevronDown size={11} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-60 overflow-hidden rounded-lg border border-[#1A2640] bg-[#0D1B2E] shadow-lg">
          {/* header */}
          <div className="flex items-center justify-between border-b border-[#1A2640] px-3 py-2">
            <span className="text-[11px] font-semibold tracking-wider text-[#3A4A60] uppercase">
              Accounts
            </span>
            {value.size > 0 && (
              <button
                onClick={() => onChange(new Set())}
                className="text-[11px] text-[#6C3AED] transition-colors hover:text-[#7C4AFF]"
              >
                Clear all
              </button>
            )}
          </div>

          {/* list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {accounts.map((acc) => {
              const checked = value.has(acc.id);
              const meta =
                ACCOUNT_TYPE_META[API_TO_UI[acc.type as ApiAccountType]] ??
                ACCOUNT_TYPE_META.checking;
              return (
                <button
                  key={acc.id}
                  onClick={() => toggle(acc.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                    checked
                      ? "bg-[#6C3AED]/15 text-white"
                      : "text-[#5A6A85] hover:bg-[#131C2E] hover:text-white",
                  )}
                >
                  {/* checkbox */}
                  <span
                    className={cn(
                      "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors",
                      checked ? "border-[#6C3AED] bg-[#6C3AED]" : "border-[#2A3A54]",
                    )}
                  >
                    {checked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path
                          d="M1 3.5L3.5 6L8 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  {/* type icon */}
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded"
                    style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                  >
                    {meta.icon}
                  </span>
                  {/* name */}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] leading-tight text-[#A8B4CC]">{acc.name}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Envelope filter dropdown (multi-select) ────────────── */
function EnvelopeFilter({
  value,
  onChange,
  triggerClassName,
  envelopes,
}: {
  value: Set<number>;
  onChange: (ids: Set<number>) => void;
  triggerClassName?: string;
  envelopes: ApiEnvelope[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function toggle(id: number) {
    const next = new Set(value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  function triggerLabel() {
    if (value.size === 0) return "All Envelopes";
    if (value.size === 1) {
      const env = envelopes.find((e) => e.id === [...value][0]);
      return env ? env.title : "All Envelopes";
    }
    return `${value.size} Envelopes`;
  }

  const firstSelected = value.size === 1 ? envelopes.find((e) => e.id === [...value][0]) : null;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(triggerClassName, open && "border-[#6C3AED]/60 text-[#A8B4CC]")}
      >
        {firstSelected && (
          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-[#6C3AED]/20 text-[10px] text-[#8B5CF6]">
            {firstSelected.title[0]}{" "}
          </span>
        )}
        {value.size > 1 && (
          <span className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#6C3AED] text-[9px] font-bold text-white">
            {value.size}
          </span>
        )}
        {triggerLabel()}
        <ChevronDown size={11} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-[#1A2640] bg-[#0D1B2E] shadow-lg">
          {/* header */}
          <div className="flex items-center justify-between border-b border-[#1A2640] px-3 py-2">
            <span className="text-[11px] font-semibold tracking-wider text-[#3A4A60] uppercase">
              Envelopes
            </span>
            {value.size > 0 && (
              <button
                onClick={() => onChange(new Set())}
                className="text-[11px] text-[#6C3AED] transition-colors hover:text-[#7C4AFF]"
              >
                Clear all
              </button>
            )}
          </div>

          {/* list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {envelopes.map((env) => {
              const checked = value.has(env.id);
              return (
                <button
                  key={env.id}
                  onClick={() => toggle(env.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                    checked
                      ? "bg-[#6C3AED]/15 text-white"
                      : "text-[#5A6A85] hover:bg-[#131C2E] hover:text-white",
                  )}
                >
                  {/* checkbox */}
                  <span
                    className={cn(
                      "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors",
                      checked ? "border-[#6C3AED] bg-[#6C3AED]" : "border-[#2A3A54]",
                    )}
                  >
                    {checked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path
                          d="M1 3.5L3.5 6L8 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[#6C3AED]/20 text-[11px] text-[#8B5CF6]">
                    {env.title[0]}{" "}
                  </span>
                  <span className="truncate text-[#A8B4CC]">{env.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Transaction type filter (multi-select) ─────────────── */
const TX_TYPES = [
  {
    id: "expense",
    label: "Expense",
    icon: <ArrowDownLeft size={11} />,
    color: "#F87171",
    bg: "rgba(239,68,68,0.12)",
  },
  {
    id: "income",
    label: "Income",
    icon: <ArrowUpRight size={11} />,
    color: "#4ADE80",
    bg: "rgba(34,197,94,0.12)",
  },
  {
    id: "transfer",
    label: "Transfer",
    icon: <ArrowLeftRight size={11} />,
    color: "#7DD3FC",
    bg: "rgba(99,179,237,0.12)",
  },
] as const;

type TxTypeId = (typeof TX_TYPES)[number]["id"];

function TypeFilter({
  value,
  onChange,
  triggerClassName,
}: {
  value: Set<TxTypeId>;
  onChange: (ids: Set<TxTypeId>) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function toggle(id: TxTypeId) {
    const next = new Set(value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  function triggerLabel() {
    if (value.size === 0 || value.size === TX_TYPES.length) return "All Types";
    if (value.size === 1) return TX_TYPES.find((t) => t.id === [...value][0])!.label;
    return `${value.size} Types`;
  }

  const singleSelected = value.size === 1 ? TX_TYPES.find((t) => t.id === [...value][0]) : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(triggerClassName, open && "border-[#6C3AED]/60 text-[#A8B4CC]")}
      >
        {singleSelected ? (
          <span style={{ color: singleSelected.color }}>{singleSelected.icon}</span>
        ) : (
          <Grid3x3 size={12} />
        )}
        {value.size > 1 && value.size < TX_TYPES.length && (
          <span className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#6C3AED] text-[9px] font-bold text-white">
            {value.size}
          </span>
        )}
        {triggerLabel()}
        <ChevronDown size={11} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-[#1A2640] bg-[#0D1B2E] shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1A2640] px-3 py-2">
            <span className="text-[11px] font-semibold tracking-wider text-[#3A4A60] uppercase">
              Type
            </span>
            {value.size > 0 && value.size < TX_TYPES.length && (
              <button
                onClick={() => onChange(new Set())}
                className="text-[11px] text-[#6C3AED] transition-colors hover:text-[#7C4AFF]"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="py-1">
            {TX_TYPES.map((type) => {
              const checked = value.has(type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => toggle(type.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                    checked
                      ? "bg-[#6C3AED]/15 text-white"
                      : "text-[#5A6A85] hover:bg-[#131C2E] hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors",
                      checked ? "border-[#6C3AED] bg-[#6C3AED]" : "border-[#2A3A54]",
                    )}
                  >
                    {checked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path
                          d="M1 3.5L3.5 6L8 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded"
                    style={{ backgroundColor: type.bg, color: type.color }}
                  >
                    {type.icon}
                  </span>
                  <span className="text-[#A8B4CC]">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Per-page dropdown ──────────────────────────────────── */
const PAGE_SIZES = [10, 25, 50, 100];

function PageSizeSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={ref} className="relative ml-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2640] px-3 py-1.5 text-sm text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none"
      >
        {value} / page <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 bottom-full z-20 mb-1 w-32 overflow-hidden rounded-lg border border-[#1A2640] bg-[#0D1B2E] py-1 shadow-lg">
          {PAGE_SIZES.map((n) => (
            <button
              key={n}
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-left text-sm transition-colors",
                n === value
                  ? "bg-[#6C3AED]/20 text-white"
                  : "text-[#5A6A85] hover:bg-[#131C2E] hover:text-white",
              )}
            >
              {n} / page
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────── */
export function TransactionsView() {
  const activeBudgetId = useUIStore((s) => s.activeBudgetId);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [, setDeleteError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pageSize, setPageSize] = useState(25);
  const [envelopeFilter, setEnvelopeFilter] = useState<Set<number>>(new Set());
  const [accountFilter, setAccountFilter] = useState<Set<number>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<TxTypeId>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  });

  const { accounts, accountMap } = useAccounts(activeBudgetId);
  const { envelopes, envelopeMap } = useEnvelopes(activeBudgetId);
  const {
    transactions,
    total: totalCount,
    loading: txLoading,
    error: txError,
    refetch,
  } = useTransactions(activeBudgetId, accountMap, envelopeMap, {
    accountId: accountFilter.size === 1 ? Number([...accountFilter][0]) : undefined,
    envelopeId: envelopeFilter.size === 1 ? Number([...envelopeFilter][0]) : undefined,
    dateFrom: dateRange.from?.toISOString(),
    dateTo: dateRange.to?.toISOString(),
    pageSize,
  });
  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (typeFilter.size > 0) {
      result = result.filter((t) => typeFilter.has(t.type));
    }
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (t) =>
          t.payee?.toLowerCase().includes(query) ||
          t.memo?.toLowerCase().includes(query) ||
          t.accountName?.toLowerCase().includes(query) ||
          t.envelopeName?.toLowerCase().includes(query),
      );
    }
    return result;
  }, [transactions, typeFilter, searchQuery]);

  // Running balance is only well-defined within a single account's chronological
  // history, so it's only computed when the view is scoped to exactly one account.
  const singleAccountId = accountFilter.size === 1 ? Number([...accountFilter][0]) : null;
  const singleAccountBalance =
    singleAccountId != null ? accountMap.get(singleAccountId)?.balance : undefined;
  const { balances: runningBalances } = useRunningBalances(
    activeBudgetId,
    singleAccountId,
    singleAccountBalance,
  );
  const rowsWithBalance = useMemo(
    () =>
      filteredTransactions.map((t) =>
        runningBalances.has(t.id) ? { ...t, runningBalance: runningBalances.get(t.id) } : t,
      ),
    [filteredTransactions, runningBalances],
  );

  const allSelected =
    selected.size === filteredTransactions.length && filteredTransactions.length > 0;
  const someSelected = selected.size > 0 && !allSelected;

  const totalInflow = filteredTransactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const totalOutflow = filteredTransactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + t.amount, 0);
  const netFlow = totalInflow + totalOutflow;
  function toggleAll() {
    if (allSelected || someSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredTransactions.map((t) => t.id)));
    }
  }

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openDeleteModal(tx: Transaction) {
    setDeleteTx(tx);
    setDeleteOpen(true);
  }

  function closeDeleteModal() {
    if (deleteLoading) return;
    setDeleteOpen(false);
    setTimeout(() => setDeleteTx(null), 200);
  }

  async function confirmDelete() {
    if (!deleteTx || !activeBudgetId) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await apiFetch<unknown>(`/api/v1/budgets/${activeBudgetId}/transactions/${deleteTx.id}`, {
        method: "DELETE",
      });
      refetch();
      setDeleteOpen(false);
      setDetailOpen(false);
      setTimeout(() => {
        setDeleteTx(null);
        setDetailTx(null);
      }, 200);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setDeleteLoading(false);
    }
  }

  /* Flowbite dropdown trigger style */
  const filterBtn = [
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1A2640]",
    "bg-[#080D1A] text-sm text-[#7A8BA8]",
    "hover:text-[#C8D4E8] hover:border-[#2A3A54]",
    "focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/25",
    "transition-all whitespace-nowrap",
  ].join(" ");

  return (
    <div className="layout-page py-6">
      {/* ── Page header ─────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#E8EEF8]">Transactions</h1>
          <p className="mt-1 text-sm whitespace-nowrap text-[#5A6A85]">
            Review and manage all transactions in your budget. Your transactions update your
            accounts and envelopes.
            <br />
            Filter by type, envelope, or account to find what you need. Import from your bank or add
            transactions manually.
          </p>
        </div>

        {/* Flowbite button group pattern */}
        <div className="mt-0.5 flex flex-shrink-0 items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#5A6A85]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions…"
              className="w-72 rounded-xl border border-[#1A2540] bg-transparent py-2.5 pr-3 pl-8 text-sm text-[#A8B4CC] placeholder-[#5A6A85] transition-colors hover:border-[#2A3A54] focus:border-[#2A3A54] focus:outline-none"
            />
          </div>

          {isFeatureEnabled("transactionImport") && (
            <button className="inline-flex items-center gap-2 rounded-lg border border-[#1E2B42] px-4 py-2.5 text-sm font-medium text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none">
              <Upload size={14} />
              Import
            </button>
          )}

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#6C3AED] bg-[#6C3AED] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#7C4AFF] focus:ring-2 focus:ring-[#6C3AED]/50 focus:outline-none"
          >
            <Plus size={14} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* ── Table card ──────────────────────────────────── */}
      <div className="overflow-hidden rounded-lg border border-[#1A2640] bg-[#0B1220] shadow-sm">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#131E30] px-4 py-3">
          <AccountFilter
            value={accountFilter}
            onChange={setAccountFilter}
            triggerClassName={filterBtn}
            accounts={accounts}
          />
          <EnvelopeFilter
            value={envelopeFilter}
            onChange={setEnvelopeFilter}
            triggerClassName={filterBtn}
            envelopes={envelopes}
          />
          <DateRangePicker value={dateRange} onChange={setDateRange} triggerClassName={filterBtn} />
          <TypeFilter value={typeFilter} onChange={setTypeFilter} triggerClassName={filterBtn} />
          {isFeatureEnabled("transactionFilters") && (
            <button className={cn(filterBtn, "ml-auto")}>
              <SlidersHorizontal size={12} />
              Filters
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="border-b border-[#131E30] px-4 py-3">
          <div className="flex rounded-lg border border-[#1A2640] bg-[#080E1A]">
            {/* Total Inflow */}
            <div className="flex flex-1 flex-col px-5 pt-3 pb-0">
              <p className="mb-1 text-xs font-semibold tracking-widest text-[#22C55E] uppercase">
                Total Inflow
              </p>
              <p className="text-2xl font-bold text-[#E8EEF8] tabular-nums">
                {formatCurrency(totalInflow)}
              </p>
              <div className="-mx-1 mt-1 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkInflow} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <defs>
                      <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<SparkTooltip formatter={formatCurrencyCompact} />} />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#22C55E"
                      strokeWidth={1.5}
                      fill="url(#inflowGrad)"
                      dot={false}
                      activeDot={{ r: 3, fill: "#22C55E", stroke: "#080C14", strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="my-3 w-px bg-[#1A2640]" />

            {/* Total Outflow */}
            <div className="flex flex-1 flex-col px-5 pt-3 pb-0">
              <p className="mb-1 text-xs font-semibold tracking-widest text-[#F97316] uppercase">
                Total Outflow
              </p>
              <p className="text-2xl font-bold text-[#F97316] tabular-nums">
                {formatCurrency(totalOutflow)}
              </p>
              <div className="-mx-1 mt-1 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkOutflow} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <defs>
                      <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F97316" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<SparkTooltip formatter={formatCurrencyCompact} />} />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#F97316"
                      strokeWidth={1.5}
                      fill="url(#outflowGrad)"
                      dot={false}
                      activeDot={{ r: 3, fill: "#F97316", stroke: "#080C14", strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="my-3 w-px bg-[#1A2640]" />

            {/* Net Flow */}
            <div className="flex flex-1 flex-col px-5 pt-3 pb-0">
              <p
                className={cn(
                  "mb-1 text-xs font-semibold tracking-widest uppercase",
                  netFlow >= 0 ? "text-[#22C55E]" : "text-[#F87171]",
                )}
              >
                Net Flow
              </p>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  netFlow >= 0 ? "text-[#4ADE80]" : "text-[#F87171]",
                )}
              >
                {formatCurrency(netFlow)}
              </p>
              <div className="-mx-1 mt-1 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkNet} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <defs>
                      <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#4ADE80" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<SparkTooltip formatter={formatCurrencyCompact} />} />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#4ADE80"
                      strokeWidth={1.5}
                      fill="url(#netGrad)"
                      dot={false}
                      activeDot={{ r: 3, fill: "#4ADE80", stroke: "#080C14", strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="my-3 w-px bg-[#1A2640]" />

            {/* Transactions */}
            <div className="flex flex-1 flex-col px-5 pt-3 pb-0">
              <p className="mb-1 text-xs font-semibold tracking-widest text-[#5A6A85] uppercase">
                Transactions
              </p>
              <p className="text-2xl font-bold text-[#E8EEF8] tabular-nums">
                {filteredTransactions.length}
              </p>
              <div className="-mx-1 mt-1 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sparkCount}
                    margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                    barCategoryGap="30%"
                  >
                    <Tooltip content={<SparkTooltip formatter={(v: number) => `${v} txns`} />} />
                    <Bar dataKey="v" fill="#6C3AED" radius={[2, 2, 0, 0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Table — Flowbite: divide-y on tbody, text-xs uppercase headers */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#080E1A] text-xs text-[#5A6A85] uppercase">
              <tr>
                <th scope="col" className="w-10 py-3 pr-2 pl-4">
                  <button
                    onClick={toggleAll}
                    className="flex text-[#2A3A54] transition-colors hover:text-[#6C3AED] focus:outline-none"
                  >
                    {allSelected ? (
                      <CheckSquare size={14} className="text-[#6C3AED]" />
                    ) : (
                      <Square size={14} />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-4 py-3">
                  <button className="inline-flex items-center gap-1 tracking-wider transition-colors hover:text-[#A8B4CC]">
                    Date <span className="text-[10px]">↑</span>
                  </button>
                </th>
                <th scope="col" className="px-4 py-3 tracking-wider">
                  Payee / Note
                </th>
                <th scope="col" className="px-4 py-3 tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 tracking-wider">
                  Envelope / Category
                </th>
                <th scope="col" className="px-4 py-3 tracking-wider">
                  Account
                </th>
                <th scope="col" className="px-4 py-3 text-right tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-4 py-3 text-right tracking-wider">
                  Running Balance
                </th>
                <th scope="col" className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0F1A2C]">
              {txLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-[#5A6A85]">
                    Loading transactions…
                  </td>
                </tr>
              )}
              {txError && !txLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-[#F87171]">
                    {txError}
                  </td>
                </tr>
              )}
              {!txLoading && !txError && filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-[#5A6A85]">
                    No transactions found.
                  </td>
                </tr>
              )}
              {!txLoading &&
                rowsWithBalance.map((tx, i) => (
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    index={i}
                    accounts={accounts}
                    selected={selected.has(tx.id)}
                    onSelect={() => toggleRow(tx.id)}
                    onRowClick={() => {
                      setDetailTx(tx);
                      setDetailOpen(true);
                    }}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination — Flowbite pagination pattern */}
        <div className="flex items-center justify-between border-t border-[#131E30] px-4 py-3">
          <span className="text-sm text-[#5A6A85]">
            Showing <span className="font-medium text-[#A8B4CC]">1</span> to{" "}
            <span className="font-medium text-[#A8B4CC]">{filteredTransactions.length}</span> of{" "}
            <span className="font-medium text-[#A8B4CC]">{totalCount}</span> transactions
          </span>

          <div className="inline-flex items-center gap-1" aria-label="Pagination">
            <button className="rounded-lg border border-[#1A2640] px-2.5 py-1.5 text-sm text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none">
              ‹
            </button>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                aria-current={n === 1 ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none",
                  n === 1
                    ? "border border-[#6C3AED] bg-[#6C3AED] text-white"
                    : "border border-[#1A2640] text-[#5A6A85] hover:bg-[#131C2E] hover:text-white",
                )}
              >
                {n}
              </button>
            ))}
            <button className="rounded-lg border border-[#1A2640] px-2.5 py-1.5 text-sm text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none">
              ›
            </button>

            <PageSizeSelect value={pageSize} onChange={setPageSize} />
          </div>
        </div>
      </div>

      <AddTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={refetch}
        budgetId={activeBudgetId}
        accounts={accounts}
        envelopes={envelopes}
      />
      <TransactionDetailsModal
        tx={detailTx}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onDelete={() => {
          if (!detailTx) return;
          const acc = accountMap.get(detailTx.accountId);
          if (acc?.is_immutable) return;
          openDeleteModal(detailTx);
        }}
        onEdit={() => {
          if (!detailTx) return;
          const acc = accountMap.get(detailTx.accountId);
          if (acc?.is_immutable) return;
          setEditTx(detailTx);
          setEditOpen(true);
          setDetailOpen(false);
        }}
      />
      <EditTransactionModal
        tx={editTx}
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setTimeout(() => setEditTx(null), 200);
        }}
        onSave={() => refetch()}
        budgetId={activeBudgetId}
        accounts={accounts}
        envelopes={envelopes}
      />
      <DeleteTransactionModal
        tx={deleteTx}
        open={deleteOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
