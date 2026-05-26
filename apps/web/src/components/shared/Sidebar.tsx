'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ArrowLeftRight, Landmark, Tag,
  Target, BarChart2, Settings,
  BookOpen, HelpCircle, Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui.store'

const mainNavItems = [
  { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Accounts',     href: '/accounts',     icon: Landmark },
  { label: 'Categories',   href: '/envelopes',    icon: Tag },
  { label: 'Goals',        href: '/goals',        icon: Target },
  { label: 'Reports',      href: '/reports',      icon: BarChart2 },
  { label: 'Settings',     href: '/settings',     icon: Settings },
]

const extrasNavItems = [
  { label: 'Documentation', href: '/docs',    icon: BookOpen },
  { label: 'Help & Support', href: '/support', icon: HelpCircle },
  { label: 'Get PRO',        href: '/upgrade', icon: Sparkles },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, mobileSidebarOpen, setMobileSidebar } = useUIStore()

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
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0A0E1A] border-r border-[#1E2B42]',
          'lg:relative lg:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ width: sidebarCollapsed ? 64 : 256 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-[#1E2B42] flex-shrink-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#6C3AED] flex items-center justify-center text-white font-bold text-xl">
            ₹
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="font-semibold text-white text-[22px] tracking-tight leading-none"
              >
                <div>Moniqo</div>
                <div className="text-[11px] font-normal text-[#5A6A85] tracking-wide mt-0.5">Budget Planner</div>
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
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {/* Section title */}
          {!sidebarCollapsed && (
            <div className="px-2 mb-1">
              <span className="text-[10px] font-semibold text-[#6B7FA3] uppercase tracking-widest">General</span>
            </div>
          )}

          <div className="space-y-0.5">
            {mainNavItems.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center p-2 rounded-lg text-sm font-medium transition-colors relative',
                    active
                      ? 'bg-[rgba(108,58,237,0.15)] text-[#C4B5FD]'
                      : 'text-[#C8D3E8] hover:bg-[#111827] hover:text-white',
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-lg bg-[rgba(108,58,237,0.15)]"
                      transition={{ duration: 0.15 }}
                    />
                  )}
                  <span className="flex-shrink-0 relative z-10 flex items-center justify-center w-10">
                    <Icon size={16} className={cn(active && 'text-[#A78BFA]')} />
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
              )
            })}
          </div>

          {/* Extras section */}
          {!sidebarCollapsed && (
            <div className="px-2 mt-4 mb-1">
              <span className="text-[10px] font-semibold text-[#6B7FA3] uppercase tracking-widest">Extras</span>
            </div>
          )}
          {sidebarCollapsed && <div className="my-3 mx-2 border-t border-[#1E2B42]" />}

          <div className="space-y-0.5">
            {extrasNavItems.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center p-2 rounded-lg text-sm font-medium transition-colors relative',
                    active
                      ? 'bg-[rgba(108,58,237,0.15)] text-[#C4B5FD]'
                      : 'text-[#C8D3E8] hover:bg-[#111827] hover:text-white',
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="activeNavExtras"
                      className="absolute inset-0 rounded-lg bg-[rgba(108,58,237,0.15)]"
                      transition={{ duration: 0.15 }}
                    />
                  )}
                  <span className="flex-shrink-0 relative z-10 flex items-center justify-center w-10">
                    <Icon size={16} className={cn(active && 'text-[#A78BFA]')} />
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
              )
            })}
          </div>
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
