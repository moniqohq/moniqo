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

import { useState, useRef, useEffect } from "react";
import {
  Bell,
  HelpCircle,
  Sun,
  Menu,
  Search,
  ChevronDown,
  Wallet,
  Check,
  Plus,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { useBudgets } from "@/hooks/use-budgets";
import { useEnvelopes } from "@/hooks/use-envelopes";
import { useAuthStore } from "@/stores/auth.store";
import { logout as apiLogout } from "@/lib/api/auth";
import { getInitials, formatCurrency, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Budget } from "@/types";

function BudgetSwitcher({ budgets, isLoading }: { budgets: Budget[]; isLoading: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeBudgetId = useUIStore((s) => s.activeBudgetId);
  const setActiveBudget = useUIStore((s) => s.setActiveBudget);

  const activeBudget = budgets.find((b) => b.id === activeBudgetId) ?? budgets[0];

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 items-center gap-2.5 rounded-lg border pr-3 pl-2 transition-all",
          "focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none",
          open
            ? "border-[#6C3AED]/50 bg-[#6C3AED]/15 text-white"
            : "border-[#1E2B42] bg-[#0F1623] text-[#A8B4CC] hover:border-[#2A3A54] hover:bg-[#131C2E] hover:text-white",
        )}
      >
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[#6C3AED] shadow-sm shadow-[#6C3AED]/40">
          <Wallet size={13} className="text-white" strokeWidth={2} />
        </span>
        <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">
          {isLoading ? "Loading…" : (activeBudget?.name ?? "Select budget")}
        </span>
        <ChevronDown
          size={12}
          className={cn(
            "flex-shrink-0 text-[#5A6A85] transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute top-full left-0 z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-[#1A2640] bg-[#0A1120] shadow-2xl shadow-black/40"
          >
            <div className="px-3 pt-3 pb-2">
              <p className="text-[10px] font-semibold tracking-widest text-[#3A4A60] uppercase">
                Your Budgets
              </p>
            </div>

            <div className="space-y-0.5 px-1.5 pb-1.5">
              {budgets.map((budget) => {
                const isActive = budget.id === activeBudgetId;
                return (
                  <button
                    key={budget.id}
                    onClick={() => {
                      setActiveBudget(budget.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                      isActive
                        ? "bg-[#6C3AED]/20 text-white"
                        : "text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
                        isActive ? "bg-[#6C3AED]" : "bg-[#131C2E]",
                      )}
                    >
                      <Wallet
                        size={15}
                        className={isActive ? "text-white" : "text-[#5A6A85]"}
                        strokeWidth={1.8}
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm leading-tight font-medium",
                          isActive ? "text-white" : "text-[#A8B4CC]",
                        )}
                      >
                        {budget.name}
                      </p>
                    </div>

                    {isActive && (
                      <Check size={14} className="flex-shrink-0 text-[#7C5AFF]" strokeWidth={2.5} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mx-1.5 border-t border-[#131E30]" />
            <div className="px-1.5 py-1.5">
              <button className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-[#2A3A54] bg-[#131C2E]">
                  <Plus size={13} className="text-[#3A4A60]" />
                </span>
                <span className="text-sm text-[#5A6A85]">New budget</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      // proceed with local logout even if the server call fails
    }
    clearAuth();
    router.push("/login");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-lg py-1 pr-2 pl-1 transition-colors hover:bg-[#131C2E] focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6C3AED] to-[#4F46E5] text-[13px] font-bold text-white">
          {getInitials(user?.name ?? user?.username ?? "")}
        </div>
        <div className="hidden text-left sm:block">
          <div className="text-[15px] leading-tight font-medium text-white">
            {user?.name ?? user?.username ?? ""}
          </div>
          <div className="text-[13px] leading-tight text-[#5A6A85]">Owner</div>
        </div>
        <ChevronDown
          size={12}
          className={cn(
            "hidden flex-shrink-0 text-[#5A6A85] transition-transform duration-200 sm:block",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute top-full right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-[#1A2640] bg-[#0A1120] shadow-2xl shadow-black/40"
          >
            {/* User info header */}
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6C3AED] to-[#4F46E5] text-[13px] font-bold text-white">
                {getInitials(user?.name ?? user?.username ?? "")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {user?.name ?? user?.username ?? ""}
                </p>
                <p className="truncate text-xs text-[#5A6A85]">{user?.email ?? ""}</p>
              </div>
              <span className="flex-shrink-0 rounded-md bg-[#6C3AED]/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#7C5AFF] uppercase">
                Owner
              </span>
            </div>

            <div className="mx-1.5 border-t border-[#131E30]" />

            <div className="space-y-0.5 px-1.5 py-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/settings");
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white"
              >
                <Settings size={15} className="flex-shrink-0" />
                <span className="text-sm">Settings</span>
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/profile");
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white"
              >
                <User size={15} className="flex-shrink-0" />
                <span className="text-sm">Profile</span>
              </button>
            </div>

            <div className="mx-1.5 border-t border-[#131E30]" />

            <div className="px-1.5 py-1.5">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[#F87171] transition-colors hover:bg-[#F87171]/10"
              >
                <LogOut size={15} className="flex-shrink-0" />
                <span className="text-sm">Log out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Topbar() {
  const { setMobileSidebar } = useUIStore();
  const activeBudgetId = useUIStore((s) => s.activeBudgetId);
  const { data: budgets, isLoading: budgetsLoading } = useBudgets();
  const { summary } = useEnvelopes(activeBudgetId);

  return (
    <header className="relative flex h-16 flex-shrink-0 items-center gap-3 border-b border-[#1E2B42] bg-[#080C14] px-4">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileSidebar(true)}
        className="flex-shrink-0 text-[#5A6A85] transition-colors hover:text-white lg:hidden"
      >
        <Menu size={18} />
      </button>

      <BudgetSwitcher budgets={budgets} isLoading={budgetsLoading} />

      {/* Search bar */}
      <div className="max-w-md min-w-0 flex-1">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#5A6A85]"
          />
          <input
            type="text"
            placeholder="Search transactions, categories, or insights..."
            className="w-full rounded-lg border border-[#1E2B42] bg-[#0F1623] py-2 pr-20 pl-9 text-sm text-[#A8B4CC] transition-all placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/25 focus:outline-none"
          />
          <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1">
            <kbd className="rounded border border-[#1E2B42] bg-[#131C2E] px-1.5 py-0.5 font-mono text-[10px] text-[#2A3A54]">
              ⌘
            </kbd>
            <kbd className="rounded border border-[#1E2B42] bg-[#131C2E] px-1.5 py-0.5 font-mono text-[10px] text-[#2A3A54]">
              K
            </kbd>
          </div>
        </div>
      </div>

      {/* To Be Budgeted */}
      {summary != null && (
        <div className="hidden flex-shrink-0 items-center gap-3 md:flex">
          <div className="h-5 w-px bg-[#1E2B42]" />
          <div className="flex flex-col items-start">
            <span className="text-sm leading-tight font-semibold text-[#4ADE80] tabular-nums">
              {formatCurrency(summary.toBeBudgeted)}
            </span>
            <span className="mt-0.5 text-[10px] leading-tight tracking-wider text-[#3A4A60] uppercase">
              To Be Budgeted
            </span>
          </div>

          {summary.overspentEnvelopesCount > 0 && (
            <>
              <div className="h-5 w-px bg-[#1E2B42]" />
              <div className="flex flex-col items-start">
                <span className="text-sm leading-tight font-semibold text-[#F87171] tabular-nums">
                  {summary.overspentEnvelopesCount} envelope
                  {summary.overspentEnvelopesCount > 1 ? "s" : ""}
                </span>
                <span className="mt-0.5 text-[10px] leading-tight tracking-wider text-[#3A4A60] uppercase">
                  Overspent
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative rounded-lg p-2 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#6C3AED]" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-lg p-2 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none"
        >
          <HelpCircle size={20} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-lg p-2 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white focus:ring-2 focus:ring-[#6C3AED]/30 focus:outline-none"
        >
          <Sun size={20} />
        </motion.button>

        <div className="mx-1 h-5 w-px bg-[#1E2B42]" />

        <UserMenu />
      </div>
    </header>
  );
}
