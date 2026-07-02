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

import { useEffect, useRef, useState } from "react";
import {
  User,
  Settings2,
  Bell,
  Shield,
  Database,
  Users,
  ChevronRight,
  Search,
  Camera,
  CheckCircle2,
  Lock,
  Cloud,
  Eye,
  SquarePen,
  CalendarDays,
  MapPin,
  Monitor,
  Wifi,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PreferencesView } from "./PreferencesView";
import { NotificationsView } from "./NotificationsView";
import { SecurityView } from "./SecurityView";
import { DataPrivacyView } from "./DataPrivacyView";
import { MembersPermissionsView } from "./MembersPermissionsView";
import { SectionCard } from "@/components/shared/SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────

type NavItem = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

// ── Nav config ────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: "PERSONAL",
    items: [
      {
        id: "profile",
        label: "Profile",
        description: "Personal information and account",
        icon: User,
        iconColor: "#A78BFA",
        iconBg: "rgba(108,58,237,0.15)",
      },
      {
        id: "preferences",
        label: "Preferences",
        description: "Language, currency, and display",
        icon: Settings2,
        iconColor: "#60A5FA",
        iconBg: "rgba(59,130,246,0.12)",
      },
      {
        id: "notifications",
        label: "Notifications",
        description: "Alerts and email preferences",
        icon: Bell,
        iconColor: "#FBBF24",
        iconBg: "rgba(245,158,11,0.12)",
      },
    ],
  },
  {
    label: "SECURITY",
    items: [
      {
        id: "security",
        label: "Security",
        description: "Password, 2FA, sessions, and devices",
        icon: Shield,
        iconColor: "#34D399",
        iconBg: "rgba(34,197,94,0.12)",
      },
      {
        id: "privacy",
        label: "Data & Privacy",
        description: "Exports, imports, sync, and privacy",
        icon: Database,
        iconColor: "#C084FC",
        iconBg: "rgba(168,85,247,0.12)",
      },
    ],
  },
  {
    label: "COLLABORATION",
    items: [
      {
        id: "members",
        label: "Members & Permissions",
        description: "Shared budget access and roles",
        icon: Users,
        iconColor: "#FB923C",
        iconBg: "rgba(249,115,22,0.12)",
      },
    ],
  },
];

// ── Security info cards ───────────────────────────────────────────

const SECURITY_CARDS = [
  {
    icon: Lock,
    color: "#34D399",
    bg: "rgba(34,197,94,0.12)",
    title: "Encrypted",
    description: "Your data is encrypted in transit and at rest.",
  },
  {
    icon: Cloud,
    color: "#60A5FA",
    bg: "rgba(59,130,246,0.12)",
    title: "Secure backups",
    description: "Automatic backups keep your data protected.",
  },
  {
    icon: Eye,
    color: "#A78BFA",
    bg: "rgba(108,58,237,0.12)",
    title: "Private by design",
    description: "Your financial data never leaves your control.",
  },
  {
    icon: Shield,
    color: "#FBBF24",
    bg: "rgba(245,158,11,0.12)",
    title: "You're in control",
    description: "Export, delete, or manage your data anytime.",
  },
];

// ── Sidebar nav item ──────────────────────────────────────────────

function NavItemButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
        active
          ? "border border-[rgba(108,58,237,0.3)] bg-[rgba(108,58,237,0.15)]"
          : "border border-transparent hover:bg-[#131C2E]",
      )}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: item.iconBg }}
      >
        <Icon size={15} style={{ color: item.iconColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13px] leading-tight font-medium",
            active ? "text-white" : "text-[#A8B4CC] transition-colors group-hover:text-white",
          )}
        >
          {item.label}
        </p>
        <p className="mt-0.5 truncate text-[11px] leading-tight text-[#5A6A85]">
          {item.description}
        </p>
      </div>
      <ChevronRight
        size={13}
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-[#A78BFA]" : "text-[#3A4A60] group-hover:text-[#5A6A85]",
        )}
      />
    </button>
  );
}

// ── Profile form field ────────────────────────────────────────────

