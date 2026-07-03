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

import { useState, useRef, useEffect } from "react";
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
  TrendingUp,
  Landmark,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
import { mockTransactions, mockAccounts } from "@/mock/data";
import { useEnvelopes } from "@/hooks/useEnvelopes";
import { formatCurrency, formatCurrencyCompact, formatTableDate, cn } from "@/lib/utils";
import { AddTransactionModal } from "./AddTransactionModal";
import { TransactionDetailsModal } from "./TransactionDetailsModal";
import { DeleteTransactionModal } from "./DeleteTransactionModal";
import { EditTransactionModal } from "./EditTransactionModal";
import { DateRangePicker } from "./DateRangePicker";
import type { DateRange } from "./DateRangePicker";
import type { Transaction, AccountType } from "@/types";

/* ── Sparkline mock data (daily buckets for current month) ── */
const sparkInflow = [
  { v: 42000 },
  { v: 58000 },
  { v: 35000 },
  { v: 91000 },
  { v: 67000 },
  { v: 48000 },
  { v: 72000 },
  { v: 55000 },
  { v: 83000 },
  { v: 61000 },
  { v: 44000 },
  { v: 96000 },
  { v: 70000 },
  { v: 52000 },
  { v: 88000 },
];
const sparkOutflow = [
  { v: 18000 },
  { v: 24000 },
  { v: 31000 },
  { v: 15000 },
  { v: 27000 },
  { v: 22000 },
  { v: 38000 },
  { v: 19000 },
  { v: 29000 },
  { v: 33000 },
  { v: 16000 },
  { v: 41000 },
  { v: 25000 },
  { v: 20000 },
  { v: 36000 },
];
const sparkNet = [
  { v: 24000 },
  { v: 34000 },
  { v: 4000 },
  { v: 76000 },
  { v: 40000 },
  { v: 26000 },
  { v: 34000 },
  { v: 36000 },
  { v: 54000 },
  { v: 28000 },
  { v: 28000 },
  { v: 55000 },
  { v: 45000 },
  { v: 32000 },
  { v: 52000 },
];
const sparkCount = [
  { v: 3 },
  { v: 5 },
  { v: 2 },
  { v: 8 },
  { v: 4 },
  { v: 6 },
  { v: 7 },
  { v: 3 },
  { v: 9 },
  { v: 5 },
  { v: 4 },
  { v: 11 },
  { v: 6 },
  { v: 3 },
  { v: 6 },
];

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
}: {
  tx: Transaction;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onRowClick: () => void;
}) {
  const amountColor =
    tx.type === "income"
      ? "text-[#4ADE80]"
      : tx.type === "transfer"
        ? tx.amount >= 0
          ? "text-[#4ADE80]"
          : "text-[#F87171]"
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
          <PayeeAvatar payee={tx.payee} color={tx.payeeColor} />
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
        <EnvelopeChip name={tx.envelopeName} icon={tx.envelopeIcon} color={tx.envelopeColor} />
      </td>

      {/* Account */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {(() => {
            const acc = mockAccounts.find((a) => a.id === tx.accountId);
            const meta = acc ? ACCOUNT_TYPE_META[acc.type] : ACCOUNT_TYPE_META.checking;
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
              {tx.accountInstitution ?? tx.accountName}
            </p>
            <p className="text-xs leading-tight text-[#5A6A85]">{tx.accountSubLabel}</p>
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
          {tx.amount >= 0 ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
          {tx.amount >= 0 ? (
            <ArrowUp size={13} strokeWidth={2.5} />
          ) : (
            <ArrowDown size={13} strokeWidth={2.5} />
          )}
        </span>
      </td>

      {/* Running Balance */}
      <td
        className={cn(
          "px-4 py-3 text-right text-sm whitespace-nowrap tabular-nums",
          tx.runningBalance !== undefined && tx.runningBalance < 0
            ? "text-[#F87171]"
            : "text-[#A8B4CC]",
        )}
      >
        {tx.runningBalance !== undefined ? formatCurrency(tx.runningBalance) : "—"}
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
  investment: { icon: <TrendingUp size={11} />, color: "#8B5CF6" },
  loan: { icon: <Landmark size={11} />, color: "#EC4899" },
};

/* ── Account filter dropdown (multi-select) ─────────────── */
function AccountFilter({
  value,
  onChange,
  triggerClassName,
}: {
  value: Set<string>;
  onChange: (ids: Set<string>) => void;
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

  function toggle(id: string) {
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
      const acc = mockAccounts.find((a) => a.id === [...value][0]);
      return acc ? acc.name : "All Accounts";
    }
    return `${value.size} Accounts`;
  }

  const firstSelected = value.size === 1 ? mockAccounts.find((a) => a.id === [...value][0]) : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(triggerClassName, open && "border-[#6C3AED]/60 text-[#A8B4CC]")}
      >
        {firstSelected && (
          <span
            className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded"
            style={{ backgroundColor: `${ACCOUNT_TYPE_META[firstSelected.type].color}22` }}
          >
            <span style={{ color: ACCOUNT_TYPE_META[firstSelected.type].color }}>
              {ACCOUNT_TYPE_META[firstSelected.type].icon}
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
            {mockAccounts.map((acc) => {
              const checked = value.has(acc.id);
              const meta = ACCOUNT_TYPE_META[acc.type];
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
                  {/* name + institution */}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] leading-tight text-[#A8B4CC]">{acc.name}</p>
                    {acc.institution && (
                      <p className="text-[11px] leading-tight text-[#5A6A85]">{acc.institution}</p>
                    )}
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
  value: Set<string>;
  onChange: (ids: Set<string>) => void;
  triggerClassName?: string;
  envelopes: import("@/types").BudgetEnvelope[];
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

  function toggle(id: string) {
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
      const env = envelopes.find((e) => String(e.id) === [...value][0]);
      return env ? env.title : "All Envelopes";
    }
    return `${value.size} Envelopes`;
  }

  const firstSelected =
    value.size === 1 ? envelopes.find((e) => String(e.id) === [...value][0]) : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(triggerClassName, open && "border-[#6C3AED]/60 text-[#A8B4CC]")}
      >
        {firstSelected && (
          <span
            className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[10px]"
            style={{ backgroundColor: "rgba(108,58,237,0.4)" }}
          >
            💼
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
            {envelopes.length === 0 && (
              <p className="px-3 py-3 text-xs text-[#5A6A85]">No envelopes.</p>
            )}
            {envelopes.map((env) => {
              const envId = String(env.id);
              const checked = value.has(envId);
              return (
                <button
                  key={env.id}
                  onClick={() => toggle(envId)}
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
                  <span
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[11px]"
                    style={{ backgroundColor: "rgba(108,58,237,0.4)" }}
                  >
                    💼
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
  const { envelopes } = useEnvelopes();

  const [modalOpen, setModalOpen] = useState(false);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(25);
  const [envelopeFilter, setEnvelopeFilter] = useState<Set<string>>(new Set());
  const [accountFilter, setAccountFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<TxTypeId>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  });

  const allSelected = selected.size === mockTransactions.length && mockTransactions.length > 0;
  const someSelected = selected.size > 0 && !allSelected;

  const totalInflow = 885650;
  const totalOutflow = -347820;
  const netFlow = totalInflow + totalOutflow;
  const totalCount = 72;

  function toggleAll() {
    if (allSelected || someSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(mockTransactions.map((t) => t.id)));
    }
  }

  function toggleRow(id: string) {
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
    setDeleteLoading(true);
    // Simulate async delete — replace with real API call
    await new Promise((r) => setTimeout(r, 800));
    setDeleteLoading(false);
    setDeleteOpen(false);
    setDetailOpen(false);
    setTimeout(() => {
      setDeleteTx(null);
      setDetailTx(null);
    }, 200);
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
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#1E2B42] px-4 py-2.5 text-sm font-medium text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none">
            <Upload size={14} />
            Import
          </button>

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
          {/* Flowbite search input */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={13} className="text-[#3A4A60]" />
            </div>
            <input
              type="search"
              placeholder="Search transactions..."
              className="block w-56 rounded-lg border border-[#1A2640] bg-[#080D1A] py-2 pr-3 pl-9 text-sm text-[#A8B4CC] transition-colors placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/25 focus:outline-none"
            />
          </div>

          <AccountFilter
            value={accountFilter}
            onChange={setAccountFilter}
            triggerClassName={filterBtn}
          />
          <EnvelopeFilter
            value={envelopeFilter}
            onChange={setEnvelopeFilter}
            triggerClassName={filterBtn}
            envelopes={envelopes}
          />
          <DateRangePicker value={dateRange} onChange={setDateRange} triggerClassName={filterBtn} />
          <TypeFilter value={typeFilter} onChange={setTypeFilter} triggerClassName={filterBtn} />
          <button className={cn(filterBtn, "ml-auto")}>
            <SlidersHorizontal size={12} />
            Filters
          </button>
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
              <p className="text-2xl font-bold text-[#E8EEF8] tabular-nums">{totalCount}</p>
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
              {mockTransactions.map((tx, i) => (
                <TxRow
                  key={tx.id}
                  tx={tx}
                  index={i}
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
            <span className="font-medium text-[#A8B4CC]">{mockTransactions.length}</span> of{" "}
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

      <AddTransactionModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <TransactionDetailsModal
        tx={detailTx}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onDelete={() => detailTx && openDeleteModal(detailTx)}
        onEdit={() => {
          if (detailTx) {
            setEditTx(detailTx);
            setEditOpen(true);
            setDetailOpen(false);
          }
        }}
      />
      <EditTransactionModal
        tx={editTx}
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setTimeout(() => setEditTx(null), 200);
        }}
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
