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
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  Plus,
  MoreHorizontal,
  Calendar,
  TrendingUp,
  Pause,
  Pencil,
  Trash2,
  Eye,
  Sparkles,
} from "lucide-react";
import { GoalDetailsModal } from "./GoalDetailsModal";
import { CreateGoalDialog } from "./CreateGoalDialog";
import { ModifyGoalDialog, type GoalFormData } from "./ModifyGoalDialog";
import { GoalCompletionDialog, type CompletionGoal } from "./GoalCompletionDialog";
import { DeleteGoalDialog, type DeleteGoalTarget } from "./DeleteGoalDialog";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";

// ─── Types ─────────────────────────────────────────────────────────────────

type GoalStatus = "on_track" | "slightly_behind" | "behind" | "completed" | "paused";
type GoalType =
  | "emergency_fund"
  | "vacation"
  | "vehicle"
  | "home"
  | "education"
  | "technology"
  | "custom";
type ViewMode = "grid" | "list";
type SortKey = "progress" | "target_date" | "target_amount" | "monthly" | "name";

interface Contributor {
  initials: string;
  color: string;
}

interface GoalData {
  id: string;
  name: string;
  displayName: string;
  type: GoalType;
  status: GoalStatus;
  targetAmount: number;
  savedAmount: number;
  monthlyContribution: number;
  targetDate?: string;
  iconEmoji: string;
  iconBg: string;
  ringColor: string;
  ringBg: string;
  contributors: Contributor[];
  recentContribution: number;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_GOALS: GoalData[] = [
  {
    id: "g1",
    name: "Emergency Fund",
    displayName: "Emergency Fund",
    type: "emergency_fund",
    status: "on_track",
    targetAmount: 120000,
    savedAmount: 72000,
    monthlyContribution: 8000,
    iconEmoji: "🛡️",
    iconBg: "#22C55E",
    ringColor: "#22D3EE",
    ringBg: "#0A2028",
    contributors: [
      { initials: "SA", color: "#6C3AED" },
      { initials: "MA", color: "#EC4899" },
      { initials: "+2", color: "#3B82F6" },
    ],
    recentContribution: 8000,
  },
  {
    id: "g2",
    name: "Goa Trip",
    displayName: "Goa Trip ✈️",
    type: "vacation",
    status: "slightly_behind",
    targetAmount: 60000,
    savedAmount: 27000,
    monthlyContribution: 5000,
    targetDate: "2025-08-01",
    iconEmoji: "🌅",
    iconBg: "#F59E0B",
    ringColor: "#F59E0B",
    ringBg: "#201500",
    contributors: [
      { initials: "SA", color: "#6C3AED" },
      { initials: "MA", color: "#22C55E" },
    ],
    recentContribution: 0,
  },
  {
    id: "g3",
    name: "MacBook Pro",
    displayName: "MacBook Pro 💻",
    type: "technology",
    status: "on_track",
    targetAmount: 180000,
    savedAmount: 135000,
    monthlyContribution: 15000,
    iconEmoji: "💻",
    iconBg: "#8B5CF6",
    ringColor: "#8B5CF6",
    ringBg: "#1A0D30",
    contributors: [
      { initials: "SA", color: "#6C3AED" },
      { initials: "KR", color: "#F59E0B" },
      { initials: "+1", color: "#3B82F6" },
    ],
    recentContribution: 15000,
  },
  {
    id: "g4",
    name: "Car Down Payment",
    displayName: "Car Down Payment 🚗",
    type: "vehicle",
    status: "behind",
    targetAmount: 500000,
    savedAmount: 125000,
    monthlyContribution: 16000,
    targetDate: "2027-12-01",
    iconEmoji: "🚗",
    iconBg: "#3B82F6",
    ringColor: "#FB7185",
    ringBg: "#22080E",
    contributors: [
      { initials: "SA", color: "#6C3AED" },
      { initials: "MA", color: "#EC4899" },
    ],
    recentContribution: 8000,
  },
  {
    id: "g5",
    name: "Japan Vacation",
    displayName: "Japan Vacation ✈️",
    type: "vacation",
    status: "completed",
    targetAmount: 250000,
    savedAmount: 250000,
    monthlyContribution: 10400,
    targetDate: "2026-05-24",
    iconEmoji: "✈️",
    iconBg: "#7C3AED",
    ringColor: "#A855F7",
    ringBg: "#1A0D30",
    contributors: [
      { initials: "SA", color: "#6C3AED" },
      { initials: "MA", color: "#EC4899" },
    ],
    recentContribution: 0,
  },
];

const STATS_DATA = [
  {
    title: "Total Goal Targets",
    value: "₹4,50,000",
    illustration: "🎯",
    gradFrom: "#1A0E35",
    gradTo: "#27194A",
    titleColor: "#C4B5FD",
    borderColor: "#6C3AED33",
  },
  {
    title: "Total Saved",
    value: "₹1,82,000",
    illustration: "💰",
    gradFrom: "#0A2215",
    gradTo: "#123020",
    titleColor: "#86EFAC",
    borderColor: "#22C55E33",
  },
  {
    title: "Remaining to Reach",
    value: "₹2,68,000",
    illustration: "⛰️",
    gradFrom: "#221500",
    gradTo: "#331E00",
    titleColor: "#FDE68A",
    borderColor: "#F59E0B33",
  },
  {
    title: "Active Goals",
    value: "6",
    illustration: "👥",
    gradFrom: "#071A30",
    gradTo: "#0D2540",
    titleColor: "#93C5FD",
    borderColor: "#3B82F633",
  },
  {
    title: "Monthly Contribution",
    value: "₹24,000",
    illustration: "🐷",
    gradFrom: "#220A18",
    gradTo: "#330D24",
    titleColor: "#FBCFE8",
    borderColor: "#EC489933",
  },
];

const FORECAST_DATA = [
  { month: "Dec 24", value: 50000 },
  { month: "Jan", value: 74000 },
  { month: "Feb", value: 98000 },
  { month: "Mar", value: 122000 },
  { month: "Apr", value: 148000 },
  { month: "May", value: 182000 },
  { month: "Jun", value: 206000 },
  { month: "Jul", value: 232000 },
  { month: "Aug", value: 260000 },
  { month: "Sep", value: 290000 },
  { month: "Oct", value: 322000 },
  { month: "Nov", value: 356000 },
  { month: "Dec 26", value: 450000 },
];

const ALLOCATION_DATA = [
  { name: "Emergency Fund", value: 26.7, color: "#22C55E" },
  { name: "Goa Trip", value: 13.3, color: "#F59E0B" },
  { name: "MacBook Pro", value: 40.0, color: "#8B5CF6" },
  { name: "Car Down Payment", value: 20.0, color: "#3B82F6" },
];

const TIMELINE_ITEMS = [
  { name: "Goa Trip", date: "Aug 2025", emoji: "🌅", bg: "#201500" },
  { name: "MacBook Pro", date: "Mar 2026", emoji: "💻", bg: "#1A0D30" },
  { name: "Emergency Fund", date: "Dec 2026", emoji: "🛡️", bg: "#0A2215" },
  { name: "Car Down Payment", date: "Dec 2027", emoji: "🚗", bg: "#071A30" },
];

const MONTHLY_TREND = [
  { month: "Jan", amount: 18000 },
  { month: "Feb", amount: 20000 },
  { month: "Mar", amount: 16000 },
  { month: "Apr", amount: 22000 },
  { month: "May", amount: 19000 },
  { month: "Jun", amount: 24000 },
];

const STATUS_OPTIONS = [
  { label: "All Goals", value: "all" },
  { label: "On Track", value: "on_track" },
  { label: "Slightly Behind", value: "slightly_behind" },
  { label: "Behind", value: "behind" },
  { label: "Completed", value: "completed" },
  { label: "Paused", value: "paused" },
];

const TYPE_OPTIONS = [
  { label: "Emergency Fund", value: "emergency_fund" },
  { label: "Vacation", value: "vacation" },
  { label: "Vehicle", value: "vehicle" },
  { label: "Home", value: "home" },
  { label: "Education", value: "education" },
  { label: "Technology", value: "technology" },
  { label: "Custom", value: "custom" },
];

const SORT_OPTIONS = [
  { label: "Progress", value: "progress" },
  { label: "Target Date", value: "target_date" },
  { label: "Target Amount", value: "target_amount" },
  { label: "Monthly Contribution", value: "monthly" },
  { label: "Goal Name", value: "name" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

function fmtDate(d?: string) {
  if (!d) return null;
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function getPct(saved: number, target: number) {
  return Math.min(Math.round((saved / target) * 100), 100);
}

// ─── ProgressRing ───────────────────────────────────────────────────────────

function ProgressRing({
  pct,
  color,
  bgColor,
  size = 110,
  stroke = 11,
}: {
  pct: number;
  color: string;
  bgColor: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const cx = size / 2;

  return (
    <div
      className="relative flex flex-shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={bgColor} strokeWidth={stroke} />
        <motion.circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[21px] font-bold leading-none text-white">{pct}%</span>
      </div>
    </div>
  );
}

// ─── StatusBadge ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<GoalStatus, { label: string; bg: string; text: string; prefix?: string }> =
  {
    on_track: { label: "On Track", bg: "rgba(34,197,94,0.15)", text: "#22C55E" },
    slightly_behind: {
      label: "Slightly Behind",
      bg: "rgba(245,158,11,0.18)",
      text: "#F59E0B",
      prefix: "⚡",
    },
    behind: { label: "Behind", bg: "rgba(239,68,68,0.15)", text: "#EF4444", prefix: "⚡" },
    completed: { label: "Completed", bg: "rgba(34,197,94,0.15)", text: "#22C55E", prefix: "✓" },
    paused: { label: "Paused", bg: "rgba(90,106,133,0.18)", text: "#A8B4CC", prefix: "⏸" },
  };

function StatusBadge({ status }: { status: GoalStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.prefix && <span>{cfg.prefix}</span>}
      {cfg.label}
    </span>
  );
}

// ─── GoalActionsMenu ────────────────────────────────────────────────────────

function GoalActionsMenu({
  onEdit,
  onCelebrate,
  onDelete,
}: {
  onEdit?: () => void;
  onCelebrate?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const actions: { icon: typeof Eye; label: string; danger?: boolean; onClick?: () => void }[] = [
    { icon: Eye, label: "View Goal" },
    { icon: Pencil, label: "Edit Goal", onClick: onEdit },
    ...(onCelebrate
      ? [{ icon: Sparkles as typeof Eye, label: "🎉 View Achievement", onClick: onCelebrate }]
      : []),
    { icon: Plus, label: "Add Contribution" },
    { icon: Pause, label: "Pause Goal" },
    { icon: Trash2, label: "Delete Goal", danger: true, onClick: onDelete },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5A6A85] transition-colors hover:bg-[#1E2B42] hover:text-[#A8B4CC]"
      >
        <MoreHorizontal size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-[#1E2B42] bg-[#0D1525] py-1.5 shadow-xl"
          >
            {actions.map(({ icon: Icon, label, danger, onClick }) => (
              <button
                key={label}
                onClick={() => {
                  setOpen(false);
                  onClick?.();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors",
                  danger
                    ? "text-[#EF4444] hover:bg-[#1A0808]"
                    : "text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white",
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── GoalCard ───────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  index,
  onOpen,
  onEdit,
  onCelebrate,
  onDelete,
}: {
  goal: GoalData;
  index: number;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onCelebrate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const pct = getPct(goal.savedAmount, goal.targetAmount);
  const remaining = goal.targetAmount - goal.savedAmount;
  const targetDate = fmtDate(goal.targetDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-[#1E2B42] bg-[#0F1623] p-5"
      onClick={() => onOpen(goal.id)}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[18px]"
            style={{ background: `${goal.iconBg}22` }}
          >
            {goal.iconEmoji}
          </div>
          <span className="truncate text-[15px] font-semibold text-white">{goal.displayName}</span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={goal.status} />
          <GoalActionsMenu
            onEdit={() => onEdit(goal.id)}
            onCelebrate={goal.status === "completed" ? () => onCelebrate(goal.id) : undefined}
            onDelete={() => onDelete(goal.id)}
          />
        </div>
      </div>

      {/* Progress + Metrics row */}
      <div className="flex items-start gap-5">
        <ProgressRing
          pct={pct}
          color={goal.ringColor}
          bgColor={goal.ringBg}
          size={112}
          stroke={11}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-0">
          <MetricRow value={`₹${fmt(goal.targetAmount)}`} label="Target" />
          <MetricRow value={`₹${fmt(goal.savedAmount)}`} label="Saved" />
          <MetricRow value={`₹${fmt(remaining)}`} label="Remaining" />
          <div className="mt-3 flex items-center gap-1.5 text-[13px] text-[#5A6A85]">
            <Calendar size={12} className="flex-shrink-0" />
            <span>₹{fmt(goal.monthlyContribution)} / month</span>
          </div>
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between border-t border-[#161F30] pt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#5A6A85]">Recent contributions</span>
          <div className="flex items-center">
            {goal.contributors.map((c, i) => (
              <div
                key={i}
                className="flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-[#0F1623] text-[8px] font-bold text-white"
                style={{
                  background: c.color,
                  marginLeft: i > 0 ? "-5px" : "0",
                  zIndex: goal.contributors.length - i,
                  position: "relative",
                }}
              >
                {c.initials}
              </div>
            ))}
          </div>
          {goal.recentContribution > 0 && (
            <span className="text-[12px] font-medium text-[#22C55E]">
              +₹{fmt(goal.recentContribution)} this month
            </span>
          )}
        </div>
        {targetDate && <span className="text-[12px] text-[#5A6A85]">Target: {targetDate}</span>}
      </div>
    </motion.div>
  );
}

function MetricRow({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[#111827] py-1.5 last:border-0">
      <span className="text-[15px] font-semibold tabular-nums text-white">{value}</span>
      <span className="text-[12px] text-[#5A6A85]">{label}</span>
    </div>
  );
}

// ─── GoalListTable ──────────────────────────────────────────────────────────

function GoalListTable({ goals }: { goals: GoalData[] }) {
  const cols = ["Goal", "Status", "Progress", "Saved", "Remaining", "Monthly", "Target Date", ""];
  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1E2B42]">
              {cols.map((c) => (
                <th
                  key={c}
                  className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#5A6A85]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {goals.map((goal, i) => {
              const pct = getPct(goal.savedAmount, goal.targetAmount);
              const remaining = goal.targetAmount - goal.savedAmount;
              return (
                <motion.tr
                  key={goal.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-[#111827] transition-colors last:border-0 hover:bg-[#131C2E]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[14px]"
                        style={{ background: `${goal.iconBg}22` }}
                      >
                        {goal.iconEmoji}
                      </div>
                      <div>
                        <div className="whitespace-nowrap text-[14px] font-medium text-white">
                          {goal.name}
                        </div>
                        <div className="text-[11px] capitalize text-[#5A6A85]">
                          {goal.type.replace(/_/g, " ")}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={goal.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#1E2B42]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                          className="h-full rounded-full"
                          style={{ background: goal.ringColor }}
                        />
                      </div>
                      <span className="text-[12px] tabular-nums text-[#A8B4CC]">{pct}%</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[14px] tabular-nums text-white">
                    ₹{fmt(goal.savedAmount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[14px] tabular-nums text-[#A8B4CC]">
                    ₹{fmt(remaining)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[14px] tabular-nums text-[#A8B4CC]">
                    ₹{fmt(goal.monthlyContribution)}/mo
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[#5A6A85]">
                    {fmtDate(goal.targetDate) ?? <span className="text-[#2A3A55]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <GoalActionsMenu />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sidebar: Savings Forecast ──────────────────────────────────────────────

function SavingsForecastCard() {
  return (
    <div className="rounded-xl border border-[#1E2B42] bg-[#0F1623] p-4">
      <div className="mb-0.5 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-white">Savings Forecast</h3>
        <div className="h-2 w-2 rounded-full bg-[#2A3A55]" />
      </div>
      <p className="mb-3 text-[12px] leading-relaxed text-[#5A6A85]">
        You&apos;re on track to reach ₹4,50,000 by Dec 2026
      </p>
      <div className="h-[130px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={FORECAST_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6C3AED" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#6C3AED" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fill: "#5A6A85", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-[#1E2B42] bg-[#131C2E] px-2.5 py-1.5 text-[11px] text-white shadow-xl">
                    ₹{fmt(payload[0].value as number)}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6C3AED"
              strokeWidth={2}
              fill="url(#forecastGrad)"
              dot={false}
              activeDot={{ r: 3, fill: "#8B5CF6", stroke: "#080C14", strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Sidebar: Goal Completion Timeline ─────────────────────────────────────

function GoalTimelineCard() {
  return (
    <div className="rounded-xl border border-[#1E2B42] bg-[#0F1623] p-4">
      <h3 className="mb-3 text-[14px] font-semibold text-white">Goal Completion Timeline</h3>
      <div className="space-y-2.5">
        {TIMELINE_ITEMS.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[13px]"
                style={{ background: item.bg }}
              >
                {item.emoji}
              </div>
              <span className="truncate text-[13px] text-[#A8B4CC]">{item.name}</span>
            </div>
            <span className="whitespace-nowrap text-[12px] text-[#5A6A85]">{item.date}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar: Goal Allocation Breakdown ────────────────────────────────────

function GoalAllocationChart() {
  return (
    <div className="rounded-xl border border-[#1E2B42] bg-[#0F1623] p-4">
      <h3 className="mb-3 text-[14px] font-semibold text-white">Goal Allocation Breakdown</h3>
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ALLOCATION_DATA}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={56}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {ALLOCATION_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] font-bold leading-none text-white">₹4,50,000</span>
            <span className="mt-0.5 text-center text-[9px] leading-tight text-[#5A6A85]">
              Total
              <br />
              Target
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {ALLOCATION_DATA.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <div
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="truncate text-[11px] text-[#A8B4CC]">{item.name}</span>
              </div>
              <span className="flex-shrink-0 whitespace-nowrap text-[11px] text-[#5A6A85]">
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar: Monthly Savings Trend ────────────────────────────────────────

function MonthlySavingsTrend() {
  return (
    <div className="rounded-xl border border-[#1E2B42] bg-[#0F1623] p-4">
      <h3 className="mb-3 text-[14px] font-semibold text-white">Monthly Savings Trend</h3>
      <div className="flex items-end gap-3">
        <div className="h-[90px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={MONTHLY_TREND}
              margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
              barSize={14}
            >
              <XAxis
                dataKey="month"
                tick={{ fill: "#5A6A85", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                {MONTHLY_TREND.map((_, i) => (
                  <Cell key={i} fill={i === MONTHLY_TREND.length - 1 ? "#6C3AED" : "#1E2B42"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end pb-5">
          <span className="text-[18px] font-bold leading-none text-white">₹24,000</span>
          <span className="mt-1 text-right text-[10px] leading-tight text-[#5A6A85]">
            Avg monthly
            <br />
            contribution
          </span>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-1 text-[11px] text-[#22C55E]">
        <TrendingUp size={11} />
        <span>↑ 12% vs last month</span>
      </div>
    </div>
  );
}

// ─── Stats Cards Row ────────────────────────────────────────────────────────

function GoalStatsCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {STATS_DATA.map((stat, i) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.06 }}
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          className="relative flex min-h-[100px] cursor-default flex-col justify-between overflow-hidden rounded-xl p-4"
          style={{
            background: `linear-gradient(135deg, ${stat.gradFrom}, ${stat.gradTo})`,
            border: `1px solid ${stat.borderColor}`,
          }}
        >
          <span
            className="text-[12px] font-medium leading-tight"
            style={{ color: stat.titleColor }}
          >
            {stat.title}
          </span>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-[20px] font-bold tabular-nums leading-none text-white">
              {stat.value}
            </span>
            <span className="select-none text-[30px] leading-none" aria-hidden>
              {stat.illustration}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ onCreateGoal }: { onCreateGoal?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center rounded-2xl border border-[#1E2B42] bg-[#0F1623] p-16 text-center"
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        style={{ background: "rgba(108,58,237,0.12)" }}
      >
        🎯
      </div>
      <h3 className="mb-2 text-[18px] font-semibold text-white">No goals yet</h3>
      <p className="mb-6 max-w-xs text-[14px] leading-relaxed text-[#5A6A85]">
        Create your first financial goal to start tracking your savings progress.
      </p>
      <button
        onClick={onCreateGoal}
        className="flex h-10 items-center gap-2 rounded-lg bg-[#6C3AED] px-5 text-[14px] font-medium text-white shadow-lg shadow-[#6C3AED]/20 transition-colors hover:bg-[#7C4AFF]"
      >
        <Plus size={15} />
        Create Goal
      </button>
    </motion.div>
  );
}

// ─── Goal → form data mapper ──────────────────────────────────────────────────

function goalToFormData(goal: GoalData): GoalFormData {
  const iconMap: Record<GoalType, string> = {
    emergency_fund: "savings",
    vacation: "travel",
    vehicle: "vehicle",
    home: "home",
    education: "education",
    technology: "technology",
    custom: "custom",
  };
  return {
    id: goal.id,
    name: goal.displayName.replace(/\s[\S]+$/, "").trim() || goal.name,
    description: "",
    iconId: iconMap[goal.type] ?? "custom",
    colorId: "purple",
    targetAmount: goal.targetAmount,
    savedAmount: goal.savedAmount,
    envelopeId: "e1",
    startDate: new Date().toISOString().slice(0, 10),
    targetDate: goal.targetDate ?? "",
    priority: "high",
  };
}

// ─── GoalsView (main export) ────────────────────────────────────────────────

export function GoalsView() {
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("progress");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [modifyGoalId, setModifyGoalId] = useState<string | null>(null);
  const [completionGoalId, setCompletionGoalId] = useState<string | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  const completionGoalData = useMemo<CompletionGoal | null>(() => {
    if (!completionGoalId) return null;
    const g = MOCK_GOALS.find((g) => g.id === completionGoalId);
    if (!g) return null;
    return {
      id: g.id,
      title: g.name,
      icon: g.iconEmoji,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      completedAt: new Date("2026-05-24"),
      createdAt: new Date("2025-01-24"),
    };
  }, [completionGoalId]);

  const deleteGoalData = useMemo<DeleteGoalTarget | null>(() => {
    if (!deleteGoalId) return null;
    const g = MOCK_GOALS.find((g) => g.id === deleteGoalId);
    if (!g) return null;
    return {
      id: g.id,
      title: g.name,
      icon: g.iconEmoji,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      progressPercentage: Math.round((g.savedAmount / g.targetAmount) * 100),
      contributionCount: 4,
    };
  }, [deleteGoalId]);

  const modifyGoalData = useMemo(
    () => (modifyGoalId ? goalToFormData(MOCK_GOALS.find((g) => g.id === modifyGoalId)!) : null),
    [modifyGoalId],
  );

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";
  const filterActive = statusFilter !== "all";

  const filteredGoals = useMemo(() => {
    const goals = MOCK_GOALS.filter((g) => {
      if (search) {
        const q = search.toLowerCase();
        if (!g.name.toLowerCase().includes(q) && !g.displayName.toLowerCase().includes(q))
          return false;
      }
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      return true;
    });

    return [...goals].sort((a, b) => {
      switch (sort) {
        case "progress":
          return getPct(b.savedAmount, b.targetAmount) - getPct(a.savedAmount, a.targetAmount);
        case "target_amount":
          return b.targetAmount - a.targetAmount;
        case "monthly":
          return b.monthlyContribution - a.monthlyContribution;
        case "name":
          return a.name.localeCompare(b.name);
        case "target_date": {
          if (!a.targetDate && !b.targetDate) return 0;
          if (!a.targetDate) return 1;
          if (!b.targetDate) return -1;
          return a.targetDate.localeCompare(b.targetDate);
        }
        default:
          return 0;
      }
    });
  }, [search, statusFilter, sort]);

  return (
    <div className="layout-page space-y-5 py-6">
      {/* Header */}
      <PageHeader
        title="Financial Goals ✨"
        description="Track progress toward your future plans"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A85]"
              />
              <input
                type="text"
                placeholder="Search goals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-[350px] rounded-lg border border-[#1E2B42] bg-[#0F1623] pl-9 pr-3 text-[14px] text-white placeholder-[#5A6A85] outline-none transition-colors focus:border-[#6C3AED]"
              />
            </div>

            {/* Filter */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => {
                  setFilterOpen((v) => !v);
                  setSortOpen(false);
                }}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-lg border px-4 text-[14px] transition-colors",
                  filterActive
                    ? "border-[#6C3AED] bg-[#131C2E] text-[#C4B5FD]"
                    : "border-[#1E2B42] text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white",
                )}
              >
                <Filter size={13} />
                Filter
                {filterActive && <span className="h-1.5 w-1.5 rounded-full bg-[#6C3AED]" />}
              </button>
              <AnimatePresence>
                {filterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.13 }}
                    className="absolute left-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0D1525] py-2 shadow-2xl"
                  >
                    <div className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-[#5A6A85]">
                      Status
                    </div>
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setStatusFilter(opt.value);
                          setFilterOpen(false);
                        }}
                        className={cn(
                          "w-full px-3 py-1.5 text-left text-[13px] transition-colors",
                          opt.value === statusFilter
                            ? "bg-[#131C2E] text-white"
                            : "text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <div className="my-1.5 border-t border-[#1E2B42]" />
                    <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#5A6A85]">
                      Goal Type
                    </div>
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setFilterOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-[13px] text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sort */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => {
                  setSortOpen((v) => !v);
                  setFilterOpen(false);
                }}
                className="flex h-10 items-center gap-2 rounded-lg border border-[#1E2B42] px-4 text-[14px] text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white"
              >
                <ArrowUpDown size={13} />
                {sortLabel}
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.13 }}
                    className="absolute left-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0D1525] py-2 shadow-2xl"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSort(opt.value as SortKey);
                          setSortOpen(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-[13px] transition-colors",
                          opt.value === sort
                            ? "bg-[#131C2E] text-white"
                            : "text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-[#1E2B42] bg-[#0F1623] p-1">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all",
                  view === "grid"
                    ? "bg-[#6C3AED] text-white shadow-sm"
                    : "text-[#5A6A85] hover:text-[#A8B4CC]",
                )}
              >
                <LayoutGrid size={13} />
                Grid
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all",
                  view === "list"
                    ? "bg-[#6C3AED] text-white shadow-sm"
                    : "text-[#5A6A85] hover:text-[#A8B4CC]",
                )}
              >
                <List size={13} />
                List
              </button>
            </div>

            <button
              onClick={() => setCreateOpen(true)}
              className="flex h-10 items-center gap-2 rounded-lg bg-[#6C3AED] px-5 text-[14px] font-medium text-white shadow-lg shadow-[#6C3AED]/25 transition-colors hover:bg-[#7C4AFF]"
            >
              <Plus size={15} />
              Create Goal
            </button>
          </div>
        }
      />

      {/* KPI Stats */}
      <GoalStatsCards />

      {/* Main content + right sidebar */}
      <div className="flex items-start gap-5">
        {/* Left: goal cards */}
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            {filteredGoals.length === 0 ? (
              <EmptyState key="empty" onCreateGoal={() => setCreateOpen(true)} />
            ) : view === "grid" ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 gap-4 xl:grid-cols-2"
              >
                {filteredGoals.map((goal, i) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    index={i}
                    onOpen={setSelectedGoalId}
                    onEdit={setModifyGoalId}
                    onCelebrate={setCompletionGoalId}
                    onDelete={setDeleteGoalId}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <GoalListTable goals={filteredGoals} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right sidebar */}
        <div className="w-[280px] flex-shrink-0 space-y-4">
          <SavingsForecastCard />
          <GoalTimelineCard />
          <GoalAllocationChart />
          <MonthlySavingsTrend />
        </div>
      </div>

      {/* Goal Details Modal */}
      <GoalDetailsModal
        goalId={selectedGoalId}
        onClose={() => setSelectedGoalId(null)}
        onEdit={(id) => {
          setSelectedGoalId(null);
          setModifyGoalId(id);
        }}
        onDelete={(id) => {
          setSelectedGoalId(null);
          setDeleteGoalId(id);
        }}
      />

      {/* Create Goal Dialog */}
      <CreateGoalDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Modify Goal Dialog */}
      <ModifyGoalDialog
        open={modifyGoalId !== null}
        goal={modifyGoalData}
        onClose={() => setModifyGoalId(null)}
      />

      {/* Delete Goal Dialog */}
      <DeleteGoalDialog
        open={deleteGoalId !== null}
        goal={deleteGoalData}
        onClose={() => setDeleteGoalId(null)}
        onDeleted={() => setDeleteGoalId(null)}
      />

      {/* Goal Completion Celebration */}
      <GoalCompletionDialog
        open={completionGoalId !== null}
        goal={completionGoalData}
        userName="Saqib"
        onClose={() => setCompletionGoalId(null)}
        onViewSummary={(id) => {
          setCompletionGoalId(null);
          setSelectedGoalId(id);
        }}
        onCreateNewGoal={() => {
          setCompletionGoalId(null);
          setCreateOpen(true);
        }}
      />
    </div>
  );
}
