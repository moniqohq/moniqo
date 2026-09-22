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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Shared building blocks for Settings tabs, extracted from the original
// PreferencesView mock so real tabs (Currency & Money, Date & Time, Budget
// Settings) can reuse the same visual language.

// ── Section header (icon + title + description) ───────────────────

export function SectionHeader({
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
        <p className="text-[14px] leading-tight font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-[11px] text-[#5A6A85]">{description}</p>
      </div>
    </div>
  );
}

// ── Card container ────────────────────────────────────────────────

export function PrefCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-[#1A2640] bg-[#0A1020] p-4", className)}>
      {children}
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
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

export function ToggleRow({
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
        <p className="text-[13px] leading-tight font-medium text-[#A8B4CC]">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#5A6A85]">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ── Select field ──────────────────────────────────────────────────

export function PrefSelect({
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
      <Label className="text-[12px] font-medium tracking-wider text-[#5A6A85] uppercase">
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
