'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ArrowLeftRight, Landmark, Tag,
  Target, BarChart2, Settings, ChevronDown, ChevronRight,
  X, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui.store'
import { mockBudgets } from '@/mock/data'
import { formatCurrencyCompact } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Accounts',     href: '/accounts',     icon: Landmark },
  { label: 'Categories',   href: '/envelopes',    icon: Tag },
  { label: 'Goals',        href: '/goals',        icon: Target },
  { label: 'Reports',      href: '/reports',      icon: BarChart2 },
  { label: 'Settings',     href: '/settings',     icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, mobileSidebarOpen, setMobileSidebar } = useUIStore()
  const activeBudget = mockBudgets[0]
  const budgetProgress = (activeBudget.totalAllocated / (activeBudget.toBeBudgeted + activeBudget.totalAllocated)) * 100

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
        animate={{ width: sidebarCollapsed ? 64 : 220 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0A0E1A] border-r border-[#1E2B42]',
          'lg:relative lg:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ width: sidebarCollapsed ? 64 : 220 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[#1E2B42] flex-shrink-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#6C3AED] flex items-center justify-center text-white font-bold text-sm">
            ₹
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="font-semibold text-white text-[15px] tracking-tight"
              >
                moniqo
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

        {/* Budget selector */}
        {!sidebarCollapsed && (
          <div className="px-3 py-3 border-b border-[#1E2B42] flex-shrink-0">
            <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#131C2E] transition-colors group">
              <div className="w-7 h-7 rounded-md bg-[#1E2B42] flex items-center justify-center flex-shrink-0">
                <CreditCard size={14} className="text-[#6C3AED]" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-[13px] font-medium text-white truncate leading-tight">
                  {activeBudget.name}
                </div>
                <div className="text-[11px] text-[#5A6A85] leading-tight mt-0.5">
                  {activeBudget.totalAccounts} accounts • {formatCurrencyCompact(activeBudget.toBeBudgeted)} left
                </div>
              </div>
              <ChevronDown size={13} className="text-[#5A6A85] flex-shrink-0" />
            </button>
            {/* Progress bar */}
            <div className="mx-2.5 mt-2 h-1 bg-[#1E2B42] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${budgetProgress}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="h-full budget-progress"
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg text-sm font-medium transition-colors relative',
                  active
                    ? 'bg-[rgba(108,58,237,0.15)] text-[#C4B5FD]'
                    : 'text-[#5A6A85] hover:bg-[#111827] hover:text-[#A8B4CC]',
                )}
              >
                {active && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-lg bg-[rgba(108,58,237,0.15)]"
                    transition={{ duration: 0.15 }}
                  />
                )}
                <Icon size={16} className={cn('flex-shrink-0 relative z-10', active && 'text-[#A78BFA]')} />
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
            )
          })}
        </nav>

        {/* Version */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-t border-[#1E2B42] flex-shrink-0">
            <span className="text-[11px] text-[#2A3A54]">1.0.0-alpha</span>
          </div>
        )}
      </motion.aside>
    </>
  )
}
