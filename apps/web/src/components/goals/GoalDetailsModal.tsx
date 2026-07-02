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

import { useState, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  MoreHorizontal,
  Pencil,
  Pause,
  Play,
  Copy,
  Trash2,
  TrendingUp,
  Wallet,
  ChevronRight,
  Calendar,
  Sparkles,
  Zap,
  PiggyBank,
  Lightbulb,
  ArrowUpRight,
  BadgeCheck,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type GoalStatus = "on_track" | "slightly_behind" | "behind" | "completed" | "paused";
type GoalPriority = "high" | "medium" | "low";
type ContribType = "salary" | "manual" | "bonus";

interface Contribution {
  id: string;
  date: string;
  type: ContribType;
  title: string;
  description: string;
  amount: number;
}

interface GoalInsight {
  icon: "trending" | "streak" | "suggestion";
  title: string;
  body: string;
  iconBg: string;
  iconColor: string;
}

interface GoalDetailData {
  id: string;
  name: string;
  emoji: string;
  status: GoalStatus;
  tagline: string;
  overview: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  estimatedCompletion: string;
  estimatedCompletionEarly: boolean;
  monthlyContribution: number;
  notes: string;
  linkedEnvelope?: string;
  linkedEnvelopeColor?: string;
  createdOn: string;
  lastUpdated: string;
  priority: GoalPriority;
  contributions: Contribution[];
  progressData: { month: string; value: number }[];
  insights: GoalInsight[];
}

// ─── Mock Detail Data ─────────────────────────────────────────────────────────

const MOCK_DETAILS: Record<string, GoalDetailData> = {
  g1: {
    id: "g1",
    name: "Japan Vacation",
    emoji: "🗾",
    status: "on_track",
    tagline: "A dream trip to Japan in spring 2027 🇯🇵",
    overview:
      "I want to explore Japan — from the temples of Kyoto to the streets of Tokyo.\n\nThis goal is for flights, stay, food, and experiences.",
    targetAmount: 250000,
    savedAmount: 180000,
    targetDate: "24 May 2026",
    estimatedCompletion: "2 months early",
    estimatedCompletionEarly: true,
    monthlyContribution: 10400,
    notes: "Passport valid till 2030.\n\nPlanning for cherry blossom season 🌸",
    linkedEnvelope: "Travel",
    linkedEnvelopeColor: "#6C3AED",
    createdOn: "10 Dec 2024",
    lastUpdated: "24 May 2025",
    priority: "high",
    contributions: [
      {
        id: "c1",
        date: "May 2025",
        type: "salary",
        title: "Salary Allocation",
        description: "Monthly auto-allocation",
        amount: 8000,
      },
      {
        id: "c2",
        date: "12 May 2025",
        type: "manual",
        title: "Manual Contribution",
        description: "Added from savings",
        amount: 5000,
      },
      {
        id: "c3",
        date: "1 May 2025",
        type: "salary",
        title: "Salary Allocation",
        description: "Monthly auto-allocation",
        amount: 8000,
      },
      {
        id: "c4",
        date: "18 Apr 2025",
        type: "manual",
        title: "Manual Contribution",
        description: "Bonus saved",
        amount: 3000,
      },
    ],
    progressData: [
      { month: "Dec '24", value: 50000 },
      { month: "Feb '25", value: 95000 },
      { month: "Apr '25", value: 145000 },
      { month: "May '25", value: 180000 },
    ],
    insights: [
      {
        icon: "trending",
        title: "You're on track!",
        body: "You'll reach your goal 2 months early.",
        iconBg: "rgba(34,197,94,0.15)",
        iconColor: "#22C55E",
      },
      {
        icon: "streak",
        title: "Keep it going",
        body: "Your current saving streak is 4 months 👏",
        iconBg: "rgba(108,58,237,0.2)",
        iconColor: "#8B5CF6",
      },
      {
        icon: "suggestion",
        title: "Suggestion",
        body: "Increase monthly saving by ₹2,000 to reach your goal 1 month earlier.",
        iconBg: "rgba(245,158,11,0.15)",
        iconColor: "#F59E0B",
      },
    ],
  },
};

function getGoalDetail(id: string): GoalDetailData {
  return MOCK_DETAILS[id] ?? { ...MOCK_DETAILS["g1"], id };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

function getPct(saved: number, target: number) {
  return Math.min(Math.round((saved / target) * 100), 100);
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<GoalStatus, { label: string; bg: string; text: string; dot: string }> = {
  on_track: { label: "On Track", bg: "rgba(34,197,94,0.12)", text: "#22C55E", dot: "#22C55E" },
  slightly_behind: {
    label: "Slightly Behind",
    bg: "rgba(245,158,11,0.15)",
    text: "#F59E0B",
    dot: "#F59E0B",
  },
  behind: { label: "Behind", bg: "rgba(239,68,68,0.12)", text: "#EF4444", dot: "#EF4444" },
  completed: { label: "Completed", bg: "rgba(34,197,94,0.12)", text: "#22C55E", dot: "#22C55E" },
  paused: { label: "Paused", bg: "rgba(90,106,133,0.15)", text: "#A8B4CC", dot: "#A8B4CC" },
};

function StatusBadge({ status }: { status: GoalStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium"
      style={{ background: cfg.bg, color: cfg.text, borderColor: `${cfg.dot}30` }}
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<
  GoalPriority,
  { label: string; bg: string; text: string; border: string }
> = {
  high: { label: "High", bg: "rgba(108,58,237,0.15)", text: "#C4B5FD", border: "#6C3AED40" },
  medium: { label: "Medium", bg: "rgba(245,158,11,0.12)", text: "#FDE68A", border: "#F59E0B30" },
  low: { label: "Low", bg: "rgba(90,106,133,0.15)", text: "#A8B4CC", border: "#5A6A8530" },
};

function PriorityBadge({ priority }: { priority: GoalPriority }) {
  const cfg = PRIORITY_CFG[priority];
  return (
    <span
      className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-[12px] font-medium"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}

// ─── GoalProgressRing ─────────────────────────────────────────────────────────

function GoalProgressRing({
  pct,
  size = 160,
  stroke = 14,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const cx = size / 2;

  const endAngle = (pct / 100) * 2 * Math.PI - Math.PI / 2;
  const dotX = cx + r * Math.cos(endAngle);
  const dotY = cx + r * Math.sin(endAngle);

  return (
    <div
      className="relative flex flex-shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <linearGradient id={`ringGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6C3AED" />
            <stop offset="50%" stopColor="#9B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <filter id={`ringGlow-${uid}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="#1A1A35"
          strokeWidth={stroke}
          transform={`rotate(-90, ${cx}, ${cx})`}
        />
        {/* Animated gradient arc */}
        <motion.circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={`url(#ringGrad-${uid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.33, 1, 0.68, 1] }}
          transform={`rotate(-90, ${cx}, ${cx})`}
          filter={`url(#ringGlow-${uid})`}
        />
        {/* Endpoint indicator dot */}
        <motion.circle
          cx={dotX}
          cy={dotY}
          r={stroke / 2 + 1}
          fill="#22C55E"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.3 }}
        />
        <motion.circle
          cx={dotX}
          cy={dotY}
          r={stroke / 2 - 2}
          fill="white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-[32px] leading-none font-bold text-white tabular-nums"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
        >
          {pct}%
        </motion.span>
        <motion.span
          className="mt-1 text-[12px] text-[#5A6A85]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Complete
        </motion.span>
      </div>
    </div>
  );
}

// ─── MetricPill ───────────────────────────────────────────────────────────────

function MetricPill({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#1E2B42] bg-[#131C2E] px-3 py-2.5">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#1E2B42]">
        <Icon size={13} className="text-[#5A6A85]" />
      </div>
      <div className="min-w-0">
        <div className="mb-1 text-[10px] leading-none text-[#5A6A85]">{label}</div>
        <div
          className="truncate text-[13px] leading-none font-semibold"
          style={{ color: valueColor ?? "#E8EEF8" }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ─── GoalSummaryCard ──────────────────────────────────────────────────────────

function GoalSummaryCard({ goal }: { goal: GoalDetailData }) {
  const pct = getPct(goal.savedAmount, goal.targetAmount);
  const remaining = goal.targetAmount - goal.savedAmount;

  return (
    <div className="rounded-2xl border border-[#1E2B42] bg-[#0D1525] p-6">
      <div className="flex items-start gap-8">
        {/* Progress ring */}
        <GoalProgressRing pct={pct} size={160} stroke={14} />

        {/* Metrics */}
        <div className="min-w-0 flex-1">
          <div className="mb-5 grid grid-cols-3 gap-4">
            <div>
              <div className="mb-1 text-[11px] text-[#5A6A85]">Total Target</div>
              <div className="text-[22px] leading-none font-bold text-white tabular-nums">
                ₹{fmt(goal.targetAmount)}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] text-[#5A6A85]">Saved</div>
              <div
                className="text-[22px] leading-none font-bold tabular-nums"
                style={{ color: "#22C55E" }}
              >
                ₹{fmt(goal.savedAmount)}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] text-[#5A6A85]">Remaining</div>
              <div className="text-[22px] leading-none font-bold text-white tabular-nums">
                ₹{fmt(remaining)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MetricPill icon={Calendar} label="Target Date" value={goal.targetDate} />
            <MetricPill
              icon={BadgeCheck}
              label="Est. Completion"
              value={goal.estimatedCompletion}
              valueColor={goal.estimatedCompletionEarly ? "#22C55E" : "#EF4444"}
            />
            <MetricPill
              icon={PiggyBank}
              label="Monthly Saving"
              value={`₹${fmt(goal.monthlyContribution)}`}
            />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#1A1A35]">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.5, ease: [0.33, 1, 0.68, 1] }}
          style={{ background: "linear-gradient(90deg, #6C3AED 0%, #EC4899 100%)" }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] text-[#5A6A85]">₹0</span>
        <span className="text-[10px] text-[#5A6A85]">₹{fmt(goal.targetAmount)}</span>
      </div>
    </div>
  );
}

// ─── GoalOverviewCard ─────────────────────────────────────────────────────────

function GoalOverviewCard({ goal }: { goal: GoalDetailData }) {
  return (
    <div className="rounded-2xl border border-[#1E2B42] bg-[#0D1525] p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-white">Goal Overview</h3>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E2B42] bg-[#131C2E] text-[#5A6A85] transition-colors hover:border-[#2A3A55] hover:text-[#A8B4CC]">
          <Pencil size={13} />
        </button>
      </div>
      <p className="text-[14px] leading-relaxed whitespace-pre-line text-[#A8B4CC]">
        {goal.overview}
      </p>
    </div>
  );
}

// ─── Contribution Icon ────────────────────────────────────────────────────────

const CONTRIB_ICON: Record<ContribType, { icon: React.ElementType; bg: string; color: string }> = {
  salary: { icon: Wallet, bg: "#0A2215", color: "#22C55E" },
  manual: { icon: PiggyBank, bg: "#1A0D30", color: "#8B5CF6" },
  bonus: { icon: Zap, bg: "#201500", color: "#F59E0B" },
};

function ContributionTimelineItem({
  contribution,
  isLast,
}: {
  contribution: Contribution;
  isLast: boolean;
}) {
  const cfg = CONTRIB_ICON[contribution.type];
  const Icon = cfg.icon;

  return (
    <div className="flex items-start gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-shrink-0 flex-col items-center pt-1">
        <div
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full border-2"
          style={{ background: cfg.color, borderColor: cfg.color }}
        />
        {!isLast && (
          <div className="mt-1.5 mb-0 min-h-[32px] w-px flex-1" style={{ background: "#1E2B42" }} />
        )}
      </div>

      {/* Date label */}
      <div className="w-[90px] flex-shrink-0 pt-0.5">
        <span className="text-[12px] text-[#5A6A85]">{contribution.date}</span>
      </div>

      {/* Icon */}
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ background: cfg.bg }}
      >
        <Icon size={15} style={{ color: cfg.color }} />
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1 pb-5">
        <div className="text-[14px] font-medium text-white">{contribution.title}</div>
        <div className="mt-0.5 text-[12px] text-[#5A6A85]">{contribution.description}</div>
      </div>

      {/* Amount */}
      <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
        <span className="text-[15px] font-semibold" style={{ color: "#22C55E" }}>
          +₹{fmt(contribution.amount)}
        </span>
        <ChevronRight size={13} className="text-[#2A3A55]" />
      </div>
    </div>
  );
}

// ─── GoalContributionsCard ────────────────────────────────────────────────────

function GoalContributionsCard({
  goal,
  onAddContribution,
}: {
  goal: GoalDetailData;
  onAddContribution: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#1E2B42] bg-[#0D1525] p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-white">Contributions</h3>
        <button className="flex items-center gap-1 text-[13px] text-[#6C3AED] transition-colors hover:text-[#A78BFA]">
          View all <ChevronRight size={13} />
        </button>
      </div>

      <div className="space-y-0">
        {goal.contributions.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <ContributionTimelineItem
              contribution={c}
              isLast={i === goal.contributions.length - 1}
            />
          </motion.div>
        ))}
      </div>

      <div className="mt-4 border-t border-[#131C2E] pt-4">
        <button
          onClick={onAddContribution}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#2A3A55] text-[13px] text-[#6C3AED] transition-all hover:border-[#6C3AED] hover:bg-[#6C3AED]/5"
        >
          <Plus size={14} />
          Add Contribution
        </button>
      </div>
    </div>
  );
}

// ─── GoalNotesCard ────────────────────────────────────────────────────────────

function GoalNotesCard({ goal }: { goal: GoalDetailData }) {
  return (
    <div className="rounded-2xl border border-[#1E2B42] bg-[#0D1525] p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-white">Notes</h3>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E2B42] bg-[#131C2E] text-[#5A6A85] transition-colors hover:border-[#2A3A55] hover:text-[#A8B4CC]">
          <Pencil size={13} />
        </button>
      </div>
      <p className="text-[14px] leading-relaxed whitespace-pre-line text-[#A8B4CC]">{goal.notes}</p>
    </div>
  );
}

// ─── GoalInsightsCard ─────────────────────────────────────────────────────────

function InsightIcon({
  type,
  bg,
  color,
}: {
  type: GoalInsight["icon"];
  bg: string;
  color: string;
}) {
  const Icon = type === "trending" ? TrendingUp : type === "streak" ? PiggyBank : Lightbulb;
  return (
    <div
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
      style={{ background: bg }}
    >
      <Icon size={16} style={{ color }} />
    </div>
  );
}

function GoalInsightsCard({ goal }: { goal: GoalDetailData }) {
  return (
    <div className="rounded-2xl border border-[#1E2B42] bg-[#0D1525] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={14} className="text-[#6C3AED]" />
        <h3 className="text-[14px] font-semibold text-white">Goal Insights</h3>
      </div>

      <div className="space-y-4">
        {goal.insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 + 0.3 }}
            className="flex items-start gap-3"
          >
            <InsightIcon type={insight.icon} bg={insight.iconBg} color={insight.iconColor} />
            <div className="min-w-0">
              <div className="text-[13px] leading-snug font-semibold text-white">
                {insight.title}
              </div>
              <div className="mt-0.5 text-[12px] leading-relaxed text-[#A8B4CC]">
                {insight.body}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── GoalProgressChart ────────────────────────────────────────────────────────

function GoalProgressChart({ goal }: { goal: GoalDetailData }) {
  const uid = useId().replace(/:/g, "");
  const lastValue = goal.progressData[goal.progressData.length - 1]?.value ?? 0;

  return (
    <div className="rounded-2xl border border-[#1E2B42] bg-[#0D1525] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={14} className="text-[#6C3AED]" />
        <h3 className="text-[14px] font-semibold text-white">Goal Progress</h3>
      </div>

      <div className="relative h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={goal.progressData} margin={{ top: 16, right: 16, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={`pgGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6C3AED" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#6C3AED" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fill: "#5A6A85", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#5A6A85", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              ticks={[0, 50000, 150000, 250000]}
            />
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
              fill={`url(#pgGrad-${uid})`}
              dot={false}
              activeDot={{ r: 4, fill: "#8B5CF6", stroke: "#0D1525", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Current value badge */}
        <div
          className="absolute top-0 right-3 rounded-lg bg-[#6C3AED] px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg"
          style={{ boxShadow: "0 0 12px rgba(108,58,237,0.4)" }}
        >
          ₹{fmt(lastValue)}
        </div>
      </div>
    </div>
  );
}

// ─── GoalDetailsCard ──────────────────────────────────────────────────────────

function GoalDetailsCard({ goal }: { goal: GoalDetailData }) {
  const rows = [
    {
      label: "Linked Envelope",
      value: goal.linkedEnvelope ? (
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: goal.linkedEnvelopeColor ?? "#6C3AED" }}
          />
          <span style={{ color: goal.linkedEnvelopeColor ?? "#6C3AED" }}>
            {goal.linkedEnvelope}
          </span>
        </span>
      ) : (
        <span className="text-[#5A6A85]">—</span>
      ),
    },
    { label: "Created On", value: <span className="text-[#A8B4CC]">{goal.createdOn}</span> },
    { label: "Last Updated", value: <span className="text-[#A8B4CC]">{goal.lastUpdated}</span> },
    { label: "Goal Priority", value: <PriorityBadge priority={goal.priority} /> },
  ];

  return (
    <div className="rounded-2xl border border-[#1E2B42] bg-[#0D1525] p-5">
      <h3 className="mb-4 text-[14px] font-semibold text-white">Goal Details</h3>
      <div className="space-y-0">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between border-b border-[#131C2E] py-2.5 last:border-0"
          >
            <span className="text-[13px] text-[#5A6A85]">{row.label}</span>
            <span className="text-[13px] font-medium">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GoalMotivationCard ───────────────────────────────────────────────────────

function GoalMotivationCard() {
  return (
    <div
      className="relative flex items-center gap-4 overflow-hidden rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, #1A0E35 0%, #220A18 50%, #1A1430 100%)",
        border: "1px solid rgba(108,58,237,0.25)",
      }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute -top-4 -right-4 h-24 w-24 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #EC4899, transparent)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, #6C3AED, transparent)" }}
      />

      {/* Illustration */}
      <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center">
        <div
          className="text-[42px] select-none"
          style={{ filter: "drop-shadow(0 0 8px rgba(236,72,153,0.4))" }}
        >
          🎉
        </div>
      </div>

      {/* Text */}
      <div className="relative min-w-0">
        <div className="text-[15px] leading-snug font-bold text-white">
          You&apos;ve got this! ✨
        </div>
        <div className="mt-1 text-[12px] leading-relaxed text-[#C4B5FD]">
          Every contribution brings you closer to your dream.
        </div>
      </div>
    </div>
  );
}

// ─── GoalActionsDropdown ──────────────────────────────────────────────────────

function GoalActionsDropdown({
  status,
  onClose,
  onEdit,
  onDelete,
}: {
  status: GoalStatus;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const n = node;
    function handler(e: MouseEvent) {
      if (!n.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  type Action = { icon: React.ElementType; label: string; danger?: boolean; onClick?: () => void };
  const actions: Action[] = [
    { icon: Pencil, label: "Edit Goal", onClick: onEdit },
    {
      icon: status === "paused" ? Play : Pause,
      label: status === "paused" ? "Resume Goal" : "Pause Goal",
    },
    { icon: Copy, label: "Duplicate Goal" },
    { icon: Trash2, label: "Delete Goal", danger: true, onClick: onDelete ?? onClose },
  ];

  return (
    <div className="relative" ref={ref as React.RefCallback<HTMLDivElement>}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-xl border border-[#2A3A55] px-3.5 text-[13px] text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white"
      >
        <MoreHorizontal size={15} />
        More
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full right-0 z-[200] mt-1.5 w-48 rounded-xl border border-[#1E2B42] bg-[#0D1525] py-1.5 shadow-2xl"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
          >
            {actions.map(({ icon: Icon, label, danger, onClick }) => (
              <button
                key={label}
                onClick={() => {
                  setOpen(false);
                  onClick?.();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors",
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

// ─── AddContributionDialog ────────────────────────────────────────────────────

function AddContributionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("savings");
  const [loading, setLoading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120] shadow-2xl"
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ boxShadow: "0 0 0 1px rgba(108,58,237,0.15), 0 32px 80px rgba(0,0,0,0.75)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gradient accent */}
            <div
              className="absolute top-0 right-0 left-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, #6C3AED80, transparent)" }}
            />

            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-[16px] font-semibold text-white">Add Contribution</h3>
                  <p className="mt-0.5 text-[12px] text-[#5A6A85]">
                    Record a new savings contribution
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#131C2E] text-[#5A6A85] transition-colors hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount */}
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-[#A8B4CC]">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-[14px] font-medium text-[#5A6A85]">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      required
                      min={1}
                      className="h-10 w-full rounded-xl border border-[#1E2B42] bg-[#131C2E] pr-3 pl-7 text-[14px] text-white placeholder-[#2A3A55] transition-colors outline-none focus:border-[#6C3AED]"
                    />
                  </div>
                </div>

                {/* Source */}
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-[#A8B4CC]">
                    Source Account
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-[#1E2B42] bg-[#131C2E] px-3 text-[14px] text-white transition-colors outline-none focus:border-[#6C3AED]"
                  >
                    <option value="savings">Savings Account</option>
                    <option value="salary">Salary Account</option>
                    <option value="bonus">Bonus</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-[#A8B4CC]">
                    Contribution Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-[#1E2B42] bg-[#131C2E] px-3 text-[14px] text-white [color-scheme:dark] transition-colors outline-none focus:border-[#6C3AED]"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-[#A8B4CC]">
                    Notes <span className="font-normal text-[#5A6A85]">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a note..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-[#1E2B42] bg-[#131C2E] px-3 py-2.5 text-[14px] text-white placeholder-[#2A3A55] transition-colors outline-none focus:border-[#6C3AED]"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 flex-1 rounded-xl border border-[#1E2B42] text-[13px] text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !amount}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#6C3AED] text-[13px] font-medium text-white transition-colors hover:bg-[#7C4AFF] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ boxShadow: "0 4px 16px rgba(108,58,237,0.3)" }}
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                        />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        Add Contribution
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── GoalDetailsModal (main export) ──────────────────────────────────────────

export interface GoalDetailsModalProps {
  goalId: string | null;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function GoalDetailsModal({ goalId, onClose, onEdit, onDelete }: GoalDetailsModalProps) {
  const [addContribOpen, setAddContribOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!goalId) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !addContribOpen) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [goalId, onClose, addContribOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (goalId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [goalId]);

  if (!mounted) return null;

  const goal = goalId ? getGoalDetail(goalId) : null;

  return createPortal(
    <>
      <AnimatePresence>
        {goalId && goal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4"
            >
              <motion.div
                className="pointer-events-auto relative flex max-h-[90vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-[#080C14]"
                initial={{ opacity: 0, scale: 0.94, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                style={{
                  border: "1px solid #1A2540",
                  boxShadow:
                    "0 0 0 1px rgba(108,58,237,0.08), 0 40px 100px rgba(0,0,0,0.85), 0 0 80px rgba(108,58,237,0.06)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Top gradient accent line */}
                <div
                  className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, #6C3AED60 30%, #EC489940 70%, transparent 100%)",
                  }}
                />

                {/* ── Header ── */}
                <div
                  className="flex flex-shrink-0 items-start justify-between gap-6 border-b border-[#131C2E] px-8 py-5"
                  style={{ background: "rgba(8,12,20,0.95)" }}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-[28px] leading-none font-bold text-white">{goal.name}</h1>
                      <StatusBadge status={goal.status} />
                    </div>
                    <p className="mt-2 text-[14px] text-[#5A6A85]">{goal.tagline}</p>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-3">
                    <button
                      onClick={() => setAddContribOpen(true)}
                      className="flex h-9 items-center gap-2 rounded-xl px-4 text-[13px] font-medium text-white transition-all"
                      style={{
                        background: "linear-gradient(135deg, #6C3AED, #8B5CF6)",
                        boxShadow: "0 4px 16px rgba(108,58,237,0.35)",
                      }}
                    >
                      <Plus size={14} />
                      Add Contribution
                    </button>
                    <GoalActionsDropdown
                      status={goal.status}
                      onClose={onClose}
                      onEdit={onEdit ? () => onEdit(goal.id) : undefined}
                      onDelete={
                        onDelete
                          ? () => {
                              onClose();
                              onDelete(goal.id);
                            }
                          : undefined
                      }
                    />
                    <button
                      onClick={onClose}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1E2B42] bg-[#131C2E] text-[#5A6A85] transition-colors hover:border-[#2A3A55] hover:text-white"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* ── Body (scrollable) ── */}
                <div className="flex-1 overflow-y-auto">
                  <div className="flex items-start gap-5 p-6">
                    {/* Left column — 70% */}
                    <div className="min-w-0 flex-1 space-y-4">
                      <GoalSummaryCard goal={goal} />
                      <GoalOverviewCard goal={goal} />
                      <GoalContributionsCard
                        goal={goal}
                        onAddContribution={() => setAddContribOpen(true)}
                      />
                      <GoalNotesCard goal={goal} />
                    </div>

                    {/* Right sidebar — 30% */}
                    <div className="w-[320px] flex-shrink-0 space-y-4">
                      <GoalInsightsCard goal={goal} />
                      <GoalProgressChart goal={goal} />
                      <GoalDetailsCard goal={goal} />
                      <GoalMotivationCard />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Contribution nested dialog */}
      <AddContributionDialog open={addContribOpen} onClose={() => setAddContribOpen(false)} />
    </>,
    document.body,
  );
}
