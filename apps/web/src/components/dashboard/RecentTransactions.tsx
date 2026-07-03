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

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { formatCurrency, formatTableDate, cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui.store";
import { useAccounts } from "@/hooks/useAccounts";
import { useEnvelopes } from "@/hooks/useEnvelopes";
import { useTransactions } from "@/hooks/useTransactions";

type Status = "Done" | "Reconciled" | "Pending";

const STATUSES: Status[] = [
  "Done",
  "Reconciled",
  "Pending",
  "Done",
  "Done",
  "Reconciled",
  "Pending",
  "Done",
  "Reconciled",
  "Pending",
  "Done",
  "Reconciled",
];

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    Done: "bg-[rgba(34,197,94,0.12)] text-[#4ADE80]",
    Reconciled: "bg-[rgba(99,179,237,0.12)] text-[#7DD3FC]",
    Pending: "bg-[rgba(245,158,11,0.12)] text-[#FBB74B]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

export function RecentTransactions() {
  const activeBudgetId = useUIStore((s) => s.activeBudgetId);
  const { accountMap } = useAccounts(activeBudgetId);
  const { envelopeMap } = useEnvelopes(activeBudgetId);
  const { transactions, loading } = useTransactions(activeBudgetId, accountMap, envelopeMap, { pageSize: 7 });
  const recent = transactions;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1E2B42]">
              <th className="px-5 py-2.5 text-[11px] font-semibold tracking-wider text-[#5A6A85] uppercase">
                Merchant
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold tracking-wider text-[#5A6A85] uppercase">
                Envelope
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold tracking-wider text-[#5A6A85] uppercase">
                Date
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold tracking-wider text-[#5A6A85] uppercase">
                Amount
              </th>
              <th className="px-5 py-2.5 text-right text-[11px] font-semibold tracking-wider text-[#5A6A85] uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2B42]">
            {loading && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-sm text-[#5A6A85]">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && recent.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-sm text-[#3A4A60]">
                  No transactions yet
                </td>
              </tr>
            )}
            {!loading && recent.map((tx, i) => {
              const amountColor =
                tx.type === "income"
                  ? "text-[#4ADE80]"
                  : tx.type === "transfer"
                    ? tx.amount >= 0
                      ? "text-[#4ADE80]"
                      : "text-[#F87171]"
                    : "text-[#F87171]";

              return (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="cursor-pointer transition-colors hover:bg-[#0D1828]"
                >
                  {/* Merchant */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white select-none"
                        style={{ backgroundColor: "#1E2B42" }}
                      >
                        {(tx.payee || tx.accountName || "T")[0]}
                      </div>
                      <div>
                        <p className="max-w-[140px] truncate text-[13px] leading-tight font-medium text-[#E8EEF8]">
                          {tx.payee}
                        </p>
                        {tx.memo && (
                          <p className="max-w-[140px] truncate text-[11px] leading-tight text-[#5A6A85]">
                            {tx.memo}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Envelope */}
                  <td className="px-4 py-3">
                    {tx.envelopeName ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[11px]"
                          style={{ backgroundColor: "#1E2B42" }}
                        >
                          {tx.envelopeName?.[0] ?? "E"}
                        </div>
                        <span className="text-[13px] whitespace-nowrap text-[#A8B4CC]">
                          {tx.envelopeName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-[#2A3A54] select-none">—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap text-[#A8B4CC]">
                    {formatTableDate(tx.date)}
                  </td>

                  {/* Amount */}
                  <td
                    className={cn(
                      "px-4 py-3 text-right text-[13px] font-semibold whitespace-nowrap tabular-nums",
                      amountColor,
                    )}
                  >
                    {tx.amount >= 0 ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3 text-right">
                    <StatusBadge status={STATUSES[i % STATUSES.length]} />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#1E2B42] px-5 py-3">
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-[13px] text-[#6C3AED] transition-colors hover:text-[#A78BFA]"
        >
          View all transactions <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}
