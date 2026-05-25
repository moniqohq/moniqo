'use client'

import { Bell, HelpCircle, Sun, Menu, Search, ChevronDown } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'
import { mockUser } from '@/mock/data'
import { getInitials } from '@/lib/utils'
import { motion } from 'framer-motion'

export function Topbar() {
  const { toggleSidebar, setMobileSidebar } = useUIStore()

  return (
    <header className="h-14 border-b border-[#1E2B42] bg-[#080C14] flex items-center px-4 gap-4 flex-shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileSidebar(true)}
        className="lg:hidden text-[#5A6A85] hover:text-white transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Search bar */}
      <div className="flex-1 max-w-md">
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

      <div className="flex items-center gap-1 ml-auto">
        {/* Notification */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-lg text-[#5A6A85] hover:text-white hover:bg-[#131C2E] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-colors"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#6C3AED] rounded-full" />
        </motion.button>

        {/* Help */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg text-[#5A6A85] hover:text-white hover:bg-[#131C2E] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-colors"
        >
          <HelpCircle size={16} />
        </motion.button>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg text-[#5A6A85] hover:text-white hover:bg-[#131C2E] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-colors"
        >
          <Sun size={16} />
        </motion.button>

        {/* Divider */}
        <div className="w-px h-5 bg-[#1E2B42] mx-1" />

        {/* User */}
        <button className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-[#131C2E] transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6C3AED] to-[#4F46E5] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {getInitials(mockUser.name)}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-[13px] font-medium text-white leading-tight">{mockUser.name}</div>
            <div className="text-[11px] text-[#5A6A85] leading-tight">{mockUser.role.charAt(0) + mockUser.role.slice(1).toLowerCase()}</div>
          </div>
          <ChevronDown size={12} className="text-[#5A6A85] hidden sm:block flex-shrink-0" />
        </button>
      </div>
    </header>
  )
}
