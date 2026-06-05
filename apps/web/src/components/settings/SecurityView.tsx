'use client'

import { useState } from 'react'
import {
  Shield, Lock, Monitor, Smartphone, Laptop, Tablet,
  Eye, EyeOff, ChevronRight, MoreVertical, LogOut, Plus,
  CheckCircle2, KeyRound, QrCode, Mail, Info, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionCard } from '@/components/shared/SectionCard'

// ── Toggle ────────────────────────────────────────────────────────

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

// ── Password Field ────────────────────────────────────────────────

function PasswordField({
  value,
  onChange,
  show,
  onToggleShow,
  placeholder = '••••••••••',
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        <Lock size={12} className="text-[#5A6A85]" />
      </div>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-8 pl-8 pr-8 rounded-lg border border-[#1E2B42] bg-[#0D1520]',
          'text-[12px] text-[#A8B4CC] placeholder:text-[#3A4A60] outline-none',
          'focus:border-[#6C3AED] focus:ring-2 focus:ring-[rgba(108,58,237,0.2)] transition-all',
        )}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6A85] hover:text-[#A8B4CC] transition-colors"
      >
        {show ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  )
}

// ── Password Card ─────────────────────────────────────────────────

function PasswordCard() {
  const [showCurrent, setShowCurrent]     = useState(false)
  const [showNew, setShowNew]             = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [currentPw, setCurrentPw]         = useState('')
  const [newPw, setNewPw]                 = useState('')
  const [confirmPw, setConfirmPw]         = useState('')

  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1E2B42]">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(108,58,237,0.15)' }}>
          <Lock size={16} className="text-[#A78BFA]" />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-white leading-tight">Change Password</h2>
          <p className="text-[12px] text-[#5A6A85] mt-0.5">Update your password regularly to keep your account secure.</p>
        </div>
        <ChevronRight size={15} className="text-[#3A4A60]" />
      </div>

      <div className="p-5 flex flex-col gap-3">
        {/* Current Password */}
        <div className="flex items-center gap-3">
          <span className="w-[140px] shrink-0 text-[12px] text-[#A8B4CC]">Current Password</span>
          <PasswordField
            value={currentPw}
            onChange={setCurrentPw}
            show={showCurrent}
            onToggleShow={() => setShowCurrent(v => !v)}
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-[#1A2640]" />

        {/* New Password */}
        <div className="flex items-center gap-3">
          <span className="w-[140px] shrink-0 text-[12px] text-[#A8B4CC]">New Password</span>
          <PasswordField
            value={newPw}
            onChange={setNewPw}
            show={showNew}
            onToggleShow={() => setShowNew(v => !v)}
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-[#1A2640]" />

        {/* Confirm New Password */}
        <div className="flex items-center gap-3">
          <span className="w-[140px] shrink-0 text-[12px] text-[#A8B4CC]">Confirm New Password</span>
          <PasswordField
            value={confirmPw}
            onChange={setConfirmPw}
            show={showConfirm}
            onToggleShow={() => setShowConfirm(v => !v)}
          />
        </div>

        {/* Update button */}
        <button
          type="button"
          className={cn(
            'mt-2 w-full h-8 rounded-lg text-[12px] font-semibold text-white transition-all',
            'bg-gradient-to-r from-[#6C3AED] to-[#8B5CF6] hover:from-[#5B2FD0] hover:to-[#7C3AED]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3AED]',
            'shadow-[0_0_16px_rgba(108,58,237,0.35)] hover:shadow-[0_0_20px_rgba(108,58,237,0.5)]',
          )}
        >
          Update Password
        </button>

        {/* Password requirements */}
        <ul className="flex flex-col gap-1 pt-1">
          {[
            'At least 8 characters long',
            'At least one uppercase letter',
            'At least one lowercase letter',
            'At least one number',
            'At least one special character',
          ].map(req => (
            <li key={req} className="flex items-center gap-2 text-[11px] text-[#5A6A85]">
              <span className="w-1 h-1 rounded-full bg-[#3A4A60] shrink-0" />
              {req}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── 2FA Card ──────────────────────────────────────────────────────

const TFA_METHODS = [
  { icon: QrCode,    label: 'Authenticator App',  description: 'Primary method',          badge: 'Verified', chevron: false },
  { icon: KeyRound,  label: 'Backup Codes',        description: '10 unused codes',         badge: null,       chevron: true  },
  { icon: Mail,      label: 'Recovery Options',    description: 'Manage recovery email',   badge: null,       chevron: true  },
  { icon: Shield,    label: 'Security Key',        description: 'Add a security key',      badge: null,       chevron: true  },
]

function TwoFactorCard() {
  const [enabled, setEnabled] = useState(true)

  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4 border-b border-[#1E2B42]">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
          <Shield size={16} className="text-[#34D399]" />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-white leading-tight">Two-Factor Authentication (2FA)</h2>
          <p className="text-[12px] text-[#5A6A85] mt-0.5">Add an extra layer of security to your account.</p>
        </div>
        <Toggle checked={enabled} onChange={setEnabled} />
      </div>

      <div className="p-5 flex flex-col gap-0">
        {/* Enabled banner */}
        {enabled && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)]">
            <CheckCircle2 size={16} className="text-[#34D399] shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-[#34D399] leading-tight">2FA is enabled</p>
              <p className="text-[11px] text-[#5A6A85] mt-0.5">Your account is protected with authenticator app</p>
            </div>
          </div>
        )}

        {/* Method rows */}
        {TFA_METHODS.map((method, i) => {
          const Icon = method.icon
          const last = i === TFA_METHODS.length - 1
          return (
            <button
              key={method.label}
              className={cn(
                'w-full flex items-center gap-3 py-3.5 text-left transition-all hover:bg-[rgba(255,255,255,0.02)] -mx-1 px-1 rounded-lg',
                !last && 'border-b border-[#1A2640]',
              )}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#0D1520] border border-[#1E2B42]">
                <Icon size={14} className="text-[#5A6A85]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#A8B4CC] leading-tight">{method.label}</p>
                <p className="text-[11px] text-[#5A6A85] mt-0.5">{method.description}</p>
              </div>
              {method.badge ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-[rgba(34,197,94,0.12)] text-[#34D399] border border-[rgba(34,197,94,0.2)]">
                  {method.badge}
                  <CheckCircle2 size={10} />
                </span>
              ) : (
                <ChevronRight size={14} className="text-[#3A4A60] shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Sessions Card ─────────────────────────────────────────────────

type SessionDevice = 'mac' | 'ios' | 'windows'

const SESSIONS = [
  {
    id: 1,
    device: 'macOS • Chrome' as const,
    location: 'New Delhi, India',
    ip: 'IP 49.36.***.***',
    time: 'Active now',
    isActive: true,
    isCurrent: true,
    icon: 'mac' as SessionDevice,
    iconColor: '#A78BFA',
    iconBg: 'rgba(108,58,237,0.12)',
  },
  {
    id: 2,
    device: 'iOS • Moniqo App' as const,
    location: 'New Delhi, India',
    ip: 'IP 49.36.***.***',
    time: '2 hours ago',
    isActive: false,
    isCurrent: false,
    icon: 'ios' as SessionDevice,
    iconColor: '#34D399',
    iconBg: 'rgba(34,197,94,0.12)',
  },
  {
    id: 3,
    device: 'Windows • Edge' as const,
    location: 'Mumbai, India',
    ip: 'IP 103.41.***.***',
    time: '1 day ago',
    isActive: false,
    isCurrent: false,
    icon: 'windows' as SessionDevice,
    iconColor: '#FBBF24',
    iconBg: 'rgba(245,158,11,0.12)',
  },
]

function DeviceIcon({ type }: { type: SessionDevice }) {
  if (type === 'mac')     return <Laptop size={14} />
  if (type === 'ios')     return <Smartphone size={14} />
  return <Monitor size={14} />
}

function SessionsCard() {
  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4 border-b border-[#1E2B42]">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
          <Monitor size={16} className="text-[#60A5FA]" />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-white leading-tight">Active Sessions</h2>
          <p className="text-[12px] text-[#5A6A85] mt-0.5">Manage your active sessions across devices.</p>
        </div>
        <button className="flex items-center gap-1.5 text-[12px] font-medium text-[#F87171] hover:text-[#FCA5A5] transition-colors px-2 py-1 rounded-lg border border-[rgba(248,113,113,0.2)] hover:border-[rgba(248,113,113,0.4)] hover:bg-[rgba(248,113,113,0.06)]">
          <LogOut size={12} />
          Sign out all
        </button>
      </div>

      <div className="flex flex-col">
        {SESSIONS.map((session, i) => {
          const last = i === SESSIONS.length - 1
          return (
            <div
              key={session.id}
              className={cn(
                'flex items-center gap-3 px-5 py-3.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors',
                !last && 'border-b border-[#1A2640]',
              )}
            >
              {/* Icon + current badge */}
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: session.iconBg, color: session.iconColor }}
                >
                  <DeviceIcon type={session.icon} />
                </div>
                {session.isCurrent && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-[#6C3AED] text-white leading-none">
                    Current
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pl-1">
                <p className="text-[13px] font-medium text-[#A8B4CC] leading-tight">{session.device}</p>
                <p className="text-[11px] text-[#5A6A85] mt-0.5">{session.location} · {session.ip}</p>
              </div>

              {/* Status / time */}
              {session.isActive ? (
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#34D399]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
                    Active now
                  </span>
                  <ChevronRight size={14} className="text-[#3A4A60]" />
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] text-[#5A6A85]">{session.time}</span>
                  <button className="text-[#3A4A60] hover:text-[#5A6A85] transition-colors p-1 rounded-lg hover:bg-[#131C2E]">
                    <MoreVertical size={14} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#1E2B42]">
        <button className="flex items-center gap-1.5 text-[12px] font-medium text-[#6C3AED] hover:text-[#A78BFA] transition-colors">
          View all sessions
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Trusted Devices Card ──────────────────────────────────────────

const TRUSTED_DEVICES = [
  {
    id: 1,
    name: 'MacBook Pro',
    detail: 'macOS 14.4 · Chrome',
    isCurrent: true,
    icon: Laptop,
    iconColor: '#A78BFA',
    iconBg: 'rgba(108,58,237,0.12)',
  },
  {
    id: 2,
    name: 'iPhone 15 Pro',
    detail: 'iOS 17.4 · Moniqo App',
    isCurrent: false,
    icon: Smartphone,
    iconColor: '#34D399',
    iconBg: 'rgba(34,197,94,0.12)',
  },
  {
    id: 3,
    name: 'iPad Air',
    detail: 'iPadOS 17.4 · Moniqo App',
    isCurrent: false,
    icon: Tablet,
    iconColor: '#60A5FA',
    iconBg: 'rgba(59,130,246,0.12)',
  },
]

function TrustedDevicesCard() {
  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4 border-b border-[#1E2B42]">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(168,85,247,0.12)' }}>
          <Smartphone size={16} className="text-[#C084FC]" />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-white leading-tight">Trusted Devices</h2>
          <p className="text-[12px] text-[#5A6A85] mt-0.5">Devices you trust and won&apos;t require 2FA codes.</p>
        </div>
        <button className="flex items-center gap-1.5 text-[12px] font-medium text-[#A78BFA] hover:text-white transition-colors px-2.5 py-1.5 rounded-lg border border-[rgba(108,58,237,0.3)] hover:border-[rgba(108,58,237,0.5)] hover:bg-[rgba(108,58,237,0.1)]">
          <Plus size={12} />
          Add device
        </button>
      </div>

      <div className="flex flex-col">
        {TRUSTED_DEVICES.map((device, i) => {
          const Icon = device.icon
          const last = i === TRUSTED_DEVICES.length - 1
          return (
            <div
              key={device.id}
              className={cn(
                'flex items-center gap-3 px-5 py-3.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors',
                !last && 'border-b border-[#1A2640]',
              )}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: device.iconBg }}
              >
                <Icon size={14} style={{ color: device.iconColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-[#A8B4CC] leading-tight">{device.name}</p>
                  {device.isCurrent && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-[rgba(108,58,237,0.15)] text-[#A78BFA] border border-[rgba(108,58,237,0.3)]">
                      This Device
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#5A6A85] mt-0.5">{device.detail}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 text-[12px] font-medium text-[#34D399]">
                  Trusted
                  <CheckCircle2 size={12} />
                </span>
                <button className="text-[#3A4A60] hover:text-[#5A6A85] transition-colors p-1 rounded-lg hover:bg-[#131C2E]">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info footer */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-[#1E2B42]">
        <Info size={12} className="text-[#60A5FA] shrink-0" />
        <p className="text-[11px] text-[#5A6A85]">Remove a device if you no longer use it or if it&apos;s not recognizable.</p>
      </div>
    </div>
  )
}

// ── Security Status Badge ─────────────────────────────────────────

function SecurityStatusBadge() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0F1623] border border-[#1E2B42] hover:border-[#2A3A54] transition-colors">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
        <ShieldCheck size={15} className="text-[#34D399]" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-white leading-tight">Your account is secured</p>
        <p className="text-[11px] text-[#5A6A85] mt-0.5">Last checked just now</p>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────

export function SecurityView() {
  return (
    <SectionCard
      title="Security"
      description="Manage your password, two-factor authentication, active sessions, and trusted devices."
      icon={Shield}
      iconColor="#34D399"
      iconBg="rgba(34,197,94,0.12)"
      actions={<SecurityStatusBadge />}
      noPadding
    >
      <div className="p-5 flex flex-col gap-5">
        {/* 2×2 card grid */}
        <div className="grid grid-cols-2 gap-5">
          <PasswordCard />
          <TwoFactorCard />
          <SessionsCard />
          <TrustedDevicesCard />
        </div>
      </div>
    </SectionCard>
  )
}
