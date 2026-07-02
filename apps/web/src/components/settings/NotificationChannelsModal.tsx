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

import { useState } from "react";
import {
  Globe,
  X,
  Info,
  Send,
  ArrowUpDown,
  Wallet,
  CalendarClock,
  Building2,
  Shield,
  Pencil,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ── Webhook event groups ───────────────────────────────────────────

const WEBHOOK_EVENT_GROUPS = [
  {
    id: "transactions",
    icon: ArrowUpDown,
    iconColor: "#60A5FA",
    iconBg: "rgba(59,130,246,0.12)",
    label: "Transactions",
    description: "New transactions, updated transactions, and refunds.",
  },
  {
    id: "budgets",
    icon: Wallet,
    iconColor: "#34D399",
    iconBg: "rgba(34,197,94,0.12)",
    label: "Budget & Envelopes",
    description: "Overspending alerts and envelope updates.",
  },
  {
    id: "bills",
    icon: CalendarClock,
    iconColor: "#FBBF24",
    iconBg: "rgba(245,158,11,0.12)",
    label: "Bills & Reminders",
    description: "Upcoming bills and scheduled payment reminders.",
  },
  {
    id: "accountAlerts",
    icon: Building2,
    iconColor: "#F87171",
    iconBg: "rgba(239,68,68,0.12)",
    label: "Account Alerts",
    description: "Balance updates, low balance, and account changes.",
  },
  {
    id: "securityEvents",
    icon: Shield,
    iconColor: "#A78BFA",
    iconBg: "rgba(108,58,237,0.12)",
    label: "Security Events",
    description: "Login alerts, 2FA changes, and security updates.",
  },
];

// ── Toggle ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
        "focus-visible:ring-[#6C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1520]",
        checked ? "bg-[#6C3AED]" : "bg-[#1E2B42]",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

// ── Checkbox ────────────────────────────────────────────────────────

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-[#6C3AED] focus-visible:outline-none",
        "focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1623]",
        checked
          ? "border-[#6C3AED] bg-[#6C3AED]"
          : "border-[#2A3A54] bg-transparent hover:border-[#4A5A74]",
      )}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden="true">
          <path
            d="M1 3.5L3.5 6L8 1"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// ── WebhookConfigModal ──────────────────────────────────────────────

