'use client'

import { useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReportFilters, BudgetStatus, EnvelopeReport } from './types'

interface Props {
  open: boolean
  onClose: () => void
  filters: ReportFilters
  onChange: (f: ReportFilters) => void
  envelopes: EnvelopeReport[]
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors shrink-0',
        checked ? 'bg-[#6C3AED]' : 'bg-[#1E2B42]',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

function MultiSelect<T extends string>({
  options, selected, onChange,
}: { options: { value: T; label: string }[]; selected: T[]; onChange: (v: T[]) => void }) {
  const toggle = (v: T) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => toggle(o.value)}
          className={cn(
            'px-3 py-1 rounded-lg text-[12px] font-medium border transition-colors',
            selected.includes(o.value)
              ? 'bg-[rgba(108,58,237,0.2)] border-[#6C3AED]/60 text-[#C4B5FD]'
              : 'bg-transparent border-[#1E2B42] text-[#5A6A85] hover:border-[#2A3A52] hover:text-[#A8B4CC]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ReportFiltersDrawer({ open, onClose, filters, onChange, envelopes }: Props) {
  if (!open) return null

  const set = <K extends keyof ReportFilters>(k: K, v: ReportFilters[K]) =>
    onChange({ ...filters, [k]: v })

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-[#0A0E1A] border-l border-[#1E2B42] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2B42]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-[#6C3AED]" />
            <h2 className="text-[14px] font-semibold text-white">Report Filters</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#5A6A85] hover:text-white hover:bg-[#1A2438] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Envelope */}
          <div>
            <label className="text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider block mb-2">Envelope</label>
            <MultiSelect
              options={envelopes.map(e => ({ value: e.id, label: e.name }))}
              selected={filters.envelopes}
              onChange={v => set('envelopes', v)}
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider block mb-2">Envelope Type</label>
            <MultiSelect
              options={[
                { value: 'income',  label: 'Income' },
                { value: 'expense', label: 'Expense' },
              ]}
              selected={filters.types as any}
              onChange={v => set('types', v)}
            />
          </div>

          {/* Nature */}
          <div>
            <label className="text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider block mb-2">Envelope Nature</label>
            <MultiSelect
              options={[
                { value: 'want',   label: 'Want' },
                { value: 'should', label: 'Should' },
                { value: 'need',   label: 'Need' },
                { value: 'must',   label: 'Must' },
              ]}
              selected={filters.natures as any}
              onChange={v => set('natures', v)}
            />
          </div>

          {/* Budget Status */}
          <div>
            <label className="text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider block mb-2">Budget Status</label>
            <MultiSelect
              options={[
                { value: 'under', label: 'Under Budget' },
                { value: 'near',  label: 'Near Budget' },
                { value: 'over',  label: 'Over Budget' },
              ]}
              selected={filters.statuses as any}
              onChange={v => set('statuses', v as BudgetStatus[])}
            />
          </div>

          {/* Amount Range */}
          <div>
            <label className="text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider block mb-2">Amount Range (Spent)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minAmount}
                onChange={e => set('minAmount', e.target.value)}
                className="flex-1 bg-[#0F1623] border border-[#1E2B42] rounded-lg px-3 py-2 text-[12px] text-[#E8EEF8] placeholder-[#3A4A60] focus:outline-none focus:border-[#6C3AED]/60"
              />
              <span className="text-[#5A6A85] text-xs">–</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxAmount}
                onChange={e => set('maxAmount', e.target.value)}
                className="flex-1 bg-[#0F1623] border border-[#1E2B42] rounded-lg px-3 py-2 text-[12px] text-[#E8EEF8] placeholder-[#3A4A60] focus:outline-none focus:border-[#6C3AED]/60"
              />
            </div>
          </div>

          {/* Hide Empty */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#E8EEF8] font-medium">Hide Empty Envelopes</p>
              <p className="text-[11px] text-[#5A6A85] mt-0.5">Hide envelopes with no activity</p>
            </div>
            <Toggle checked={filters.hideEmpty} onChange={v => set('hideEmpty', v)} />
          </div>
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t border-[#1E2B42] flex gap-2">
          <button
            onClick={() => onChange({ envelopes: [], types: [], natures: [], statuses: [], minAmount: '', maxAmount: '', hideEmpty: false })}
            className="flex-1 py-2 rounded-lg border border-[#1E2B42] text-[13px] text-[#5A6A85] hover:text-white hover:border-[#2A3A52] transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-[#6C3AED] text-white text-[13px] font-medium hover:bg-[#7C4AFF] transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  )
}
