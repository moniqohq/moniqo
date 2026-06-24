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
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { fmtINR } from "./types";

interface Props {
  budgeted: number;
  spent: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#1E2B42] bg-[#131C2E] px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-[#A8B4CC]">{payload[0].value}%</p>
    </div>
  );
}

export function ReportSummaryCard({ budgeted, spent }: Props) {
  const remaining = budgeted - spent;
  const pctUsed = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;
  const pctRemaining = 100 - pctUsed;

  const donutData = [
    { name: "Spent", value: pctUsed },
    { name: "Remaining", value: pctRemaining },
  ];

  return (
    <div className="rounded-xl border border-[#1E2B42] bg-[#0F1623] px-5 py-4">
      <div className="flex items-start justify-between">
        {/* left: title + metrics */}
        <div className="flex-1">
          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="text-[14px] font-semibold text-white">Summary</h2>
            <span className="text-[11px] text-[#5A6A85]">All amounts in INR</span>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {/* Total Budgeted */}
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wider text-[#5A6A85]">
                Total Budgeted
              </p>
              <p className="text-[20px] font-semibold tracking-tight text-white">
                {fmtINR(budgeted)}
              </p>
            </div>

            {/* Total Spent */}
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wider text-[#5A6A85]">
                Total Spent
              </p>
              <p className="text-[20px] font-semibold tracking-tight text-white">{fmtINR(spent)}</p>
            </div>

            {/* Remaining */}
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wider text-[#5A6A85]">Remaining</p>
              <p className="text-[20px] font-semibold tracking-tight" style={{ color: "#22C55E" }}>
                {fmtINR(remaining)}
              </p>
            </div>

            {/* % Used */}
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wider text-[#5A6A85]">
                Percent of Budget Used
              </p>
              <p className="mb-2 text-[20px] font-semibold text-white">{pctUsed}%</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#1A2438]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pctUsed, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #6C3AED, #9C72FF)" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* right: doughnut chart */}
        <div className="ml-6 flex shrink-0 items-center gap-4">
          <div className="h-[96px] w-[96px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={44}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                >
                  <Cell fill="#6C3AED" />
                  <Cell fill="#1E2B42" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#6C3AED]" />
              <span className="text-[12px] text-[#A8B4CC]">Spent</span>
              <span className="ml-auto pl-4 text-[12px] font-semibold text-white">{pctUsed}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-[#3A4A62] bg-[#2A3A52]" />
              <span className="text-[12px] text-[#A8B4CC]">Remaining</span>
              <span className="ml-auto pl-4 text-[12px] font-semibold text-white">
                {pctRemaining}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
