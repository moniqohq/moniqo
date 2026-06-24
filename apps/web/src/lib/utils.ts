import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR", locale = "en-IN"): string {
  const num = new Intl.NumberFormat(locale, {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  return amount < 0 ? `₹ -${num}` : `₹ ${num}`;
}

export function formatTableDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-IN");
  return amount < 0 ? `₹ -${formatted}` : `₹ ${formatted}`;
}

export function formatDate(
  date: Date | string,
  format: "short" | "medium" | "long" = "medium",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const opts: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: "short", day: "numeric" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { month: "long", day: "numeric", year: "numeric" },
  };
  return d.toLocaleDateString("en-IN", opts[format]);
}

export function getAmountColor(amount: number): string {
  if (amount > 0) return "amount-positive";
  if (amount < 0) return "amount-negative";
  return "text-muted-foreground";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function classifyTransaction(amount: number): "income" | "expense" | "transfer" {
  if (amount > 0) return "income";
  if (amount < 0) return "expense";
  return "transfer";
}
