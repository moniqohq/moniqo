"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Building2,
  PiggyBank,
  CreditCard,
  Wallet,
  Landmark,
  CalendarDays,
  ChevronDown,
  Info,
  AlertCircle,
  CheckCircle2,
  MinusCircle,
  Shield,
  Timer,
  FileText,
  Star,
  Plus,
  Sparkles,
  Lock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── types ────────────────────────────────────────────── */

type AccountType = "checking" | "savings" | "credit" | "cash" | "loan";

export interface AddAccountModalProps {
  open: boolean;
  onClose: () => void;
}

/* ── constants ────────────────────────────────────────── */

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: React.ElementType }[] = [
  { type: "checking", label: "Checking", icon: Building2 },
  { type: "savings", label: "Savings", icon: PiggyBank },
  { type: "credit", label: "Credit Card", icon: CreditCard },
  { type: "cash", label: "Cash", icon: Wallet },
  { type: "loan", label: "Loan", icon: Landmark },
];

const TYPE_INFO: Record<AccountType, { title: string; description: string }> = {
  checking: {
    title: "Everyday spending and income account.",
    description: "Ideal for salary deposits, bills, and day-to-day purchases.",
  },
  savings: {
    title: "Long-term savings and emergency fund.",
    description: "Earn interest and grow your savings over time.",
  },
  credit: {
    title: "Credit card balance and payment tracking.",
    description: "Monitor your credit limit, spending, and due payments.",
  },
  cash: {
    title: "Physical cash and petty cash management.",
    description: "Track cash in hand, wallets, and small day-to-day expenses.",
  },
  loan: {
    title: "Loan, mortgage, and debt tracking.",
    description: "Monitor outstanding balance and scheduled repayments.",
  },
};

const TYPE_COLORS: Record<AccountType, { icon: string; bg: string }> = {
  checking: { icon: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  savings: { icon: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  credit: { icon: "#F87171", bg: "rgba(248,113,113,0.12)" },
  cash: { icon: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  loan: { icon: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
};

/* ── ToggleSwitch ─────────────────────────────────────── */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40",
        checked
          ? "bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] shadow-[0_0_12px_rgba(108,58,237,0.5)]"
          : "bg-[#1E2B42]",
      )}
    >
      <span
        className="inline-block rounded-full bg-white shadow transition-transform duration-200"
        style={{
          width: 18,
          height: 18,
          transform: checked ? "translateX(22px)" : "translateX(3px)",
        }}
      />
    </button>
  );
}

/* ── AccountTypeCard ──────────────────────────────────── */

