'use client'

import { useEffect, useRef, useState } from 'react'
import {
  User, Settings2, Bell, Shield, Database, Users,
  ChevronRight, Search, Camera, CheckCircle2, Lock,
  Cloud, Eye, SquarePen, CalendarDays,
  MapPin, Monitor, Wifi,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PreferencesView } from './PreferencesView'
import { NotificationsView } from './NotificationsView'
import { SectionCard } from '@/components/shared/SectionCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────

type NavItem = {
  id: string
  label: string
  description: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

// ── Nav config ────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'PERSONAL',
    items: [
      { id: 'profile', label: 'Profile', description: 'Personal information and account', icon: User, iconColor: '#A78BFA', iconBg: 'rgba(108,58,237,0.15)' },
      { id: 'preferences', label: 'Preferences', description: 'Language, currency, and display', icon: Settings2, iconColor: '#60A5FA', iconBg: 'rgba(59,130,246,0.12)' },
      { id: 'notifications', label: 'Notifications', description: 'Alerts and email preferences', icon: Bell, iconColor: '#FBBF24', iconBg: 'rgba(245,158,11,0.12)' },
    ],
  },
  {
    label: 'SECURITY',
    items: [
      { id: 'security', label: 'Security', description: 'Password, 2FA, sessions, and devices', icon: Shield, iconColor: '#34D399', iconBg: 'rgba(34,197,94,0.12)' },
      { id: 'privacy', label: 'Data & Privacy', description: 'Exports, imports, sync, and privacy', icon: Database, iconColor: '#C084FC', iconBg: 'rgba(168,85,247,0.12)' },
    ],
  },
  {
    label: 'COLLABORATION',
    items: [
      { id: 'members', label: 'Members & Permissions', description: 'Shared budget access and roles', icon: Users, iconColor: '#FB923C', iconBg: 'rgba(249,115,22,0.12)' },
    ],
  },
]

// ── Security info cards ───────────────────────────────────────────

const SECURITY_CARDS = [
  { icon: Lock, color: '#34D399', bg: 'rgba(34,197,94,0.12)', title: 'Encrypted', description: 'Your data is encrypted in transit and at rest.' },
  { icon: Cloud, color: '#60A5FA', bg: 'rgba(59,130,246,0.12)', title: 'Secure backups', description: 'Automatic backups keep your data protected.' },
  { icon: Eye, color: '#A78BFA', bg: 'rgba(108,58,237,0.12)', title: 'Private by design', description: 'Your financial data never leaves your control.' },
  { icon: Shield, color: '#FBBF24', bg: 'rgba(245,158,11,0.12)', title: "You're in control", description: 'Export, delete, or manage your data anytime.' },
]

// ── Sidebar nav item ──────────────────────────────────────────────

function NavItemButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group',
        active
          ? 'bg-[rgba(108,58,237,0.15)] border border-[rgba(108,58,237,0.3)]'
          : 'hover:bg-[#131C2E] border border-transparent',
      )}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: item.iconBg }}
      >
        <Icon size={15} style={{ color: item.iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-[13px] font-medium leading-tight', active ? 'text-white' : 'text-[#A8B4CC] group-hover:text-white transition-colors')}>
          {item.label}
        </p>
        <p className="text-[11px] text-[#5A6A85] mt-0.5 leading-tight truncate">{item.description}</p>
      </div>
      <ChevronRight size={13} className={cn('shrink-0 transition-colors', active ? 'text-[#A78BFA]' : 'text-[#3A4A60] group-hover:text-[#5A6A85]')} />
    </button>
  )
}

// ── Profile form field ────────────────────────────────────────────

function FormField({ label, children, helperText }: { label: string; children: React.ReactNode; helperText?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[12px] text-[#5A6A85] font-medium uppercase tracking-wider">{label}</Label>
      {children}
      {helperText && <p className="text-[11px] text-[#5A6A85] leading-relaxed">{helperText}</p>}
    </div>
  )
}

// ── Last login data ───────────────────────────────────────────────

const LAST_LOGINS = [
  { date: 'May 15, 2024, 9:42 AM', location: 'Bengaluru, India', device: 'Chrome on macOS', ip: '192.168.1.42', isCurrentDevice: true },
  { date: 'May 14, 2024, 6:18 PM', location: 'Bengaluru, India', device: 'Safari on iPhone', ip: '192.168.1.55', isCurrentDevice: false },
]

// ── Read-only display field ───────────────────────────────────────

function ReadField({ value, icon: Icon }: { value: string; icon?: React.ElementType }) {
  return (
    <div className="h-8 w-full flex items-center gap-2 px-2.5 rounded-lg border border-[#1E2B42] bg-[#0D1520] text-[13px] text-[#A8B4CC]">
      {Icon && <Icon size={13} className="text-[#5A6A85] shrink-0" />}
      <span>{value}</span>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────

export function SettingsView() {
  const [activeNav, setActiveNav] = useState('profile')
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [profileForm, setProfileForm] = useState({
    fullName: 'Saqib Abdul',
    email: 'saqib.abdul@gmail.com',
    username: 'saqib_abdul',
  })
  const [draftForm, setDraftForm] = useState(profileForm)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const asideRef = useRef<HTMLElement>(null)
  const [profileSidebarHeight, setProfileSidebarHeight] = useState<number | null>(null)

  useEffect(() => {
    if (activeNav !== 'profile') return
    const el = asideRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (el.offsetHeight > 0) setProfileSidebarHeight(el.offsetHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [activeNav])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setAvatarUrl(URL.createObjectURL(file))
  }
  const filteredGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(
      item =>
        !searchQuery ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  })).filter(group => group.items.length > 0)

  return (
    <div className="layout-page py-6 space-y-6 relative">
      {/* ── Page header ─────────────────────────────────── */}
      <PageHeader
        title="Settings"
        description="Manage your preferences, security, and connected experiences."
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-[#22C55E]" />
              <span className="text-[12px] text-[#5A6A85]">Auto-saved just now</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield size={13} className="text-[#6C3AED]" />
              <span className="text-[12px] text-[#5A6A85]">Military-grade encryption</span>
            </div>
          </div>
        }
      />

      {/* ── Two-column layout ────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── LEFT SIDEBAR ────────────────────────────────── */}
        <aside
          ref={asideRef}
          className={cn('w-[320px] shrink-0 sticky top-6', activeNav === 'profile' ? 'self-stretch' : 'self-start')}
          style={activeNav !== 'profile' && profileSidebarHeight ? { height: profileSidebarHeight } : undefined}
        >
          <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl flex flex-col gap-0 overflow-hidden h-full">

            {/* Search */}
            <div className="p-3 border-b border-[#1E2B42]">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6A85]" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search settings..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-[#1E2B42] bg-[#0D1520] text-[13px] text-[#A8B4CC] placeholder:text-[#3A4A60] outline-none focus:border-[#6C3AED] focus:ring-2 focus:ring-[rgba(108,58,237,0.2)] transition-all"
                />
              </div>
            </div>

            {/* Nav groups */}
            <nav className="flex flex-col gap-4 p-3 flex-1">
              {filteredGroups.map(group => (
                <div key={group.label} className="flex flex-col gap-1">
                  <p className="text-[10px] font-semibold text-[#3A4A60] uppercase tracking-widest px-1 mb-0.5">
                    {group.label}
                  </p>
                  {group.items.map(item => (
                    <NavItemButton
                      key={item.id}
                      item={item}
                      active={activeNav === item.id}
                      onClick={() => setActiveNav(item.id)}
                    />
                  ))}
                </div>
              ))}
            </nav>

            {/* Bottom security info */}
            <div className="p-3 border-t border-[#1E2B42]">
              <div className="rounded-xl bg-[#0D1520] border border-[#1E2B42] p-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[rgba(108,58,237,0.12)]">
                    <Shield size={13} className="text-[#A78BFA]" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#A8B4CC] leading-tight">Your data is safe with Moniqo</p>
                    <p className="text-[11px] text-[#5A6A85] mt-1 leading-relaxed">
                      We use military-grade encryption and never share your financial data.
                    </p>
                    <button className="mt-2 text-[11px] text-[#6C3AED] hover:text-[#A78BFA] transition-colors font-medium">
                      Learn more
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* ── MAIN CONTENT ────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {activeNav === 'preferences' && <PreferencesView />}
          {activeNav === 'notifications' && <NotificationsView />}

          {/* ── Combined Profile + Security card ─────────── */}
          {activeNav !== 'preferences' && activeNav !== 'notifications' && <SectionCard title="Profile" description="Manage your personal information and account details." icon={User} iconColor="#A78BFA" iconBg="rgba(108,58,237,0.15)" className="flex-1">

            <div className="flex flex-col sm:flex-row gap-6">

              {/* Avatar column */}
              <div className="flex flex-col items-center gap-3 sm:w-44 shrink-0">
                <div className="relative">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover ring-4 ring-[rgba(108,58,237,0.2)]" />
                    : <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6C3AED] to-[#9B59F5] flex items-center justify-center text-white text-[28px] font-bold ring-4 ring-[rgba(108,58,237,0.2)]">SA</div>
                  }
                  <button
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#1E2B42] border border-[#2A3A54] flex items-center justify-center hover:bg-[#2A3A54] transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={12} className="text-[#A8B4CC]" />
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-medium text-[#A8B4CC]">Profile picture</p>
                  <p className="text-[10px] text-[#5A6A85] mt-0.5">JPG, PNG or WebP. Max 2MB.</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                <Button variant="outline" size="sm" className="gap-1.5 text-[11px]" onClick={() => fileInputRef.current?.click()}>
                  <Camera size={11} />
                  Change photo
                </Button>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px bg-[#1E2B42] self-stretch" />
              <div className="block sm:hidden h-px bg-[#1E2B42] w-full" />

              {/* Form fields */}
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

                <FormField label="Full name">
                  {isEditing
                    ? <Input value={draftForm.fullName} onChange={e => setDraftForm(p => ({ ...p, fullName: e.target.value }))} className="text-[13px]" />
                    : <ReadField value={profileForm.fullName} />}
                </FormField>

                <FormField label="Email address">
                  {isEditing
                    ? <Input value={draftForm.email} onChange={e => setDraftForm(p => ({ ...p, email: e.target.value }))} type="email" className="text-[13px]" />
                    : <ReadField value={profileForm.email} />}
                </FormField>

                <FormField
                  label="Username"
                  helperText={isEditing ? "Username can include letters, numbers, _, -, ^ and must be 3–12 characters long." : undefined}
                >
                  {isEditing
                    ? <Input value={draftForm.username} onChange={e => setDraftForm(p => ({ ...p, username: e.target.value }))} className="text-[13px]" />
                    : <ReadField value={profileForm.username} />}
                </FormField>

                <FormField label="Member since">
                  <ReadField value="Mar 14, 2024" icon={CalendarDays} />
                </FormField>

                <div>
                  <FormField label="Last login">
                    <div className="flex flex-col">
                      {LAST_LOGINS.map((login, i) => (
                        <div key={i} className="flex gap-3">
                          {/* Timeline spine */}
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              'w-2.5 h-2.5 rounded-full shrink-0 mt-1 ring-2',
                              login.isCurrentDevice
                                ? 'bg-[#22C55E] ring-[rgba(34,197,94,0.25)]'
                                : 'bg-[#3A4A60] ring-[rgba(58,74,96,0.25)]'
                            )} />
                            {i < LAST_LOGINS.length - 1 && (
                              <div className="w-px flex-1 bg-[#1E2B42] my-1" />
                            )}
                          </div>

                          {/* Content */}
                          <div className={cn('flex flex-col gap-1', i < LAST_LOGINS.length - 1 ? 'pb-4' : 'pb-0')}>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] text-[#A8B4CC]">{login.date}</span>
                              {login.isCurrentDevice && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[rgba(34,197,94,0.12)] text-[#22C55E] border border-[rgba(34,197,94,0.2)]">
                                  This device
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin size={11} className="text-[#5A6A85] shrink-0" />
                              <span className="text-[12px] text-[#6C3AED]">{login.location}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <Monitor size={11} className="text-[#5A6A85] shrink-0" />
                                <span className="text-[12px] text-[#5A6A85]">{login.device}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Wifi size={11} className="text-[#5A6A85] shrink-0" />
                                <span className="text-[12px] text-[#5A6A85]">{login.ip}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </FormField>
                </div>

              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 mt-5 pt-5 border-t border-[#1E2B42]">
              <Button
                size="sm"
                className="gap-1.5 bg-[#6C3AED] hover:bg-[#5B2FD0] text-white"
                onClick={() => {
                  if (isEditing) {
                    setProfileForm(draftForm)
                    setIsEditing(false)
                  } else {
                    setDraftForm(profileForm)
                    setIsEditing(true)
                  }
                }}
              >
                {isEditing ? <><CheckCircle2 size={13} />Save profile</> : <><SquarePen size={13} />Edit profile</>}
              </Button>
            </div>

            {/* ── Security info cards (inside same card) ──── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#1E2B42]">
              {SECURITY_CARDS.map(card => {
                const Icon = card.icon
                return (
                  <div
                    key={card.title}
                    className="bg-[#0D1520] border border-[#1E2B42] rounded-xl p-4 flex flex-col gap-3 hover:border-[#2A3A54] transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: card.bg }}
                    >
                      <Icon size={15} style={{ color: card.color }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white leading-tight">{card.title}</p>
                      <p className="text-[11px] text-[#5A6A85] mt-1 leading-relaxed">{card.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>}

        </div>
      </div>

    </div>
  )
}
