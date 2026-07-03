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
import { useUIStore } from "@/stores/ui.store";
import { useEnvelopes } from "@/hooks/use-envelopes";
import { formatCurrencyCompact } from "@/lib/utils";

const COLORS = [
  "#6C3AED", "#00E6B4", "#F59E0B", "#EF4444", "#22C55E",
  "#3B82F6", "#A855F7", "#F97316", "#06B6D4",
];

export function CategorySpendingList() {
  const activeBudgetId = useUIStore((s) => s.activeBudgetId);
  const { data: envelopes, isLoading } = useEnvelopes(activeBudgetId);

  if (isLoading && envelopes.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-[#3A4A60] text-sm">Loading…</div>
    );
  }

  if (envelopes.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-[#3A4A60] text-sm">
        No envelopes yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {envelopes.map((env, i) => {
        const pct = env.allocated > 0 ? Math.min((env.spent / env.allocated) * 100, 100) : 0;
        const overBudget = env.isOverspent;
        const color = COLORS[i % COLORS.length];
        return (
          <motion.div
            key={env.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
              style={{ background: `${color}30` }}
            >
              {env.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#A8B4CC]">{env.name}</span>
                <div className="flex items-center gap-1.5 text-[12px]">
                  <span className={overBudget ? "text-[#EF4444]" : "text-[#A8B4CC]"}>
                    {formatCurrencyCompact(env.spent)}
                  </span>
                  <span className="text-[#2A3A54]">/</span>
                  <span className="text-[#5A6A85]">{formatCurrencyCompact(env.allocated)}</span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#1E2B42]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 + 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: overBudget ? "#EF4444" : color }}
                />
              </div>
            </div>
            <div className="w-10 flex-shrink-0 text-right">
              <span
                className="text-[12px] font-medium tabular-nums"
                style={{ color: overBudget ? "#EF4444" : "#5A6A85" }}
              >
                {pct.toFixed(0)}%
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
