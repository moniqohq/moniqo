'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, HelpCircle, Sun, Menu, Search, ChevronDown, Wallet, Check, Plus } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'
import { mockUser, mockBudgets } from '@/mock/data'
import { getInitials, formatCurrency, cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

function BudgetSwitcher() {
  const [open, setOpen] = useState(false)
  const [activeBudget, setActiveBudget] = useState(mockBudgets[0])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2.5 h-9 pl-2 pr-3 rounded-lg border transition-all',
          'focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30',
          open
            ? 'bg-[#6C3AED]/15 border-[#6C3AED]/50 text-white'
            : 'bg-[#0F1623] border-[#1E2B42] text-[#A8B4CC] hover:bg-[#131C2E] hover:border-[#2A3A54] hover:text-white',
        )}
      >
        {/* Wallet icon in purple pill */}
        <span className="w-6 h-6 rounded-md bg-[#6C3AED] flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#6C3AED]/40">
          <Wallet size={13} className="text-white" strokeWidth={2} />
        </span>
        <span className="text-sm font-medium max-w-[120px] truncate hidden sm:block">
          {activeBudget.name}
        </span>
        <ChevronDown
          size={12}
          className={cn('text-[#5A6A85] flex-shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-1.5 w-64 rounded-xl border border-[#1A2640] bg-[#0A1120] shadow-2xl shadow-black/40 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-3 pt-3 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3A4A60]">Your Budgets</p>
            </div>

            {/* Budget list */}
            <div className="px-1.5 pb-1.5 space-y-0.5">
              {mockBudgets.map(budget => {
                const isActive = budget.id === activeBudget.id
                return (
                  <button
                    key={budget.id}
                    onClick={() => { setActiveBudget(budget); setOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-left transition-colors',
                      isActive
                        ? 'bg-[#6C3AED]/20 text-white'
                        : 'text-[#7A8BA8] hover:bg-[#131C2E] hover:text-white',
                    )}
                  >
                    {/* Budget icon */}
                    <span className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                      isActive ? 'bg-[#6C3AED]' : 'bg-[#131C2E]',
                    )}>
                      <Wallet size={15} className={isActive ? 'text-white' : 'text-[#5A6A85]'} strokeWidth={1.8} />
                    </span>

                    {/* Name + meta */}
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm font-medium truncate leading-tight', isActive ? 'text-white' : 'text-[#A8B4CC]')}>
                        {budget.name}
                      </p>
                      <p className="text-[11px] text-[#3A4A60] leading-tight mt-0.5">
                        {budget.totalAccounts} accounts · {budget.currency}
                      </p>
                    </div>

                    {/* Active checkmark */}
                    {isActive && (
                      <Check size={14} className="text-[#7C5AFF] flex-shrink-0" strokeWidth={2.5} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Divider + create */}
            <div className="border-t border-[#131E30] mx-1.5" />
            <div className="px-1.5 py-1.5">
              <button className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[#5A6A85] hover:bg-[#131C2E] hover:text-white transition-colors">
                <span className="w-8 h-8 rounded-lg bg-[#131C2E] border border-dashed border-[#2A3A54] flex items-center justify-center flex-shrink-0">
                  <Plus size={13} className="text-[#3A4A60]" />
                </span>
                <span className="text-sm text-[#5A6A85]">New budget</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Topbar() {
  const { toggleSidebar, setMobileSidebar } = useUIStore()

  return (
    <header className="h-16 border-b border-[#1E2B42] bg-[#080C14] flex items-center px-4 gap-3 flex-shrink-0 relative">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileSidebar(true)}
        className="lg:hidden text-[#5A6A85] hover:text-white transition-colors flex-shrink-0"
      >
        <Menu size={18} />
      </button>

      {/* Budget switcher — left of search */}
      <BudgetSwitcher />

      {/* Search bar — left aligned */}
      <div className="flex-1 min-w-0 max-w-md">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A85] pointer-events-none" />
          <input
            type="text"
            placeholder="Search transactions, categories, or insights..."
            className="w-full bg-[#0F1623] border border-[#1E2B42] rounded-lg pl-9 pr-20 py-2 text-sm text-[#A8B4CC] placeholder:text-[#2A3A54] focus:outline-none focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/25 transition-all"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="text-[10px] text-[#2A3A54] bg-[#131C2E] border border-[#1E2B42] px-1.5 py-0.5 rounded font-mono">⌘</kbd>
            <kbd className="text-[10px] text-[#2A3A54] bg-[#131C2E] border border-[#1E2B42] px-1.5 py-0.5 rounded font-mono">K</kbd>
          </div>
        </div>
      </div>

      {/* To Be Budgeted */}
      <div className="hidden md:flex items-center gap-3 flex-shrink-0">
        <div className="w-px h-5 bg-[#1E2B42]" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold tabular-nums text-[#4ADE80] leading-tight">
            {formatCurrency(mockBudgets[0].toBeBudgeted)}
          </span>
          <span className="text-[10px] text-[#3A4A60] uppercase tracking-wider leading-tight mt-0.5">
            To Be Budgeted
          </span>
        </div>

        {/* Overspent */}
        {mockBudgets[0].overspent > 0 && (
          <>
            <div className="w-px h-5 bg-[#1E2B42]" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold tabular-nums text-[#F87171] leading-tight">
                {formatCurrency(mockBudgets[0].overspent)}
              </span>
              <span className="text-[10px] text-[#3A4A60] uppercase tracking-wider leading-tight mt-0.5">
                Overspent
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Notification */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-lg text-[#5A6A85] hover:text-white hover:bg-[#131C2E] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-colors"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#6C3AED] rounded-full" />
        </motion.button>

        {/* Help */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg text-[#5A6A85] hover:text-white hover:bg-[#131C2E] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-colors"
        >
          <HelpCircle size={20} />
        </motion.button>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg text-[#5A6A85] hover:text-white hover:bg-[#131C2E] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-colors"
        >
          <Sun size={20} />
        </motion.button>

        {/* Divider */}
        <div className="w-px h-5 bg-[#1E2B42] mx-1" />

        {/* User */}
        <button className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-[#131C2E] transition-colors">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6C3AED] to-[#4F46E5] flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
            {getInitials(mockUser.name)}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-[15px] font-medium text-white leading-tight">{mockUser.name}</div>
            <div className="text-[13px] text-[#5A6A85] leading-tight">{mockUser.role.charAt(0) + mockUser.role.slice(1).toLowerCase()}</div>
          </div>
          <ChevronDown size={12} className="text-[#5A6A85] hidden sm:block flex-shrink-0" />
        </button>
      </div>
    </header>
  )
}