export function NotificationChannelsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [eventGroups, setEventGroups] = useState<Record<string, boolean>>({
    transactions: true,
    budgets: true,
    bills: true,
    accountAlerts: true,
    securityEvents: true,
  });

  const allSelected = Object.values(eventGroups).every(Boolean);
  const MOCK_SECRET = "whsec_k9mXp2rLqT8vNcJdAeYfUbW4sGhRn6oI";

  function toggleGroup(id: string, v: boolean) {
    setEventGroups((prev) => ({ ...prev, [id]: v }));
  }

  function selectAll(v: boolean) {
    setEventGroups(Object.fromEntries(Object.keys(eventGroups).map((k) => [k, v])));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] min-w-0 gap-0 overflow-hidden rounded-xl border-[#1E2B42] bg-[#0D1520] p-0 sm:max-w-[780px]"
      >
        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-center gap-4 border-b border-[#1E2B42] px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(249,115,22,0.12)]">
            <Globe size={18} className="text-[#FB923C]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] leading-tight font-semibold text-white">Configure webhook</p>
            <p className="mt-0.5 text-[12px] text-[#5A6A85]">
              Manage your webhook endpoint and delivery settings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5A6A85] transition-all hover:bg-[#1E2B42] hover:text-[#A8B4CC]"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="overflow-y-auto p-5" style={{ maxHeight: "calc(100vh - 220px)" }}>
          {/* Enable toggle */}
          <div className="flex items-start justify-between gap-4 border-b border-[#1E2B42] pb-4">
            <div>
              <p className="text-[13px] leading-tight font-semibold text-white">Enable webhooks</p>
              <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-[#5A6A85]">
                Send real-time event notifications to your webhook endpoints.
              </p>
            </div>
            <Toggle checked={enabled} onChange={setEnabled} />
          </div>

          {/* Webhook endpoints */}
          <div
            className={cn(
              "border-b border-[#1E2B42] py-4",
              !enabled && "pointer-events-none opacity-40",
            )}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-white">Endpoints</p>
                <p className="mt-0.5 text-[11px] text-[#5A6A85]">
                  We&apos;ll send a POST request to these URLs when events occur.
                </p>
              </div>
              <button
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium",
                  "bg-[#6C3AED] text-white transition-all hover:bg-[#7C4AFD]",
                )}
              >
                <Plus size={12} />
                Add endpoint
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#1E2B42] bg-[#0F1623] px-3.5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(108,58,237,0.2)]">
                <span className="text-[10px] font-bold tracking-wide text-[#A78BFA]">WH</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-tight font-medium text-white">
                  Moniqo Integration
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#5A6A85]">
                  https://api.moniqointegrations.com/webhook
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <div className="rounded-md border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.12)] px-2 py-0.5">
                  <span className="text-[11px] font-semibold text-[#22C55E]">Active</span>
                </div>
                <button className="flex items-center gap-1 text-[12px] text-[#A8B4CC] transition-colors hover:text-white">
                  <Pencil size={12} />
                  Edit
                </button>
                <button className="flex items-center gap-1 text-[12px] text-[#F87171] transition-colors hover:text-[#FCA5A5]">
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Secret token */}
          <div
            className={cn(
              "border-b border-[#1E2B42] py-4",
              !enabled && "pointer-events-none opacity-40",
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-white">Secret token</p>
                <p className="mt-0.5 text-[11px] text-[#5A6A85]">
                  Use this token to verify that requests are coming from Moniqo.
                </p>
              </div>
              <button className="flex items-center gap-1.5 text-[12px] font-medium text-[#A78BFA] transition-colors hover:text-[#C4B5FD]">
                <RefreshCw size={12} />
                Regenerate
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-[#1E2B42] bg-[#0F1623] px-3.5 py-2.5">
                <span className="truncate text-[15px] tracking-[0.15em] text-[#A8B4CC] select-none">
                  {showSecret ? MOCK_SECRET : "••••••••••••••••••••••••••••••"}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => setShowSecret((v) => !v)}
                    className="p-1 text-[#5A6A85] transition-colors hover:text-[#A8B4CC]"
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(MOCK_SECRET)}
                    className="p-1 text-[#5A6A85] transition-colors hover:text-[#A8B4CC]"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-[#5A6A85]">
              Keep this token secure. Do not share it publicly.
            </p>
          </div>

          {/* Events to send */}
          <div className={cn("py-4", !enabled && "pointer-events-none opacity-40")}>
            <div className="mb-1 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-white">Events to send</p>
                <p className="mt-0.5 text-[11px] text-[#5A6A85]">
                  Choose which events should trigger webhook notifications.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#5A6A85]">Select all</span>
                <Checkbox checked={allSelected} onChange={selectAll} />
              </div>
            </div>

            <div>
              {WEBHOOK_EVENT_GROUPS.map((group, i) => {
                const Icon = group.icon;
                return (
                  <div
                    key={group.id}
                    className={cn(
                      "flex items-center gap-3 py-3",
                      i < WEBHOOK_EVENT_GROUPS.length - 1 && "border-b border-[#1A2640]",
                    )}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: group.iconBg }}
                    >
                      <Icon size={14} style={{ color: group.iconColor }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-tight font-medium text-[#A8B4CC]">
                        {group.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#5A6A85]">{group.description}</p>
                    </div>
                    <Checkbox
                      checked={eventGroups[group.id]}
                      onChange={(v) => toggleGroup(group.id, v)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 border-t border-[#1E2B42] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#1E2B42] bg-[#131C2E]">
              <Info size={11} className="text-[#5A6A85]" />
            </div>
            <p className="text-[12px] leading-tight text-[#A8B4CC]">
              Changes are saved automatically.
            </p>
          </div>
          <button
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-medium",
              "border border-[#2A3A54] bg-transparent text-[#A8B4CC]",
              "hover:border-[rgba(108,58,237,0.4)] hover:bg-[rgba(108,58,237,0.08)] hover:text-white",
              "transition-all duration-200 hover:shadow-[0_0_12px_rgba(108,58,237,0.12)]",
            )}
          >
            <Send size={12} />
            Test webhook
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
