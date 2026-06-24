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
import Link from "next/link";
import { BarChart2, ArrowRight } from "lucide-react";

export const metadata = { title: "Reports — Moniqo" };

export default function ReportsPage() {
  return (
    <div className="layout-page py-6">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Reports</h1>
        <p className="mt-0.5 text-[13px] text-[#5A6A85]">
          Analyse your budget and spending patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/reports/spending-by-envelope"
          className="group rounded-xl border border-[#1E2B42] bg-[#0F1623] p-5 transition-colors hover:border-[#6C3AED]/50"
        >
          <div className="mb-3 flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(108,58,237,0.15)]">
              <BarChart2 size={18} className="text-[#6C3AED]" />
            </div>
            <ArrowRight
              size={14}
              className="text-[#3A4A60] transition-colors group-hover:text-[#6C3AED]"
            />
          </div>
          <h2 className="mb-1 text-[14px] font-semibold text-white">Spending by Envelope</h2>
          <p className="text-[12px] leading-relaxed text-[#5A6A85]">
            Compare spending against budgeted amounts across all your envelopes.
          </p>
        </Link>
      </div>
    </div>
  );
}
