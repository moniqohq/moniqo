"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Plus } from "lucide-react";
import { mockSavingsGoals } from "@/mock/data";

function fmtAmount(n: number) {
  return n.toLocaleString("en-IN");
}

export function SavingsGoalsList() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col space-y-3 px-5 py-5">
        {mockSavingsGoals.map((goal, i) => {
          const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3 rounded-xl border border-[#1E2B42] bg-[#0D1526] px-4 py-3"
            >
              <div
                className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[13px]"
                style={{ background: `${goal.color}20` }}
              >
                {goal.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-[14px] font-medium text-white">{goal.name}</span>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="text-[12px] tabular-nums text-[#5A6A85]">
                      {fmtAmount(goal.currentAmount)} / {fmtAmount(goal.targetAmount)}
                    </span>
                    <span className="text-[12px] text-[#5A6A85]">{pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#1E2B42]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: i * 0.06 + 0.2 }}
                    className="h-full rounded-full"
                    style={{ background: goal.color }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-[#1E2B42] px-5 py-3">
        <Link
          href="/goals"
          className="flex items-center gap-1 text-[13px] text-[#6C3AED] transition-colors hover:text-[#A78BFA]"
        >
          View all goals <ArrowUpRight size={12} />
        </Link>
        <button className="flex h-7 items-center gap-1 rounded-lg bg-[#6C3AED] px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#7C4AFF]">
          <Plus size={12} /> New Goal
        </button>
      </div>
    </div>
  );
}
