"use client";

import { motion } from "framer-motion";
import { EnvelopeReport, fmtINR, getPercentUsed, getBudgetStatus, getRemaining } from "./types";

interface Props {
  envelopes: EnvelopeReport[];
}

export function OverBudgetEnvelopesCard({ envelopes }: Props) {
  const overBudget = envelopes
    .filter((e) => getBudgetStatus(e) === "over")
    .sort((a, b) => getRemaining(a) - getRemaining(b)); // most over first (most negative)

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
      <div className="border-b border-[#1E2B42] px-5 py-4">
        <h2 className="text-[14px] font-semibold text-white">Top Over Budget Envelopes</h2>
      </div>

      <div className="space-y-4 p-5">
        {overBudget.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-[#5A6A85]">
            No envelopes are over budget.
          </p>
        ) : (
          overBudget.map((env, i) => {
            const overage = Math.abs(getRemaining(env));
            const pct = getPercentUsed(env);

            return (
              <div key={env.id} className="flex items-start gap-3">
                {/* rank badge */}
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EF4444]/15">
                  <span className="text-[11px] font-bold text-[#EF4444]">{i + 1}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#E8EEF8]">{env.name}</span>
                    <span className="text-[12px] font-semibold text-[#EF4444]">{pct}%</span>
                  </div>
                  <p className="mb-1.5 text-[11px] text-[#5A6A85]">
                    Spent <span className="font-medium text-[#EF4444]">{fmtINR(overage)}</span> over
                    budget
                  </p>
                  {/* red progress bar exceeding 100% */}
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#1A2438]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #EF4444, #FF6B6B)" }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {overBudget.length > 0 && (
        <div className="px-5 pb-4">
          <button className="text-[12px] text-[#6C3AED] transition-colors hover:text-[#9C72FF]">
            View all over budget envelopes →
          </button>
        </div>
      )}
    </div>
  );
}
