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
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  LayoutGrid,
  SlidersHorizontal,
  ArrowUpDown,
  Pencil,
  PlusCircle,
  Archive,
  Home,
  ShoppingCart,
  Zap,
  UtensilsCrossed,
  ShoppingBag,
  Gamepad2,
  Bus,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Shield,
  Star,
  Heart,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, cn } from "@/lib/utils";
import { AddEnvelopeModal } from "./AddEnvelopeModal";
import { ModifyEnvelopeModal } from "./ModifyEnvelopeModal";
import { ArchiveEnvelopeModal } from "./ArchiveEnvelopeModal";
import { EnvelopeDetails } from "./EnvelopeDetails";

/* ── Local types ────────────────────────────────────────── */
type Nature = "Must" | "Need" | "Should" | "Want";
type Status = "Healthy" | "Warning" | "Fully Used" | "Overspent";

interface EnvelopeRow {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  nature: Nature;
  allocated: number;
  spent: number;
}

/* ── Mock envelope data ─────────────────────────────────── */
const MOCK_ENVELOPES: EnvelopeRow[] = [
  {
    id: "e1",
    name: "Rent",
    description: "Monthly house rent",
    iconKey: "home",
    nature: "Must",
    allocated: 17700,
    spent: 17700,
  },
  {
    id: "e2",
    name: "Groceries",
    description: "Food & groceries",
    iconKey: "cart",
    nature: "Need",
    allocated: 8000,
    spent: 5200,
  },
  {
    id: "e3",
    name: "Utilities",
    description: "Electricity, Water, Gas",
    iconKey: "zap",
    nature: "Should",
    allocated: 3000,
    spent: 2550,
  },
  {
    id: "e4",
    name: "Dining Out",
    description: "Restaurants & cafes",
    iconKey: "dining",
    nature: "Want",
    allocated: 2800,
    spent: 4050,
  },
  {
    id: "e5",
    name: "Shopping",
    description: "Clothing & accessories",
    iconKey: "bag",
    nature: "Want",
    allocated: 3650,
    spent: 2100,
  },
  {
    id: "e6",
    name: "Entertainment",
    description: "Movies, streaming, games",
    iconKey: "game",
    nature: "Should",
    allocated: 1200,
    spent: 950,
  },
  {
    id: "e7",
    name: "Transport",
    description: "Fuel, bus, metro",
    iconKey: "bus",
    nature: "Need",
    allocated: 2800,
    spent: 1950,
  },
  {
    id: "e8",
    name: "Savings – Emergency",
    description: "Emergency fund",
    iconKey: "piggy",
    nature: "Need",
    allocated: 15000,
    spent: 3100,
  },
  {
    id: "e9",
    name: "Debt – Credit Card",
    description: "Card payments",
    iconKey: "card",
    nature: "Must",
    allocated: 8500,
    spent: 8500,
  },
  {
    id: "e10",
    name: "Investments",
    description: "Index funds & SIPs",
    iconKey: "invest",
    nature: "Should",
    allocated: 5350,
    spent: 2450,
  },
  {
    id: "e11",
    name: "Health",
    description: "Medical & wellness",
    iconKey: "shield",
    nature: "Need",
    allocated: 3000,
    spent: 800,
  },
  {
    id: "e12",
    name: "Subscriptions",
    description: "Apps & streaming",
    iconKey: "game",
    nature: "Want",
    allocated: 2500,
    spent: 2490,
  },
  {
    id: "e13",
    name: "Education",
    description: "Courses & books",
    iconKey: "invest",
    nature: "Should",
    allocated: 2000,
    spent: 900,
  },
  {
    id: "e14",
    name: "Travel",
    description: "Flights & hotels",
    iconKey: "bus",
    nature: "Want",
    allocated: 5000,
    spent: 0,
  },
  {
    id: "e15",
    name: "Gifts",
    description: "Birthdays & occasions",
    iconKey: "bag",
    nature: "Want",
    allocated: 1500,
    spent: 650,
  },
  {
    id: "e16",
    name: "Insurance",
    description: "Life & health cover",
    iconKey: "shield",
    nature: "Must",
    allocated: 4200,
    spent: 4200,
  },
  {
    id: "e17",
    name: "Pet Care",
    description: "Food & vet",
    iconKey: "home",
    nature: "Need",
    allocated: 1800,
    spent: 1200,
  },
  {
    id: "e18",
    name: "Household",
    description: "Cleaning & maintenance",
    iconKey: "home",
    nature: "Should",
    allocated: 1500,
    spent: 710,
  },
];

