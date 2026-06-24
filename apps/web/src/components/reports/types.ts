"use client";

export type BudgetStatus = "under" | "near" | "over";

export interface EnvelopeReport {
  id: string;
  name: string;
  iconBg: string;
  iconColor: string;
  iconEmoji: string;
  nature: "want" | "should" | "need" | "must";
  type: "income" | "expense";
  budgeted: number;
  spent: number;
}

export interface ReportFilters {
  envelopes: string[];
  types: string[];
  natures: string[];
  statuses: BudgetStatus[];
  minAmount: string;
  maxAmount: string;
  hideEmpty: boolean;
}

export function getRemaining(e: EnvelopeReport): number {
  return e.budgeted - e.spent;
}

export function getPercentUsed(e: EnvelopeReport): number {
  if (e.budgeted === 0) return 0;
  return Math.round((e.spent / e.budgeted) * 100);
}

export function getBudgetStatus(e: EnvelopeReport): BudgetStatus {
  const pct = getPercentUsed(e);
  if (pct > 100) return "over";
  if (pct >= 90) return "near";
  return "under";
}

export function fmtINR(amount: number): string {
  const abs = Math.abs(amount);
  const str = abs.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return amount < 0 ? `-₹${str}` : `₹${str}`;
}

export const MOCK_ENVELOPES: EnvelopeReport[] = [
  {
    id: "e1",
    name: "Groceries",
    iconBg: "rgba(34,197,94,0.15)",
    iconColor: "#22C55E",
    iconEmoji: "🛒",
    nature: "need",
    type: "expense",
    budgeted: 10000,
    spent: 8200,
  },
  {
    id: "e2",
    name: "Dining Out",
    iconBg: "rgba(239,68,68,0.15)",
    iconColor: "#EF4444",
    iconEmoji: "🍽️",
    nature: "want",
    type: "expense",
    budgeted: 4000,
    spent: 5200,
  },
  {
    id: "e3",
    name: "Transport",
    iconBg: "rgba(59,130,246,0.15)",
    iconColor: "#3B82F6",
    iconEmoji: "🚌",
    nature: "need",
    type: "expense",
    budgeted: 5000,
    spent: 3200,
  },
  {
    id: "e4",
    name: "Entertainment",
    iconBg: "rgba(168,85,247,0.15)",
    iconColor: "#A855F7",
    iconEmoji: "🎮",
    nature: "want",
    type: "expense",
    budgeted: 3000,
    spent: 3900,
  },
  {
    id: "e5",
    name: "Utilities",
    iconBg: "rgba(245,158,11,0.15)",
    iconColor: "#F59E0B",
    iconEmoji: "⚡",
    nature: "must",
    type: "expense",
    budgeted: 6000,
    spent: 4800,
  },
  {
    id: "e6",
    name: "Shopping",
    iconBg: "rgba(59,130,246,0.15)",
    iconColor: "#38BDF8",
    iconEmoji: "🛍️",
    nature: "want",
    type: "expense",
    budgeted: 8000,
    spent: 5600,
  },
  {
    id: "e7",
    name: "Health",
    iconBg: "rgba(239,68,68,0.15)",
    iconColor: "#F87171",
    iconEmoji: "❤️‍🩹",
    nature: "must",
    type: "expense",
    budgeted: 2000,
    spent: 1200,
  },
  {
    id: "e8",
    name: "Education",
    iconBg: "rgba(59,130,246,0.15)",
    iconColor: "#60A5FA",
    iconEmoji: "📚",
    nature: "should",
    type: "expense",
    budgeted: 2000,
    spent: 1000,
  },
  {
    id: "e9",
    name: "Gifts & Donations",
    iconBg: "rgba(236,72,153,0.15)",
    iconColor: "#EC4899",
    iconEmoji: "🎁",
    nature: "want",
    type: "expense",
    budgeted: 1500,
    spent: 200,
  },
];

export const CHART_COLORS = ["#22C55E", "#F97316", "#06B6D4", "#A855F7", "#F59E0B", "#6B7280"];
