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
import { useUIStore } from "@/stores/ui.store";
import { useAccounts } from "@/hooks/use-accounts";
import { useEnvelopes } from "@/hooks/use-envelopes";
import { useTransactions } from "@/hooks/use-transactions";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Pencil,
  Archive,
  Trash2,
  ChevronDown,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Shield,
  Info,
  Wallet,
  TrendingUp,
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Star,
  Heart,
  Hash,
  ArrowDownRight,
  Landmark,
  Gauge,
  ReceiptText,
  Edit2,
  MoreHorizontal,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { AddTransactionModal } from "@/components/transactions/AddTransactionModal";
import { ModifyEnvelopeModal } from "./ModifyEnvelopeModal";
import { ArchiveEnvelopeModal } from "./ArchiveEnvelopeModal";
import { ForceDeleteEnvelopeDialog } from "./ForceDeleteEnvelopeDialog";

/* ── Types ───────────────────────────────────────────────── */
type Nature = "Must" | "Need" | "Should" | "Want";
type TxStatus = "Cleared" | "Pending" | "Reconciled";

interface EnvelopeTx {
  id: string;
  date: string;
  title: string;
  account: string;
  accountType: "bank" | "wallet";
  amount: number;
  runningImpact: number;
  status: TxStatus;
}

/* ── Nature badge ────────────────────────────────────────── */
function NatureBadge({ nature }: { nature: Nature }) {
  const cfg: Record<Nature, { icon: React.ReactNode; bg: string; text: string; border: string }> = {
    Must: {
      icon: <Shield size={10} strokeWidth={2.5} />,
      bg: "rgba(108,58,237,0.15)",
      text: "#A78BFA",
      border: "rgba(108,58,237,0.3)",
    },
    Need: {
      icon: <Shield size={10} strokeWidth={2.5} />,
      bg: "rgba(34,197,94,0.12)",
      text: "#4ADE80",
      border: "rgba(34,197,94,0.25)",
    },
    Should: {
      icon: <Star size={10} strokeWidth={2.5} />,
      bg: "rgba(245,158,11,0.12)",
      text: "#FCD34D",
      border: "rgba(245,158,11,0.25)",
    },
    Want: {
      icon: <Heart size={10} strokeWidth={2.5} />,
      bg: "rgba(236,72,153,0.12)",
      text: "#F472B6",
      border: "rgba(236,72,153,0.25)",
    },
  };
  const c = cfg[nature];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
    >
      {c.icon} {nature}
    </span>
  );
}

/* ── Status badge (envelope health) ────────────────────── */
function HealthBadge({ pct }: { pct: number }) {
  const label = pct > 100 ? "Overspent" : pct >= 80 ? "Warning" : "Healthy";
  const bg =
    pct > 100
      ? "rgba(239,68,68,0.12)"
      : pct >= 80
        ? "rgba(245,158,11,0.12)"
        : "rgba(34,197,94,0.12)";
  const text = pct > 100 ? "#F87171" : pct >= 80 ? "#FCD34D" : "#4ADE80";
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}

/* ── TX status badge ─────────────────────────────────────── */
function TxStatusBadge({ status }: { status: TxStatus }) {
  const cfg: Record<TxStatus, { bg: string; text: string; border: string }> = {
    Cleared: { bg: "rgba(34,197,94,0.12)", text: "#4ADE80", border: "rgba(34,197,94,0.25)" },
    Pending: { bg: "rgba(245,158,11,0.12)", text: "#FCD34D", border: "rgba(245,158,11,0.25)" },
    Reconciled: { bg: "rgba(59,130,246,0.12)", text: "#60A5FA", border: "rgba(59,130,246,0.25)" },
  };
  const c = cfg[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
    >
      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: c.text }} />
      {status}
    </span>
  );
}