function AccountTypeCard({
  type,
  label,
  icon: Icon,
  selected,
  onClick,
}: {
  type: AccountType;
  label: string;
  icon: React.ElementType;
  selected: boolean;
  onClick: () => void;
}) {
  const colors = TYPE_COLORS[type];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-1.5 py-3 transition-all duration-200 focus:outline-none",
        selected
          ? "border-[#6C3AED] bg-[#120A24] shadow-[0_0_18px_rgba(108,58,237,0.32),inset_0_1px_0_rgba(108,58,237,0.2)]"
          : "border-[#1E2B42] bg-[#0D1525] hover:border-[#3A4A62] hover:bg-[#111B2D] hover:shadow-[0_0_10px_rgba(108,58,237,0.1)]",
      )}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          backgroundColor: selected ? colors.bg : "rgba(255,255,255,0.04)",
          color: selected ? colors.icon : "#4A5A75",
        }}
      >
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <span
        className={cn(
          "text-center text-[11px] font-medium leading-tight",
          selected ? "text-[#C4B5FD]" : "text-[#5A6A85]",
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}

/* ── ToggleSettingRow ─────────────────────────────────── */

function ToggleSettingRow({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  checked,
  onChange,
  badge,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#1E2B42] bg-[#0D1525] p-3.5 transition-colors hover:border-[#2A3A54]">
      <div
        className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        <Icon size={16} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-white">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-[#7A8BA8]">{description}</p>
        )}
        {badge && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[#3D2870] bg-[#1E1030] px-2 py-0.5 text-[10px] font-semibold text-[#A78BFA]">
            <Star size={8} fill="#A78BFA" />
            {badge}
          </span>
        )}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

/* ── PreviewPanel ─────────────────────────────────────── */

function PreviewRow({
  label,
  enabled,
  enabledText,
  enabledDesc,
  disabledText,
  disabledDesc,
}: {
  label: string;
  enabled: boolean;
  enabledText: string;
  enabledDesc: string;
  disabledText: string;
  disabledDesc: string;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-[#8A9BB5]">{label}</p>
      <div className="flex items-center gap-1.5">
        {enabled ? (
          <CheckCircle2 size={14} className="text-[#22C55E]" />
        ) : (
          <MinusCircle size={14} className="text-[#3D4E65]" />
        )}
        <span
          className={cn("text-sm font-semibold", enabled ? "text-[#4ADE80]" : "text-[#4A5A75]")}
        >
          {enabled ? enabledText : disabledText}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] leading-relaxed text-[#8A9BB5]">
        {enabled ? enabledDesc : disabledDesc}
      </p>
    </div>
  );
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function PreviewPanel({
  accountName,
  accountType,
  initialBalance,
  balanceDate,
  includeInBudget,
  reconciliation,
  immutability,
}: {
  accountName: string;
  accountType: AccountType;
  initialBalance: string;
  balanceDate: string;
  includeInBudget: boolean;
  reconciliation: boolean;
  immutability: boolean;
}) {
  const TypeIcon = ACCOUNT_TYPES.find((t) => t.type === accountType)?.icon ?? Building2;
  const label = ACCOUNT_TYPES.find((t) => t.type === accountType)?.label ?? "Account";
  const numBal = parseFloat(initialBalance.replace(/,/g, "")) || 0;
  const balStr = `₹${numBal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const colors = TYPE_COLORS[accountType];
  const rgb = hexToRgb(colors.icon);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(160deg, #111C30 0%, #0D1525 60%, #0B1120 100%)",
        border: `1px solid rgba(${rgb},0.15)`,
        boxShadow: `0 0 0 1px rgba(${rgb},0.1), inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Subtle top radial highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl"
        style={{
          background: `linear-gradient(to right, transparent, rgba(${rgb},0.4), transparent)`,
        }}
      />

      {/* Header */}
      <div className="border-b border-white/[0.05] px-4 py-3">
        <p className="text-sm font-bold text-white">Account preview</p>
      </div>

      {/* Identity */}
      <div className="flex flex-col items-center gap-2 border-b border-white/[0.05] px-4 pb-4 pt-5">
        <motion.div
          key={accountType}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 300 }}
          className="flex h-[60px] w-[60px] items-center justify-center rounded-full"
          style={{
            backgroundColor: colors.bg,
            border: `2px solid rgba(${rgb},0.45)`,
            boxShadow: `0 0 28px rgba(${rgb},0.45), inset 0 1px 0 rgba(255,255,255,0.1)`,
          }}
        >
          <TypeIcon size={26} strokeWidth={1.5} style={{ color: colors.icon }} />
        </motion.div>
        <div className="text-center">
          <p className="mt-1 text-base font-bold text-white">
            {accountName.trim() || `${label} Account`}
          </p>
          <span
            className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
            style={{
              color: colors.icon,
              backgroundColor: colors.bg,
              border: `1px solid rgba(${rgb},0.35)`,
            }}
          >
            New account
          </span>
        </div>
      </div>

      {/* Info rows */}
      <div className="space-y-3 px-4 pb-1 pt-3">
        {/* Initial balance */}
        <div>
          <p className="mb-0.5 text-[11px] font-medium text-[#8A9BB5]">Initial balance</p>
          <motion.p
            key={balStr}
            initial={{ opacity: 0.7, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "text-xl font-bold tabular-nums",
              numBal < 0 ? "text-[#F87171]" : "text-[#4ADE80]",
            )}
          >
            {balStr}
          </motion.p>
          <p className="mt-0.5 text-[10px] text-[#4A5A75]">As of {balanceDate}</p>
        </div>

        <div className="h-px bg-white/[0.05]" />

        <PreviewRow
          label="Included in budget"
          enabled={includeInBudget}
          enabledText="Yes"
          enabledDesc="Affects available cash and allocations"
          disabledText="No"
          disabledDesc="Tracked separately from budget"
        />

        <div className="h-px bg-white/[0.05]" />

        <PreviewRow
          label="Reconciliation"
          enabled={reconciliation}
          enabledText="Enabled"
          enabledDesc="Statement tracking and cleared balances"
          disabledText="Disabled"
          disabledDesc="Reconciliation not active"
        />

        <div className="h-px bg-white/[0.05]" />

        <PreviewRow
          label="Immutability"
          enabled={immutability}
          enabledText="Enabled"
          enabledDesc="Transactions locked and cannot be deleted"
          disabledText="Disabled"
          disabledDesc="Transactions can be modified"
        />
      </div>

      {/* Security notes */}
      <div
        className="mx-3 mb-3 mt-3 space-y-2 rounded-xl px-3 py-2.5"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div className="flex items-start gap-2">
          <Shield size={11} className="mt-0.5 flex-shrink-0 text-[#6C3AED]" />
          <p className="text-[10px] leading-relaxed text-[#8A9BB5]">
            Accounts belong to this budget.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <RefreshCw size={11} className="mt-0.5 flex-shrink-0 text-[#22C55E]" />
          <p className="text-[10px] leading-relaxed text-[#8A9BB5]">
            Unspent balance carries over to the next month.
          </p>
        </div>
        {immutability && (
          <div className="flex items-start gap-2">
            <Lock size={11} className="mt-0.5 flex-shrink-0 text-[#EC4899]" />
            <p className="text-[10px] leading-relaxed text-[#8A9BB5]">
              All transactions are permanent and cannot be deleted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main modal ───────────────────────────────────────── */

export function AddAccountModal({ open, onClose }: AddAccountModalProps) {
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("checking");
  const [initialBalance, setInitialBalance] = useState("");
  const [balanceDate] = useState("May 15, 2026");
  const [includeInBudget, setIncludeInBudget] = useState(true);
  const [reconciliation, setReconciliation] = useState(true);
  const [immutability, setImmutability] = useState(false);
  const [notes, setNotes] = useState("");
  const [nameError, setNameError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleCreate = () => {
    if (!accountName.trim()) {
      setNameError(true);
      return;
    }
    onClose();
  };

  const handleReset = () => {
    setAccountName("");
    setAccountType("checking");
    setInitialBalance("");
    setIncludeInBudget(true);
    setReconciliation(true);
    setImmutability(false);
    setNotes("");
    setNameError(false);
  };

  const typeInfo = TYPE_INFO[accountType];
  const TypeIcon = ACCOUNT_TYPES.find((t) => t.type === accountType)?.icon ?? Building2;
  const typeColors = TYPE_COLORS[accountType];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 30, stiffness: 380 }}
              className="relative my-auto w-full max-w-[800px] overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120] shadow-[0_0_0_1px_rgba(108,58,237,0.12),0_32px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(108,58,237,0.08)]"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Add Account"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6C3AED]/40 to-transparent" />

              {/* ── Header ── */}
              <div className="flex items-start justify-between border-b border-[#111B2D] px-6 pb-4 pt-5">
                <div>
                  <h2 className="text-[1.35rem] font-bold leading-tight text-white">Add Account</h2>
                  <p className="mt-0.5 text-sm text-[#4A5A75]">
                    Create a financial account inside this budget
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-full border border-[#3A2A00] bg-[#1A1200] px-3 py-1.5">
                    <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-amber-400" />
                    <span className="whitespace-nowrap text-xs font-medium text-amber-400">
                      Unsaved changes
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A5A75] transition-colors hover:bg-[#1A2540] hover:text-white focus:outline-none"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* ── Body (scrollable) ── */}
              <div className="flex max-h-[calc(100vh-160px)] gap-5 overflow-y-auto px-6 py-4">
                {/* LEFT COLUMN */}
                <div className="min-w-0 flex-1 space-y-4">
                  {/* Section label */}
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7A8BA8]">
                    Account identity
                  </p>

                  {/* Account name */}
                  <div className="-mt-1">
                    <label className="mb-1.5 block text-sm font-medium text-[#C8D4E4]">
                      Account name
                    </label>
                    <div className="relative">
                      {nameError && (
                        <AlertCircle
                          size={15}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F87171]"
                        />
                      )}
                      <input
                        value={accountName}
                        onChange={(e) => {
                          setAccountName(e.target.value);
                          if (e.target.value.trim()) setNameError(false);
                        }}
                        placeholder="e.g., HDFC Salary Account"
                        className={cn(
                          "w-full rounded-xl bg-[#0D1525] py-2.5 text-sm text-white transition-all placeholder:text-[#2A3A54] focus:outline-none",
                          nameError
                            ? "border border-[#F87171]/60 pl-10 pr-3 ring-2 ring-[#F87171]/20"
                            : "border border-[#1E2B42] px-3 focus:border-[#6C3AED] focus:ring-2 focus:ring-[#6C3AED]/40",
                        )}
                      />
                    </div>
                    {nameError && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-[#F87171]">
                        <AlertCircle size={11} />
                        Account name is required
                      </p>
                    )}
                  </div>

                  {/* Account type */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#C8D4E4]">
                      Account type
                    </label>
                    <div className="flex gap-2">
                      {ACCOUNT_TYPES.map(({ type, label, icon }) => (
                        <AccountTypeCard
                          key={type}
                          type={type}
                          label={label}
                          icon={icon}
                          selected={accountType === type}
                          onClick={() => setAccountType(type)}
                        />
                      ))}
                    </div>

                    <motion.div
                      key={accountType}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="mt-2 flex items-start gap-3 rounded-xl border border-[#1E2B42] bg-[#0D1525] px-3.5 py-2.5"
                    >
                      <div
                        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: typeColors.bg, color: typeColors.icon }}
                      >
                        <TypeIcon size={14} strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight text-[#E8EEF8]">
                          {typeInfo.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#5C6E8A]">
                          {typeInfo.description}
                        </p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Initial balance */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(108,58,237,0.07) 0%, rgba(13,16,32,0.95) 100%)",
                      border: "1px solid rgba(108,58,237,0.28)",
                      boxShadow:
                        "0 0 24px rgba(108,58,237,0.1), inset 0 1px 0 rgba(108,58,237,0.1)",
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md border border-[#3D2870] bg-[#1A0E30]">
                        <Info size={12} className="text-[#8B5CF6]" />
                      </div>
                      <p className="text-sm font-semibold text-white">Initial balance</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[#A8B4CC]">
                          Initial balance
                        </label>
                        <div className="relative flex items-center rounded-xl border border-[#1A2540] bg-[#0B1120] transition-all focus-within:border-[#6C3AED] focus-within:ring-2 focus-within:ring-[#6C3AED]/40">
                          <span className="flex-shrink-0 pl-3 pr-1 text-sm text-[#4A5A75]">₹</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={initialBalance}
                            onChange={(e) =>
                              setInitialBalance(e.target.value.replace(/[^0-9.]/g, ""))
                            }
                            placeholder="0.00"
                            className="flex-1 bg-transparent py-2.5 pr-3 text-sm tabular-nums text-white placeholder:text-[#2A3A54] focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[#A8B4CC]">
                          As of date
                        </label>
                        <button className="flex w-full items-center gap-2 rounded-xl border border-[#1A2540] bg-[#0B1120] px-3 py-2.5 text-sm transition-colors hover:border-[#2A3A54] focus:outline-none">
                          <CalendarDays size={13} className="flex-shrink-0 text-[#4A5A75]" />
                          <span className="flex-1 text-left text-sm text-white">{balanceDate}</span>
                          <ChevronDown size={12} className="flex-shrink-0 text-[#4A5A75]" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-start gap-2">
                      <Sparkles size={12} className="mt-0.5 flex-shrink-0 text-[#7C3AED]" />
                      <div>
                        <p className="text-xs leading-relaxed text-[#A8B4CC]">
                          An opening balance transaction will be created automatically.
                        </p>
                        <p className="mt-0.5 text-[10px] text-[#4A5A75]">
                          Balances are calculated from transactions and cannot be edited directly.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Settings rows */}
                  <div className="space-y-2">
                    <ToggleSettingRow
                      icon={Timer}
                      iconColor="#8B5CF6"
                      iconBg="rgba(139,92,246,0.12)"
                      title="Include in budget"
                      description="On-budget accounts affect available cash calculations."
                      checked={includeInBudget}
                      onChange={setIncludeInBudget}
                    />
                    <ToggleSettingRow
                      icon={FileText}
                      iconColor="#6C3AED"
                      iconBg="rgba(108,58,237,0.12)"
                      title="Enable reconciliation workflow"
                      description="Track cleared balances and reconcile statements."
                      checked={reconciliation}
                      onChange={setReconciliation}
                      badge="Recommended"
                    />
                    <ToggleSettingRow
                      icon={Lock}
                      iconColor="#EC4899"
                      iconBg="rgba(236,72,153,0.12)"
                      title="Lock transactions (Prevent editing)"
                      description="Prevent future edits or deletions to transactions for this account."
                      checked={immutability}
                      onChange={setImmutability}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#C8D4E4]">
                      Notes <span className="font-normal text-[#3D4E65]">(optional)</span>
                    </label>
                    <div className="relative">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                        placeholder="Optional notes about this account…"
                        rows={3}
                        className="w-full resize-none rounded-xl border border-[#252F42] bg-[#0D1525] px-3 py-2.5 text-sm text-white transition-all placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40"
                      />
                      <span className="absolute bottom-2.5 right-3 text-[10px] tabular-nums text-[#2A3A54]">
                        {notes.length} / 200
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN — preview */}
                <div className="relative w-[215px] flex-shrink-0">
                  <PreviewPanel
                    accountName={accountName}
                    accountType={accountType}
                    initialBalance={initialBalance}
                    balanceDate={balanceDate}
                    includeInBudget={includeInBudget}
                    reconciliation={reconciliation}
                    immutability={immutability}
                  />
                </div>
              </div>

              {/* ── Footer ── */}
              <div
                className="flex items-center justify-between px-6 py-3.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              >
                <button
                  onClick={onClose}
                  className="rounded-xl border border-[#1A2540] bg-transparent px-5 py-2 text-sm font-semibold text-[#A8B4CC] transition-all hover:bg-[#0D1525] hover:text-white focus:outline-none"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="rounded-xl border border-[#1A2540] bg-transparent px-5 py-2 text-sm font-semibold text-[#A8B4CC] transition-all hover:bg-[#0D1525] hover:text-white focus:outline-none"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5B21B6] to-[#6C3AED] px-6 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(108,58,237,0.45)] transition-all hover:from-[#6C3AED] hover:to-[#7C4AFF] hover:shadow-[0_0_32px_rgba(108,58,237,0.6)] focus:outline-none focus:ring-4 focus:ring-[#6C3AED]/30"
                  >
                    <Plus size={15} />
                    Create Account
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
