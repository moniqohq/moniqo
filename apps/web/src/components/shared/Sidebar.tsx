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
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Mail,
  Target,
  BarChart2,
  Settings,
  BookOpen,
  HelpCircle,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui.store";
import { isFeatureEnabled, type FeatureName } from "@/features/feature-flags";

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; flag?: FeatureName };

const allMainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Accounts", href: "/accounts", icon: Landmark },
  { label: "Envelopes", href: "/envelopes", icon: Mail },
  { label: "Goals", href: "/goals", icon: Target, flag: "goals" },
  { label: "Reports", href: "/reports", icon: BarChart2, flag: "reports" },
  { label: "Settings", href: "/settings", icon: Settings },
];

const mainNavItems = allMainNavItems.filter((item) => !item.flag || isFeatureEnabled(item.flag));

const allExtrasNavItems: NavItem[] = [
  { label: "Documentation", href: "/docs", icon: BookOpen, flag: "sidebarExtras" },
  { label: "Help & Support", href: "/support", icon: HelpCircle, flag: "sidebarExtras" },
  { label: "Get PRO", href: "/upgrade", icon: Sparkles, flag: "sidebarExtras" },
];

const extrasNavItems = allExtrasNavItems.filter(
  (item) => !item.flag || isFeatureEnabled(item.flag),
);

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, mobileSidebarOpen, setMobileSidebar } = useUIStore();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebar(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#1E2B42] bg-[#0A0E1A]",
          "lg:relative lg:translate-x-0",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        style={{ width: sidebarCollapsed ? 64 : 256 }}
      >
        {/* Logo */}
        <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-[#1E2B42] px-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#6C3AED] text-xl font-bold text-white">
            ₹
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="text-[22px] leading-none font-semibold tracking-tight text-white"
              >
                <div>Moniqo</div>
                <div className="mt-0.5 text-[11px] font-normal tracking-wide text-[#5A6A85]">
                  Budget Planner
                </div>
              </motion.span>
            )}
          </AnimatePresence>
          {mobileSidebarOpen && (
            <button
              onClick={() => setMobileSidebar(false)}
              className="ml-auto text-[#5A6A85] hover:text-white lg:hidden"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {/* Section title */}
          {!sidebarCollapsed && (
            <div className="mb-1 px-2">
              <span className="text-[10px] font-semibold tracking-widest text-[#6B7FA3] uppercase">
                General
              </span>
            </div>
          )}

          <div className="space-y-0.5">
            {mainNavItems.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center rounded-lg p-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[rgba(108,58,237,0.15)] text-[#C4B5FD]"
                      : "text-[#C8D3E8] hover:bg-[#111827] hover:text-white",
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-lg bg-[rgba(108,58,237,0.15)]"
                      transition={{ duration: 0.15 }}
                    />
                  )}
                  <span className="relative z-10 flex w-10 flex-shrink-0 items-center justify-center">
                    <Icon size={16} className={cn(active && "text-[#A78BFA]")} />
                  </span>
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-10"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>

          {/* Extras section */}
          {extrasNavItems.length > 0 && !sidebarCollapsed && (
            <div className="mt-4 mb-1 px-2">
              <span className="text-[10px] font-semibold tracking-widest text-[#6B7FA3] uppercase">
                Extras
              </span>
            </div>
          )}
          {extrasNavItems.length > 0 && sidebarCollapsed && (
            <div className="mx-2 my-3 border-t border-[#1E2B42]" />
          )}

          <div className="space-y-0.5">
            {extrasNavItems.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center rounded-lg p-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[rgba(108,58,237,0.15)] text-[#C4B5FD]"
                      : "text-[#C8D3E8] hover:bg-[#111827] hover:text-white",
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="activeNavExtras"
                      className="absolute inset-0 rounded-lg bg-[rgba(108,58,237,0.15)]"
                      transition={{ duration: 0.15 }}
                    />
                  )}
                  <span className="relative z-10 flex w-10 flex-shrink-0 items-center justify-center">
                    <Icon size={16} className={cn(active && "text-[#A78BFA]")} />
                  </span>
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-10"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Version */}
        {!sidebarCollapsed && (
          <div className="flex-shrink-0 border-t border-[#1E2B42] px-4 py-3">
            <span className="text-[11px] text-[#2A3A54]">1.0.0-alpha</span>
          </div>
        )}
      </motion.aside>
    </>
  );
}