/* ── KPI stat card ───────────────────────────────────────── */
interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  subColor?: string;
  barColor?: string;
  barPct?: number;
}
function KpiCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  subColor,
  barColor,
  barPct,
}: KpiCardProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[#1A2540] bg-[#0B1120] p-4 transition-colors hover:border-[#2A3A54]">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs whitespace-nowrap text-[#5A6A85]">{label}</p>
          <p className="mt-0.5 truncate text-xl leading-tight font-bold text-[#E8EEF8] tabular-nums">
            {value}
          </p>
          <p className="mt-0.5 truncate text-xs" style={{ color: subColor ?? "#5A6A85" }}>
            {sub}
          </p>
        </div>
      </div>
      {barColor !== undefined && barPct !== undefined && (
        <div className="h-[3px] overflow-hidden rounded-full bg-[#1A2640]">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(barPct, 100)}%`, backgroundColor: barColor }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Analytics card ──────────────────────────────────────── */
interface AnalyticsCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
}
function AnalyticsCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  valueColor,
}: AnalyticsCardProps) {
  return (
    <div className="min-w-0 rounded-xl border border-[#1A2540] bg-[#0B1120] p-4 transition-colors hover:border-[#2A3A54]">
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="mb-0.5 text-[11px] text-[#5A6A85]">{label}</p>
          <p
            className="text-lg leading-tight font-bold tabular-nums"
            style={{ color: valueColor ?? "#E8EEF8" }}
          >
            {value}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[#5A6A85]">{sub}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Sort dropdown ───────────────────────────────────────── */
const SORT_OPTIONS = ["Newest", "Oldest", "Largest Amount", "Smallest Amount"];

function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm whitespace-nowrap transition-all",
          "border-[#1A2640] bg-[#0D1525] text-[#7A8BA8]",
          "hover:border-[#2A3A54] hover:text-[#C8D4E8]",
          open && "border-[#6C3AED]/50 text-[#A8B4CC]",
        )}
      >
        <ArrowUpDown size={13} />
        Sort: {value}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-[#1A2640] bg-[#0D1B2E] py-1 shadow-xl">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors",
                opt === value
                  ? "bg-[#6C3AED]/20 text-white"
                  : "text-[#5A6A85] hover:bg-[#131C2E] hover:text-[#A8B4CC]",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page size dropdown ──────────────────────────────────── */
const PAGE_SIZES = [5, 10, 25];

function PageSizeSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2640] px-3 py-1.5 text-sm text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white"
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

/* ── Main component ──────────────────────────────────────── */
export function EnvelopeDetails({ envelopeId = "e1" }: { envelopeId?: string }) {
  const activeBudgetId = useUIStore((s) => s.activeBudgetId);
  const { data: accounts } = useAccounts(activeBudgetId);
  const { data: apiEnvelopes } = useEnvelopes(activeBudgetId);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);

  const envelopeIdNum = Number(envelopeId);
  const envelope = apiEnvelopes.find((e) => e.id === envelopeIdNum);

  const { data: apiTransactions } = useTransactions(
    activeBudgetId,
    { budget_envelope_id: envelopeIdNum },
    accountMap,
  );

  const [addTxOpen, setAddTxOpen] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [forceDeleteOpen, setForceDeleteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  /* Envelope stats */
  const allocated = envelope?.allocated ?? 0;
  const spent = envelope?.spent ?? 0;
  const remaining = allocated - spent;
  const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
  const nature: Nature = "Need";

  /* Map API transactions to local type */
  const txRows: EnvelopeTx[] = apiTransactions.map((t) => ({
    id: String(t.id),
    date: new Date(t.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    title: t.payee || t.accountName,
    account: t.accountName,
    accountType: "bank" as const,
    amount: t.type === "expense" ? -t.amount : t.amount,
    runningImpact: 0,
    status: "Cleared" as const,
  }));

  /* Filter + sort transactions */
  const filtered = txRows
    .filter(
      (tx) =>
        !search ||
        tx.title.toLowerCase().includes(search.toLowerCase()) ||
        tx.account.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === "Largest Amount") return a.amount - b.amount;
      if (sort === "Smallest Amount") return b.amount - a.amount;
      if (sort === "Oldest") return a.id.localeCompare(b.id);
      return b.id.localeCompare(a.id);
    });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-w-0 space-y-4">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left — icon + title + pills */}
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{
              background:
                "radial-gradient(135deg, rgba(34,197,94,0.25) 0%, rgba(34,197,94,0.1) 100%)",
              color: "#4ADE80",
              boxShadow: "0 0 24px rgba(34,197,94,0.2)",
              border: "1px solid rgba(34,197,94,0.25)",
            }}
          >
            <ShoppingCart size={28} />
          </div>
          <div>
            <h1 className="text-[26px] leading-tight font-bold tracking-tight text-white">
              Groceries
            </h1>
            <p className="mt-0.5 text-[13px] text-[#5A6A85]">
              Track allocation, spending, and activity
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <NatureBadge nature={nature} />
              <HealthBadge pct={pct} />
              <span className="text-[12px] text-[#3A4A60]">
                Last updated: May 15, 2026 at 10:30 AM
              </span>
            </div>
          </div>
        </div>

        {/* Right — action buttons */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={() => setAddTxOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #6C3AED 0%, #7C4AFF 100%)",
              boxShadow: "0 0 20px rgba(108,58,237,0.35)",
            }}
          >
            <Plus size={15} />
            Add Transaction
          </button>
          <button
            onClick={() => setModifyOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: "linear-gradient(135deg, #854D0E 0%, #CA8A04 100%)",
              color: "#fff",
              boxShadow: "0 0 12px rgba(202,138,4,0.3)",
              border: "1px solid rgba(202,138,4,0.5)",
            }}
          >
            <Pencil size={13} />
            Modify Envelope
          </button>
          <button
            onClick={() => setArchiveOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: "linear-gradient(135deg, #92400E 0%, #C2651A 100%)",
              color: "#fff",
              boxShadow: "0 0 12px rgba(194,101,26,0.3)",
              border: "1px solid rgba(194,101,26,0.5)",
            }}
          >
            <Archive size={13} />
            Archive Envelope
          </button>
          <button
            onClick={() => setForceDeleteOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: "linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%)",
              color: "#fff",
              boxShadow: "0 0 12px rgba(220,38,38,0.3)",
              border: "1px solid rgba(220,38,38,0.5)",
            }}
          >
            <Trash2 size={13} />
            Force Delete
          </button>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={<ReceiptText size={18} />}
          iconBg="rgba(108,58,237,0.18)"
          iconColor="#A78BFA"
          label="Allocated Amount"
          value={formatCurrency(allocated)}
          sub="From To Be Budgeted"
          barColor="#6C3AED"
          barPct={100}
        />
        <KpiCard
          icon={<TrendingUp size={18} />}
          iconBg="rgba(59,130,246,0.18)"
          iconColor="#60A5FA"
          label="Total Spent"
          value={formatCurrency(spent)}
          sub={`${pct}% of allocated`}
          barColor="#3B82F6"
          barPct={pct}
        />
        <KpiCard
          icon={<Wallet size={18} />}
          iconBg="rgba(34,197,94,0.18)"
          iconColor="#4ADE80"
          label="Remaining Balance"
          value={formatCurrency(remaining)}
          sub="35% remaining"
          subColor="#4ADE80"
          barColor="#22C55E"
          barPct={100 - pct}
        />
        <KpiCard
          icon={<Activity size={18} />}
          iconBg="rgba(245,158,11,0.18)"
          iconColor="#FCD34D"
          label="Monthly Activity"
          value="12"
          sub="Transactions this month"
          barColor="#F59E0B"
          barPct={60}
        />
        <KpiCard
          icon={<BarChart3 size={18} />}
          iconBg="rgba(139,92,246,0.18)"
          iconColor="#C084FC"
          label="Average Spending"
          value={formatCurrency(Math.round(spent / 12))}
          sub="Per transaction"
          barColor="#8B5CF6"
          barPct={45}
        />
      </div>

      {/* ── Envelope overview panel ───────────────────────── */}
      <div
        className="rounded-2xl bg-[#0A1020] p-5"
        style={{
          border: "1px solid rgba(108,58,237,0.35)",
          boxShadow: "0 0 40px rgba(108,58,237,0.08), inset 0 0 40px rgba(108,58,237,0.03)",
        }}
      >
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left — envelope info */}
          <div className="flex-shrink-0 lg:w-[320px]">
            <div className="mb-4 flex items-start gap-4">
              <div
                className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-2xl"
                style={{
                  background:
                    "radial-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.06) 100%)",
                  color: "#4ADE80",
                  boxShadow: "0 0 30px rgba(34,197,94,0.15)",
                  border: "1px solid rgba(34,197,94,0.2)",
                }}
              >
                <ShoppingCart size={32} />
              </div>
              <div>
                <h2 className="text-[20px] leading-tight font-bold text-white">Groceries</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#7A8BA8]">
                  Food and groceries for the household.
                </p>
                <div className="mt-2">
                  <NatureBadge nature={nature} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-[#1A2540] pt-4">
              <div>
                <p className="mb-1 text-[11px] text-[#5A6A85]">Created</p>
                <p className="text-sm font-semibold text-[#C8D4E8]">Jan 12, 2026</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] text-[#5A6A85]">Last Modified</p>
                <p className="text-sm font-semibold text-[#C8D4E8]">May 15, 2026</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden w-px flex-shrink-0 bg-[#1A2540] lg:block" />

          {/* Right — allocation summary + progress */}
          <div className="min-w-0 flex-1">
            {/* 3 columns */}
            <div className="mb-5 grid grid-cols-3 gap-4">
              <div>
                <p className="mb-1 text-[11px] text-[#5A6A85]">Allocated</p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {formatCurrency(allocated)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[11px] text-[#5A6A85]">Spent</p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {formatCurrency(spent)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[11px] text-[#5A6A85]">Remaining</p>
                <p className="text-2xl font-bold tabular-nums" style={{ color: "#4ADE80" }}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#111C30]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: "linear-gradient(90deg, #22C55E, #4ADE80)",
                      boxShadow: "0 0 8px rgba(34,197,94,0.4)",
                    }}
                  />
                </div>
                <span
                  className="inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: "rgba(34,197,94,0.12)",
                    color: "#4ADE80",
                    border: "1px solid rgba(34,197,94,0.2)",
                  }}
                >
                  {pct}% used
                </span>
              </div>
            </div>

            {/* Helper text */}
            <div className="flex items-start gap-1.5">
              <Info size={13} className="mt-0.5 flex-shrink-0 text-[#3A4A60]" />
              <p className="text-[12px] leading-relaxed text-[#5A6A85]">
                Money assigned from To Be Budgeted. Spending is calculated automatically from
                transactions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Analytics cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <AnalyticsCard
          icon={<Hash size={16} />}
          iconBg="rgba(108,58,237,0.18)"
          iconColor="#A78BFA"
          label="Total Transactions"
          value="12"
          sub="This envelope"
        />
        <AnalyticsCard
          icon={<ArrowDownRight size={16} />}
          iconBg="rgba(34,197,94,0.18)"
          iconColor="#4ADE80"
          label="Largest Transaction"
          value={formatCurrency(1450)}
          sub="Big Basket (May 12)"
        />
        <AnalyticsCard
          icon={<Landmark size={16} />}
          iconBg="rgba(59,130,246,0.18)"
          iconColor="#60A5FA"
          label="Top Account"
          value="HDFC Checking"
          sub="8 transactions"
          valueColor="#E8EEF8"
        />
        <AnalyticsCard
          icon={<Gauge size={16} />}
          iconBg="rgba(239,68,68,0.18)"
          iconColor="#F87171"
          label="Spending Frequency"
          value="2.4 / week"
          sub="On average"
        />
        <AnalyticsCard
          icon={<BarChart3 size={16} />}
          iconBg="rgba(139,92,246,0.18)"
          iconColor="#C084FC"
          label="Average Transaction"
          value={formatCurrency(Math.round(spent / 12))}
          sub="Per transaction"
        />
      </div>

      {/* ── Transactions section ──────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120]">
        {/* Section header + toolbar */}
        <div className="flex flex-col gap-3 border-b border-[#1A2540] px-5 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white">Transactions</h3>
            <p className="mt-0.5 text-xs text-[#5A6A85]">
              All transactions linked to this envelope
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#3A4A60]"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search transactions..."
                className="w-64 rounded-lg border border-[#1A2540] bg-[#0D1525] py-2 pr-3 pl-8 text-xs text-white transition-all placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2540] bg-[#0D1525] px-3 py-2 text-xs text-[#7A8BA8] transition-all hover:border-[#2A3A54] hover:text-white">
              <Filter size={12} />
              Filter
            </button>
            <SortDropdown
              value={sort}
              onChange={(v) => {
                setSort(v);
                setPage(1);
              }}
            />
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2540] bg-[#0D1525] px-3 py-2 text-xs text-[#7A8BA8] transition-all hover:border-[#2A3A54] hover:text-white">
              <Download size={12} />
              Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#0F1A2C] bg-[#080E1A]">
                {[
                  { label: "Date", cls: "w-28" },
                  { label: "Transaction Title", cls: "" },
                  { label: "Account", cls: "" },
                  { label: "Type", cls: "w-24" },
                  { label: "Amount", cls: "w-28 text-right" },
                  { label: "Running Impact", cls: "w-32 text-right" },
                  { label: "Status", cls: "w-28" },
                  { label: "Actions", cls: "w-20 text-right" },
                ].map(({ label, cls }) => (
                  <th
                    key={label}
                    className={cn(
                      "px-4 py-3 text-left text-[10px] font-bold tracking-wider text-[#5A6A85] uppercase",
                      cls,
                    )}
                  >
                    {label === "Amount" || label === "Running Impact" ? (
                      <span className="flex items-center justify-end gap-1">
                        {label} <ChevronDown size={9} />
                      </span>
                    ) : label === "Date" || label === "Actions" ? (
                      <span className="flex items-center gap-1">
                        {label} {label !== "Actions" && <ChevronDown size={9} />}
                      </span>
                    ) : (
                      label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0D1525]">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#3A4A60]">
                    No transactions found
                  </td>
                </tr>
              ) : (
                paged.map((tx, i) => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="group cursor-pointer transition-colors hover:bg-[#0D1828]"
                  >
                    {/* Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-[#8A9AB5]">{tx.date}</td>

                    {/* Title */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                          style={{ backgroundColor: "#1E2B42" }}
                        >
                          {tx.title[0]}
                        </div>
                        <span className="font-semibold text-[#C8D4E8]">{tx.title}</span>
                      </div>
                    </td>

                    {/* Account */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-[#8A9AB5]">
                        {tx.accountType === "bank" ? (
                          <Landmark size={12} className="text-[#5A6A85]" />
                        ) : (
                          <Wallet size={12} className="text-[#5A6A85]" />
                        )}
                        {tx.account}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: "rgba(239,68,68,0.12)",
                          color: "#F87171",
                          border: "1px solid rgba(239,68,68,0.2)",
                        }}
                      >
                        Expense
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-bold text-[#F87171] tabular-nums">
                        {formatCurrency(tx.amount)}
                      </span>
                    </td>

                    {/* Running impact */}
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={cn(
                          "font-medium tabular-nums",
                          tx.runningImpact >= 0 ? "text-[#8A9AB5]" : "text-[#8A9AB5]",
                        )}
                      >
                        {formatCurrency(tx.runningImpact)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <TxStatusBadge status={tx.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button className="rounded-lg p-1.5 text-[#3A4A60] transition-all hover:bg-[#1E2B42] hover:text-[#E8EEF8]">
                          <Edit2 size={13} />
                        </button>
                        <button className="rounded-lg p-1.5 text-[#3A4A60] transition-all hover:bg-[#1E2B42] hover:text-[#E8EEF8]">
                          <MoreHorizontal size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#131E30] px-5 py-3.5">
          <span className="text-xs text-[#5A6A85]">
            Showing{" "}
            <span className="font-medium text-[#A8B4CC]">
              {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-[#A8B4CC]">
              {Math.min(page * pageSize, filtered.length)}
            </span>{" "}
            of <span className="font-medium text-[#A8B4CC]">{filtered.length}</span> transactions
          </span>

          <div className="inline-flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-[#1A2640] p-1.5 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  n === page
                    ? "border border-[#6C3AED] text-white"
                    : "border border-[#1A2640] text-[#5A6A85] hover:bg-[#131C2E] hover:text-white",
                )}
                style={
                  n === page
                    ? { background: "linear-gradient(135deg, #6C3AED, #7C4AFF)" }
                    : undefined
                }
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="rounded-lg border border-[#1A2640] p-1.5 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
            <PageSizeSelect
              value={pageSize}
              onChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom notice ─────────────────────────────────── */}
      <div
        className="rounded-xl bg-[#0A1020] px-5 py-4"
        style={{ border: "1px solid rgba(108,58,237,0.2)" }}
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-2.5">
            <div
              className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(108,58,237,0.15)", color: "#A78BFA" }}
            >
              <Info size={13} />
            </div>
            <p className="text-[12px] leading-relaxed text-[#7A8BA8]">
              Spending is calculated automatically from linked transactions and cannot be edited
              directly.
            </p>
          </div>
          <div className="hidden w-px self-stretch bg-[#1A2540] sm:block" />
          <p className="flex-1 text-[12px] leading-relaxed text-[#7A8BA8] sm:pl-0">
            Historical transactions remain unchanged even if this envelope is archived.
          </p>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────── */}
      <AddTransactionModal
        open={addTxOpen}
        onClose={() => setAddTxOpen(false)}
        defaultType="expense"
      />
      {modifyOpen && envelope && activeBudgetId !== null && (
        <ModifyEnvelopeModal
          open={modifyOpen}
          onClose={() => setModifyOpen(false)}
          envelope={envelope}
          budgetId={activeBudgetId}
        />
      )}
      {archiveOpen && envelope && activeBudgetId !== null && (
        <ArchiveEnvelopeModal
          open={archiveOpen}
          onClose={() => setArchiveOpen(false)}
          envelope={envelope}
          budgetId={activeBudgetId}
          envelopes={apiEnvelopes}
        />
      )}
      <ForceDeleteEnvelopeDialog
        open={forceDeleteOpen}
        onOpenChange={setForceDeleteOpen}
        envelope={{ id: envelopeIdNum, title: envelope?.name ?? "Envelope" }}
        budgetId={activeBudgetId ?? 0}
      />
    </div>
  );
}
