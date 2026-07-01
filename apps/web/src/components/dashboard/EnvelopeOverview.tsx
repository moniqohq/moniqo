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
import { mockEnvelopes } from "@/mock/data";
import { formatCurrencyCompact, cn } from "@/lib/utils";

export function EnvelopeOverview() {
  const essentials = mockEnvelopes.filter((e) => e.groupName === "Essentials");
  const lifestyle = mockEnvelopes.filter((e) => e.groupName === "Lifestyle");

  const renderGroup = (label: string, envelopes: typeof mockEnvelopes) => (
    <div>
      <div className="mb-2 px-1 text-[11px] font-semibold tracking-widest text-[#2A3A54] uppercase">
        {label}
      </div>
      <div className="space-y-1.5">
        {envelopes.map((env, i) => {
          const pct = Math.min((env.spent / env.allocated) * 100, 100);
          const low = env.available <= env.allocated * 0.1;
          const empty = env.available <= 0;
          return (
            <motion.div
              key={env.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#131C2E]"
            >
              <span className="flex-shrink-0 text-[13px]">{env.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="truncate text-[13px] text-[#A8B4CC]">{env.name}</span>
                  <span
                    className={cn(
                      "text-[12px] font-medium tabular-nums",
                      empty ? "text-[#EF4444]" : low ? "text-[#F59E0B]" : "text-[#22C55E]",
                    )}
                  >
                    {formatCurrencyCompact(env.available)}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[#1E2B42]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: empty ? "#EF4444" : low ? "#F59E0B" : env.color,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderGroup("Essentials", essentials)}
      {renderGroup("Lifestyle", lifestyle)}
    </div>
  );
}
