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
} from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { mockUser, mockBudgets } from "@/mock/data";
import { getInitials, formatCurrency, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

function BudgetSwitcher() {
  const [open, setOpen] = useState(false);
  const [activeBudget, setActiveBudget] = useState(mockBudgets[0]);
  const ref = useRef<HTMLDivElement>(null);

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
          "flex h-9 items-center gap-2.5 rounded-lg border pl-2 pr-3 transition-all",
          "focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30",
          open
            ? "border-[#6C3AED]/50 bg-[#6C3AED]/15 text-white"
            : "border-[#1E2B42] bg-[#0F1623] text-[#A8B4CC] hover:border-[#2A3A54] hover:bg-[#131C2E] hover:text-white",
        )}
      >
        {/* Wallet icon in purple pill */}
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[#6C3AED] shadow-sm shadow-[#6C3AED]/40">
          <Wallet size={13} className="text-white" strokeWidth={2} />
        </span>
        <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">
          {activeBudget.name}
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
            className="absolute left-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-[#1A2640] bg-[#0A1120] shadow-2xl shadow-black/40"
          >
            {/* Header */}
            <div className="px-3 pb-2 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3A4A60]">
                Your Budgets
              </p>
            </div>

            {/* Budget list */}
            <div className="space-y-0.5 px-1.5 pb-1.5">
              {mockBudgets.map((budget) => {
                const isActive = budget.id === activeBudget.id;
                return (
                  <button
                    key={budget.id}
                    onClick={() => {
                      setActiveBudget(budget);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                      isActive
                        ? "bg-[#6C3AED]/20 text-white"
                        : "text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white",
                    )}
                  >
                    {/* Budget icon */}
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

                    {/* Name + meta */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium leading-tight",
                          isActive ? "text-white" : "text-[#A8B4CC]",
                        )}
                      >
                        {budget.name}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-tight text-[#3A4A60]">
                        {budget.totalAccounts} accounts · {budget.currency}
                      </p>
                    </div>

                    {/* Active checkmark */}
                    {isActive && (
                      <Check size={14} className="flex-shrink-0 text-[#7C5AFF]" strokeWidth={2.5} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider + create */}
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

export function Topbar() {
  const { toggleSidebar, setMobileSidebar } = useUIStore();

  return (
    <header className="relative flex h-16 flex-shrink-0 items-center gap-3 border-b border-[#1E2B42] bg-[#080C14] px-4">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileSidebar(true)}
        className="flex-shrink-0 text-[#5A6A85] transition-colors hover:text-white lg:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Budget switcher — left of search */}
      <BudgetSwitcher />

      {/* Search bar — left aligned */}
      <div className="min-w-0 max-w-md flex-1">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A85]"
          />
          <input
            type="text"
            placeholder="Search transactions, categories, or insights..."
            className="w-full rounded-lg border border-[#1E2B42] bg-[#0F1623] py-2 pl-9 pr-20 text-sm text-[#A8B4CC] transition-all placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/25"
          />
          <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
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
      <div className="hidden flex-shrink-0 items-center gap-3 md:flex">
        <div className="h-5 w-px bg-[#1E2B42]" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold tabular-nums leading-tight text-[#4ADE80]">
            {formatCurrency(mockBudgets[0].toBeBudgeted)}
          </span>
          <span className="mt-0.5 text-[10px] uppercase leading-tight tracking-wider text-[#3A4A60]">
            To Be Budgeted
          </span>
        </div>

        {/* Overspent */}
        {mockBudgets[0].overspent > 0 && (
          <>
            <div className="h-5 w-px bg-[#1E2B42]" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold tabular-nums leading-tight text-[#F87171]">
                {formatCurrency(mockBudgets[0].overspent)}
              </span>
              <span className="mt-0.5 text-[10px] uppercase leading-tight tracking-wider text-[#3A4A60]">
                Overspent
              </span>
            </div>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Notification */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative rounded-lg p-2 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30"
        >
          <Bell size={20} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#6C3AED]" />
        </motion.button>

        {/* Help */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-lg p-2 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30"
        >
          <HelpCircle size={20} />
        </motion.button>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-lg p-2 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30"
        >
          <Sun size={20} />
        </motion.button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-[#1E2B42]" />

        {/* User */}
        <button className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-[#131C2E]">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6C3AED] to-[#4F46E5] text-[13px] font-bold text-white">
            {getInitials(mockUser.name)}
          </div>
          <div className="hidden text-left sm:block">
            <div className="text-[15px] font-medium leading-tight text-white">{mockUser.name}</div>
            <div className="text-[13px] leading-tight text-[#5A6A85]">
              {mockUser.role.charAt(0) + mockUser.role.slice(1).toLowerCase()}
            </div>
          </div>
          <ChevronDown size={12} className="hidden flex-shrink-0 text-[#5A6A85] sm:block" />
        </button>
      </div>
    </header>
  );
}
