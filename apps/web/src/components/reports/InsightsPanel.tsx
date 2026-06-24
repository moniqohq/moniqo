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

import { AlertTriangle, CheckCircle, Eye, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnvelopeReport, fmtINR, getRemaining, getPercentUsed, getBudgetStatus } from "./types";

interface Insight {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}

function buildInsights(envelopes: EnvelopeReport[]): Insight[] {
  const insights: Insight[] = [];

  for (const env of envelopes) {
    const status = getBudgetStatus(env);
    const remaining = getRemaining(env);
    const pct = getPercentUsed(env);

    if (status === "over") {
      const overage = Math.abs(remaining);
      const overPct = pct - 100;
      insights.push({
        icon: <AlertTriangle size={14} />,
        iconBg: "rgba(239,68,68,0.15)",
        title: `${env.name} is over budget`,
        description: `You've spent ${fmtINR(overage)} (${overPct}%) more than your budget.`,
      });
    } else if (status === "under" && pct < 50) {
      insights.push({
        icon: <CheckCircle size={14} />,
        iconBg: "rgba(34,197,94,0.15)",
        title: `Great job on ${env.name.toLowerCase()}!`,
        description: `You're under budget by ${fmtINR(remaining)} (${100 - pct}%).`,
      });
    } else if (status === "near") {
      insights.push({
        icon: <Eye size={14} />,
        iconBg: "rgba(245,158,11,0.15)",
        title: `${env.name} looks good`,
        description: `You're within ${100 - pct}% of your budget.`,
      });
    }
  }

  return insights.slice(0, 4);
}

interface Props {
  envelopes: EnvelopeReport[];
}

export function InsightsPanel({ envelopes }: Props) {
  const insights = buildInsights(envelopes);

  const iconColorMap: Record<string, string> = {
    "rgba(239,68,68,0.15)": "#EF4444",
    "rgba(34,197,94,0.15)": "#22C55E",
    "rgba(245,158,11,0.15)": "#F59E0B",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
      <div className="border-b border-[#1E2B42] px-5 py-4">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-[#F59E0B]" />
          <h2 className="text-[14px] font-semibold text-white">Insights</h2>
        </div>
      </div>

      <div className="space-y-3 p-5">
        {insights.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-[#5A6A85]">No insights available.</p>
        ) : (
          insights.map((ins, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-[#1E2B42]/60 bg-[#0A1020] p-3"
            >
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background: ins.iconBg, color: iconColorMap[ins.iconBg] || "#6C3AED" }}
              >
                {ins.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold leading-snug text-[#E8EEF8]">{ins.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#5A6A85]">
                  {ins.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-5 pb-4">
        <button className="text-[12px] text-[#6C3AED] transition-colors hover:text-[#9C72FF]">
          View all insights →
        </button>
      </div>
    </div>
  );
}
