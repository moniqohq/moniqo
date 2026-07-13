/*
 * Moniqo is a personal finance management application designed to help users
 * track, manage, and optimize their financial activities.
 *
 * Copyright (C) 2026 Moniqo <support@moniqo.in>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { Receipt, Wallet, Package, Layers, Search, Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useUIStore } from "@/stores/ui.store";
import { useSearch, MIN_SEARCH_LEN } from "@/hooks/use-search";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

/**
 * Global ⌘K command palette. Searches the active budget's transactions,
 * accounts and envelopes plus the user's budgets, and navigates to the chosen
 * result (or switches the active budget). Open state lives in the UI store so
 * the Topbar trigger and the global keyboard shortcut can both control it.
 */
export function CommandPalette() {
  const router = useRouter();
  const open = useUIStore((s) => s.searchOpen);
  const setOpen = useUIStore((s) => s.setSearchOpen);
  const activeBudgetId = useUIStore((s) => s.activeBudgetId);
  const setActiveBudget = useUIStore((s) => s.setActiveBudget);

  const [query, setQuery] = useState("");
  const { results, isLoading, isActive } = useSearch(activeBudgetId, query);

  // Reset the query on close so the palette always reopens clean. Handles both
  // user-driven closes (Esc / backdrop, via onOpenChange) and programmatic ones.
  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery("");
    setOpen(next);
  };

  const close = () => handleOpenChange(false);

  const go = (path: string) => {
    close();
    router.push(path);
  };

  const switchBudget = (id: number) => {
    setActiveBudget(id);
    close();
    router.push("/dashboard");
  };

  const { transactions, accounts, envelopes, budgets } = results;
  const hasResults =
    transactions.length > 0 || accounts.length > 0 || envelopes.length > 0 || budgets.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-xl gap-0 overflow-hidden border border-[#1E2B42] bg-[#0B111C] p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search transactions, accounts, envelopes and budgets.
        </DialogDescription>

        <Command shouldFilter={false} loop className="flex max-h-[60vh] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#1E2B42] px-4">
            <Search size={16} className="shrink-0 text-[#5A6A85]" />
            <CommandInput
              value={query}
              onValueChange={setQuery}
              autoFocus
              placeholder="Search transactions, accounts, envelopes, budgets…"
              className="flex-1 bg-transparent py-3.5 text-sm text-[#E4EAF3] placeholder:text-[#3B4A63] focus:outline-none"
            />
            {isLoading && <Loader2 size={15} className="shrink-0 animate-spin text-[#5A6A85]" />}
          </div>

          <CommandList className="overflow-y-auto p-2">
            {!isActive && (
              <p className="px-3 py-6 text-center text-sm text-[#5A6A85]">
                Type at least {MIN_SEARCH_LEN} characters to search.
              </p>
            )}

            {isActive && !isLoading && !hasResults && (
              <CommandEmpty className="px-3 py-6 text-center text-sm text-[#5A6A85]">
                No results found.
              </CommandEmpty>
            )}

            {transactions.length > 0 && (
              <CommandGroup
                heading="Transactions"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[#5A6A85]"
              >
                {transactions.map((t) => (
                  <PaletteItem
                    key={`txn-${t.id}`}
                    value={`txn-${t.id}`}
                    onSelect={() => go("/transactions")}
                    icon={<Receipt size={15} className="text-[#6C3AED]" />}
                    label={t.memo?.trim() || t.account_name}
                    sub={[t.account_name, t.envelope_title].filter(Boolean).join(" · ")}
                    right={
                      <span className={cn(t.amount < 0 ? "text-[#F27289]" : "text-[#3FD8A4]")}>
                        {formatCurrency(t.amount)}
                      </span>
                    }
                    meta={formatDate(t.date, "short")}
                  />
                ))}
              </CommandGroup>
            )}

            {accounts.length > 0 && (
              <CommandGroup
                heading="Accounts"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[#5A6A85]"
              >
                {accounts.map((a) => (
                  <PaletteItem
                    key={`acct-${a.id}`}
                    value={`acct-${a.id}`}
                    onSelect={() => go("/accounts")}
                    icon={<Wallet size={15} className="text-[#3B82F6]" />}
                    label={a.name}
                    sub={a.institution ?? undefined}
                  />
                ))}
              </CommandGroup>
            )}

            {envelopes.length > 0 && (
              <CommandGroup
                heading="Envelopes"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[#5A6A85]"
              >
                {envelopes.map((e) => (
                  <PaletteItem
                    key={`env-${e.id}`}
                    value={`env-${e.id}`}
                    onSelect={() => go("/envelopes")}
                    icon={<Package size={15} className="text-[#F5A623]" />}
                    label={e.title}
                  />
                ))}
              </CommandGroup>
            )}

            {budgets.length > 0 && (
              <CommandGroup
                heading="Budgets"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[#5A6A85]"
              >
                {budgets.map((b) => (
                  <PaletteItem
                    key={`bud-${b.id}`}
                    value={`bud-${b.id}`}
                    onSelect={() => switchBudget(b.id)}
                    icon={<Layers size={15} className="text-[#3FD8A4]" />}
                    label={b.title}
                    sub={b.id === activeBudgetId ? "Current budget" : "Switch to this budget"}
                    meta={b.role.toLowerCase()}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

interface PaletteItemProps {
  value: string;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  meta?: string;
}

function PaletteItem({ value, onSelect, icon, label, sub, right, meta }: PaletteItemProps) {
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-[#A8B4CC] data-[selected=true]:bg-[#131C2E] data-[selected=true]:text-white"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#0F1623]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[#E4EAF3]">{label}</span>
        {sub && <span className="block truncate text-xs text-[#5A6A85]">{sub}</span>}
      </span>
      {right && <span className="shrink-0 font-mono text-sm">{right}</span>}
      {meta && <span className="shrink-0 text-xs text-[#3B4A63]">{meta}</span>}
    </CommandItem>
  );
}
