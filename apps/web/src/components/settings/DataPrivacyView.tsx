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
  Download,
  Upload,
  CloudSync,
  EyeOff,
  Trash2,
  FileText,
  BarChart3,
  Bug,
  Mail,
  ChevronRight,
  Info,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/shared/SectionCard";

// ── Toggle (matches SecurityView) ─────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
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

// ── Export Card ────────────────────────────────────────────────────

function DataExportCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623] transition-colors hover:border-[#2A3A54]">
      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(34,197,94,0.12)" }}
        >
          <Download size={16} className="text-[#34D399]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] leading-tight font-semibold text-white">Export your data</h3>
          <p className="mt-0.5 text-[12px] text-[#5A6A85]">
            Download your financial data in CSV or JSON format.
          </p>
        </div>
        <button
          className={cn(
            "flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#34D399]",
            "rounded-lg border border-[rgba(34,197,94,0.3)] px-3 py-1.5",
            "hover:border-[rgba(34,197,94,0.55)] hover:bg-[rgba(34,197,94,0.08)]",
            "transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]",
          )}
        >
          <Download size={12} />
          Export Data
        </button>
      </div>
    </div>
  );
}

// ── Import Card ────────────────────────────────────────────────────

function DataImportCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623] transition-colors hover:border-[#2A3A54]">
      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(59,130,246,0.12)" }}
        >
          <Upload size={16} className="text-[#60A5FA]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] leading-tight font-semibold text-white">Import data</h3>
          <p className="mt-0.5 text-[12px] text-[#5A6A85]">Import transactions from a CSV file.</p>
        </div>
        <button
          className={cn(
            "flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#60A5FA]",
            "rounded-lg border border-[rgba(59,130,246,0.3)] px-3 py-1.5",
            "hover:border-[rgba(59,130,246,0.55)] hover:bg-[rgba(59,130,246,0.08)]",
            "transition-all hover:shadow-[0_0_10px_rgba(59,130,246,0.2)]",
          )}
        >
          <Upload size={12} />
          Import Data
        </button>
      </div>
    </div>
  );
}

// ── Sync Settings Card ─────────────────────────────────────────────