/* ── Derived computations ───────────────────────────────── */
function getRemaining(row: EnvelopeRow) {
  return row.allocated - row.spent;
}
function getPct(row: EnvelopeRow) {
  return row.allocated > 0 ? (row.spent / row.allocated) * 100 : 0;
}
function getStatus(row: EnvelopeRow): Status {
  const pct = getPct(row);
  if (pct > 100) return "Overspent";
  if (pct === 100) return "Fully Used";
  if (pct >= 80) return "Warning";
  return "Healthy";
}

/* ── Envelope icons ─────────────────────────────────────── */
const ICON_MAP: Record<string, { el: React.ReactNode; bg: string; color: string }> = {
  home: { el: <Home size={14} />, bg: "rgba(59,130,246,0.18)", color: "#60A5FA" },
  cart: { el: <ShoppingCart size={14} />, bg: "rgba(34,197,94,0.18)", color: "#4ADE80" },
  zap: { el: <Zap size={14} />, bg: "rgba(245,158,11,0.18)", color: "#FCD34D" },
  dining: { el: <UtensilsCrossed size={14} />, bg: "rgba(239,68,68,0.18)", color: "#F87171" },
  bag: { el: <ShoppingBag size={14} />, bg: "rgba(236,72,153,0.18)", color: "#F472B6" },
  game: { el: <Gamepad2 size={14} />, bg: "rgba(108,58,237,0.18)", color: "#A78BFA" },
  bus: { el: <Bus size={14} />, bg: "rgba(245,158,11,0.18)", color: "#FCD34D" },
  piggy: { el: <PiggyBank size={14} />, bg: "rgba(249,115,22,0.18)", color: "#FB923C" },
  card: { el: <CreditCard size={14} />, bg: "rgba(59,130,246,0.18)", color: "#60A5FA" },
  invest: { el: <TrendingUp size={14} />, bg: "rgba(20,184,166,0.18)", color: "#2DD4BF" },
  shield: { el: <Shield size={14} />, bg: "rgba(34,197,94,0.18)", color: "#4ADE80" },
};

/* ── Nature badge ───────────────────────────────────────── */
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
      {c.icon}
      {nature}
    </span>
  );
}

