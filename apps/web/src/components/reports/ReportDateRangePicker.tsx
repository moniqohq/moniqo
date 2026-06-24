"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Preset = { label: string; from: Date; to: Date };

function getPresets(): Preset[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return [
    { label: "This Month", from: new Date(y, m, 1), to: new Date(y, m + 1, 0) },
    { label: "Last Month", from: new Date(y, m - 1, 1), to: new Date(y, m, 0) },
    { label: "Last 3 Months", from: new Date(y, m - 2, 1), to: new Date(y, m + 1, 0) },
    { label: "Last 6 Months", from: new Date(y, m - 5, 1), to: new Date(y, m + 1, 0) },
    { label: "Year to Date", from: new Date(y, 0, 1), to: new Date(y, m + 1, 0) },
    { label: "Custom Range", from: new Date(y, m, 1), to: new Date(y, m + 1, 0) },
  ];
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  from: Date;
  to: Date;
  onChange: (from: Date, to: Date) => void;
}

export function ReportDateRangePicker({ from, to, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const presets = getPresets();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = `${fmtDate(from)} – ${fmtDate(to)}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
          "border-[#1E2B42] bg-[#0F1623] text-[#A8B4CC] hover:border-[#6C3AED]/50 hover:text-white",
          open && "border-[#6C3AED]/60 text-white",
        )}
      >
        <Calendar size={13} />
        <span>{label}</span>
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-52 overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0D1623] py-1.5 shadow-2xl">
          {presets.map((p) => {
            const active = p.from.getTime() === from.getTime() && p.to.getTime() === to.getTime();
            return (
              <button
                key={p.label}
                onClick={() => {
                  onChange(p.from, p.to);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-[13px] transition-colors",
                  active
                    ? "bg-[rgba(108,58,237,0.12)] text-[#C4B5FD]"
                    : "text-[#A8B4CC] hover:bg-[#1A2438] hover:text-white",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
