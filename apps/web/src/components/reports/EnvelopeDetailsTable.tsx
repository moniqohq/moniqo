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

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EnvelopeReport,
  fmtINR,
  getRemaining,
  getPercentUsed,
  getBudgetStatus,
  BudgetStatus,
} from "./types";

type SortKey = "name" | "budgeted" | "spent" | "remaining" | "pct";
type SortDir = "asc" | "desc";
type GroupBy = "none" | "nature" | "type" | "status";

interface Props {
  envelopes: EnvelopeReport[];
}

function StatusBadge({ status }: { status: BudgetStatus }) {
  const cfg = {
    under: {
      label: "Under Budget",
      bg: "rgba(34,197,94,0.12)",
      text: "#22C55E",
      border: "rgba(34,197,94,0.25)",
    },
    near: {
      label: "Near Budget",
      bg: "rgba(245,158,11,0.12)",
      text: "#F59E0B",
      border: "rgba(245,158,11,0.25)",
    },
    over: {
      label: "Over Budget",
      bg: "rgba(239,68,68,0.12)",
      text: "#EF4444",
      border: "rgba(239,68,68,0.25)",
    },
  }[status];

  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}

function SortIcon({ col, current, dir }: { col: SortKey; current: SortKey; dir: SortDir }) {
  if (col !== current) return <ArrowUpDown size={11} className="text-[#3A4A60]" />;
  return dir === "asc" ? (
    <ArrowUp size={11} className="text-[#6C3AED]" />
  ) : (
    <ArrowDown size={11} className="text-[#6C3AED]" />
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function EnvelopeDetailsTable({ envelopes }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  function handleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
    setPage(0);
  }

  const sorted = useMemo(() => {
    return [...envelopes].sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      switch (sortKey) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "budgeted":
          aVal = a.budgeted;
          bVal = b.budgeted;
          break;
        case "spent":
          aVal = a.spent;
          bVal = b.spent;
          break;
        case "remaining":
          aVal = getRemaining(a);
          bVal = getRemaining(b);
          break;
        case "pct":
          aVal = getPercentUsed(a);
          bVal = getPercentUsed(b);
          break;
      }
      const cmp =
        typeof aVal === "string"
          ? aVal.localeCompare(bVal as string)
          : (aVal as number) - (bVal as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [envelopes, sortKey, sortDir]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return { "": sorted };
    const map: Record<string, EnvelopeReport[]> = {};
    sorted.forEach((e) => {
      const key = groupBy === "status" ? getBudgetStatus(e) : e[groupBy as "nature" | "type"];
      (map[key] ??= []).push(e);
    });
    return map;
  }, [sorted, groupBy]);

  const allRows = Object.values(grouped).flat();
  const totalPages = Math.ceil(allRows.length / pageSize);
  const pageRows = allRows.slice(page * pageSize, (page + 1) * pageSize);

  const thClass =
    "px-4 py-2.5 text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider whitespace-nowrap";

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
      {/* header */}
      <div className="flex items-center justify-between border-b border-[#1E2B42] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold text-white">Envelope Details</h2>
          <p className="mt-0.5 text-[12px] text-[#5A6A85]">Detailed breakdown of all envelopes</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#5A6A85]">Group by:</span>
          <select
            value={groupBy}
            onChange={(e) => {
              setGroupBy(e.target.value as GroupBy);
              setPage(0);
            }}
            className="cursor-pointer rounded-lg border border-[#1E2B42] bg-[#0A1020] px-2.5 py-1.5 text-[12px] text-[#E8EEF8] focus:border-[#6C3AED]/60 focus:outline-none"
          >
            {(["none", "nature", "type", "status"] as GroupBy[]).map((g) => (
              <option key={g} value={g} className="bg-[#0A1020]">
                {g === "none" ? "None" : g.charAt(0).toUpperCase() + g.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1E2B42]">
              <th className={cn(thClass, "text-left")}>
                <button
                  className="flex items-center gap-1 transition-colors hover:text-[#A8B4CC]"
                  onClick={() => handleSort("name")}
                >
                  Envelope <SortIcon col="name" current={sortKey} dir={sortDir} />
                </button>
              </th>
              {(
                [
                  { key: "budgeted", label: "Budgeted" },
                  { key: "spent", label: "Spent" },
                  { key: "remaining", label: "Remaining" },
                  { key: "pct", label: "% Used" },
                ] as { key: SortKey; label: string }[]
              ).map((col) => (
                <th key={col.key} className={cn(thClass, "text-right")}>
                  <button
                    className="ml-auto flex items-center gap-1 transition-colors hover:text-[#A8B4CC]"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label} <SortIcon col={col.key} current={sortKey} dir={sortDir} />
                  </button>
                </th>
              ))}
              <th className={cn(thClass, "text-right")}>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((env, i) => {
              const remaining = getRemaining(env);
              const pct = getPercentUsed(env);
              const status = getBudgetStatus(env);
              const pctColor =
                status === "over" ? "#EF4444" : status === "near" ? "#F59E0B" : "#22C55E";

              return (
                <motion.tr
                  key={env.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className="border-b border-[#1E2B42]/50 transition-colors hover:bg-[#141E30]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px]"
                        style={{ background: env.iconBg }}
                      >
                        {env.iconEmoji}
                      </div>
                      <span className="text-[13px] text-[#E8EEF8]">{env.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] text-[#A8B4CC]">
                    {fmtINR(env.budgeted)}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] text-[#E8EEF8]">
                    {fmtINR(env.spent)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right text-[13px] font-medium",
                      remaining < 0 ? "text-[#EF4444]" : "text-[#22C55E]",
                    )}
                  >
                    {fmtINR(remaining)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[13px] font-semibold" style={{ color: pctColor }}>
                      {pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StatusBadge status={status} />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-between border-t border-[#1E2B42] px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#5A6A85]">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="rounded border border-[#1E2B42] bg-[#0A1020] px-2 py-1 text-[12px] text-[#E8EEF8] focus:border-[#6C3AED]/60 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-[#0A1020]">
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#5A6A85]">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, allRows.length)} of{" "}
            {allRows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg p-1.5 text-[#5A6A85] transition-colors hover:bg-[#1A2438] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg p-1.5 text-[#5A6A85] transition-colors hover:bg-[#1A2438] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
