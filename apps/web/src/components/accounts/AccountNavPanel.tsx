'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, PiggyBank, CreditCard, Wallet, TrendingUp,
  ChevronDown, Plus,
} from 'lucide-react'
import { mockAccounts } from '@/mock/data'
import { formatCurrency, cn } from '@/lib/utils'
import type { Account, AccountType } from '@/types'

interface Props {
  selectedId: string
  onSelect: (id: string) => void
}

const TYPE_META: Record<AccountType, { icon: React.ReactNode; color: string; bg: string }> = {
  checking:   { icon: <Building2 size={14} />, color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  savings:    { icon: <PiggyBank  size={14} />, color: '#22C55E', bg: 'rgba(34,197,94,0.15)'  },
  credit:     { icon: <CreditCard size={14} />, color: '#F87171', bg: 'rgba(239,68,68,0.15)'  },
  cash:       { icon: <Wallet     size={14} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  investment: { icon: <TrendingUp size={14} />, color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
}

const GROUPS: { label: string; types: AccountType[] }[] = [
  { label: 'Cash & Checking', types: ['checking', 'cash'] },
  { label: 'Savings',         types: ['savings'] },
  { label: 'Credit Cards',    types: ['credit'] },
  { label: 'Investments',     types: ['investment'] },
]

function AccountRow({ account, selected, onSelect }: { account: Account; selected: boolean; onSelect: () => void }) {
  const meta = TYPE_META[account.type]
  const negative = account.balance < 0
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group',
        selected
          ? 'bg-[rgba(108,58,237,0.12)] border border-[rgba(108,58,237,0.35)] shadow-[0_0_12px_rgba(108,58,237,0.15)]'
          : 'border border-transparent hover:bg-[#0D1525] hover:border-[#1A2540]',
      )}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: meta.bg, color: meta.color }}
      >
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-semibold truncate', selected ? 'text-[#C4B5FD]' : 'text-[#D1D9E8] group-hover:text-white')}>
          {account.name}
        </p>
        {account.institution && (
          <p className="text-[10px] text-[#5A6A85] truncate">{account.institution}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={cn('text-xs font-semibold tabular-nums', negative ? 'text-[#F87171]' : 'text-[#D1D9E8]')}>
          {formatCurrency(account.balance)}
        </span>
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', negative ? 'bg-[#EF4444]' : 'bg-[#22C55E]')} />
      </div>
    </button>
  )
}

function AccountGroup({
  label, accounts, selectedId, onSelect,
}: { label: string; accounts: Account[]; selectedId: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(true)
  if (accounts.length === 0) return null
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-1 py-1.5 group"
      >
        <span className="text-[10px] font-bold text-[#5A6A85] uppercase tracking-widest group-hover:text-[#5A6A85] transition-colors">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-[#5A6A85] bg-[#0D1525] border border-[#1A2540] rounded-full px-1.5 py-0.5">
            {accounts.length}
          </span>
          <ChevronDown
            size={12}
            className={cn('text-[#5A6A85] transition-transform', open ? '' : '-rotate-90')}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden space-y-0.5"
          >
            {accounts.map(acc => (
              <AccountRow
                key={acc.id}
                account={acc}
                selected={acc.id === selectedId}
                onSelect={() => onSelect(acc.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AccountNavPanel({ selectedId, onSelect }: Props) {
  return (
    <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="px-4 pt-4 pb-3 border-b border-[#1A2540]">
        <h3 className="text-sm font-bold text-white">Accounts</h3>
        <p className="text-xs text-[#5A6A85] mt-0.5">{mockAccounts.length} total accounts</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {GROUPS.map(({ label, types }) => {
          const accounts = mockAccounts.filter(a => types.includes(a.type))
          return (
            <AccountGroup
              key={label}
              label={label}
              accounts={accounts}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          )
        })}

        {/* Archived section (empty) */}
        <div>
          <button className="w-full flex items-center justify-between px-1 py-1.5 group">
            <span className="text-[10px] font-bold text-[#5A6A85] uppercase tracking-widest group-hover:text-[#5A6A85] transition-colors">
              Archived
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-[#5A6A85] bg-[#0D1525] border border-[#1A2540] rounded-full px-1.5 py-0.5">
                0
              </span>
              <ChevronDown size={12} className="text-[#5A6A85] -rotate-90" />
            </div>
          </button>
        </div>
      </div>

      <div className="p-3 border-t border-[#1A2540]">
        <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-[rgba(108,58,237,0.4)] text-[#7C3AED] text-xs font-semibold hover:bg-[rgba(108,58,237,0.08)] hover:border-[rgba(108,58,237,0.6)] hover:shadow-[0_0_12px_rgba(108,58,237,0.15)] transition-all">
          <Plus size={13} />
          Create New Account
        </button>
      </div>
    </div>
  )
}
