'use client'

import { useState } from 'react'
import {
  Plus, Upload, ChevronDown, MoreVertical, Search,
  Calendar, Grid3x3, SlidersHorizontal, Square, CheckSquare,
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Building2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { mockTransactions } from '@/mock/data'
import { formatCurrency, formatTableDate, cn } from '@/lib/utils'
import { AddTransactionModal } from './AddTransactionModal'
import type { Transaction } from '@/types'

/* ── Type badge — Flowbite: rounded, px-2.5 py-0.5 text-xs font-medium ── */
function TypeBadge({ type }: { type: Transaction['type'] }) {
  if (type === 'expense') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-[rgba(239,68,68,0.12)] text-[#F87171] whitespace-nowrap">
      <ArrowDownLeft size={10} strokeWidth={2.5} />
      Expense
    </span>
  )
  if (type === 'income') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-[rgba(34,197,94,0.12)] text-[#4ADE80] whitespace-nowrap">
      <ArrowUpRight size={10} strokeWidth={2.5} />
      Income
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-[rgba(99,179,237,0.12)] text-[#7DD3FC] whitespace-nowrap">
      <ArrowLeftRight size={10} strokeWidth={2.5} />
      Transfer
    </span>
  )
}

/* ── Payee avatar ───────────────────────────────────────── */
function PayeeAvatar({ payee, color }: { payee: string; color?: string }) {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 select-none"
      style={{ backgroundColor: color ?? '#1E2B42' }}
    >
      {payee[0]}
    </div>
  )
}

/* ── Envelope chip ──────────────────────────────────────── */
function EnvelopeChip({ name, icon, color }: { name?: string; icon?: string; color?: string }) {
  if (!name) return <span className="text-[#2A3A54] text-sm select-none">—</span>
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded flex items-center justify-center text-xs flex-shrink-0"
        style={{ backgroundColor: color ?? '#1E2B42' }}
      >
        {icon ?? name[0]}
      </div>
      <span className="text-sm text-[#A8B4CC] whitespace-nowrap">{name}</span>
    </div>
  )
}

