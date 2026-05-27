'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Crown, Shield, PenLine, Eye, Plus, MoreVertical,
  ChevronDown, Check, X, UserMinus, ArrowRightLeft, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionCard } from '@/components/shared/SectionCard'

// ── Types ─────────────────────────────────────────────────────────

type Role = 'Owner' | 'Admin' | 'Editor' | 'Viewer'

type Member = {
  id: number
  name: string
  email: string
  role: Role
  joined: string
  lastActive: string
  isOnline: boolean
  isCurrentUser: boolean
  initials: string
  avatarFrom: string
  avatarTo: string
}

// ── Data ─────────────────────────────────────────────────────────

const INITIAL_MEMBERS: Member[] = [
  {
    id: 1, name: 'Abdul Saqib', email: 'saqib@moniqo.app', role: 'Owner',
    joined: 'May 24, 2025', lastActive: 'Just now', isOnline: true,
    isCurrentUser: true, initials: 'AS', avatarFrom: '#6C3AED', avatarTo: '#9B59F5',
  },
  {
    id: 2, name: 'James Carter', email: 'james.carter@moniqo.app', role: 'Admin',
    joined: 'May 20, 2025', lastActive: '2 hours ago', isOnline: true,
    isCurrentUser: false, initials: 'JC', avatarFrom: '#059669', avatarTo: '#34D399',
  },
  {
    id: 3, name: 'Dmitri Volkov', email: 'dmitri.volkov@moniqo.app', role: 'Editor',
    joined: 'May 22, 2025', lastActive: '1 day ago', isOnline: true,
    isCurrentUser: false, initials: 'DV', avatarFrom: '#1D4ED8', avatarTo: '#60A5FA',
  },
  {
    id: 4, name: 'Léo Dubois', email: 'leo.dubois@moniqo.app', role: 'Viewer',
    joined: 'May 23, 2025', lastActive: '3 days ago', isOnline: true,
    isCurrentUser: false, initials: 'LD', avatarFrom: '#B45309', avatarTo: '#FBBF24',
  },
]

// ── Role config ───────────────────────────────────────────────────

type RoleConfig = {
  color: string
  bg: string
  border: string
  icon: React.ElementType
  description: string
  access: string
  accessColor: string
  permissions: string[]
}

const ROLE_CONFIG: Record<Role, RoleConfig> = {
  Owner: {
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    icon: Crown,
    description: 'Full control',
    access: 'Full access',
    accessColor: '#34D399',
    permissions: ['Full control', 'Manage members', 'Manage settings', 'Delete budget'],
  },
  Admin: {
    color: '#34D399',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.25)',
    icon: Shield,
    description: 'Manage everything',
    access: 'Full access',
    accessColor: '#34D399',
    permissions: ['Full access', 'Manage members', 'Manage settings', 'Cannot delete budget'],
  },
  Editor: {
    color: '#60A5FA',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.25)',
    icon: PenLine,
    description: 'Can edit data',
    access: 'Can edit',
    accessColor: '#60A5FA',
    permissions: ['Add & edit transactions', 'Manage accounts', 'Manage envelopes', 'Cannot manage members'],
  },
  Viewer: {
    color: '#A78BFA',
    bg: 'rgba(108,58,237,0.12)',
    border: 'rgba(108,58,237,0.25)',
    icon: Eye,
    description: 'Read-only access',
    access: 'Read only',
    accessColor: '#5A6A85',
    permissions: ['View accounts', 'View transactions', 'View reports', 'No editing access'],
  },
}

const ALL_ROLES: Role[] = ['Owner', 'Admin', 'Editor', 'Viewer']
const ASSIGNABLE_ROLES: Role[] = ['Admin', 'Editor', 'Viewer']
const INVITE_ROLES: Exclude<Role, 'Owner'>[] = ['Admin', 'Editor', 'Viewer']

// ── Role Badge ────────────────────────────────────────────────────

