'use client'

import { useState } from 'react'
import {
  Download, Upload, CloudSync, EyeOff, Trash2, FileText,
  BarChart3, Bug, Mail, ChevronRight, Info,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionCard } from '@/components/shared/SectionCard'

// ── Toggle (matches SecurityView) ─────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#6C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1623]',
        checked ? 'bg-[#6C3AED]' : 'bg-[#1E2B42]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ── Export Card ────────────────────────────────────────────────────

function DataExportCard() {
  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden hover:border-[#2A3A54] transition-colors">
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
          <Download size={16} className="text-[#34D399]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-white leading-tight">Export your data</h3>
          <p className="text-[12px] text-[#5A6A85] mt-0.5">Download your financial data in CSV or JSON format.</p>
        </div>
        <button
          className={cn(
            'flex items-center gap-1.5 text-[12px] font-medium text-[#34D399] shrink-0',
            'px-3 py-1.5 rounded-lg border border-[rgba(34,197,94,0.3)]',
            'hover:border-[rgba(34,197,94,0.55)] hover:bg-[rgba(34,197,94,0.08)]',
            'hover:shadow-[0_0_10px_rgba(34,197,94,0.2)] transition-all',
          )}
        >
          <Download size={12} />
          Export Data
        </button>
      </div>
    </div>
  )
}

// ── Import Card ────────────────────────────────────────────────────

function DataImportCard() {
  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden hover:border-[#2A3A54] transition-colors">
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
          <Upload size={16} className="text-[#60A5FA]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-white leading-tight">Import data</h3>
          <p className="text-[12px] text-[#5A6A85] mt-0.5">Import transactions from a CSV file.</p>
        </div>
        <button
          className={cn(
            'flex items-center gap-1.5 text-[12px] font-medium text-[#60A5FA] shrink-0',
            'px-3 py-1.5 rounded-lg border border-[rgba(59,130,246,0.3)]',
            'hover:border-[rgba(59,130,246,0.55)] hover:bg-[rgba(59,130,246,0.08)]',
            'hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all',
          )}
        >
          <Upload size={12} />
          Import Data
        </button>
      </div>
    </div>
  )
}

// ── Sync Settings Card ─────────────────────────────────────────────

function SyncSettingsCard() {
  const [syncEnabled, setSyncEnabled] = useState(true)

  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden hover:border-[#2A3A54] transition-colors">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(168,85,247,0.12)' }}>
          <CloudSync size={16} className="text-[#C084FC]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-white leading-tight">Data synchronization</h3>
          <p className="text-[12px] text-[#5A6A85] mt-0.5">Keep your data synced across all your devices.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[12px] text-[#A8B4CC]">
            {syncEnabled ? 'Auto-sync is enabled' : 'Auto-sync is disabled'}
          </span>
          <Toggle checked={syncEnabled} onChange={setSyncEnabled} />
          <ChevronRight size={14} className="text-[#3A4A60]" />
        </div>
      </div>

      {/* Sync details */}
      <div className="flex items-start gap-8 px-5 pb-4 border-t border-[#1A2640] pt-3">
        <div>
          <p className="text-[11px] text-[#5A6A85] leading-tight">Last synced</p>
          <p className="text-[12px] text-[#A8B4CC] mt-0.5">May 24, 2025 at 3:15 PM</p>
        </div>
        <div>
          <p className="text-[11px] text-[#5A6A85] leading-tight">Sync status</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            <p className="text-[12px] text-[#A8B4CC]">All up to date</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Privacy Mode Card ──────────────────────────────────────────────

function PrivacyModeCard() {
  const [privacyEnabled, setPrivacyEnabled] = useState(false)

  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden hover:border-[#2A3A54] transition-colors">
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.12)' }}>
          <EyeOff size={16} className="text-[#FBBF24]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-white leading-tight">Privacy mode</h3>
          <p className="text-[12px] text-[#5A6A85] mt-0.5">Hide sensitive amounts in the app.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[12px] text-[#A8B4CC]">
            {privacyEnabled ? 'Privacy mode is on' : 'Privacy mode is off'}
          </span>
          <Toggle checked={privacyEnabled} onChange={setPrivacyEnabled} />
          <ChevronRight size={14} className="text-[#3A4A60]" />
        </div>
      </div>
    </div>
  )
}

// ── Delete Data Card ───────────────────────────────────────────────

function DeleteDataCard() {
  return (
    <div className="bg-[#0F1623] border border-[rgba(239,68,68,0.15)] rounded-xl overflow-hidden hover:border-[rgba(239,68,68,0.3)] transition-colors">
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
          <Trash2 size={16} className="text-[#F87171]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-white leading-tight">Delete my data</h3>
          <p className="text-[12px] text-[#5A6A85] mt-0.5">Permanently delete all your data. This action cannot be undone.</p>
        </div>
        <button
          className={cn(
            'flex items-center gap-1.5 text-[12px] font-medium text-[#F87171] shrink-0',
            'px-3 py-1.5 rounded-lg border border-[rgba(248,113,113,0.3)]',
            'hover:border-[rgba(248,113,113,0.6)] hover:bg-[rgba(248,113,113,0.08)]',
            'hover:shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all',
          )}
        >
          <Trash2 size={12} />
          Delete Data
        </button>
      </div>
    </div>
  )
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
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-[#0D1520] rounded-xl border border-[#1E2B42] hover:border-[#2A3A54] transition-colors flex-1">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#A8B4CC] leading-tight">{title}</p>
        <p className="text-[11px] text-[#5A6A85] mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// ── Permissions Card ───────────────────────────────────────────────

function PermissionsCard() {
  const [analytics, setAnalytics] = useState(true)
  const [crashReports, setCrashReports] = useState(true)
  const [marketing, setMarketing] = useState(false)

  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden hover:border-[#2A3A54] transition-colors">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-[#1E2B42]">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(108,58,237,0.15)' }}>
          <FileText size={16} className="text-[#A78BFA]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-white leading-tight">Data permissions</h3>
          <p className="text-[12px] text-[#5A6A85] mt-0.5">Control how Moniqo uses your data.</p>
        </div>
        <ChevronRight size={14} className="text-[#3A4A60] shrink-0" />
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
  )
}

// ── Privacy Notice Strip ───────────────────────────────────────────

function PrivacyNoticeStrip() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0D1520] border border-[#1E2B42]">
      <Info size={14} className="text-[#60A5FA] shrink-0" />
      <p className="flex-1 text-[12px] text-[#5A6A85]">We never sell your data. Your privacy is our priority.</p>
      <button className="flex items-center gap-1.5 text-[12px] font-medium text-[#6C3AED] hover:text-[#A78BFA] transition-colors shrink-0">
        Read our Privacy Policy
        <ExternalLink size={11} />
      </button>
    </div>
  )
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
      <div className="p-5 flex flex-col gap-3">
        <DataExportCard />
        <DataImportCard />
        <SyncSettingsCard />
        <PrivacyModeCard />
        <DeleteDataCard />
        <PermissionsCard />
        <PrivacyNoticeStrip />
      </div>
    </SectionCard>
  )
}
