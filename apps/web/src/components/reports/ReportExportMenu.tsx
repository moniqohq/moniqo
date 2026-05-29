'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, FileText, Sheet, FileDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ReportExportMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const options = [
    { icon: FileText,  label: 'Export CSV',   onClick: () => {} },
    { icon: Sheet,     label: 'Export Excel',  onClick: () => {} },
    { icon: FileDown,  label: 'Export PDF',    onClick: () => {} },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors',
          'border-[#1E2B42] bg-[#0F1623] text-[#A8B4CC] hover:border-[#6C3AED]/50 hover:text-white',
          open && 'border-[#6C3AED]/60 text-white',
        )}
      >
        <Download size={13} />
        <span>Export</span>
        <ChevronDown size={11} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl border border-[#1E2B42] bg-[#0D1623] shadow-2xl py-1.5 overflow-hidden">
          {options.map(({ icon: Icon, label, onClick }) => (
            <button
              key={label}
              onClick={() => { onClick(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#A8B4CC] hover:bg-[#1A2438] hover:text-white transition-colors"
            >
              <Icon size={13} className="shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