function RoleBadge({ role, onChange, disabled }: {
  role: Role
  onChange?: (r: Role) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = ROLE_CONFIG[role]
  const Icon = cfg.icon

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] font-semibold transition-all',
          disabled ? 'cursor-default' : 'hover:opacity-90 cursor-pointer',
        )}
        style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
      >
        <Icon size={11} />
        {role}
        {!disabled && (
          <ChevronDown
            size={10}
            className={cn('transition-transform duration-150', open && 'rotate-180')}
          />
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-[150px] bg-[#0D1520] border border-[#1E2B42] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] py-1 overflow-hidden">
          {ASSIGNABLE_ROLES.map(r => {
            const rc = ROLE_CONFIG[r]
            const RIcon = rc.icon
            return (
              <button
                key={r}
                onClick={() => { onChange?.(r); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-left transition-colors hover:bg-[#131C2E] text-[#A8B4CC]"
              >
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: rc.bg }}
                >
                  <RIcon size={10} style={{ color: rc.color }} />
                </span>
                <span className={cn(r === role ? 'text-white' : '')}>{r}</span>
                {r === role && <Check size={10} className="ml-auto" style={{ color: cfg.color }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Actions menu ──────────────────────────────────────────────────

function ActionsMenu({ member, onRemove }: { member: Member; onRemove: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#3A4A60] hover:text-[#A8B4CC] hover:bg-[#131C2E] transition-all"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[184px] bg-[#0D1520] border border-[#1E2B42] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] py-1 overflow-hidden">
          <button
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-[#A8B4CC] hover:bg-[#131C2E] transition-colors text-left"
          >
            <PenLine size={12} className="text-[#5A6A85] shrink-0" />
            Change role
          </button>
          {member.role === 'Owner' && (
            <button
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-[#A8B4CC] hover:bg-[#131C2E] transition-colors text-left"
            >
              <ArrowRightLeft size={12} className="text-[#5A6A85] shrink-0" />
              Transfer ownership
            </button>
          )}
          <div className="my-1 h-px bg-[#1E2B42]" />
          <button
            onClick={() => { onRemove(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-[#F87171] hover:bg-[rgba(248,113,113,0.06)] transition-colors text-left"
          >
            <UserMinus size={12} className="shrink-0" />
            Remove member
          </button>
        </div>
      )}
    </div>
  )
}

// ── Invite Member Modal ───────────────────────────────────────────

function InviteMemberModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Exclude<Role, 'Owner'>>('Editor')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-[#0F1623] border border-[#1E2B42] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2B42]">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(249,115,22,0.12)' }}
            >
              <Users size={15} className="text-[#FB923C]" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white leading-tight">Invite member</h3>
              <p className="text-[11px] text-[#5A6A85] mt-0.5">Send an invitation to collaborate on this budget</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#5A6A85] hover:text-white hover:bg-[#1E2B42] transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#5A6A85] uppercase tracking-wider">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className={cn(
                'w-full h-9 px-3 rounded-lg border border-[#1E2B42] bg-[#0D1520]',
                'text-[13px] text-[#A8B4CC] placeholder:text-[#3A4A60] outline-none',
                'focus:border-[#6C3AED] focus:ring-2 focus:ring-[rgba(108,58,237,0.2)] transition-all',
              )}
            />
          </div>

          {/* Role selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#5A6A85] uppercase tracking-wider">
              Role
            </label>
            <div className="flex gap-2">
              {INVITE_ROLES.map(r => {
                const cfg = ROLE_CONFIG[r]
                const Icon = cfg.icon
                const selected = role === r
                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[12px] font-medium transition-all',
                      selected
                        ? 'text-white border-[rgba(108,58,237,0.45)] bg-[rgba(108,58,237,0.1)]'
                        : 'text-[#5A6A85] border-[#1E2B42] hover:border-[#2A3A54] hover:bg-[#131C2E]',
                    )}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: cfg.bg }}
                    >
                      <Icon size={13} style={{ color: cfg.color }} />
                    </span>
                    {r}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected role description */}
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-[#0D1520] border border-[#1A2640]">
            <span
              className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: ROLE_CONFIG[role].bg }}
            >
              {(() => {
                const Icon = ROLE_CONFIG[role].icon
                return <Icon size={10} style={{ color: ROLE_CONFIG[role].color }} />
              })()}
            </span>
            <div>
              <p className="text-[12px] font-semibold" style={{ color: ROLE_CONFIG[role].color }}>
                {role}
              </p>
              <p className="text-[11px] text-[#5A6A85] mt-0.5 leading-relaxed">
                {ROLE_CONFIG[role].permissions.join(' · ')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#1E2B42]">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg text-[12px] font-medium text-[#A8B4CC] border border-[#1E2B42] hover:bg-[#131C2E] hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className={cn(
              'h-8 px-4 rounded-lg text-[12px] font-semibold text-white transition-all',
              'bg-gradient-to-r from-[#6C3AED] to-[#8B5CF6] hover:from-[#5B2FD0] hover:to-[#7C3AED]',
              'shadow-[0_0_16px_rgba(108,58,237,0.35)] hover:shadow-[0_0_24px_rgba(108,58,237,0.5)]',
            )}
          >
            Send invite
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Role Summary Card ─────────────────────────────────────────────

function RoleSummaryCard({ role, count }: { role: Role; count: number }) {
  const cfg = ROLE_CONFIG[role]
  const Icon = cfg.icon
  return (
    <div className="bg-[#0D1520] border border-[#1E2B42] rounded-xl p-4 flex items-start gap-3 hover:border-[#2A3A54] transition-all cursor-default">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: cfg.bg }}
      >
        <Icon size={18} style={{ color: cfg.color }} />
      </div>
      <div>
        <span className="text-[22px] font-bold text-white leading-none">{count}</span>
        <p className="text-[13px] font-semibold text-white mt-0.5 leading-tight">{role}</p>
        <p className="text-[11px] text-[#5A6A85] mt-0.5">{cfg.description}</p>
      </div>
    </div>
  )
}

// ── Permission Card ───────────────────────────────────────────────

function PermissionCard({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role]
  const Icon = cfg.icon
  return (
    <div
      className="bg-[#0D1520] rounded-xl p-4 flex flex-col gap-3 hover:border-opacity-60 transition-all border"
      style={{ borderColor: cfg.border }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: cfg.bg }}
        >
          <Icon size={15} style={{ color: cfg.color }} />
        </div>
        <span className="text-[14px] font-semibold" style={{ color: cfg.color }}>{role}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {cfg.permissions.map(perm => (
          <li key={perm} className="flex items-center gap-2 text-[12px] text-[#A8B4CC]">
            <Check size={11} style={{ color: cfg.color }} className="shrink-0" />
            {perm}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Invite button ─────────────────────────────────────────────────

function InviteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-[12px] font-semibold text-white transition-all shrink-0',
        'bg-gradient-to-r from-[#6C3AED] to-[#8B5CF6] hover:from-[#5B2FD0] hover:to-[#7C3AED]',
        'shadow-[0_0_14px_rgba(108,58,237,0.35)] hover:shadow-[0_0_22px_rgba(108,58,237,0.55)]',
      )}
    >
      <Plus size={13} />
      Invite member
    </button>
  )
}

// ── Main view ─────────────────────────────────────────────────────

export function MembersPermissionsView() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const roleCounts = ALL_ROLES.reduce<Record<Role, number>>((acc, r) => {
    acc[r] = members.filter(m => m.role === r).length
    return acc
  }, {} as Record<Role, number>)

  function handleRoleChange(id: number, newRole: Role) {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m))
  }

  function handleRemoveMember(id: number) {
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  return (
    <>
      <SectionCard
        title="Members & Permissions"
        description="Manage members, roles, and access for this budget."
        icon={Users}
        iconColor="#FB923C"
        iconBg="rgba(249,115,22,0.12)"
        actions={<InviteButton onClick={() => setShowInviteModal(true)} />}
        noPadding
      >
        <div className="p-5 flex flex-col gap-5">

          {/* ── Role summary cards ──────────────────── */}
          <div className="grid grid-cols-4 gap-3">
            {ALL_ROLES.map(role => (
              <RoleSummaryCard key={role} role={role} count={roleCounts[role]} />
            ))}
          </div>

          {/* ── Members table ──────────────────────── */}
          <div className="bg-[#0D1520] border border-[#1E2B42] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1E2B42]">
              <h3 className="text-[13px] font-semibold text-white">Members ({members.length})</h3>
            </div>

            {/* Column headers */}
            <div
              className="grid items-center gap-3 px-5 py-2.5 border-b border-[#1A2640]"
              style={{ gridTemplateColumns: '1fr 148px 118px 140px 108px 44px' }}
            >
              {['MEMBER', 'ROLE', 'JOINED', 'LAST ACTIVE', 'ACCESS', ''].map((col, i) => (
                <span key={i} className="text-[10px] font-semibold text-[#3A4A60] uppercase tracking-widest">
                  {col}
                </span>
              ))}
            </div>

            {/* Rows */}
            {members.map((member, i) => {
              const isLast = i === members.length - 1
              const accessCfg = ROLE_CONFIG[member.role]
              return (
                <div
                  key={member.id}
                  className={cn(
                    'grid items-center gap-3 px-5 py-3.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors',
                    !isLast && 'border-b border-[#1A2640]',
                  )}
                  style={{ gridTemplateColumns: '1fr 148px 118px 140px 108px 44px' }}
                >
                  {/* Member cell */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                      style={{ background: `linear-gradient(135deg, ${member.avatarFrom}, ${member.avatarTo})` }}
                    >
                      {member.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-medium text-white leading-tight truncate">{member.name}</p>
                        {member.isCurrentUser && (
                          <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[rgba(108,58,237,0.2)] text-[#A78BFA] border border-[rgba(108,58,237,0.35)]">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5A6A85] mt-0.5 truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <div>
                    <RoleBadge
                      role={member.role}
                      onChange={newRole => handleRoleChange(member.id, newRole)}
                      disabled={member.role === 'Owner'}
                    />
                  </div>

                  {/* Joined */}
                  <span className="text-[12px] text-[#A8B4CC]">{member.joined}</span>

                  {/* Last active */}
                  <div className="flex items-center gap-1.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', member.isOnline ? 'bg-[#22C55E]' : 'bg-[#3A4A60]')} />
                    <span className="text-[12px] text-[#A8B4CC]">{member.lastActive}</span>
                  </div>

                  {/* Access */}
                  <span className="text-[12px] font-medium" style={{ color: accessCfg.accessColor }}>
                    {accessCfg.access}
                  </span>

                  {/* Actions */}
                  <ActionsMenu member={member} onRemove={() => handleRemoveMember(member.id)} />
                </div>
              )
            })}
          </div>

          {/* ── Roles & Permissions ─────────────────── */}
          <div className="bg-[#0D1520] border border-[#1E2B42] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1E2B42]">
              <h3 className="text-[13px] font-semibold text-white">Roles & Permissions</h3>
              <p className="text-[11px] text-[#5A6A85] mt-0.5">Understand what each role can do in this budget.</p>
            </div>
            <div className="p-4 grid grid-cols-4 gap-3">
              {ALL_ROLES.map(role => (
                <PermissionCard key={role} role={role} />
              ))}
            </div>
          </div>

        </div>
      </SectionCard>

      {showInviteModal && <InviteMemberModal onClose={() => setShowInviteModal(false)} />}
    </>
  )
}
