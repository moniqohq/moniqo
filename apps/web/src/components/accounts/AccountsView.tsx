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
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Wallet,
  CreditCard,
  PiggyBank,
  Plus,
  Upload,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Check,
  Archive,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { useUIStore } from "@/stores/ui.store";
import { useAccounts } from "@/hooks/use-accounts";
import { useAccountBalanceHistory } from "@/hooks/use-account-balance-history";
import type { ApiBalancePoint } from "@/lib/api/types";
import { formatCurrency, formatCurrencyCompact, cn } from "@/lib/utils";
import { AccountNavPanel } from "./AccountNavPanel";
import { AccountDetails } from "./AccountDetails";
import { AccountInsightsPanel } from "./AccountInsightsPanel";
import { AddAccountModal } from "./AddAccountModal";
import type { AccountType } from "@/types";
import { isFeatureEnabled } from "@/features/feature-flags";

/* ── Filter types ─────────────────────────────────────── */

type StatusFilter = "active" | "archived" | "all";
type TypeFilter = "all" | AccountType;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "Active Accounts" },
  { value: "archived", label: "Archived Accounts" },
  { value: "all", label: "All Accounts" },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Credit Card" },
  { value: "loan", label: "Loan" },
];

/* ── Filter dropdown ──────────────────────────────────── */

interface FilterDropdownProps {
  statusFilter: StatusFilter;
  typeFilter: TypeFilter;
  onStatusChange: (v: StatusFilter) => void;
  onTypeChange: (v: TypeFilter) => void;
}

function FilterDropdown({
  statusFilter,
  typeFilter,
  onStatusChange,
  onTypeChange,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeCount = (statusFilter !== "active" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
          open || activeCount > 0
            ? "border-[rgba(108,58,237,0.5)] bg-[rgba(108,58,237,0.08)] text-[#C4B5FD]"
            : "border-[#1A2540] text-[#A8B4CC] hover:border-[#2A3A54] hover:text-white",
        )}
      >
        <Filter size={15} />
        Filter
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#6C3AED] text-[10px] leading-none font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full right-0 z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623] shadow-2xl"
          >
            {/* Account Status section */}
            <div className="px-3 pt-3 pb-1">
              <p className="mb-1.5 text-[10px] font-bold tracking-widest text-[#3A4A60] uppercase">
                Account Status
              </p>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onStatusChange(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                    statusFilter === opt.value
                      ? "bg-[rgba(108,58,237,0.15)] text-white"
                      : "text-[#A8B4CC] hover:bg-[#1A2540] hover:text-white",
                  )}
                >
                  {opt.label}
                  {statusFilter === opt.value && (
                    <Check size={13} className="flex-shrink-0 text-[#A78BFA]" />
                  )}
                </button>
              ))}
            </div>

            {/* Separator */}
            <div className="mx-3 my-2 h-px bg-[#1E2B42]" />

            {/* Account Type section */}
            <div className="px-3 pt-1 pb-3">
              <p className="mb-1.5 text-[10px] font-bold tracking-widest text-[#3A4A60] uppercase">
                Account Type
              </p>
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onTypeChange(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                    typeFilter === opt.value
                      ? "bg-[rgba(108,58,237,0.15)] text-white"
                      : "text-[#A8B4CC] hover:bg-[#1A2540] hover:text-white",
                  )}
                >
                  {opt.label}
                  {typeFilter === opt.value && (
                    <Check size={13} className="flex-shrink-0 text-[#A78BFA]" />
                  )}
                </button>
              ))}
            </div>

            {/* Clear link */}
            {activeCount > 0 && (
              <>
                <div className="mx-3 h-px bg-[#1E2B42]" />
                <div className="px-3 py-2">
                  <button
                    onClick={() => {
                      onStatusChange("active");
                      onTypeChange("all");
                    }}
                    className="text-xs text-[#5A6A85] transition-colors hover:text-[#A78BFA]"
                  >
                    Clear all filters
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Archived toggle ──────────────────────────────────── */

function ArchivedToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
        checked
          ? "border-[rgba(108,58,237,0.5)] bg-[rgba(108,58,237,0.08)] text-[#C4B5FD]"
          : "border-[#1A2540] text-[#A8B4CC] hover:border-[#2A3A54] hover:text-white",
      )}
    >
      <Archive size={15} />
      Show archived
    </button>
  );
}

