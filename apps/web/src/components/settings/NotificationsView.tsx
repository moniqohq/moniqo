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
  Bell,
  Moon,
  Mail,
  ArrowUpDown,
  Wallet,
  CalendarClock,
  Target,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationChannelsModal } from "./NotificationChannelsModal";
import { QuietHoursModal } from "./QuietHoursModal";
import { EmailDigestModal } from "./EmailDigestModal";

// ── Toggle ────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[#6C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1623]",
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

// ── Notification row ──────────────────────────────────────────────

function NotifRow({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  description,
  checked,
  onChange,
  last = false,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-4 py-3.5", !last && "border-b border-[#1A2640]")}>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: iconBg }}
      >
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-tight text-[#A8B4CC]">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[#5A6A85]">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ── Section header with "Enable all" ─────────────────────────────

function SectionHeader({
  label,
  description,
  allEnabled,
  onToggleAll,
}: {
  label: string;
  description: string;
  allEnabled: boolean;
  onToggleAll: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#1E2B42] pb-3">
      <div>
        <p className="text-[14px] font-semibold leading-tight text-white">{label}</p>
        <p className="mt-0.5 text-[12px] text-[#5A6A85]">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="text-[12px] text-[#5A6A85]">Enable all</span>
        <Toggle checked={allEnabled} onChange={onToggleAll} />
      </div>
    </div>
  );
}

// ── Tab card ──────────────────────────────────────────────────────

function TabCard({
  icon: Icon,
  label,
  description,
  iconColor,
  iconBg,
  hoverBorder,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  iconColor: string;
  iconBg: string;
  hoverBorder: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-1 items-center gap-3 rounded-xl border border-[#1E2B42] bg-[#0F1623] px-4 py-3 text-left transition-all hover:bg-[#131C2E]"
      style={{ "--hover-border": hoverBorder } as React.CSSProperties}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = hoverBorder)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: iconBg }}
      >
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-tight text-[#A8B4CC] transition-colors group-hover:text-white">
          {label}
        </p>
        <p className="mt-0.5 text-[11px] leading-tight text-[#5A6A85]">{description}</p>
      </div>
    </button>
  );
}

// ── Push notification items ───────────────────────────────────────

const PUSH_ITEMS = [
  {
    id: "transactions",
    icon: ArrowUpDown,
    iconColor: "#60A5FA",
    iconBg: "rgba(59,130,246,0.12)",
    label: "Transactions",
    description: "Get notified about new transactions and updates.",
  },
  {
    id: "budgets",
    icon: Wallet,
    iconColor: "#34D399",
    iconBg: "rgba(34,197,94,0.12)",
    label: "Budget & Envelopes",
    description: "Alerts for budget limits, overspending, and envelope updates.",
  },
  {
    id: "bills",
    icon: CalendarClock,
    iconColor: "#FBBF24",
    iconBg: "rgba(245,158,11,0.12)",
    label: "Bills & Reminders",
    description: "Reminders for upcoming bills and scheduled payments.",
  },
  {
    id: "goals",
    icon: Target,
    iconColor: "#C084FC",
    iconBg: "rgba(168,85,247,0.12)",
    label: "Goals",
    description: "Updates on your goal progress and achievements.",
  },
  {
    id: "accountAlerts",
    icon: Building2,
    iconColor: "#FB923C",
    iconBg: "rgba(249,115,22,0.12)",
    label: "Account Alerts",
    description: "Important alerts about your accounts and balances.",
  },
];

// ── Email notification items ──────────────────────────────────────

const EMAIL_ITEMS = [
  {
    id: "weeklySummary",
    icon: Mail,
    iconColor: "#34D399",
    iconBg: "rgba(34,197,94,0.12)",
    label: "Weekly summary",
    description: "A weekly overview of your spending and progress.",
  },
  {
    id: "monthlySummary",
    icon: Mail,
    iconColor: "#C084FC",
    iconBg: "rgba(168,85,247,0.12)",
    label: "Monthly summary",
    description: "A detailed summary at the end of each month.",
  },
  {
    id: "productUpdates",
    icon: Bell,
    iconColor: "#60A5FA",
    iconBg: "rgba(59,130,246,0.12)",
    label: "Product updates",
    description: "News about new features and improvements.",
  },
];

type NotifKey =
  | "transactions"
  | "budgets"
  | "bills"
  | "goals"
  | "accountAlerts"
  | "weeklySummary"
  | "monthlySummary"
  | "productUpdates";

// ── Main view ─────────────────────────────────────────────────────

export function NotificationsView() {
  const [showChannelsModal, setShowChannelsModal] = useState(false);
  const [showQuietHoursModal, setShowQuietHoursModal] = useState(false);
  const [showEmailDigestModal, setShowEmailDigestModal] = useState(false);
  const [settings, setSettings] = useState<Record<NotifKey, boolean>>({
    transactions: true,
    budgets: true,
    bills: true,
    goals: true,
    accountAlerts: true,
    weeklySummary: true,
    monthlySummary: true,
    productUpdates: true,
  });

  function set(key: NotifKey, val: boolean) {
    setSettings((s) => ({ ...s, [key]: val }));
  }

  const pushKeys: NotifKey[] = ["transactions", "budgets", "bills", "goals", "accountAlerts"];
  const emailKeys: NotifKey[] = ["weeklySummary", "monthlySummary", "productUpdates"];

  const allPushOn = pushKeys.every((k) => settings[k]);
  const allEmailOn = emailKeys.every((k) => settings[k]);

  function setAll(keys: NotifKey[], val: boolean) {
    setSettings((s) => {
      const next = { ...s };
      keys.forEach((k) => {
        next[k] = val;
      });
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
      {/* ── Card heading ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[#1E2B42] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold text-white">Notifications</h2>
          <p className="mt-0.5 text-[12px] text-[#5A6A85]">
            Choose what you want to be notified about and how.
          </p>
        </div>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "rgba(108,58,237,0.12)" }}
        >
          <Bell size={18} style={{ color: "#A78BFA" }} />
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5">
        {/* ── Tab cards ────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <TabCard
            icon={Bell}
            label="Configure webhook"
            description="Set up and manage your webhook endpoint"
            iconColor="#FB923C"
            iconBg="rgba(249,115,22,0.12)"
            hoverBorder="rgba(249,115,22,0.35)"
            onClick={() => setShowChannelsModal(true)}
          />
          <TabCard
            icon={Moon}
            label="Quiet hours"
            description="Set times to pause notifications"
            iconColor="#A78BFA"
            iconBg="rgba(108,58,237,0.12)"
            hoverBorder="rgba(108,58,237,0.4)"
            onClick={() => setShowQuietHoursModal(true)}
          />
          <TabCard
            icon={Mail}
            label="Email digest"
            description="Manage summary emails"
            iconColor="#34D399"
            iconBg="rgba(34,197,94,0.12)"
            hoverBorder="rgba(34,197,94,0.35)"
            onClick={() => setShowEmailDigestModal(true)}
          />
        </div>

        {/* ── Push Notifications ───────────────────────────────── */}
        <div className="flex flex-col gap-0 rounded-xl border border-[#1A2640] bg-[#0A1020] p-5">
          <SectionHeader
            label="Push Notifications"
            description="Receive alerts on this device."
            allEnabled={allPushOn}
            onToggleAll={(v) => setAll(pushKeys, v)}
          />
          <div className="mt-1">
            {PUSH_ITEMS.map((item, i) => (
              <NotifRow
                key={item.id}
                icon={item.icon}
                iconColor={item.iconColor}
                iconBg={item.iconBg}
                label={item.label}
                description={item.description}
                checked={settings[item.id as NotifKey]}
                onChange={(v) => set(item.id as NotifKey, v)}
                last={i === PUSH_ITEMS.length - 1}
              />
            ))}
          </div>
        </div>

        {/* ── Email Notifications ──────────────────────────────── */}
        <div className="flex flex-col gap-0 rounded-xl border border-[#1A2640] bg-[#0A1020] p-5">
          <SectionHeader
            label="Email Notifications"
            description="Receive updates and summaries in your inbox."
            allEnabled={allEmailOn}
            onToggleAll={(v) => setAll(emailKeys, v)}
          />
          <div className="mt-1">
            {EMAIL_ITEMS.map((item, i) => (
              <NotifRow
                key={item.id}
                icon={item.icon}
                iconColor={item.iconColor}
                iconBg={item.iconBg}
                label={item.label}
                description={item.description}
                checked={settings[item.id as NotifKey]}
                onChange={(v) => set(item.id as NotifKey, v)}
                last={i === EMAIL_ITEMS.length - 1}
              />
            ))}
          </div>
        </div>
      </div>

      <NotificationChannelsModal
        open={showChannelsModal}
        onClose={() => setShowChannelsModal(false)}
      />
      <QuietHoursModal open={showQuietHoursModal} onClose={() => setShowQuietHoursModal(false)} />
      <EmailDigestModal
        open={showEmailDigestModal}
        onClose={() => setShowEmailDigestModal(false)}
      />
    </div>
  );
}
