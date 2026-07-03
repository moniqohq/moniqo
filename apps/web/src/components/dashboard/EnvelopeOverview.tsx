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
import { useEnvelopes } from "@/hooks/useEnvelopes";
import { formatCurrencyCompact, cn } from "@/lib/utils";

export function EnvelopeOverview() {
  const { envelopes, loading, error } = useEnvelopes();

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded-lg bg-[#131C2E]" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-[#5A6A85]">{error}</p>;
  }

  if (envelopes.length === 0) {
    return <p className="text-xs text-[#5A6A85]">No envelopes yet.</p>;
  }

  const displayed = envelopes.slice(0, 6);

  return (
    <div className="space-y-1.5">
      {displayed.map((env, i) => {
        const available = env.allocated_amt - env.spent_amt;
        const pct =
          env.allocated_amt > 0 ? Math.min((env.spent_amt / env.allocated_amt) * 100, 100) : 0;
        const low = available <= env.allocated_amt * 0.1;
        const empty = available <= 0;
        const barColor = empty ? "#EF4444" : low ? "#F59E0B" : "#6C3AED";

        return (
          <motion.div
            key={env.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#131C2E]"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center justify-between">
                <span className="truncate text-[13px] text-[#A8B4CC]">{env.title}</span>
                <span
                  className={cn(
                    "text-[12px] font-medium tabular-nums",
                    empty ? "text-[#EF4444]" : low ? "text-[#F59E0B]" : "text-[#22C55E]",
                  )}
                >
                  {formatCurrencyCompact(available)}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[#1E2B42]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
