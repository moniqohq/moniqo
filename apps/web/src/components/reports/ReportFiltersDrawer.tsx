"use client";

import { useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportFilters, BudgetStatus, EnvelopeReport } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  filters: ReportFilters;
  onChange: (f: ReportFilters) => void;
  envelopes: EnvelopeReport[];
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-[#6C3AED]" : "bg-[#1E2B42]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function MultiSelect<T extends string>({
  options,
  selected,
  onChange,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (v: T[]) => void;
}) {
  const toggle = (v: T) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => toggle(o.value)}
          className={cn(
            "rounded-lg border px-3 py-1 text-[12px] font-medium transition-colors",
            selected.includes(o.value)
              ? "border-[#6C3AED]/60 bg-[rgba(108,58,237,0.2)] text-[#C4B5FD]"
              : "border-[#1E2B42] bg-transparent text-[#5A6A85] hover:border-[#2A3A52] hover:text-[#A8B4CC]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ReportFiltersDrawer({ open, onClose, filters, onChange, envelopes }: Props) {
  if (!open) return null;

  const set = <K extends keyof ReportFilters>(k: K, v: ReportFilters[K]) =>
    onChange({ ...filters, [k]: v });

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* panel */}
      <div className="fixed bottom-0 right-0 top-0 z-50 flex w-80 flex-col border-l border-[#1E2B42] bg-[#0A0E1A] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E2B42] px-5 py-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-[#6C3AED]" />
            <h2 className="text-[14px] font-semibold text-white">Report Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#5A6A85] transition-colors hover:bg-[#1A2438] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {/* Envelope */}
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-[#5A6A85]">
              Envelope
            </label>
            <MultiSelect
              options={envelopes.map((e) => ({ value: e.id, label: e.name }))}
              selected={filters.envelopes}
              onChange={(v) => set("envelopes", v)}
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-[#5A6A85]">
              Envelope Type
            </label>
            <MultiSelect
              options={[
                { value: "income", label: "Income" },
                { value: "expense", label: "Expense" },
              ]}
              selected={filters.types}
              onChange={(v) => set("types", v)}
            />
          </div>

          {/* Nature */}
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-[#5A6A85]">
              Envelope Nature
            </label>
            <MultiSelect
              options={[
                { value: "want", label: "Want" },
                { value: "should", label: "Should" },
                { value: "need", label: "Need" },
                { value: "must", label: "Must" },
              ]}
              selected={filters.natures}
              onChange={(v) => set("natures", v)}
            />
          </div>

          {/* Budget Status */}
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-[#5A6A85]">
              Budget Status
            </label>
            <MultiSelect
              options={[
                { value: "under", label: "Under Budget" },
                { value: "near", label: "Near Budget" },
                { value: "over", label: "Over Budget" },
              ]}
              selected={filters.statuses}
              onChange={(v) => set("statuses", v as BudgetStatus[])}
            />
          </div>

          {/* Amount Range */}
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-[#5A6A85]">
              Amount Range (Spent)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minAmount}
                onChange={(e) => set("minAmount", e.target.value)}
                className="flex-1 rounded-lg border border-[#1E2B42] bg-[#0F1623] px-3 py-2 text-[12px] text-[#E8EEF8] placeholder-[#3A4A60] focus:border-[#6C3AED]/60 focus:outline-none"
              />
              <span className="text-xs text-[#5A6A85]">–</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxAmount}
                onChange={(e) => set("maxAmount", e.target.value)}
                className="flex-1 rounded-lg border border-[#1E2B42] bg-[#0F1623] px-3 py-2 text-[12px] text-[#E8EEF8] placeholder-[#3A4A60] focus:border-[#6C3AED]/60 focus:outline-none"
              />
            </div>
          </div>

          {/* Hide Empty */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#E8EEF8]">Hide Empty Envelopes</p>
              <p className="mt-0.5 text-[11px] text-[#5A6A85]">Hide envelopes with no activity</p>
            </div>
            <Toggle checked={filters.hideEmpty} onChange={(v) => set("hideEmpty", v)} />
          </div>
        </div>

        {/* footer */}
        <div className="flex gap-2 border-t border-[#1E2B42] px-5 py-4">
          <button
            onClick={() =>
              onChange({
                envelopes: [],
                types: [],
                natures: [],
                statuses: [],
                minAmount: "",
                maxAmount: "",
                hideEmpty: false,
              })
            }
            className="flex-1 rounded-lg border border-[#1E2B42] py-2 text-[13px] text-[#5A6A85] transition-colors hover:border-[#2A3A52] hover:text-white"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-[#6C3AED] py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#7C4AFF]"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