/* ── Transaction row ────────────────────────────────────── */
function TxRow({
  tx, index, selected, onSelect,
}: {
  tx: Transaction; index: number; selected: boolean; onSelect: () => void
}) {
  const amountColor =
    tx.type === 'income' ? 'text-[#4ADE80]'
    : tx.type === 'transfer' ? (tx.amount >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]')
    : 'text-[#F87171]'

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.018 }}
      className={cn(
        'group hover:bg-[#0D1828] transition-colors',
        selected && 'bg-[rgba(108,58,237,0.05)]',
      )}
    >
      {/* Checkbox */}
      <td className="w-10 pl-4 pr-2 py-3">
        <button
          onClick={onSelect}
          className="text-[#2A3A54] hover:text-[#6C3AED] focus:outline-none transition-colors flex"
        >
          {selected
            ? <CheckSquare size={15} className="text-[#6C3AED]" />
            : <Square size={15} />}
        </button>
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-sm text-[#A8B4CC] whitespace-nowrap">
        {formatTableDate(tx.date)}
      </td>

      {/* Payee / Note */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <PayeeAvatar payee={tx.payee} color={tx.payeeColor} />
          <div>
            <p className="text-sm font-medium text-[#E8EEF8] leading-tight">{tx.payee}</p>
            {tx.memo && (
              <p className="text-xs text-[#5A6A85] mt-0.5 leading-tight">{tx.memo}</p>
            )}
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <TypeBadge type={tx.type} />
      </td>

      {/* Envelope / Category */}
      <td className="px-4 py-3">
        <EnvelopeChip name={tx.envelopeName} icon={tx.envelopeIcon} color={tx.envelopeColor} />
      </td>

      {/* Account */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center bg-[#0E2040] flex-shrink-0">
            <Building2 size={10} className="text-[#3B82F6]" />
          </div>
          <div>
            <p className="text-sm text-[#A8B4CC] leading-tight whitespace-nowrap">
              {tx.accountInstitution ?? tx.accountName}
            </p>
            {tx.accountSubLabel && (
              <p className="text-xs text-[#5A6A85] leading-tight">{tx.accountSubLabel}</p>
            )}
          </div>
        </div>
      </td>

      {/* Amount */}
      <td className={cn('px-4 py-3 text-sm font-semibold tabular-nums text-right whitespace-nowrap', amountColor)}>
        {tx.amount >= 0 ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
      </td>

      {/* Running Balance */}
      <td className={cn(
        'px-4 py-3 text-sm tabular-nums text-right whitespace-nowrap',
        tx.runningBalance !== undefined && tx.runningBalance < 0
          ? 'text-[#F87171]'
          : 'text-[#A8B4CC]',
      )}>
        {tx.runningBalance !== undefined ? formatCurrency(tx.runningBalance) : '—'}
      </td>

      {/* Actions */}
      <td className="px-3 py-3">
        <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#5A6A85] hover:text-[#E8EEF8] hover:bg-[#1E2B42] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-all ml-auto flex">
          <MoreVertical size={13} />
        </button>
      </td>
    </motion.tr>
  )
}

/* ── Main view ──────────────────────────────────────────── */
export function TransactionsView() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allSelected = selected.size === mockTransactions.length && mockTransactions.length > 0
  const someSelected = selected.size > 0 && !allSelected

  const totalInflow  = 885650
  const totalOutflow = -347820
  const netFlow      = totalInflow + totalOutflow
  const totalCount   = 72

  function toggleAll() {
    if (allSelected || someSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(mockTransactions.map(t => t.id)))
    }
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  /* Flowbite dropdown trigger style */
  const filterBtn = [
    'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1A2640]',
    'bg-[#080D1A] text-sm text-[#7A8BA8]',
    'hover:text-[#C8D4E8] hover:border-[#2A3A54]',
    'focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/25',
    'transition-all whitespace-nowrap',
  ].join(' ')

  return (
    <div className="p-6 max-w-[1400px] mx-auto">

      {/* ── Page header ─────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8EEF8] tracking-tight">Transactions</h1>
          <p className="text-sm text-[#5A6A85] mt-1 max-w-xl">
            Review and manage all transactions in your budget. Your transactions update your accounts and envelopes.
          </p>
        </div>

        {/* Flowbite button group pattern */}
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#1E2B42] text-sm font-medium text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-colors">
            <Upload size={14} />
            Import
          </button>

          <div className="inline-flex rounded-lg shadow-sm" role="group">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#6C3AED] rounded-l-lg border border-[#6C3AED] hover:bg-[#7C4AFF] focus:z-10 focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/50 transition-colors"
            >
              <Plus size={14} />
              Add Transaction
            </button>
            <button className="inline-flex items-center px-3 py-2.5 text-sm font-medium text-white bg-[#6C3AED] rounded-r-lg border border-l-[#5530C8]/60 border-[#6C3AED] hover:bg-[#7C4AFF] focus:z-10 focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/50 transition-colors">
              <ChevronDown size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Table card ──────────────────────────────────── */}
      <div className="bg-[#0B1220] border border-[#1A2640] rounded-lg shadow-sm overflow-hidden">

        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#131E30] flex-wrap">
          {/* Flowbite search input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={13} className="text-[#3A4A60]" />
            </div>
            <input
              type="search"
              placeholder="Search transactions..."
              className="block w-44 py-2 pl-9 pr-3 text-sm text-[#A8B4CC] bg-[#080D1A] border border-[#1A2640] rounded-lg placeholder:text-[#2A3A54] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/25 focus:border-[#6C3AED] transition-colors"
            />
          </div>

          <button className={filterBtn}>All Accounts <ChevronDown size={11} /></button>
          <button className={filterBtn}>All Envelopes <ChevronDown size={11} /></button>
          <button className={filterBtn}>
            <Calendar size={12} />
            May 1 — May 31, 2024
            <ChevronDown size={11} />
          </button>
          <button className={filterBtn}>
            <Grid3x3 size={12} />
            All Types
            <ChevronDown size={11} />
          </button>
          <button className={cn(filterBtn, 'ml-auto')}>
            <SlidersHorizontal size={12} />
            Filters
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center px-5 py-4 border-b border-[#131E30] gap-8">
          <div>
            <p className="text-xs font-semibold text-[#22C55E] uppercase tracking-widest mb-1">Total Inflow</p>
            <p className="text-2xl font-bold tabular-nums text-[#E8EEF8]">{formatCurrency(totalInflow)}</p>
          </div>

          <div className="w-px h-10 bg-[#131E30]" />

          <div>
            <p className="text-xs font-semibold text-[#F97316] uppercase tracking-widest mb-1">Total Outflow</p>
            <p className="text-2xl font-bold tabular-nums text-[#F97316]">{formatCurrency(totalOutflow)}</p>
          </div>

          <div className="w-px h-10 bg-[#131E30]" />

          <div>
            <p className="text-xs font-semibold text-[#22C55E] uppercase tracking-widest mb-1">Net Flow</p>
            <p className={cn('text-2xl font-bold tabular-nums', netFlow >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
              {formatCurrency(netFlow)}
            </p>
          </div>

          <div className="ml-auto">
            <p className="text-xs font-semibold text-[#5A6A85] uppercase tracking-widest mb-1">Transactions</p>
            <p className="text-2xl font-bold tabular-nums text-[#E8EEF8]">{totalCount}</p>
          </div>
        </div>

        {/* Table — Flowbite: divide-y on tbody, text-xs uppercase headers */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#5A6A85] uppercase bg-[#080E1A]">
              <tr>
                <th scope="col" className="w-10 pl-4 pr-2 py-3">
                  <button
                    onClick={toggleAll}
                    className="text-[#2A3A54] hover:text-[#6C3AED] focus:outline-none transition-colors flex"
                  >
                    {allSelected
                      ? <CheckSquare size={14} className="text-[#6C3AED]" />
                      : <Square size={14} />}
                  </button>
                </th>
                <th scope="col" className="px-4 py-3">
                  <button className="inline-flex items-center gap-1 hover:text-[#A8B4CC] transition-colors tracking-wider">
                    Date <span className="text-[10px]">↑</span>
                  </button>
                </th>
                <th scope="col" className="px-4 py-3 tracking-wider">Payee / Note</th>
                <th scope="col" className="px-4 py-3 tracking-wider">Type</th>
                <th scope="col" className="px-4 py-3 tracking-wider">Envelope / Category</th>
                <th scope="col" className="px-4 py-3 tracking-wider">Account</th>
                <th scope="col" className="px-4 py-3 tracking-wider text-right">Amount</th>
                <th scope="col" className="px-4 py-3 tracking-wider text-right">Running Balance</th>
                <th scope="col" className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0F1A2C]">
              {mockTransactions.map((tx, i) => (
                <TxRow
                  key={tx.id}
                  tx={tx}
                  index={i}
                  selected={selected.has(tx.id)}
                  onSelect={() => toggleRow(tx.id)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination — Flowbite pagination pattern */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#131E30]">
          <span className="text-sm text-[#5A6A85]">
            Showing <span className="font-medium text-[#A8B4CC]">1</span> to{' '}
            <span className="font-medium text-[#A8B4CC]">{mockTransactions.length}</span> of{' '}
            <span className="font-medium text-[#A8B4CC]">{totalCount}</span> transactions
          </span>

          <div className="inline-flex items-center gap-1" aria-label="Pagination">
            <button className="px-2.5 py-1.5 text-sm rounded-lg border border-[#1A2640] text-[#5A6A85] hover:bg-[#131C2E] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-colors">
              ‹
            </button>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                aria-current={n === 1 ? 'page' : undefined}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30',
                  n === 1
                    ? 'bg-[#6C3AED] text-white border border-[#6C3AED]'
                    : 'border border-[#1A2640] text-[#5A6A85] hover:bg-[#131C2E] hover:text-white',
                )}
              >
                {n}
              </button>
            ))}
            <button className="px-2.5 py-1.5 text-sm rounded-lg border border-[#1A2640] text-[#5A6A85] hover:bg-[#131C2E] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-colors">
              ›
            </button>

            <button className="inline-flex items-center gap-1 px-3 py-1.5 ml-1 text-sm rounded-lg border border-[#1A2640] text-[#5A6A85] hover:bg-[#131C2E] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/30 transition-colors">
              25 / page <ChevronDown size={10} />
            </button>
          </div>
        </div>
      </div>

      <AddTransactionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
