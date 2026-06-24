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
import { mockCategorySpending } from "@/mock/data";
import { formatCurrencyCompact } from "@/lib/utils";

export function CategorySpendingList() {
  return (
    <div className="space-y-3">
      {mockCategorySpending.map((cat, i) => {
        const pct = Math.min((cat.amount / cat.budget) * 100, 100);
        const overBudget = cat.amount > cat.budget;
        return (
          <motion.div
            key={cat.category}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[13px]"
              style={{ background: `${cat.color}20` }}
            >
              {cat.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#A8B4CC]">{cat.category}</span>
                <div className="flex items-center gap-1.5 text-[12px]">
                  <span className={overBudget ? "text-[#EF4444]" : "text-[#A8B4CC]"}>
                    {formatCurrencyCompact(cat.amount)}
                  </span>
                  <span className="text-[#2A3A54]">/</span>
                  <span className="text-[#5A6A85]">{formatCurrencyCompact(cat.budget)}</span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#1E2B42]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 + 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: overBudget ? "#EF4444" : cat.color }}
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
