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

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Building2,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  TrendingUp,
  FileText,
  User,
  Calendar,
  Hash,
  PiggyBank,
  CreditCard,
  Wallet,
  Landmark,
  Edit2,
  Copy,
  CheckCircle,
  Trash2,
} from "lucide-react";
import type { Transaction, AccountType } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";

function formatModalDate(dateStr: string): string {
  const d = new Date(dateStr + "T09:42:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const ACCOUNT_TYPE_META: Record<AccountType, { icon: React.ReactNode; color: string }> = {
  checking: { icon: <Building2 size={14} />, color: "#3B82F6" },
  savings: { icon: <PiggyBank size={14} />, color: "#22C55E" },
  credit: { icon: <CreditCard size={14} />, color: "#F87171" },
  cash: { icon: <Wallet size={14} />, color: "#F59E0B" },
  loan: { icon: <Landmark size={14} />, color: "#EC4899" },
};

interface Props {
  tx: Transaction | null;
  open: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function TransactionDetailsModal({ tx, open, onClose, onDelete, onEdit }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!tx) return null;

  const isExpense = tx.type === "expense";
  const isIncome = tx.type === "income";
  const isTransfer = tx.type === "transfer";

  const amountColor = isIncome ? "text-[#4ADE80]" : isExpense ? "text-[#F87171]" : "text-[#93C5FD]";

  const accMeta = ACCOUNT_TYPE_META.checking;

  const formattedDate = formatModalDate(tx.date);
  const txId = `TXN-${tx.id}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Centering shell */}
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Transaction Details"
              className="relative my-auto w-full max-w-[1040px] rounded-2xl border border-[#1E2B42] bg-[#0A1220]/97 shadow-[0_0_80px_rgba(108,58,237,0.18),0_30px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top glow line */}
              <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-[#6C3AED]/35 to-transparent" />

              <div className="p-6">
                {/* ── Header ─────────────────────────────────── */}
                <div className="mb-4 flex items-start gap-5">
                  {/* Amount */}
                  <div
                    className={cn(
                      "mt-1 shrink-0 text-[2.25rem] leading-none font-bold tabular-nums",
                      amountColor,
                    )}
                  >
                    {tx.amount >= 0 ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                  </div>

                  {/* Merchant */}
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                      style={{ backgroundColor: tx.payeeColor ?? "#1E2B42" }}
                    >
                      {tx.payee[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xl leading-tight font-semibold text-[#E8EEF8]">
                        {tx.payee}
                      </p>
                      {tx.memo && (
                        <p className="mt-0.5 truncate text-sm text-[#5A6A85]">{tx.memo}</p>
                      )}
                    </div>
                  </div>

                  {/* Close */}
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5A6A85] transition-colors hover:bg-[#1E2B42] hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Date + badges */}
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm text-[#7A8BA8]">
                    <Calendar size={13} className="text-[#3A4A60]" />
                    <span>{formattedDate}</span>
                  </div>

                  <span className="text-[#1E2B42] select-none">|</span>

                  {/* Type badge */}
                  {isExpense && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(239,68,68,0.12)] px-2.5 py-1 text-xs font-medium text-[#F87171]">
                      <ArrowDownLeft size={11} strokeWidth={2.5} /> Expense
                    </span>
                  )}
                  {isIncome && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(34,197,94,0.12)] px-2.5 py-1 text-xs font-medium text-[#4ADE80]">
                      <ArrowUpRight size={11} strokeWidth={2.5} /> Income
                    </span>
                  )}
                  {isTransfer && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(99,179,237,0.12)] px-2.5 py-1 text-xs font-medium text-[#7DD3FC]">
                      <ArrowLeftRight size={11} strokeWidth={2.5} /> Transfer
                    </span>
                  )}

                  {/* Status badge */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                      tx.cleared
                        ? "border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] text-[#4ADE80]"
                        : "border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] text-[#FCD34D]",
                    )}
                  >
                    {tx.cleared && <CheckCircle size={11} strokeWidth={2} />}
                    {tx.cleared ? "Cleared" : "Pending"}
                  </span>
                </div>

                <div className="mb-5 h-px bg-[#141F32]" />

                {/* ── Main content ───────────────────────────── */}
                <div className="mb-5 flex gap-0">
                  {/* Left: Financial Details + Budget Impact */}
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-4 text-sm font-semibold text-[#E8EEF8]">Financial Details</h3>

                    {/* 2-col detail grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5 pr-6">
                      {/* Column 1 */}
                      <div className="space-y-5">
                        {/* Account */}
                        <DetailRow
                          icon={
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor: `${accMeta.color}1A`,
                                color: accMeta.color,
                              }}
                            >
                              {accMeta.icon}
                            </div>
                          }
                          label="Account"
                          value={tx.accountInstitution ?? tx.accountName}
                        />

                        {/* Envelope */}
                        <DetailRow
                          icon={
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                              style={{
                                backgroundColor: tx.envelopeColor
                                  ? `${tx.envelopeColor}2A`
                                  : "#1A2640",
                                color: tx.envelopeColor ?? "#5A6A85",
                              }}
                            >
                              {tx.envelopeIcon ?? <Tag size={14} />}
                            </div>
                          }
                          label="Envelope / Category"
                          value={tx.envelopeName ?? "—"}
                        />

                        {/* Transaction Type */}
                        <DetailRow
                          icon={
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor: isExpense
                                  ? "rgba(239,68,68,0.12)"
                                  : isIncome
                                    ? "rgba(34,197,94,0.12)"
                                    : "rgba(99,179,237,0.12)",
                                color: isExpense ? "#F87171" : isIncome ? "#4ADE80" : "#7DD3FC",
                              }}
                            >
                              {isExpense ? (
                                <ArrowDownLeft size={14} strokeWidth={2.5} />
                              ) : isIncome ? (
                                <ArrowUpRight size={14} strokeWidth={2.5} />
                              ) : (
                                <ArrowLeftRight size={14} strokeWidth={2.5} />
                              )}
                            </div>
                          }
                          label="Transaction Type"
                          value={tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        />
                      </div>

                      {/* Column 2 */}
                      <div className="space-y-5">
                        {/* Transfer Account */}
                        <DetailRow
                          icon={
                            <IconBox>
                              <ArrowLeftRight size={14} />
                            </IconBox>
                          }
                          label="Transfer Account"
                          value="—"
                        />

                        {/* Running Balance */}
                        <DetailRow
                          icon={
                            <IconBox>
                              <TrendingUp size={14} />
                            </IconBox>
                          }
                          label="Running Balance After Transaction"
                          value={false ? formatCurrency(0) : "—"}
                        />

                        {/* Notes */}
                        <DetailRow
                          icon={
                            <IconBox>
                              <FileText size={14} />
                            </IconBox>
                          }
                          label="Notes"
                          value={tx.memo ?? "—"}
                        />
                      </div>
                    </div>

                    {/* Budget Impact */}
                    <div className="mt-6 pr-6">
                      <div className="mb-4 h-px bg-[#141F32]" />
                      <h3 className="mb-4 text-sm font-semibold text-[#E8EEF8]">Budget Impact</h3>

                      <div className="flex items-center gap-3">
                        <ImpactCard label="Envelope Balance Before">
                          <span className="text-xl font-bold text-[#E8EEF8] tabular-nums">
                            {formatCurrency(0)}
                          </span>
                        </ImpactCard>

                        <span className="shrink-0 text-xl font-bold text-[#3A4A60]">−</span>

                        <ImpactCard label="Transaction Amount">
                          <span className={cn("text-xl font-bold tabular-nums", amountColor)}>
                            {tx.amount >= 0
                              ? `+${formatCurrency(tx.amount)}`
                              : formatCurrency(tx.amount)}
                          </span>
                        </ImpactCard>

                        <span className="shrink-0 text-xl font-bold text-[#3A4A60]">=</span>

                        <ImpactCard label="Envelope Balance After">
                          <span
                            className={cn(
                              "text-xl font-bold tabular-nums",
                              0 >= 0 ? "text-[#4ADE80]" : "text-[#F87171]",
                            )}
                          >
                            {formatCurrency(0)}
                          </span>
                        </ImpactCard>
                      </div>
                    </div>
                  </div>

                  {/* Vertical divider */}
                  <div className="mx-6 w-px self-stretch bg-[#141F32]" />

                  {/* Right: Metadata */}
                  <div className="w-[260px] shrink-0">
                    <h3 className="mb-4 text-sm font-semibold text-[#E8EEF8]">Metadata</h3>
                    <div className="space-y-4">
                      {/* Created by */}
                      <DetailRow
                        icon={
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6C3AED]/20 text-[#8B5CF6]">
                            <User size={14} />
                          </div>
                        }
                        label="Created by"
                        value="—"
                      />

                      {/* Created at */}
                      <DetailRow
                        icon={
                          <IconBox>
                            <Calendar size={14} />
                          </IconBox>
                        }
                        label="Created at"
                        value={formattedDate}
                      />

                      {/* Updated at */}
                      <DetailRow
                        icon={
                          <IconBox>
                            <Calendar size={14} />
                          </IconBox>
                        }
                        label="Updated at"
                        value={formattedDate}
                      />

                      {/* Transaction ID */}
                      <div className="flex items-start gap-3">
                        <IconBox>
                          <Hash size={14} />
                        </IconBox>
                        <div>
                          <p className="mb-0.5 text-xs text-[#5A6A85]">Transaction ID</p>
                          <p className="font-mono text-xs break-all text-[#A8B4CC]">{txId}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Action buttons ─────────────────────────── */}
                <div className="mb-4 h-px bg-[#141F32]" />
                <div className="flex items-center gap-2.5">
                  <ActionBtn onClick={onEdit}>
                    <Edit2 size={14} /> Edit
                  </ActionBtn>
                  <ActionBtn>
                    <Copy size={14} /> Duplicate
                  </ActionBtn>
                  <ActionBtn className="border-[#22C55E]/30 text-[#4ADE80] hover:border-[#22C55E]/50 hover:bg-[#22C55E]/10 focus:ring-[#22C55E]/30">
                    <CheckCircle size={14} /> Mark Reconciled
                  </ActionBtn>
                  <ActionBtn
                    className="ml-auto border-[#EF4444]/30 text-[#F87171] hover:border-[#EF4444]/50 hover:bg-[#EF4444]/10 focus:ring-[#EF4444]/30"
                    onClick={onDelete}
                  >
                    <Trash2 size={14} /> Delete
                  </ActionBtn>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Small reusable pieces ─────────────────────────────── */

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#131D30] text-[#5A6A85]">
      {children}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="mb-0.5 text-xs text-[#5A6A85]">{label}</p>
        <p className="text-sm font-medium break-words text-[#E8EEF8]">{value}</p>
      </div>
    </div>
  );
}

function ImpactCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 rounded-xl border border-[#1E2B42] bg-[#080E1A] px-4 py-3">
      <p className="mb-2 text-xs leading-tight text-[#5A6A85]">{label}</p>
      {children}
    </div>
  );
}

function ActionBtn({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-[#1E2B42] px-4 py-2 text-sm font-medium text-[#A8B4CC]",
        "hover:border-[#2A3A54] hover:bg-[#1A2640] hover:text-white",
        "transition-all focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none",
        className,
      )}
    >
      {children}
    </button>
  );
}