/* ── Summary card ────────────────────────────────────── */

function SparkTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey?: string; name?: string }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-[#1E2B42] bg-[#131C2E] px-2 py-1 text-[11px] text-white shadow-xl">
      {formatCurrencyCompact(payload[0].value)}
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  accentColor?: string;
  label: string;
  value: string;
  changeLabel: string;
  positive?: boolean;
  sparkData?: { v: number }[];
}

function SummaryCard({
  icon,
  iconColor,
  iconBg,
  accentColor = "#6C3AED",
  label,
  value,
  changeLabel,
  positive,
  sparkData,
}: SummaryCardProps) {
  const gradId = `spark-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 rounded-2xl border border-[#1A2540] bg-[#0B1120] p-4 transition-colors hover:border-[#2A3A54]"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-medium text-[#5A6A85]">{label}</p>
          <p className="truncate text-lg font-bold text-white tabular-nums">{value}</p>
          <div className="mt-1 flex items-center gap-1">
            {positive !== undefined &&
              (positive ? (
                <TrendingUp size={11} className="flex-shrink-0 text-[#22C55E]" />
              ) : (
                <TrendingDown size={11} className="flex-shrink-0 text-[#F87171]" />
              ))}
            <span
              className={cn(
                "truncate text-[10px] font-medium",
                positive === undefined
                  ? "text-[#5A6A85]"
                  : positive
                    ? "text-[#4ADE80]"
                    : "text-[#F87171]",
              )}
            >
              {changeLabel}
            </span>
          </div>
        </div>
      </div>

      {sparkData && (
        <div className="-mx-1 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<SparkTooltip />} />
              <Area
                type="monotone"
                dataKey="v"
                stroke={accentColor}
                strokeWidth={1.5}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 3, fill: accentColor, stroke: "#080C14", strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

/* ── Empty state ─────────────────────────────────────── */

function EmptyState({ status, hasTypeFilter }: { status: StatusFilter; hasTypeFilter: boolean }) {
  const content = hasTypeFilter
    ? { title: "No matching accounts", desc: "Try changing your filter selections." }
    : status === "archived"
      ? {
          title: "No archived accounts",
          desc: "Archived accounts will appear here when you archive an account.",
        }
      : {
          title: "No active accounts found",
          desc: "Try adjusting your filters or create a new account.",
        };

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#1A2540] bg-[#0B1120] px-6 py-16 text-center">
      <p className="mb-1 text-base font-semibold text-[#A8B4CC]">{content.title}</p>
      <p className="text-sm text-[#5A6A85]">{content.desc}</p>
    </div>
  );
}

/* ── Trend helpers ───────────────────────────────────── */

/** Percent change from the first to the last point in a balance series, formatted for a card's changeLabel. */
function pctChange(
  points: ApiBalancePoint[] | undefined,
  suffix: string,
  invert = false,
): { changeLabel: string; positive: boolean } {
  if (!points || points.length < 2 || points[0].balance === 0) {
    return { changeLabel: suffix, positive: true };
  }
  const first = points[0].balance;
  const last = points[points.length - 1].balance;
  const rawPct = ((last - first) / Math.abs(first)) * 100;
  const pct = invert ? -rawPct : rawPct;
  const sign = pct >= 0 ? "+" : "";
  return { changeLabel: `${sign}${pct.toFixed(1)}% ${suffix}`, positive: pct >= 0 };
}

/* ── main view ───────────────────────────────────────── */

export function AccountsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeBudgetId = useUIStore((s) => s.activeBudgetId);

  const initialStatus = (searchParams.get("status") ?? "active") as StatusFilter;
  const initialType = (searchParams.get("type") ?? "all") as TypeFilter;
  const initialAccountParam = searchParams.get("account");
  const initialAccountId = initialAccountParam ? Number(initialAccountParam) : null;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialType);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const showArchived = statusFilter !== "active";
  const {
    data: accounts,
    isLoading,
    error: accountsError,
  } = useAccounts(activeBudgetId, statusFilter);
  const isError = !!accountsError;

  const { data: history } = useAccountBalanceHistory(activeBudgetId);

  function handleShowArchivedChange(v: boolean) {
    handleStatusChange(v ? "all" : "active");
  }

  /* Status filtering happens server-side; only apply type + search here */
  const filteredAccounts = accounts.filter((account) => {
    const typeMatch = typeFilter === "all" || account.type === typeFilter;
    const searchMatch = !search || account.name.toLowerCase().includes(search.toLowerCase());
    return typeMatch && searchMatch;
  });

  const [selectedId, setSelectedId] = useState<number | null>(initialAccountId);

  /* Persist the selected account to the URL so a reload keeps the user on it */
  function handleSelect(id: number) {
    setSelectedId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("account", String(id));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  /* Auto-select first visible account when filters change or accounts load */
  useEffect(() => {
    if (!filteredAccounts.find((a) => a.id === selectedId) && filteredAccounts.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(filteredAccounts[0].id);
    }
  }, [filteredAccounts, selectedId]);

  /* Sync filters to URL */
  function updateFilter(key: "status" | "type", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const isDefault =
      (key === "status" && value === "active") || (key === "type" && value === "all");
    if (isDefault) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleStatusChange(v: StatusFilter) {
    setStatusFilter(v);
    updateFilter("status", v);
  }

  function handleTypeChange(v: TypeFilter) {
    setTypeFilter(v);
    updateFilter("type", v);
  }

  /* Summary calculations exclude archived accounts */
  const allActive = accounts.filter((a) => !a.isArchived);
  const cashAndChecking = allActive.filter((a) => a.type === "checking" || a.type === "cash");
  const totalCash = cashAndChecking.reduce((s, a) => s + a.balance, 0);
  const creditAccounts = allActive.filter((a) => a.type === "credit");
  const creditDebt = Math.abs(creditAccounts.reduce((s, a) => s + Math.min(0, a.balance), 0));
  const savingsAccounts = allActive.filter((a) => a.type === "savings");
  const savingsBalance = savingsAccounts.reduce((s, a) => s + a.balance, 0);
  const netWorth = totalCash + savingsBalance - creditDebt;
  const totalAssets = totalCash + savingsBalance;
  const assetPct =
    totalAssets > 0 ? Math.round((totalAssets / (totalAssets + creditDebt)) * 100) : 100;

  const cashTrend = pctChange(history?.cash, "from last month");
  const creditTrend = pctChange(history?.credit, "vs last month", /* invert */ true);
  const savingsTrend = pctChange(history?.savings, "growth MTD");
  const netWorthTrend = pctChange(history?.netWorth, "this month");

  const summaryCards: SummaryCardProps[] = [
    {
      icon: <Wallet size={24} />,
      iconColor: "#22C55E",
      iconBg: "rgba(34,197,94,0.15)",
      accentColor: "#22C55E",
      label: "Total Cash Balance",
      value: formatCurrency(totalCash),
      changeLabel: cashTrend.changeLabel,
      positive: cashTrend.positive,
      sparkData: history?.cash.map((p) => ({ v: p.balance })),
    },
    {
      icon: <CreditCard size={24} />,
      iconColor: "#F87171",
      iconBg: "rgba(239,68,68,0.15)",
      accentColor: "#F87171",
      label: "Credit Card Debt",
      value: formatCurrency(creditDebt),
      changeLabel: creditTrend.changeLabel,
      positive: creditTrend.positive,
      sparkData: history?.credit.map((p) => ({ v: p.balance })),
    },
    {
      icon: <PiggyBank size={24} />,
      iconColor: "#3B82F6",
      iconBg: "rgba(59,130,246,0.15)",
      accentColor: "#3B82F6",
      label: "Savings Balance",
      value: formatCurrency(savingsBalance),
      changeLabel: savingsTrend.changeLabel,
      positive: savingsTrend.positive,
      sparkData: history?.savings.map((p) => ({ v: p.balance })),
    },
  ];

  const selectedAccount = filteredAccounts.find((a) => a.id === selectedId) ?? filteredAccounts[0];

  if (isLoading) {
    return (
      <div className="layout-page py-6">
        <div className="mb-4 h-8 w-40 animate-pulse rounded-lg bg-[#111B2D]" />
        <div className="mb-6 grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-[#0F1623]" />
          ))}
        </div>
        <div className="grid grid-cols-[220px_1fr_280px] gap-4">
          <div className="h-[520px] animate-pulse rounded-2xl bg-[#0F1623]" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-[#0F1623]" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-[#0F1623]" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="layout-page flex h-64 flex-col items-center justify-center gap-3 py-6">
        <p className="text-sm text-[#EF4444]">Failed to load accounts.</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-[#1A2540] px-4 py-2 text-sm text-[#A8B4CC] hover:border-[#2A3A54] hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="layout-page py-6">
      {/* Page header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="mt-0.5 text-sm text-[#5A6A85]">
            Manage your financial ledgers and balances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#5A6A85]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search accounts…"
              className="w-72 rounded-xl border border-[#1A2540] bg-transparent py-2.5 pr-3 pl-8 text-sm text-[#A8B4CC] placeholder-[#5A6A85] transition-colors hover:border-[#2A3A54] focus:border-[#2A3A54] focus:outline-none"
            />
          </div>
          <ArchivedToggle checked={showArchived} onChange={handleShowArchivedChange} />
          {isFeatureEnabled("accountFilters") && (
            <FilterDropdown
              statusFilter={statusFilter}
              typeFilter={typeFilter}
              onStatusChange={handleStatusChange}
              onTypeChange={handleTypeChange}
            />
          )}
          {isFeatureEnabled("accountImport") && (
            <button className="inline-flex items-center gap-2 rounded-xl border border-[#1A2540] px-4 py-2.5 text-sm font-semibold text-[#A8B4CC] transition-colors hover:border-[#2A3A54] hover:text-white">
              <Upload size={15} />
              Import
            </button>
          )}
          <button
            onClick={() => setAddModalOpen(true)}
            className="mr-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(108,58,237,0.35)] transition-all hover:from-[#6C3AED] hover:to-[#7C4AFF] hover:shadow-[0_0_28px_rgba(108,58,237,0.5)]"
          >
            <Plus size={15} />
            Add Account
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-[1fr_1fr_1fr_1.6fr]">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}

        {/* Net Worth card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="flex flex-col justify-between rounded-2xl border border-[#1A2540] bg-[#0B1120] p-4 transition-colors hover:border-[#2A3A54]"
        >
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="mb-1 text-xs font-medium text-[#5A6A85]">Net Worth</p>
              <p className="text-2xl font-bold text-white tabular-nums">
                {formatCurrency(netWorth)}
              </p>
              <div className="mt-1 flex items-center gap-1">
                {netWorthTrend.positive ? (
                  <TrendingUp size={11} className="text-[#22C55E]" />
                ) : (
                  <TrendingDown size={11} className="text-[#F87171]" />
                )}
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    netWorthTrend.positive ? "text-[#4ADE80]" : "text-[#F87171]",
                  )}
                >
                  {netWorthTrend.changeLabel}
                </span>
              </div>
            </div>
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(108,58,237,0.15)", color: "#6C3AED" }}
            >
              <ArrowUpRight size={18} />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex justify-between text-[10px] text-[#5A6A85]">
              <span>
                Assets{" "}
                <span className="font-semibold text-[#22C55E]">{formatCurrency(totalAssets)}</span>
              </span>
              <span>
                Liabilities{" "}
                <span className="font-semibold text-[#F87171]">{formatCurrency(creditDebt)}</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#1A2540]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#3B82F6]"
                style={{ width: `${assetPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-[#5A6A85]">
              {assetPct}% assets · {100 - assetPct}% liabilities
            </p>
          </div>
        </motion.div>
      </div>

      {/* 3-column layout */}
      {filteredAccounts.length === 0 ? (
        <EmptyState status={statusFilter} hasTypeFilter={typeFilter !== "all" || !!search} />
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[260px_1fr_256px]">
          <AccountNavPanel
            accounts={filteredAccounts}
            selectedId={selectedAccount?.id ?? 0}
            onSelect={handleSelect}
            onCreateAccount={() => setAddModalOpen(true)}
          />
          {selectedAccount != null && (
            <AccountDetails accountId={selectedAccount.id} budgetId={selectedAccount.budgetId} />
          )}
          {selectedAccount != null && (
            <AccountInsightsPanel
              accountId={selectedAccount.id}
              budgetId={selectedAccount.budgetId}
              isArchived={selectedAccount.isArchived}
            />
          )}
        </div>
      )}

      <AddAccountModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
}
