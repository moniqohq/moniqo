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

import { Wallet } from "lucide-react";
import { mockBudgetOverview } from "@/mock/data";
import { formatCurrency } from "@/lib/utils";

export function BudgetOverview() {
  const { totalBudget, spent, remaining } = mockBudgetOverview;
  const pct = Math.round((spent / totalBudget) * 100);

  return (
    <div className="flex h-full flex-col">
      {/* Icon + status */}
      <div className="flex flex-col items-center gap-2 py-5">
        <div
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: "rgba(0,230,180,0.08)",
            boxShadow: "0 0 28px 4px rgba(0,230,180,0.18)",
          }}
        >
          <Wallet size={28} style={{ color: "#00E6B4" }} />
        </div>
        <p className="mt-1 text-[14px] font-semibold text-white">You&apos;re on track!</p>
        <p className="px-2 text-center text-[11px] leading-tight text-[#5A6A85]">
          You&apos;ve used {pct}% of your
          <br />
          total budget
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-5 px-4">
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1E2B42]">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #00C49A, #00E6B4)" }}
            />
          </div>
          <span className="shrink-0 text-[11px] text-[#A8B4CC]">{pct}%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1 space-y-3 px-4">
        <div>
          <p className="text-[11px] text-[#5A6A85]">Total Budget</p>
          <p className="text-[15px] font-semibold text-white">{formatCurrency(totalBudget)}</p>
        </div>
        <div>
          <p className="text-[11px] text-[#5A6A85]">Spent</p>
          <p className="text-[15px] font-semibold text-[#EF4444]">{formatCurrency(spent)}</p>
        </div>
        <div>
          <p className="text-[11px] text-[#5A6A85]">Remaining</p>
          <p className="text-[15px] font-semibold text-[#00E6B4]">{formatCurrency(remaining)}</p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pt-4 pb-5">
        <button
          className="w-full rounded-xl py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: "rgba(108,58,237,0.55)", border: "1px solid rgba(108,58,237,0.3)" }}
        >
          View Budget
        </button>
      </div>
    </div>
  );
}
