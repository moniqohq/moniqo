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

import { motion } from "framer-motion";
import { BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnvelopeReport, fmtINR, getRemaining, getPercentUsed, getBudgetStatus } from "./types";

interface Props {
  envelopes: EnvelopeReport[];
}

function StatusBar({ pct, status }: { pct: number; status: ReturnType<typeof getBudgetStatus> }) {
  const color = status === "over" ? "#EF4444" : status === "near" ? "#F59E0B" : "#22C55E";

  return (
    <div className="h-1.5 w-[72px] shrink-0 overflow-hidden rounded-full bg-[#1A2438]">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

export function EnvelopeSpendingTable({ envelopes }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
      {/* header */}
      <div className="flex items-center justify-between border-b border-[#1E2B42] px-5 py-4">
        <h2 className="text-[14px] font-semibold text-white">Spending by Envelope</h2>
        <button className="flex items-center gap-1.5 text-[12px] text-[#6C3AED] transition-colors hover:text-[#9C72FF]">
          <BarChart2 size={12} />
          View as Chart →
        </button>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1E2B42]">
              <th className="px-5 py-2.5 text-left text-[11px] font-medium tracking-wider text-[#5A6A85] uppercase">
                Envelope
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-medium tracking-wider text-[#5A6A85] uppercase">
                Budgeted
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-medium tracking-wider text-[#5A6A85] uppercase">
                Spent
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-medium tracking-wider text-[#5A6A85] uppercase">
                Remaining
              </th>
              <th className="px-5 py-2.5 text-right text-[11px] font-medium tracking-wider text-[#5A6A85] uppercase">
                % Used
              </th>
            </tr>
          </thead>
          <tbody>
            {envelopes.map((env, i) => {
              const remaining = getRemaining(env);
              const pct = getPercentUsed(env);
              const status = getBudgetStatus(env);
              const pctColor =
                status === "over" ? "#EF4444" : status === "near" ? "#F59E0B" : "#22C55E";

              return (
                <motion.tr
                  key={env.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="border-b border-[#1E2B42]/50 transition-colors hover:bg-[#141E30]"
                >
                  {/* Envelope name + progress bar */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px]"
                        style={{ background: env.iconBg }}
                      >
                        {env.iconEmoji}
                      </div>
                      <div>
                        <p className="text-[13px] leading-none font-medium text-[#E8EEF8]">
                          {env.name}
                        </p>
                        <div className="mt-1.5">
                          <StatusBar pct={pct} status={status} />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Budgeted */}
                  <td className="px-3 py-3 text-right text-[13px] text-[#A8B4CC]">
                    {fmtINR(env.budgeted)}
                  </td>

                  {/* Spent */}
                  <td className="px-3 py-3 text-right text-[13px] text-[#E8EEF8]">
                    {fmtINR(env.spent)}
                  </td>

                  {/* Remaining */}
                  <td
                    className={cn(
                      "px-3 py-3 text-right text-[13px] font-medium",
                      remaining < 0 ? "text-[#EF4444]" : "text-[#22C55E]",
                    )}
                  >
                    {fmtINR(remaining)}
                  </td>

                  {/* % Used */}
                  <td className="px-5 py-3 text-right">
                    <span className="text-[13px] font-semibold" style={{ color: pctColor }}>
                      {pct}%
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* legend */}
      <div className="flex items-center gap-4 px-5 py-3">
        {[
          { color: "#22C55E", label: "Under Budget" },
          { color: "#F59E0B", label: "Near Budget" },
          { color: "#EF4444", label: "Over Budget" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
            <span className="text-[11px] text-[#5A6A85]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
