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
import {
  Globe,
  Wallet,
  Monitor,
  Cloud,
  Database,
  Sun,
  Moon,
  SlidersHorizontal,
  Check,
  SquarePen,
  CheckCircle2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── Options ───────────────────────────────────────────────────────

const CURRENCIES = [
  { value: "INR", label: "INR (₹)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
];

function formatDate(fmt: string, d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const mon = d.toLocaleString("en-US", { month: "short" });
  switch (fmt) {
    case "MMM DD, YYYY":
      return `${mon} ${dd}, ${yyyy}`;
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${yyyy}`;
    case "MM/DD/YYYY":
      return `${mm}/${dd}/${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
    default:
      return fmt;
  }
}

const TODAY = new Date();

const TIME_FORMATS = [
  { value: "12h", label: "12-hour" },
  { value: "24h", label: "24-hour" },
];

const DATE_FORMATS = [
  { value: "MMM DD, YYYY", label: formatDate("MMM DD, YYYY", TODAY) },
  { value: "DD/MM/YYYY", label: formatDate("DD/MM/YYYY", TODAY) },
  { value: "MM/DD/YYYY", label: formatDate("MM/DD/YYYY", TODAY) },
  { value: "YYYY-MM-DD", label: formatDate("YYYY-MM-DD", TODAY) },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
];

const TRANSACTION_VIEWS = [
  { value: "group-date", label: "Group by date" },
  { value: "group-category", label: "Group by category" },
  { value: "list", label: "Simple list" },
];

const ITEMS_PER_PAGE = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

// ── Default state ─────────────────────────────────────────────────

const DEFAULTS = {
  theme: "dark" as "light" | "dark" | "system",
  language: "en",
  currency: "INR",
  dateFormat: "MMM DD, YYYY",
  compactMode: false,
  showAccountBalances: true,
  showCurrencySymbols: true,
  animations: true,
  defaultBudgetAmount: "50,000",
  autoAssignIncome: true,
  carryOver: true,
  reconciliationReminders: true,
  offlineMode: true,
  autoSync: true,
  transactionView: "group-date",
  itemsPerPage: "20",
};

// ── Toggle switch ─────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[#6C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1623]",
        checked ? "bg-[#6C3AED]" : "bg-[#1E2B42]",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

// ── Toggle row ────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#1A2640] py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-tight text-[#A8B4CC]">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#5A6A85]">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ── Select field ──────────────────────────────────────────────────

function PrefSelect({
  label,
  value,
  onValueChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div
      className={cn("flex w-full flex-col gap-1.5", disabled && "pointer-events-none opacity-50")}
    >
      <Label className="text-[12px] font-medium uppercase tracking-wider text-[#5A6A85]">
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => v && onValueChange(v)} disabled={disabled}>
        <SelectTrigger className="h-9 w-full border-[#1E2B42] bg-[#0D1520] text-[13px] text-[#A8B4CC] transition-colors hover:border-[#2A3A54] focus:border-[#6C3AED] focus:ring-[rgba(108,58,237,0.2)]">
          <SelectValue>{options.find((o) => o.value === value)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent className="border-[#1E2B42] bg-[#0F1623]">
          {options.map((o) => (
            <SelectItem
              key={o.value}
              value={o.value}
              className="text-[13px] text-[#A8B4CC] focus:bg-[rgba(108,58,237,0.12)] focus:text-white"
            >
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Section header (icon + title + description) ───────────────────

function SectionHeader({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: iconBg }}
      >
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      <div>
        <p className="text-[14px] font-semibold leading-tight text-white">{title}</p>
        <p className="mt-0.5 text-[11px] text-[#5A6A85]">{description}</p>
      </div>
    </div>
  );
}

// ── Card container ────────────────────────────────────────────────

function PrefCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-[#1A2640] bg-[#0A1020] p-4", className)}>
      {children}
    </div>
  );
}

// ── Theme option card ─────────────────────────────────────────────

function ThemeCard({
  value,
  label,
  icon: Icon,
  selected,
  onSelect,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 transition-all",
        selected
          ? "border-[#6C3AED] bg-[rgba(108,58,237,0.12)]"
          : "border-[#1E2B42] bg-[#0D1520] hover:border-[#2A3A54]",
      )}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#6C3AED]">
          <Check size={9} className="text-white" />
        </span>
      )}
      <Icon size={28} className={selected ? "text-[#A78BFA]" : "text-[#5A6A85]"} />
      <span className={cn("text-[12px] font-medium", selected ? "text-white" : "text-[#5A6A85]")}>
        {label}
      </span>
    </button>
  );
}

// ── Main view ─────────────────────────────────────────────────────

export function PreferencesView() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(DEFAULTS.theme);
  const [language, setLanguage] = useState(DEFAULTS.language);
  const [currency, setCurrency] = useState(DEFAULTS.currency);
  const [dateFormat, setDateFormat] = useState(DEFAULTS.dateFormat);
  const [timeFormat, setTimeFormat] = useState("12h");
  const [compactMode, setCompactMode] = useState(DEFAULTS.compactMode);
  const [showAccountBalances, setShowAccountBalances] = useState(DEFAULTS.showAccountBalances);
  const [showCurrencySymbols, setShowCurrencySymbols] = useState(DEFAULTS.showCurrencySymbols);
  const [animations, setAnimations] = useState(DEFAULTS.animations);

  const [defaultBudgetAmount, setDefaultBudgetAmount] = useState(DEFAULTS.defaultBudgetAmount);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(DEFAULTS.defaultBudgetAmount);
  const [autoAssignIncome, setAutoAssignIncome] = useState(DEFAULTS.autoAssignIncome);
  const [carryOver, setCarryOver] = useState(DEFAULTS.carryOver);
  const [reconciliationReminders, setReconciliationReminders] = useState(
    DEFAULTS.reconciliationReminders,
  );

  const [offlineMode, setOfflineMode] = useState(DEFAULTS.offlineMode);
  const [autoSync, setAutoSync] = useState(DEFAULTS.autoSync);
  const [transactionView, setTransactionView] = useState(DEFAULTS.transactionView);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULTS.itemsPerPage);

  // currency symbol for display
  const currencySymbol =
    currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
      {/* ── Card heading ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[#1E2B42] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold text-white">Preferences</h2>
          <p className="mt-0.5 text-[12px] text-[#5A6A85]">
            Customize language, currency, display, and budgeting defaults.
          </p>
        </div>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "rgba(59,130,246,0.12)" }}
        >
          <SlidersHorizontal size={18} style={{ color: "#60A5FA" }} />
        </div>
      </div>

      <div className="p-5">
        {/* ── Two-column grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-[3fr_2fr] items-stretch gap-4">
          {/* ── LEFT COLUMN ──────────────────────────────────────── */}
          <div className="flex flex-col gap-5">
            {/* Appearance */}
            <PrefCard>
              <SectionHeader
                icon={SlidersHorizontal}
                iconColor="#A78BFA"
                iconBg="rgba(108,58,237,0.15)"
                title="Appearance"
                description="Choose how Moniqo looks for you."
              />
              <div className="grid grid-cols-3 gap-3">
                <ThemeCard
                  value="light"
                  label="Light"
                  icon={Sun}
                  selected={theme === "light"}
                  onSelect={() => setTheme("light")}
                />
                <ThemeCard
                  value="dark"
                  label="Dark"
                  icon={Moon}
                  selected={theme === "dark"}
                  onSelect={() => setTheme("dark")}
                />
                <ThemeCard
                  value="system"
                  label="System"
                  icon={Monitor}
                  selected={theme === "system"}
                  onSelect={() => setTheme("system")}
                />
              </div>
            </PrefCard>

            {/* Regional */}
            <PrefCard>
              <SectionHeader
                icon={Globe}
                iconColor="#60A5FA"
                iconBg="rgba(59,130,246,0.12)"
                title="Regional"
                description="Set your language, currency, and date format."
              />
              <div className="grid grid-cols-[2fr_1fr] gap-4">
                <PrefSelect
                  label="Language"
                  value={language}
                  onValueChange={setLanguage}
                  options={LANGUAGES}
                />
                <PrefSelect
                  label="Currency"
                  value={currency}
                  onValueChange={setCurrency}
                  options={CURRENCIES}
                />
              </div>
              <div className="mt-4 grid grid-cols-[2fr_1fr] gap-4">
                <PrefSelect
                  label="Date format"
                  value={dateFormat}
                  onValueChange={setDateFormat}
                  options={DATE_FORMATS}
                />
                <PrefSelect
                  label="Time format"
                  value={timeFormat}
                  onValueChange={setTimeFormat}
                  options={TIME_FORMATS}
                />
              </div>
            </PrefCard>

            {/* Display */}
            <PrefCard>
              <SectionHeader
                icon={Monitor}
                iconColor="#A78BFA"
                iconBg="rgba(108,58,237,0.12)"
                title="Display"
                description="Customize how information is shown."
              />
              <div className="flex flex-col">
                <ToggleRow
                  label="Compact mode"
                  description="Show more information in less space."
                  checked={compactMode}
                  onChange={setCompactMode}
                />
                <ToggleRow
                  label="Show account balances"
                  description="Display balances on dashboards and accounts"
                  checked={showAccountBalances}
                  onChange={setShowAccountBalances}
                />
                <ToggleRow
                  label="Show currency symbols"
                  description="Display currency symbols before amounts"
                  checked={showCurrencySymbols}
                  onChange={setShowCurrencySymbols}
                />
                <ToggleRow
                  label="Animations"
                  description="Enable smooth transitions and animations"
                  checked={animations}
                  onChange={setAnimations}
                />
              </div>
            </PrefCard>

            {/* Notice */}
            <div className="flex flex-1 flex-col gap-3 rounded-xl border border-[#1A2640] bg-[rgba(108,58,237,0.06)] p-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(108,58,237,0.15)]">
                  <SlidersHorizontal size={13} className="text-[#A78BFA]" />
                </div>
                <p className="text-[13px] font-semibold leading-tight text-white">
                  Preferences sync across devices
                </p>
              </div>
              <p className="text-[12px] leading-relaxed text-[#5A6A85]">
                Your display, regional, and budgeting preferences are automatically saved and
                applied across all devices where you&apos;re signed in to Moniqo.
              </p>
            </div>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────────── */}
          <div className="flex flex-col gap-5">
            {/* Budgeting Preferences */}
            <PrefCard>
              <SectionHeader
                icon={Wallet}
                iconColor="#34D399"
                iconBg="rgba(34,197,94,0.12)"
                title="Budgeting Preferences"
                description="Set default budgeting behaviors."
              />
              <div className="flex flex-col gap-0">
                {/* Default Budget inline field */}
                <div className="flex items-start justify-between gap-4 border-b border-[#1A2640] py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-tight text-[#A8B4CC]">
                      Default Budget
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[#5A6A85]">
                      Set your default monthly budget amount.
                    </p>
                  </div>
                  {editingBudget ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[12px] text-[#5A6A85]">{currencySymbol}</span>
                      <Input
                        value={budgetDraft}
                        onChange={(e) => setBudgetDraft(e.target.value)}
                        className="h-7 w-24 text-right text-[12px]"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setDefaultBudgetAmount(budgetDraft);
                          setEditingBudget(false);
                        }}
                        className="text-[#22C55E] transition-colors hover:text-[#16A34A]"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[13px] font-medium text-[#A8B4CC]">
                        {currencySymbol}
                        {defaultBudgetAmount}
                      </span>
                      <button
                        onClick={() => {
                          setBudgetDraft(defaultBudgetAmount);
                          setEditingBudget(true);
                        }}
                        className="text-[#5A6A85] transition-colors hover:text-[#A8B4CC]"
                      >
                        <SquarePen size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <ToggleRow
                  label="Auto-assign income"
                  description="Automatically distribute new income across envelopes based on your last allocation."
                  checked={autoAssignIncome}
                  onChange={setAutoAssignIncome}
                />
                <ToggleRow
                  label="Carry over remaining balance"
                  description="Unspent envelope balance rolls forward into the next month automatically."
                  checked={carryOver}
                  onChange={setCarryOver}
                />
                <ToggleRow
                  label="Reconciliation reminders"
                  description="Receive a prompt to reconcile accounts at the start of each month."
                  checked={reconciliationReminders}
                  onChange={setReconciliationReminders}
                />
              </div>
            </PrefCard>

            {/* Data & Sync */}
            <PrefCard>
              <SectionHeader
                icon={Cloud}
                iconColor="#60A5FA"
                iconBg="rgba(59,130,246,0.12)"
                title="Data & Sync"
                description="Manage how your data syncs and works."
              />
              <div className="flex flex-col">
                <ToggleRow
                  label="Offline mode"
                  description="Allow the app to function without an internet connection using cached data."
                  checked={offlineMode}
                  onChange={setOfflineMode}
                />
                <ToggleRow
                  label="Auto sync"
                  description="Automatically synchronize your data across devices in the background."
                  checked={autoSync}
                  onChange={setAutoSync}
                />
              </div>
            </PrefCard>

            {/* Data */}
            <PrefCard className="flex-1">
              <SectionHeader
                icon={Database}
                iconColor="#C084FC"
                iconBg="rgba(168,85,247,0.12)"
                title="Data"
                description="Manage how data is shown and processed."
              />
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-tight text-[#A8B4CC]">
                      Default transaction view
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#5A6A85]">
                      How transactions are grouped by default
                    </p>
                  </div>
                  <div className="w-36 shrink-0">
                    <Select
                      value={transactionView}
                      onValueChange={(v) => v && setTransactionView(v)}
                    >
                      <SelectTrigger className="h-8 w-full border-[#1E2B42] bg-[#0D1520] text-[12px] text-[#A8B4CC] transition-colors hover:border-[#2A3A54] focus:border-[#6C3AED] focus:ring-[rgba(108,58,237,0.2)]">
                        <SelectValue>
                          {TRANSACTION_VIEWS.find((o) => o.value === transactionView)?.label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="border-[#1E2B42] bg-[#0F1623]">
                        {TRANSACTION_VIEWS.map((o) => (
                          <SelectItem
                            key={o.value}
                            value={o.value}
                            className="text-[12px] text-[#A8B4CC] focus:bg-[rgba(108,58,237,0.12)] focus:text-white"
                          >
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-tight text-[#A8B4CC]">
                      Items per page
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#5A6A85]">
                      Number of items to show in lists
                    </p>
                  </div>
                  <div className="w-36 shrink-0">
                    <Select value={itemsPerPage} onValueChange={(v) => v && setItemsPerPage(v)}>
                      <SelectTrigger className="h-8 w-full border-[#1E2B42] bg-[#0D1520] text-[12px] text-[#A8B4CC] transition-colors hover:border-[#2A3A54] focus:border-[#6C3AED] focus:ring-[rgba(108,58,237,0.2)]">
                        <SelectValue>
                          {ITEMS_PER_PAGE.find((o) => o.value === itemsPerPage)?.label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="border-[#1E2B42] bg-[#0F1623]">
                        {ITEMS_PER_PAGE.map((o) => (
                          <SelectItem
                            key={o.value}
                            value={o.value}
                            className="text-[12px] text-[#A8B4CC] focus:bg-[rgba(108,58,237,0.12)] focus:text-white"
                          >
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PrefCard>
          </div>
        </div>
      </div>
    </div>
  );
}
