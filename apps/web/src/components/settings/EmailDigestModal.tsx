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
import { X, Clock, CalendarDays, Wallet, Bell, Target, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ── Time options ────────────────────────────────────────────────────

function buildTimeOptions() {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const period = h < 12 ? "AM" : "PM";
      const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const min = m === 0 ? "00" : "30";
      options.push(`${hour}:${min} ${period}`);
    }
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

// ── Checkbox ────────────────────────────────────────────────────────

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-2 transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-[#6C3AED] focus-visible:outline-none",
        "focus-visible:ring-offset-1 focus-visible:ring-offset-[#0D1520]",
        checked
          ? "border-[#6C3AED] bg-[#6C3AED]"
          : "border-[#2A3A54] bg-transparent hover:border-[#4A5A74]",
      )}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden="true">
          <path
            d="M1 3.5L3.5 6L8 1"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// ── Frequency option ────────────────────────────────────────────────

type Frequency = "weekly" | "monthly" | "never";

const FREQUENCY_OPTIONS: { id: Frequency; label: string; sub: string }[] = [
  { id: "weekly", label: "Weekly", sub: "Every Monday morning" },
  { id: "monthly", label: "Monthly", sub: "On the 1st of every month" },
  { id: "never", label: "Never", sub: "Don't send summary emails" },
];

function FrequencyOption({
  option,
  selected,
  onSelect,
}: {
  option: (typeof FREQUENCY_OPTIONS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all duration-200",
        selected
          ? "border-[rgba(108,58,237,0.5)] bg-[rgba(108,58,237,0.12)]"
          : "border-[#1E2B42] bg-[#0F1623] hover:border-[#2A3A54] hover:bg-[#131C2E]",
      )}
    >
      {/* Radio indicator */}
      <span
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-[#6C3AED]" : "border-[#2A3A54]",
        )}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-[#6C3AED]" />}
      </span>

      {/* Calendar icon */}
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          selected ? "bg-[rgba(108,58,237,0.2)]" : "bg-[#131C2E]",
        )}
      >
        <CalendarDays size={15} className={selected ? "text-[#A78BFA]" : "text-[#5A6A85]"} />
      </span>

      {/* Text */}
      <div className="min-w-0">
        <p
          className={cn(
            "text-[13px] leading-tight font-semibold",
            selected ? "text-white" : "text-[#A8B4CC]",
          )}
        >
          {option.label}
        </p>
        <p className="mt-0.5 text-[11px] text-[#5A6A85]">{option.sub}</p>
      </div>
    </button>
  );
}

// ── Digest include items ─────────────────────────────────────────────

type IncludeKey = "spendingOverview" | "budgetHealth" | "upcomingBills" | "goalProgress";

const INCLUDE_ITEMS: {
  id: IncludeKey;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  description: string;
}[] = [
  {
    id: "spendingOverview",
    icon: SlidersHorizontal,
    iconColor: "#34D399",
    iconBg: "rgba(34,197,94,0.15)",
    label: "Spending overview",
    description: "Total spending, top categories, and budget status.",
  },
  {
    id: "budgetHealth",
    icon: Wallet,
    iconColor: "#FBBF24",
    iconBg: "rgba(245,158,11,0.15)",
    label: "Budget health",
    description: "Overspending alerts, budget limits, and envelope updates.",
  },
  {
    id: "upcomingBills",
    icon: Bell,
    iconColor: "#C084FC",
    iconBg: "rgba(168,85,247,0.15)",
    label: "Upcoming bills & reminders",
    description: "Bills due and scheduled payments.",
  },
  {
    id: "goalProgress",
    icon: Target,
    iconColor: "#60A5FA",
    iconBg: "rgba(59,130,246,0.15)",
    label: "Goal progress",
    description: "Updates on your goals and milestones.",
  },
];

// ── EmailDigestModal ─────────────────────────────────────────────────

export function EmailDigestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [sendTime, setSendTime] = useState("9:00 AM");
  const [includes, setIncludes] = useState<Record<IncludeKey, boolean>>({
    spendingOverview: true,
    budgetHealth: true,
    upcomingBills: true,
    goalProgress: false,
  });

  function toggleInclude(key: IncludeKey, v: boolean) {
    setIncludes((prev) => ({ ...prev, [key]: v }));
  }

  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzOffset =
    new Date().toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop() ?? "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] min-w-0 gap-0 overflow-hidden rounded-xl border-[#1E2B42] bg-[#0D1520] p-0 sm:max-w-[560px]"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start gap-4 border-b border-[#1E2B42] px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[18px] leading-tight font-semibold text-white">Email digest</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#5A6A85]">
              Manage summary emails and how often you receive them.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5A6A85] transition-all hover:bg-[#1E2B42] hover:text-[#A8B4CC]"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div
          className="flex flex-col gap-6 overflow-y-auto p-5"
          style={{ maxHeight: "calc(100vh - 180px)" }}
        >
          {/* Digest frequency */}
          <div>
            <p className="text-[14px] leading-tight font-semibold text-white">Digest frequency</p>
            <p className="mt-0.5 mb-3 text-[12px] text-[#5A6A85]">
              Choose how often you want to receive email digests.
            </p>
            <div className="flex flex-col gap-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <FrequencyOption
                  key={opt.id}
                  option={opt}
                  selected={frequency === opt.id}
                  onSelect={() => setFrequency(opt.id)}
                />
              ))}
            </div>
          </div>

          {/* Include in digest */}
          <div>
            <p className="text-[14px] leading-tight font-semibold text-white">Include in digest</p>
            <p className="mt-0.5 mb-3 text-[12px] text-[#5A6A85]">
              Choose what you want to include in your email summaries.
            </p>
            <div className="flex flex-col">
              {INCLUDE_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 py-3",
                      i < INCLUDE_ITEMS.length - 1 && "border-b border-[#1A2640]",
                    )}
                  >
                    <Checkbox
                      checked={includes[item.id]}
                      onChange={(v) => toggleInclude(item.id, v)}
                    />
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: item.iconBg }}
                    >
                      <Icon size={15} style={{ color: item.iconColor }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-tight font-medium text-[#A8B4CC]">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#5A6A85]">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Send time */}
          <div>
            <p className="text-[14px] leading-tight font-semibold text-white">Send time</p>
            <p className="mt-0.5 mb-3 text-[12px] text-[#5A6A85]">
              When should we send your digest emails?
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1E2B42] bg-[#131C2E]">
                <Clock size={15} className="text-[#5A6A85]" />
              </div>
              <div className="relative w-44">
                <select
                  value={sendTime}
                  onChange={(e) => setSendTime(e.target.value)}
                  className={cn(
                    "w-full appearance-none rounded-xl px-3.5 py-2.5 pr-8 text-[13px] font-medium",
                    "border border-[#1E2B42] bg-[#0F1623] text-[#A8B4CC]",
                    "hover:border-[#2A3A54] focus:border-[rgba(108,58,237,0.5)] focus:outline-none",
                    "cursor-pointer transition-colors",
                  )}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t} className="bg-[#0D1520]">
                      {t}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#5A6A85]">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path
                      d="M1 1L5 5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#5A6A85]">Your local time</span>
                <span className="mt-0.5 text-[12px] font-medium text-[#A8B4CC]">
                  {tzOffset} {localTimezone}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 border-t border-[#1E2B42] px-5 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#2A3A54]">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#5A6A85]"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-[13px] text-[#A8B4CC]">Changes are saved automatically.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
