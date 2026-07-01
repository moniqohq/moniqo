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

import { useState, useRef, useEffect } from "react";
import { Download, ChevronDown, FileText, Sheet, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReportExportMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options = [
    { icon: FileText, label: "Export CSV", onClick: () => {} },
    { icon: Sheet, label: "Export Excel", onClick: () => {} },
    { icon: FileDown, label: "Export PDF", onClick: () => {} },
  ];

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
        <Download size={13} />
        <span>Export</span>
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-40 mt-1.5 w-44 overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0D1623] py-1.5 shadow-2xl">
          {options.map(({ icon: Icon, label, onClick }) => (
            <button
              key={label}
              onClick={() => {
                onClick();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-[#A8B4CC] transition-colors hover:bg-[#1A2438] hover:text-white"
            >
              <Icon size={13} className="shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
