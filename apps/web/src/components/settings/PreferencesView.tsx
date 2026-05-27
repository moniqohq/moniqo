'use client'

import { useState } from 'react'
import {
  Globe, Wallet, LayoutDashboard, Accessibility,
  RefreshCw, RotateCcw, Check,
} from 'lucide-react'
import { SectionCard } from '@/components/shared/SectionCard'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ── Options ───────────────────────────────────────────────────────

const CURRENCIES = [
  { value: 'INR', label: '₹ INR — Indian Rupee' },
  { value: 'USD', label: '$ USD — US Dollar' },
  { value: 'EUR', label: '€ EUR — Euro' },
  { value: 'GBP', label: '£ GBP — British Pound' },
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]

const NUMBER_FORMATS = [
  { value: '1,00,000.00', label: '1,00,000.00 (Indian)' },
  { value: '100,000.00', label: '100,000.00 (US/EU)' },
  { value: '100.000,00', label: '100.000,00 (European)' },
]

const WEEK_STARTS = [
  { value: 'monday', label: 'Monday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'saturday', label: 'Saturday' },
]

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
  { value: 'America/New_York', label: 'America/New_York (EST, UTC−5)' },
  { value: 'Europe/London', label: 'Europe/London (GMT, UTC+0)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET, UTC+1)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST, UTC−8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
]

const BUDGETS = [
  { value: 'personal', label: 'Personal Budget' },
  { value: 'family', label: 'Family Budget' },
  { value: 'business', label: 'Business Budget' },
]

const MONTHS = [
  { value: 'january', label: 'January' },
  { value: 'february', label: 'February' },
  { value: 'march', label: 'March' },
  { value: 'april', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'june', label: 'June' },
  { value: 'july', label: 'July' },
  { value: 'august', label: 'August' },
  { value: 'september', label: 'September' },
  { value: 'october', label: 'October' },
  { value: 'november', label: 'November' },
  { value: 'december', label: 'December' },
]

const LANDING_PAGES = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'budget', label: 'Budget' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'accounts', label: 'Accounts' },
]

const DENSITIES = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
  { value: 'spacious', label: 'Spacious' },
]

const SYNC_FREQUENCIES = [
  { value: 'realtime', label: 'Real-time' },
  { value: '5min', label: 'Every 5 minutes' },
  { value: '15min', label: 'Every 15 minutes' },
  { value: 'manual', label: 'Manual only' },
]

const CACHE_SIZES = [
  { value: '50mb', label: '50 MB' },
  { value: '100mb', label: '100 MB' },
  { value: '250mb', label: '250 MB' },
  { value: '500mb', label: '500 MB' },
]

// ── Default state ─────────────────────────────────────────────────

const DEFAULTS = {
  currency: 'INR', dateFormat: 'DD/MM/YYYY', numberFormat: '1,00,000.00',
  firstDayOfWeek: 'monday', timezone: 'Asia/Kolkata', language: 'en',
  defaultBudget: 'personal', startMonth: 'january',
  autoAssignIncome: false, carryOver: true,
  showHiddenEnvelopes: false, reconciliationReminders: true,
  defaultLanding: 'dashboard', dashboardDensity: 'comfortable',
  compactMode: false, showSpendingCharts: true,
  showRecentTransactions: true, showSavingsGoals: true,
  reduceMotion: false, largerText: false, highContrast: false, keyboardNav: false,
  autoSync: true, syncFrequency: 'realtime', offlineMode: false, cacheSize: '100mb',
}