function FormField({
  label,
  children,
  helperText,
}: {
  label: string;
  children: React.ReactNode;
  helperText?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[12px] font-medium tracking-wider text-[#5A6A85] uppercase">
        {label}
      </Label>
      {children}
      {helperText && <p className="text-[11px] leading-relaxed text-[#5A6A85]">{helperText}</p>}
    </div>
  );
}

// ── Last login data ───────────────────────────────────────────────

const LAST_LOGINS = [
  {
    date: "May 15, 2024, 9:42 AM",
    location: "Bengaluru, India",
    device: "Chrome on macOS",
    ip: "192.168.1.42",
    isCurrentDevice: true,
  },
  {
    date: "May 14, 2024, 6:18 PM",
    location: "Bengaluru, India",
    device: "Safari on iPhone",
    ip: "192.168.1.55",
    isCurrentDevice: false,
  },
];

// ── Read-only display field ───────────────────────────────────────

function ReadField({ value, icon: Icon }: { value: string; icon?: React.ElementType }) {
  return (
    <div className="flex h-8 w-full items-center gap-2 rounded-lg border border-[#1E2B42] bg-[#0D1520] px-2.5 text-[13px] text-[#A8B4CC]">
      {Icon && <Icon size={13} className="shrink-0 text-[#5A6A85]" />}
      <span>{value}</span>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────

export function SettingsView() {
  const [activeNav, setActiveNav] = useState("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "Saqib Abdul",
    email: "saqib.abdul@gmail.com",
    username: "saqib_abdul",
  });
  const [draftForm, setDraftForm] = useState(profileForm);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const [profileSidebarHeight, setProfileSidebarHeight] = useState<number | null>(null);

  useEffect(() => {
    if (activeNav !== "profile") return;
    const el = asideRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.offsetHeight > 0) setProfileSidebarHeight(el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeNav]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setAvatarUrl(URL.createObjectURL(file));
  }
  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        !searchQuery ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="layout-page relative space-y-6 py-6">
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
      <div className="flex items-start gap-5">
        {/* ── LEFT SIDEBAR ────────────────────────────────── */}
        <aside
          ref={asideRef}
          className={cn(
            "sticky top-6 w-[320px] shrink-0",
            activeNav === "profile" ? "self-stretch" : "self-start",
          )}
          style={
            activeNav !== "profile" && profileSidebarHeight
              ? { height: profileSidebarHeight }
              : undefined
          }
        >
          <div className="flex h-full flex-col gap-0 overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
            {/* Search */}
            <div className="border-b border-[#1E2B42] p-3">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[#5A6A85]"
                />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search settings..."
                  className="h-8 w-full rounded-lg border border-[#1E2B42] bg-[#0D1520] pr-3 pl-8 text-[13px] text-[#A8B4CC] transition-all outline-none placeholder:text-[#3A4A60] focus:border-[#6C3AED] focus:ring-2 focus:ring-[rgba(108,58,237,0.2)]"
                />
              </div>
            </div>

            {/* Nav groups */}
            <nav className="flex flex-1 flex-col gap-4 p-3">
              {filteredGroups.map((group) => (
                <div key={group.label} className="flex flex-col gap-1">
                  <p className="mb-0.5 px-1 text-[10px] font-semibold tracking-widest text-[#3A4A60] uppercase">
                    {group.label}
                  </p>
                  {group.items.map((item) => (
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

            {/* Bottom info card */}
            <div className="border-t border-[#1E2B42] p-3">
              <div className="rounded-xl border border-[#1E2B42] bg-[#0D1520] p-3">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(108,58,237,0.12)]">
                    {activeNav === "members" ? (
                      <Users size={13} className="text-[#FB923C]" style={{ color: "#FB923C" }} />
                    ) : (
                      <Shield size={13} className="text-[#A78BFA]" />
                    )}
                  </div>
                  <div>
                    <p className="text-[12px] leading-tight font-semibold text-[#A8B4CC]">
                      {activeNav === "members"
                        ? "Share with confidence"
                        : "Your data is safe with Moniqo"}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#5A6A85]">
                      {activeNav === "members"
                        ? "You're in control. Add members and manage their access at any time."
                        : "We use military-grade encryption and never share your financial data."}
                    </p>
                    <button className="mt-2 text-[11px] font-medium text-[#6C3AED] transition-colors hover:text-[#A78BFA]">
                      Learn more
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {activeNav === "preferences" && <PreferencesView />}
          {activeNav === "notifications" && <NotificationsView />}
          {activeNav === "security" && <SecurityView />}
          {activeNav === "privacy" && <DataPrivacyView />}
          {activeNav === "members" && <MembersPermissionsView />}

          {/* ── Combined Profile + Security card ─────────── */}
          {activeNav !== "preferences" &&
            activeNav !== "notifications" &&
            activeNav !== "security" &&
            activeNav !== "privacy" &&
            activeNav !== "members" && (
              <SectionCard
                title="Profile"
                description="Manage your personal information and account details."
                icon={User}
                iconColor="#A78BFA"
                iconBg="rgba(108,58,237,0.15)"
                className="flex-1"
              >
                <div className="flex flex-col gap-6 sm:flex-row">
                  {/* Avatar column */}
                  <div className="flex shrink-0 flex-col items-center gap-3 sm:w-44">
                    <div className="relative">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="h-24 w-24 rounded-full object-cover ring-4 ring-[rgba(108,58,237,0.2)]"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#6C3AED] to-[#9B59F5] text-[28px] font-bold text-white ring-4 ring-[rgba(108,58,237,0.2)]">
                          SA
                        </div>
                      )}
                      <button
                        className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border border-[#2A3A54] bg-[#1E2B42] transition-colors hover:bg-[#2A3A54]"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera size={12} className="text-[#A8B4CC]" />
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-medium text-[#A8B4CC]">Profile picture</p>
                      <p className="mt-0.5 text-[10px] text-[#5A6A85]">
                        JPG, PNG or WebP. Max 2MB.
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-[11px]"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={11} />
                      Change photo
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="hidden w-px self-stretch bg-[#1E2B42] sm:block" />
                  <div className="block h-px w-full bg-[#1E2B42] sm:hidden" />

                  {/* Form fields */}
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                    <FormField label="Full name">
                      {isEditing ? (
                        <Input
                          value={draftForm.fullName}
                          onChange={(e) =>
                            setDraftForm((p) => ({ ...p, fullName: e.target.value }))
                          }
                          className="text-[13px]"
                        />
                      ) : (
                        <ReadField value={profileForm.fullName} />
                      )}
                    </FormField>

                    <FormField label="Email address">
                      {isEditing ? (
                        <Input
                          value={draftForm.email}
                          onChange={(e) => setDraftForm((p) => ({ ...p, email: e.target.value }))}
                          type="email"
                          className="text-[13px]"
                        />
                      ) : (
                        <ReadField value={profileForm.email} />
                      )}
                    </FormField>

                    <FormField
                      label="Username"
                      helperText={
                        isEditing
                          ? "Username can include letters, numbers, _, -, ^ and must be 3–12 characters long."
                          : undefined
                      }
                    >
                      {isEditing ? (
                        <Input
                          value={draftForm.username}
                          onChange={(e) =>
                            setDraftForm((p) => ({ ...p, username: e.target.value }))
                          }
                          className="text-[13px]"
                        />
                      ) : (
                        <ReadField value={profileForm.username} />
                      )}
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
                                <div
                                  className={cn(
                                    "mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2",
                                    login.isCurrentDevice
                                      ? "bg-[#22C55E] ring-[rgba(34,197,94,0.25)]"
                                      : "bg-[#3A4A60] ring-[rgba(58,74,96,0.25)]",
                                  )}
                                />
                                {i < LAST_LOGINS.length - 1 && (
                                  <div className="my-1 w-px flex-1 bg-[#1E2B42]" />
                                )}
                              </div>

                              {/* Content */}
                              <div
                                className={cn(
                                  "flex flex-col gap-1",
                                  i < LAST_LOGINS.length - 1 ? "pb-4" : "pb-0",
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] text-[#A8B4CC]">{login.date}</span>
                                  {login.isCurrentDevice && (
                                    <span className="rounded-md border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.12)] px-1.5 py-0.5 text-[10px] font-semibold text-[#22C55E]">
                                      This device
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <MapPin size={11} className="shrink-0 text-[#5A6A85]" />
                                  <span className="text-[12px] text-[#6C3AED]">
                                    {login.location}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5">
                                    <Monitor size={11} className="shrink-0 text-[#5A6A85]" />
                                    <span className="text-[12px] text-[#5A6A85]">
                                      {login.device}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Wifi size={11} className="shrink-0 text-[#5A6A85]" />
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
                <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#1E2B42] pt-5">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-[#6C3AED] text-white hover:bg-[#5B2FD0]"
                    onClick={() => {
                      if (isEditing) {
                        setProfileForm(draftForm);
                        setIsEditing(false);
                      } else {
                        setDraftForm(profileForm);
                        setIsEditing(true);
                      }
                    }}
                  >
                    {isEditing ? (
                      <>
                        <CheckCircle2 size={13} />
                        Save profile
                      </>
                    ) : (
                      <>
                        <SquarePen size={13} />
                        Edit profile
                      </>
                    )}
                  </Button>
                </div>

                {/* ── Security info cards (inside same card) ──── */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#1E2B42] pt-5 lg:grid-cols-4">
                  {SECURITY_CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.title}
                        className="flex flex-col gap-3 rounded-xl border border-[#1E2B42] bg-[#0D1520] p-4 transition-colors hover:border-[#2A3A54]"
                      >
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ background: card.bg }}
                        >
                          <Icon size={15} style={{ color: card.color }} />
                        </div>
                        <div>
                          <p className="text-[13px] leading-tight font-semibold text-white">
                            {card.title}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#5A6A85]">
                            {card.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}
        </div>
      </div>
    </div>
  );
}