function SyncSettingsCard() {
  const [syncEnabled, setSyncEnabled] = useState(true);

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623] transition-colors hover:border-[#2A3A54]">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(168,85,247,0.12)" }}
        >
          <CloudSync size={16} className="text-[#C084FC]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] leading-tight font-semibold text-white">
            Data synchronization
          </h3>
          <p className="mt-0.5 text-[12px] text-[#5A6A85]">
            Keep your data synced across all your devices.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[12px] text-[#A8B4CC]">
            {syncEnabled ? "Auto-sync is enabled" : "Auto-sync is disabled"}
          </span>
          <Toggle checked={syncEnabled} onChange={setSyncEnabled} />
          <ChevronRight size={14} className="text-[#3A4A60]" />
        </div>
      </div>

      {/* Sync details */}
      <div className="flex items-start gap-8 border-t border-[#1A2640] px-5 pt-3 pb-4">
        <div>
          <p className="text-[11px] leading-tight text-[#5A6A85]">Last synced</p>
          <p className="mt-0.5 text-[12px] text-[#A8B4CC]">May 24, 2025 at 3:15 PM</p>
        </div>
        <div>
          <p className="text-[11px] leading-tight text-[#5A6A85]">Sync status</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            <p className="text-[12px] text-[#A8B4CC]">All up to date</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Privacy Mode Card ──────────────────────────────────────────────

function PrivacyModeCard() {
  const [privacyEnabled, setPrivacyEnabled] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623] transition-colors hover:border-[#2A3A54]">
      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(245,158,11,0.12)" }}
        >
          <EyeOff size={16} className="text-[#FBBF24]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] leading-tight font-semibold text-white">Privacy mode</h3>
          <p className="mt-0.5 text-[12px] text-[#5A6A85]">Hide sensitive amounts in the app.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[12px] text-[#A8B4CC]">
            {privacyEnabled ? "Privacy mode is on" : "Privacy mode is off"}
          </span>
          <Toggle checked={privacyEnabled} onChange={setPrivacyEnabled} />
          <ChevronRight size={14} className="text-[#3A4A60]" />
        </div>
      </div>
    </div>
  );
}

// ── Delete Data Card ───────────────────────────────────────────────

function DeleteDataCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-[rgba(239,68,68,0.15)] bg-[#0F1623] transition-colors hover:border-[rgba(239,68,68,0.3)]">
      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(239,68,68,0.12)" }}
        >
          <Trash2 size={16} className="text-[#F87171]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] leading-tight font-semibold text-white">Delete my data</h3>
          <p className="mt-0.5 text-[12px] text-[#5A6A85]">
            Permanently delete all your data. This action cannot be undone.
          </p>
        </div>
        <button
          className={cn(
            "flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#F87171]",
            "rounded-lg border border-[rgba(248,113,113,0.3)] px-3 py-1.5",
            "hover:border-[rgba(248,113,113,0.6)] hover:bg-[rgba(248,113,113,0.08)]",
            "transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.2)]",
          )}
        >
          <Trash2 size={12} />
          Delete Data
        </button>
      </div>
    </div>
  );
}

// ── Permission Toggle Card ─────────────────────────────────────────

function PermissionToggleCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-xl border border-[#1E2B42] bg-[#0D1520] px-4 py-3.5 transition-colors hover:border-[#2A3A54]">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: iconBg }}
      >
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-tight font-medium text-[#A8B4CC]">{title}</p>
        <p className="mt-0.5 text-[11px] text-[#5A6A85]">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ── Permissions Card ───────────────────────────────────────────────

function PermissionsCard() {
  const [analytics, setAnalytics] = useState(true);
  const [crashReports, setCrashReports] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623] transition-colors hover:border-[#2A3A54]">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[#1E2B42] px-5 py-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(108,58,237,0.15)" }}
        >
          <FileText size={16} className="text-[#A78BFA]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] leading-tight font-semibold text-white">Data permissions</h3>
          <p className="mt-0.5 text-[12px] text-[#5A6A85]">Control how Moniqo uses your data.</p>
        </div>
        <ChevronRight size={14} className="shrink-0 text-[#3A4A60]" />
      </div>

      {/* Permission cards grid */}
      <div className="flex gap-3 p-4">
        <PermissionToggleCard
          icon={BarChart3}
          iconColor="#A78BFA"
          iconBg="rgba(108,58,237,0.12)"
          title="Analytics"
          description="Help us improve Moniqo"
          checked={analytics}
          onChange={setAnalytics}
        />
        <PermissionToggleCard
          icon={Bug}
          iconColor="#60A5FA"
          iconBg="rgba(59,130,246,0.12)"
          title="Crash reports"
          description="Help us fix issues"
          checked={crashReports}
          onChange={setCrashReports}
        />
        <PermissionToggleCard
          icon={Mail}
          iconColor="#5A6A85"
          iconBg="rgba(90,106,133,0.12)"
          title="Marketing emails"
          description="Receive product updates"
          checked={marketing}
          onChange={setMarketing}
        />
      </div>
    </div>
  );
}

// ── Privacy Notice Strip ───────────────────────────────────────────

function PrivacyNoticeStrip() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#1E2B42] bg-[#0D1520] px-4 py-3">
      <Info size={14} className="shrink-0 text-[#60A5FA]" />
      <p className="flex-1 text-[12px] text-[#5A6A85]">
        We never sell your data. Your privacy is our priority.
      </p>
      <button className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#6C3AED] transition-colors hover:text-[#A78BFA]">
        Read our Privacy Policy
        <ExternalLink size={11} />
      </button>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────

export function DataPrivacyView() {
  return (
    <SectionCard
      title="Data & Privacy"
      description="Control your data, exports, imports, and privacy preferences."
      icon={FileText}
      iconColor="#C084FC"
      iconBg="rgba(168,85,247,0.12)"
      noPadding
    >
      <div className="flex flex-col gap-3 p-5">
        <DataExportCard />
        <DataImportCard />
        <SyncSettingsCard />
        <PrivacyModeCard />
        <DeleteDataCard />
        <PermissionsCard />
        <PrivacyNoticeStrip />
      </div>
    </SectionCard>
  );
}