// ── Toggle switch ─────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#6C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1623]',
        checked ? 'bg-[#6C3AED]' : 'bg-[#1E2B42]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ── Toggle row ────────────────────────────────────────────────────

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-[#1A2640] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#A8B4CC] leading-tight">{label}</p>
        {description && (
          <p className="text-[11px] text-[#5A6A85] mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// ── Select field ──────────────────────────────────────────────────

function PrefSelect({
  label, value, onValueChange, options, helperText, disabled,
}: {
  label: string
  value: string
  onValueChange: (v: string) => void
  options: { value: string; label: string }[]
  helperText?: string
  disabled?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', disabled && 'opacity-50 pointer-events-none')}>
      <Label className="text-[12px] text-[#5A6A85] font-medium uppercase tracking-wider">{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="h-8 text-[13px] bg-[#0D1520] border-[#1E2B42] text-[#A8B4CC] hover:border-[#2A3A54] focus:ring-[rgba(108,58,237,0.2)] focus:border-[#6C3AED] transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#0F1623] border-[#1E2B42]">
          {options.map(o => (
            <SelectItem
              key={o.value}
              value={o.value}
              className="text-[13px] text-[#A8B4CC] focus:bg-[rgba(108,58,237,0.12)] focus:text-white"
            >
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helperText && <p className="text-[11px] text-[#5A6A85] leading-relaxed">{helperText}</p>}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────

export function PreferencesView() {
  const [currency, setCurrency] = useState(DEFAULTS.currency)
  const [dateFormat, setDateFormat] = useState(DEFAULTS.dateFormat)
  const [numberFormat, setNumberFormat] = useState(DEFAULTS.numberFormat)
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(DEFAULTS.firstDayOfWeek)
  const [timezone, setTimezone] = useState(DEFAULTS.timezone)
  const [language, setLanguage] = useState(DEFAULTS.language)

  const [defaultBudget, setDefaultBudget] = useState(DEFAULTS.defaultBudget)
  const [startMonth, setStartMonth] = useState(DEFAULTS.startMonth)
  const [autoAssignIncome, setAutoAssignIncome] = useState(DEFAULTS.autoAssignIncome)
  const [carryOver, setCarryOver] = useState(DEFAULTS.carryOver)
  const [showHiddenEnvelopes, setShowHiddenEnvelopes] = useState(DEFAULTS.showHiddenEnvelopes)
  const [reconciliationReminders, setReconciliationReminders] = useState(DEFAULTS.reconciliationReminders)

  const [defaultLanding, setDefaultLanding] = useState(DEFAULTS.defaultLanding)
  const [dashboardDensity, setDashboardDensity] = useState(DEFAULTS.dashboardDensity)
  const [compactMode, setCompactMode] = useState(DEFAULTS.compactMode)
  const [showSpendingCharts, setShowSpendingCharts] = useState(DEFAULTS.showSpendingCharts)
  const [showRecentTransactions, setShowRecentTransactions] = useState(DEFAULTS.showRecentTransactions)
  const [showSavingsGoals, setShowSavingsGoals] = useState(DEFAULTS.showSavingsGoals)

  const [reduceMotion, setReduceMotion] = useState(DEFAULTS.reduceMotion)
  const [largerText, setLargerText] = useState(DEFAULTS.largerText)
  const [highContrast, setHighContrast] = useState(DEFAULTS.highContrast)
  const [keyboardNav, setKeyboardNav] = useState(DEFAULTS.keyboardNav)

  const [autoSync, setAutoSync] = useState(DEFAULTS.autoSync)
  const [syncFrequency, setSyncFrequency] = useState(DEFAULTS.syncFrequency)
  const [offlineMode, setOfflineMode] = useState(DEFAULTS.offlineMode)
  const [cacheSize, setCacheSize] = useState(DEFAULTS.cacheSize)

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    setCurrency(DEFAULTS.currency); setDateFormat(DEFAULTS.dateFormat)
    setNumberFormat(DEFAULTS.numberFormat); setFirstDayOfWeek(DEFAULTS.firstDayOfWeek)
    setTimezone(DEFAULTS.timezone); setLanguage(DEFAULTS.language)
    setDefaultBudget(DEFAULTS.defaultBudget); setStartMonth(DEFAULTS.startMonth)
    setAutoAssignIncome(DEFAULTS.autoAssignIncome); setCarryOver(DEFAULTS.carryOver)
    setShowHiddenEnvelopes(DEFAULTS.showHiddenEnvelopes)
    setReconciliationReminders(DEFAULTS.reconciliationReminders)
    setDefaultLanding(DEFAULTS.defaultLanding); setDashboardDensity(DEFAULTS.dashboardDensity)
    setCompactMode(DEFAULTS.compactMode); setShowSpendingCharts(DEFAULTS.showSpendingCharts)
    setShowRecentTransactions(DEFAULTS.showRecentTransactions)
    setShowSavingsGoals(DEFAULTS.showSavingsGoals)
    setReduceMotion(DEFAULTS.reduceMotion); setLargerText(DEFAULTS.largerText)
    setHighContrast(DEFAULTS.highContrast); setKeyboardNav(DEFAULTS.keyboardNav)
    setAutoSync(DEFAULTS.autoSync); setSyncFrequency(DEFAULTS.syncFrequency)
    setOfflineMode(DEFAULTS.offlineMode); setCacheSize(DEFAULTS.cacheSize)
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Regional Settings ─────────────────────────── */}
      <SectionCard
        title="Regional Settings"
        description="Configure localization and financial display preferences."
        icon={Globe}
        iconColor="#60A5FA"
        iconBg="rgba(59,130,246,0.12)"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <PrefSelect label="Currency" value={currency} onValueChange={setCurrency} options={CURRENCIES} />
          <PrefSelect label="Date Format" value={dateFormat} onValueChange={setDateFormat} options={DATE_FORMATS} />
          <PrefSelect label="Number Format" value={numberFormat} onValueChange={setNumberFormat} options={NUMBER_FORMATS} />
          <PrefSelect label="First Day of Week" value={firstDayOfWeek} onValueChange={setFirstDayOfWeek} options={WEEK_STARTS} />
          <PrefSelect label="Timezone" value={timezone} onValueChange={setTimezone} options={TIMEZONES} />
          <PrefSelect label="Language" value={language} onValueChange={setLanguage} options={LANGUAGES} />
        </div>
      </SectionCard>

      {/* ── Budgeting Preferences ─────────────────────── */}
      <SectionCard
        title="Budgeting Preferences"
        description="Control budgeting behavior and financial workflow defaults."
        icon={Wallet}
        iconColor="#34D399"
        iconBg="rgba(34,197,94,0.12)"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 pb-5 mb-1 border-b border-[#1E2B42]">
          <PrefSelect label="Default Budget" value={defaultBudget} onValueChange={setDefaultBudget} options={BUDGETS} />
          <PrefSelect label="Start Month On" value={startMonth} onValueChange={setStartMonth} options={MONTHS} />
        </div>
        <div className="flex flex-col">
          <ToggleRow
            label="Auto-assign income"
            description="Automatically distribute new income across envelopes based on your last allocation."
            checked={autoAssignIncome}
            onChange={setAutoAssignIncome}
          />
          <ToggleRow
            label="Carry over remaining balance"
            description="Unspent envelope balance rolls forward into the next month automatically."
            checked={carryOver}
            onChange={setCarryOver}
          />
          <ToggleRow
            label="Show hidden envelopes"
            description="Display envelopes marked as hidden in your budget view."
            checked={showHiddenEnvelopes}
            onChange={setShowHiddenEnvelopes}
          />
          <ToggleRow
            label="Reconciliation reminders"
            description="Receive a prompt to reconcile accounts at the start of each month."
            checked={reconciliationReminders}
            onChange={setReconciliationReminders}
          />
        </div>
      </SectionCard>

      {/* ── Dashboard Preferences ─────────────────────── */}
      <SectionCard
        title="Dashboard Preferences"
        description="Personalize your dashboard visibility and overview behavior."
        icon={LayoutDashboard}
        iconColor="#A78BFA"
        iconBg="rgba(108,58,237,0.15)"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 pb-5 mb-1 border-b border-[#1E2B42]">
          <PrefSelect label="Default Landing Page" value={defaultLanding} onValueChange={setDefaultLanding} options={LANDING_PAGES} />
          <PrefSelect label="Dashboard Density" value={dashboardDensity} onValueChange={setDashboardDensity} options={DENSITIES} />
        </div>
        <div className="flex flex-col">
          <ToggleRow
            label="Compact dashboard mode"
            description="Reduce card sizes and spacing for a more information-dense view."
            checked={compactMode}
            onChange={setCompactMode}
          />
          <ToggleRow
            label="Show spending charts"
            description="Display spending breakdown charts on your dashboard overview."
            checked={showSpendingCharts}
            onChange={setShowSpendingCharts}
          />
          <ToggleRow
            label="Show recent transactions"
            description="Display the latest transactions widget on your dashboard."
            checked={showRecentTransactions}
            onChange={setShowRecentTransactions}
          />
          <ToggleRow
            label="Show savings goals"
            description="Display active savings goal progress on the dashboard."
            checked={showSavingsGoals}
            onChange={setShowSavingsGoals}
          />
        </div>
      </SectionCard>

      {/* ── Accessibility ─────────────────────────────── */}
      <SectionCard
        title="Accessibility"
        description="Improve readability and accessibility across the application."
        icon={Accessibility}
        iconColor="#FBBF24"
        iconBg="rgba(245,158,11,0.12)"
      >
        <div className="flex flex-col">
          <ToggleRow
            label="Reduce motion"
            description="Minimize animations and transitions throughout the interface."
            checked={reduceMotion}
            onChange={setReduceMotion}
          />
          <ToggleRow
            label="Larger text mode"
            description="Increase base font size for improved readability."
            checked={largerText}
            onChange={setLargerText}
          />
          <ToggleRow
            label="High contrast mode"
            description="Enhance visual contrast between foreground and background elements."
            checked={highContrast}
            onChange={setHighContrast}
          />
          <ToggleRow
            label="Keyboard navigation enhancements"
            description="Improve focus indicators and keyboard shortcut visibility across the app."
            checked={keyboardNav}
            onChange={setKeyboardNav}
          />
        </div>
      </SectionCard>

      {/* ── Data & Sync ───────────────────────────────── */}
      <SectionCard
        title="Data & Sync"
        description="Manage synchronization and local application behavior."
        icon={RefreshCw}
        iconColor="#C084FC"
        iconBg="rgba(168,85,247,0.12)"
      >
        <div className="flex flex-col pb-5 mb-1 border-b border-[#1E2B42]">
          <ToggleRow
            label="Auto sync"
            description="Automatically synchronize your data across devices in the background."
            checked={autoSync}
            onChange={setAutoSync}
          />
          <ToggleRow
            label="Offline mode"
            description="Allow the app to function without an internet connection using cached data."
            checked={offlineMode}
            onChange={setOfflineMode}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 pt-4">
          <PrefSelect
            label="Sync Frequency"
            value={syncFrequency}
            onValueChange={setSyncFrequency}
            options={SYNC_FREQUENCIES}
            disabled={!autoSync}
            helperText={!autoSync ? 'Enable auto sync to configure frequency.' : undefined}
          />
          <PrefSelect
            label="Local Cache Size"
            value={cacheSize}
            onValueChange={setCacheSize}
            options={CACHE_SIZES}
          />
        </div>
      </SectionCard>

      {/* ── Footer actions ────────────────────────────── */}
      <div className="flex items-center justify-between pt-1 pb-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
          <RotateCcw size={13} />
          Reset to Defaults
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          className={cn(
            'gap-1.5 transition-all',
            saved
              ? 'bg-[#22C55E] hover:bg-[#16A34A] text-white'
              : 'bg-[#6C3AED] hover:bg-[#5B2FD0] text-white',
          )}
        >
          {saved && <Check size={13} />}
          {saved ? 'Saved!' : 'Save Preferences'}
        </Button>
      </div>

    </div>
  )
}