/* ── Status badge ───────────────────────────────────────── */
function StatusBadge({ status }: { status: Status }) {
  const cfg: Record<Status, { bg: string; text: string }> = {
    Healthy: { bg: "rgba(34,197,94,0.12)", text: "#4ADE80" },
    Warning: { bg: "rgba(245,158,11,0.12)", text: "#FCD34D" },
    "Fully Used": { bg: "rgba(59,130,246,0.12)", text: "#60A5FA" },
    Overspent: { bg: "rgba(239,68,68,0.12)", text: "#F87171" },
  };
  const c = cfg[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}

/* ── Progress bar ───────────────────────────────────────── */
function EnvelopeProgress({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const color = pct > 100 ? "#EF4444" : pct >= 80 ? "#F59E0B" : pct === 100 ? "#3B82F6" : "#22C55E";

  return (
    <div className="flex min-w-[120px] items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1A2640]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${capped}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-9 text-right text-xs text-[#A8B4CC] tabular-nums">{Math.round(pct)}%</span>
    </div>
  );
}

/* ── Row actions ────────────────────────────────────────── */
function RowActions({
  onAddTransaction,
  onModify,
  onArchive,
}: {
  onAddTransaction: () => void;
  onModify: () => void;
  onArchive: () => void;
}) {
  const btnCls =
    "p-1.5 rounded-lg text-[#5A6A85] hover:text-[#E8EEF8] hover:bg-[#1E2B42] transition-all focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30";
  return (
    <div className="flex items-center gap-0.5">
      <button onClick={onAddTransaction} title="Add Transaction" className={btnCls}>
        <PlusCircle size={13} />
      </button>
      <button onClick={onModify} title="Modify Envelope" className={btnCls}>
        <Pencil size={13} />
      </button>
      <button onClick={onArchive} title="Archive Envelope" className={btnCls}>
        <Archive size={13} />
      </button>
    </div>
  );
}

/* ── Sort dropdown ──────────────────────────────────────── */
const SORT_OPTIONS = [
  "A–Z",
  "Highest Allocated",
  "Highest Spent",
  "Most Remaining",
  "Overspent First",
];

function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm whitespace-nowrap transition-all",
          "border-[#1A2640] bg-[#080D1A] text-[#7A8BA8]",
          "hover:border-[#2A3A54] hover:text-[#C8D4E8]",
          "focus:ring-2 focus:ring-[#6C3AED]/25 focus:outline-none",
          open && "border-[#6C3AED]/60 text-[#A8B4CC]",
        )}
      >
        <ArrowUpDown size={12} />
        Sort: {value}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-[#1A2640] bg-[#0D1B2E] py-1 shadow-lg">
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

/* ── Filter dropdown ────────────────────────────────────── */
const FILTER_NATURES: Nature[] = ["Must", "Need", "Should", "Want"];
const FILTER_STATUSES: Status[] = ["Healthy", "Warning", "Fully Used", "Overspent"];

function FilterDropdown({
  natures,
  onNatures,
  statuses,
  onStatuses,
}: {
  natures: Set<Nature>;
  onNatures: (s: Set<Nature>) => void;
  statuses: Set<Status>;
  onStatuses: (s: Set<Status>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const total = natures.size + statuses.size;

  function toggleNature(n: Nature) {
    const s = new Set(natures);
    if (s.has(n)) {
      s.delete(n);
    } else {
      s.add(n);
    }
    onNatures(s);
  }
  function toggleStatus(s: Status) {
    const set = new Set(statuses);
    if (set.has(s)) {
      set.delete(s);
    } else {
      set.add(s);
    }
    onStatuses(set);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm whitespace-nowrap transition-all",
          "border-[#1A2640] bg-[#080D1A] text-[#7A8BA8]",
          "hover:border-[#2A3A54] hover:text-[#C8D4E8]",
          "focus:ring-2 focus:ring-[#6C3AED]/25 focus:outline-none",
          open && "border-[#6C3AED]/60 text-[#A8B4CC]",
        )}
      >
        <SlidersHorizontal size={12} />
        Filter
        {total > 0 && (
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#6C3AED] text-[9px] font-bold text-white">
            {total}
          </span>
        )}
        <ChevronDown size={11} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-[#1A2640] bg-[#0D1B2E] shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1A2640] px-3 py-2">
            <span className="text-[11px] font-semibold tracking-wider text-[#3A4A60] uppercase">
              Filters
            </span>
            {total > 0 && (
              <button
                onClick={() => {
                  onNatures(new Set());
                  onStatuses(new Set());
                }}
                className="text-[11px] text-[#6C3AED] transition-colors hover:text-[#7C4AFF]"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="px-3 pt-2 pb-1">
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-[#3A4A60] uppercase">
              Nature
            </p>
            {FILTER_NATURES.map((n) => {
              const checked = natures.has(n);
              return (
                <button
                  key={n}
                  onClick={() => toggleNature(n)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
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
                  <NatureBadge nature={n} />
                </button>
              );
            })}
          </div>

          <div className="px-3 pt-1 pb-2">
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-[#3A4A60] uppercase">
              Status
            </p>
            {FILTER_STATUSES.map((s) => {
              const checked = statuses.has(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
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
                  <StatusBadge status={s} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page size dropdown ─────────────────────────────────── */
const PAGE_SIZES = [10, 25, 50];

function PageSizeSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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

/* ── Summary stat card ──────────────────────────────────── */
function SummaryCard({
  icon,
  iconBg,
  iconColor,
  title,
  amount,
  sub,
  subColor,
  barColor,
  barPct,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  amount: string;
  sub: string;
  subColor?: string;
  barColor: string;
  barPct: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#1A2640] bg-[#0B1220] p-4 transition-colors hover:border-[#2A3A54]">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs whitespace-nowrap text-[#5A6A85]">{title}</p>
          <p className="mt-0.5 truncate text-xl leading-tight font-bold text-[#E8EEF8] tabular-nums">
            {amount}
          </p>
          <p className="mt-0.5 truncate text-xs" style={{ color: subColor ?? "#5A6A85" }}>
            {sub}
          </p>
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[#1A2640]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(barPct, 100)}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

/* ── Budget health radial ───────────────────────────────── */
function HealthRadial({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (score / 100) * circ * 0.75;
  const color = score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#EF4444";
  const label = score >= 80 ? "Good" : score >= 60 ? "Fair" : "Poor";
  const sublabel = score >= 80 ? "On track" : score >= 60 ? "Watch spending" : "Review budget";

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[120px] w-[120px] flex-shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-[135deg]">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="#1A2640"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-[#E8EEF8] tabular-nums">{score}</span>
        </div>
      </div>
      <div>
        <p className="text-lg font-semibold" style={{ color }}>
          {label}
        </p>
        <p className="text-xs text-[#5A6A85]">{sublabel}</p>
        <p className="mt-2 max-w-[120px] text-[11px] leading-relaxed text-[#3A4A60]">
          You&apos;re doing great! Keep it up.
        </p>
      </div>
    </div>
  );
}

/* ── Allocation donut ───────────────────────────────────── */
const ALLOCATION_SLICES = [
  { name: "Essentials", value: 40, color: "#6C3AED" },
  { name: "Lifestyle", value: 25, color: "#22C55E" },
  { name: "Savings", value: 20, color: "#3B82F6" },
  { name: "Debt", value: 12, color: "#EF4444" },
  { name: "Investments", value: 3, color: "#F59E0B" },
];

function AllocationDonut() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-[90px] w-[90px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={ALLOCATION_SLICES}
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={42}
              dataKey="value"
              strokeWidth={0}
            >
              {ALLOCATION_SLICES.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded border border-[#1E2B42] bg-[#131C2E] px-2 py-1 text-[11px] text-white shadow-xl">
                    {d.name}: {d.value}%
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {ALLOCATION_SLICES.map((s) => (
          <div key={s.name} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <div
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="truncate text-[11px] text-[#A8B4CC]">{s.name}</span>
            </div>
            <span className="flex-shrink-0 text-[11px] font-medium text-[#5A6A85]">{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sidebar card wrapper ───────────────────────────────── */
function SideCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#1A2640] bg-[#0B1220] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#E8EEF8]">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────── */
export function EnvelopesView() {
  const [addOpen, setAddOpen] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [sort, setSort] = useState("A–Z");
  const [filterNatures, setFilterNatures] = useState<Set<Nature>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<Status>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* Filtering + sorting */
  const filtered = MOCK_ENVELOPES.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterNatures.size > 0 && !filterNatures.has(e.nature)) return false;
    if (filterStatuses.size > 0 && !filterStatuses.has(getStatus(e))) return false;
    return true;
  }).sort((a, b) => {
    switch (sort) {
      case "Highest Allocated":
        return b.allocated - a.allocated;
      case "Highest Spent":
        return b.spent - a.spent;
      case "Most Remaining":
        return getRemaining(b) - getRemaining(a);
      case "Overspent First":
        return getRemaining(a) < 0 ? -1 : 1;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* Summary stats */
  const totalAllocated = MOCK_ENVELOPES.reduce((s, e) => s + e.allocated, 0);
  const totalSpent = MOCK_ENVELOPES.reduce((s, e) => s + e.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overspentRows = MOCK_ENVELOPES.filter((e) => getRemaining(e) < 0);
  const totalOverspent = overspentRows.reduce((s, e) => s + Math.abs(getRemaining(e)), 0);
  const toBeBudgeted = 18500;

  if (selectedId) {
    return (
      <div className="layout-page py-6">
        <div className="mb-5">
          <button
            onClick={() => setSelectedId(null)}
            className="inline-flex items-center gap-1.5 text-sm text-[#7A8BA8] transition-colors hover:text-[#E8EEF8]"
          >
            <ChevronLeft size={15} />
            Back to Envelopes
          </button>
        </div>
        <EnvelopeDetails envelopeId={selectedId} />
      </div>
    );
  }

  return (
    <div className="layout-page py-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-white">Envelopes</h1>
          <p className="mt-0.5 text-[13px] text-[#5A6A85]">
            Plan and track your budget allocations
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={13} className="text-[#3A4A60]" />
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search envelopes..."
              className="block w-72 rounded-lg border border-[#1A2640] bg-[#080D1A] py-2 pr-3 pl-9 text-sm text-[#A8B4CC] transition-colors placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/25 focus:outline-none"
            />
          </div>

          <FilterDropdown
            natures={filterNatures}
            onNatures={(s) => {
              setFilterNatures(s);
              setPage(1);
            }}
            statuses={filterStatuses}
            onStatuses={(s) => {
              setFilterStatuses(s);
              setPage(1);
            }}
          />

          <SortDropdown value={sort} onChange={setSort} />

          {/* View toggle */}
          <div className="flex items-center overflow-hidden rounded-lg border border-[#1A2640]">
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-2 transition-colors",
                view === "list"
                  ? "bg-[#6C3AED] text-white"
                  : "bg-[#080D1A] text-[#5A6A85] hover:text-[#A8B4CC]",
              )}
            >
              <LayoutList size={15} />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn(
                "p-2 transition-colors",
                view === "grid"
                  ? "bg-[#6C3AED] text-white"
                  : "bg-[#080D1A] text-[#5A6A85] hover:text-[#A8B4CC]",
              )}
            >
              <LayoutGrid size={15} />
            </button>
          </div>

          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#6C3AED] bg-[#6C3AED] px-4 py-2 text-sm font-medium whitespace-nowrap text-white shadow-sm transition-colors hover:bg-[#7C4AFF] focus:ring-2 focus:ring-[#6C3AED]/50 focus:outline-none"
          >
            <Plus size={14} />
            Add Envelope
          </button>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          icon={<TrendingUp size={18} />}
          iconBg="rgba(108,58,237,0.18)"
          iconColor="#A78BFA"
          title="Total Allocated"
          amount={formatCurrency(totalAllocated)}
          sub="100% of budget"
          barColor="#6C3AED"
          barPct={100}
        />
        <SummaryCard
          icon={<ShoppingBag size={18} />}
          iconBg="rgba(59,130,246,0.18)"
          iconColor="#60A5FA"
          title="Total Spent"
          amount={formatCurrency(totalSpent)}
          sub={`${Math.round((totalSpent / totalAllocated) * 100)}% of allocated`}
          barColor="#3B82F6"
          barPct={(totalSpent / totalAllocated) * 100}
        />
        <SummaryCard
          icon={<TrendingUp size={18} />}
          iconBg="rgba(34,197,94,0.18)"
          iconColor="#4ADE80"
          title="Remaining Budget"
          amount={formatCurrency(totalRemaining)}
          sub={`${Math.round((totalRemaining / totalAllocated) * 100)}% remaining`}
          subColor="#4ADE80"
          barColor="#22C55E"
          barPct={(totalRemaining / totalAllocated) * 100}
        />
        <SummaryCard
          icon={<AlertTriangle size={18} />}
          iconBg="rgba(239,68,68,0.18)"
          iconColor="#F87171"
          title="Overspent Categories"
          amount={String(overspentRows.length)}
          sub={`${formatCurrency(totalOverspent)} over`}
          subColor="#F87171"
          barColor="#EF4444"
          barPct={overspentRows.length > 0 ? 100 : 0}
        />
        <SummaryCard
          icon={<PiggyBank size={18} />}
          iconBg="rgba(108,58,237,0.18)"
          iconColor="#A78BFA"
          title="To Be Budgeted"
          amount={formatCurrency(toBeBudgeted)}
          sub="Available to assign"
          barColor="#6C3AED"
          barPct={35}
        />
      </div>

      {/* ── Split layout ────────────────────────────────── */}
      <div className="flex flex-col gap-4 xl:flex-row">
        {/* ── Main content ─────────────────────────────── */}
        <div className="min-w-0 flex-1">
          {/* Table / Grid */}
          {view === "list" ? (
            <div className="overflow-hidden rounded-xl border border-[#1A2640] bg-[#0B1220] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#080E1A] text-xs text-[#5A6A85] uppercase">
                    <tr>
                      <th className="px-4 py-3 tracking-wider">Envelope</th>
                      <th className="px-4 py-3 tracking-wider">Nature</th>
                      <th className="px-4 py-3 text-right tracking-wider">Allocated</th>
                      <th className="px-4 py-3 text-right tracking-wider">Spent</th>
                      <th className="px-4 py-3 text-right tracking-wider">Remaining</th>
                      <th className="px-4 py-3 tracking-wider">Progress</th>
                      <th className="px-4 py-3 tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F1A2C]">
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center text-sm text-[#5A6A85]">
                          No envelopes match your filters.
                        </td>
                      </tr>
                    ) : (
                      paged.map((env, i) => {
                        const remaining = getRemaining(env);
                        const pct = getPct(env);
                        const status = getStatus(env);
                        const icon = ICON_MAP[env.iconKey] ?? ICON_MAP.home;

                        const remainColor =
                          remaining < 0
                            ? "text-[#F87171]"
                            : remaining === 0
                              ? "text-[#60A5FA]"
                              : "text-[#4ADE80]";

                        return (
                          <motion.tr
                            key={env.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.018 }}
                            onClick={() => setSelectedId(env.id)}
                            className="group cursor-pointer transition-colors hover:bg-[#0D1828]"
                          >
                            {/* Envelope */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                                  style={{ backgroundColor: icon.bg, color: icon.color }}
                                >
                                  {icon.el}
                                </div>
                                <div>
                                  <p className="text-sm leading-tight font-medium text-[#E8EEF8]">
                                    {env.name}
                                  </p>
                                  <p className="mt-0.5 text-xs leading-tight text-[#5A6A85]">
                                    {env.description}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Nature */}
                            <td className="px-4 py-3">
                              <NatureBadge nature={env.nature} />
                            </td>

                            {/* Allocated */}
                            <td className="px-4 py-3 text-right text-sm whitespace-nowrap text-[#A8B4CC] tabular-nums">
                              {formatCurrency(env.allocated)}
                            </td>

                            {/* Spent */}
                            <td className="px-4 py-3 text-right text-sm whitespace-nowrap text-[#A8B4CC] tabular-nums">
                              {formatCurrency(env.spent)}
                            </td>

                            {/* Remaining */}
                            <td
                              className={cn(
                                "px-4 py-3 text-right text-sm font-semibold whitespace-nowrap tabular-nums",
                                remainColor,
                              )}
                            >
                              {remaining < 0
                                ? `-${formatCurrency(Math.abs(remaining))}`
                                : formatCurrency(remaining)}
                            </td>

                            {/* Progress */}
                            <td className="px-4 py-3">
                              <EnvelopeProgress pct={pct} />
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <StatusBadge status={status} />
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end">
                                <RowActions
                                  onAddTransaction={() => {}}
                                  onModify={() => setModifyOpen(true)}
                                  onArchive={() => setArchiveOpen(true)}
                                />
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-[#131E30] px-4 py-3">
                <span className="text-sm text-[#5A6A85]">
                  Showing{" "}
                  <span className="font-medium text-[#A8B4CC]">
                    {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-[#A8B4CC]">
                    {Math.min(page * pageSize, filtered.length)}
                  </span>{" "}
                  of <span className="font-medium text-[#A8B4CC]">{filtered.length}</span> envelopes
                </span>

                <div className="inline-flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-[#1A2640] p-1.5 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none",
                        n === page
                          ? "border border-[#6C3AED] bg-[#6C3AED] text-white"
                          : "border border-[#1A2640] text-[#5A6A85] hover:bg-[#131C2E] hover:text-white",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || totalPages === 0}
                    className="rounded-lg border border-[#1A2640] p-1.5 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-30"
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
          ) : (
            /* Grid view */
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {paged.length === 0 ? (
                <div className="col-span-full rounded-xl border border-[#1A2640] bg-[#0B1220] px-4 py-16 text-center text-sm text-[#5A6A85]">
                  No envelopes match your filters.
                </div>
              ) : (
                paged.map((env, i) => {
                  const remaining = getRemaining(env);
                  const pct = getPct(env);
                  const status = getStatus(env);
                  const icon = ICON_MAP[env.iconKey] ?? ICON_MAP.home;
                  const remainColor =
                    remaining < 0 ? "#F87171" : remaining === 0 ? "#60A5FA" : "#4ADE80";

                  return (
                    <motion.div
                      key={env.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setSelectedId(env.id)}
                      className="cursor-pointer rounded-xl border border-[#1A2640] bg-[#0B1220] p-4 transition-colors hover:border-[#2A3A54]"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: icon.bg, color: icon.color }}
                          >
                            {icon.el}
                          </div>
                          <div>
                            <p className="text-sm leading-tight font-medium text-[#E8EEF8]">
                              {env.name}
                            </p>
                            <p className="text-[11px] leading-tight text-[#5A6A85]">
                              {env.description}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={status} />
                      </div>

                      <div className="mb-1.5 flex items-center justify-between">
                        <NatureBadge nature={env.nature} />
                        <span
                          className="text-xs font-semibold tabular-nums"
                          style={{ color: remainColor }}
                        >
                          {remaining < 0
                            ? `-${formatCurrency(Math.abs(remaining))}`
                            : formatCurrency(remaining)}{" "}
                          left
                        </span>
                      </div>

                      <EnvelopeProgress pct={pct} />

                      <div className="mt-3 flex items-center justify-between border-t border-[#1A2640] pt-3">
                        <div>
                          <p className="text-[10px] tracking-wider text-[#3A4A60] uppercase">
                            Allocated
                          </p>
                          <p className="text-xs font-medium text-[#A8B4CC] tabular-nums">
                            {formatCurrency(env.allocated)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] tracking-wider text-[#3A4A60] uppercase">
                            Spent
                          </p>
                          <p className="text-xs font-medium text-[#A8B4CC] tabular-nums">
                            {formatCurrency(env.spent)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────── */}
        <div className="flex flex-shrink-0 flex-col gap-4 xl:w-[260px]">
          {/* Budget Health Score */}
          <SideCard title="Budget Health Score">
            <HealthRadial score={78} />
          </SideCard>

          {/* Top Spend */}
          <SideCard
            title="Top Spend"
            action={
              <button className="inline-flex items-center gap-1 text-xs text-[#6C3AED] transition-colors hover:text-[#7C4AFF]">
                View all <ArrowRight size={11} />
              </button>
            }
          >
            <div className="flex flex-col gap-2.5">
              {[...MOCK_ENVELOPES]
                .sort((a, b) => b.spent - a.spent)
                .slice(0, 2)
                .map((env) => {
                  const icon = ICON_MAP[env.iconKey] ?? ICON_MAP.home;
                  return (
                    <div key={env.id} className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: icon.bg, color: icon.color }}
                      >
                        {icon.el}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-[#A8B4CC]">{env.name}</p>
                        <p className="text-[11px] font-semibold text-[#A78BFA] tabular-nums">
                          {formatCurrency(env.spent)} spent
                        </p>
                      </div>
                    </div>
                  );
                })}
              {MOCK_ENVELOPES.length === 0 && (
                <p className="text-xs text-[#5A6A85]">No envelopes found.</p>
              )}
            </div>
          </SideCard>

          {/* Allocation Breakdown */}
          <SideCard title="Allocation Breakdown">
            <AllocationDonut />
          </SideCard>

          {/* Monthly Progress */}
          <SideCard title="Monthly Progress">
            <div className="mb-3 text-center">
              <p className="text-4xl font-bold text-[#4ADE80] tabular-nums">
                {Math.round((totalSpent / totalAllocated) * 100)}%
              </p>
              <p className="mt-1 text-xs text-[#5A6A85]">of budget used</p>
            </div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#1A2640]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min((totalSpent / totalAllocated) * 100, 100)}%`,
                  backgroundColor: "#22C55E",
                }}
              />
            </div>
            <p className="text-center text-[11px] text-[#5A6A85]">
              {formatCurrency(totalSpent)} spent of {formatCurrency(totalAllocated)} allocated
            </p>
          </SideCard>
        </div>
      </div>

      <AddEnvelopeModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ModifyEnvelopeModal open={modifyOpen} onClose={() => setModifyOpen(false)} />
      <ArchiveEnvelopeModal open={archiveOpen} onClose={() => setArchiveOpen(false)} />
    </div>
  );
}
