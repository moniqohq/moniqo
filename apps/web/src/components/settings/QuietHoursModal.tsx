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
import { Moon, Clock, Globe2, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ── Toggle ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[#6C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1520]",
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

const TIMEZONE_OPTIONS = [
  "(GMT-12:00) International Date Line West",
  "(GMT-08:00) Pacific Time (US & Canada)",
  "(GMT-07:00) Mountain Time (US & Canada)",
  "(GMT-06:00) Central Time (US & Canada)",
  "(GMT-05:00) Eastern Time (US & Canada)",
  "(GMT+00:00) UTC",
  "(GMT+01:00) Central European Time",
  "(GMT+02:00) Eastern European Time",
  "(GMT+03:00) Moscow Time",
  "(GMT+05:30) Asia/Kolkata",
  "(GMT+08:00) China Standard Time",
  "(GMT+09:00) Japan Standard Time",
  "(GMT+10:00) Australian Eastern Time",
  "(GMT+12:00) New Zealand Standard Time",
];

// ── SelectField ────────────────────────────────────────────────────

function SelectField({
  icon: Icon,
  label,
  value,
  options,
  onChange,
  wide,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  wide?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", wide ? "flex-1" : "")}>
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="text-[#5A6A85]" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#5A6A85]">
          {label}
        </span>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full appearance-none rounded-xl px-3.5 py-2.5 pr-8 text-[13px] font-medium",
            "border border-[#1E2B42] bg-[#0F1623] text-[#A8B4CC]",
            "hover:border-[#2A3A54] focus:border-[rgba(108,58,237,0.5)] focus:outline-none",
            "cursor-pointer transition-colors",
          )}
        >
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-[#0D1520]">
              {opt}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6A85]">
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
    </div>
  );
}

// ── QuietHoursModal ─────────────────────────────────────────────────

export function QuietHoursModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [enabled, setEnabled] = useState(true);
  const [startTime, setStartTime] = useState("10:00 PM");
  const [endTime, setEndTime] = useState("7:00 AM");
  const [timezone, setTimezone] = useState("(GMT+05:30) Asia/Kolkata");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full min-w-0 max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl border-[#1E2B42] bg-[#0D1520] p-0 sm:max-w-[600px]"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4 border-b border-[#1E2B42] px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(108,58,237,0.12)]">
            <Moon size={18} className="text-[#A78BFA]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold leading-tight text-white">Quiet Hours</p>
            <p className="mt-0.5 text-[12px] text-[#5A6A85]">
              Pause non-urgent notifications during these times.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-[12px] text-[#5A6A85]">Enable quiet hours</span>
            <Toggle checked={enabled} onChange={setEnabled} />
          </div>
          <button
            onClick={onClose}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-[#5A6A85] transition-all hover:bg-[#1E2B42] hover:text-[#A8B4CC]"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div
          className={cn("flex flex-col gap-5 p-5", !enabled && "pointer-events-none opacity-40")}
        >
          {/* Time + timezone row */}
          <div className="flex items-end gap-4">
            <SelectField
              icon={Clock}
              label="Start time"
              value={startTime}
              options={TIME_OPTIONS}
              onChange={setStartTime}
            />
            <SelectField
              icon={Clock}
              label="End time"
              value={endTime}
              options={TIME_OPTIONS}
              onChange={setEndTime}
            />
            <SelectField
              icon={Globe2}
              label="Time zone"
              value={timezone}
              options={TIMEZONE_OPTIONS}
              onChange={setTimezone}
              wide
            />
          </div>

          {/* Info note */}
          <div className="flex items-start gap-3 rounded-xl border border-[rgba(108,58,237,0.15)] bg-[rgba(108,58,237,0.07)] px-4 py-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(108,58,237,0.15)]">
              <Info size={11} className="text-[#A78BFA]" />
            </div>
            <p className="text-[12px] leading-relaxed text-[#A8B4CC]">
              During quiet hours, only critical alerts like security notifications will be
              delivered.
            </p>
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 border-t border-[#1E2B42] px-5 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#1E2B42] bg-[#131C2E]">
            <Info size={11} className="text-[#5A6A85]" />
          </div>
          <p className="text-[12px] leading-tight text-[#A8B4CC]">
            Changes are saved automatically.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
