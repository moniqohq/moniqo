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
import { Wallet, CheckCircle2, AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/shared/SectionCard";
import { PrefCard, PrefSelect } from "./primitives";
import { Button } from "@/components/ui/button";
import { CURRENCIES, getCurrency } from "@/lib/currency";
import { usePreferencesStore } from "@/stores/preferences.store";
import { useAuthStore } from "@/stores/auth.store";
import { patchUser } from "@/lib/api/users";
import { ApiError } from "@/lib/api-client";

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.code, label: c.label }));

export function CurrencySettingsView() {
  const storeUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const currency = usePreferencesStore((s) => s.currency);
  const setPreferences = usePreferencesStore((s) => s.setPreferences);

  const [draft, setDraft] = useState(currency);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const preview = getCurrency(draft);
  const dirty = draft !== currency;

  async function handleSave() {
    if (!storeUser) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await patchUser(storeUser.id, { currency: draft });
      setUser(updated);
      setPreferences({ currency: updated.currency });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save currency preference.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Currency & Money"
      description="Choose how monetary values are displayed across Moniqo."
      icon={Wallet}
      iconColor="#34D399"
      iconBg="rgba(34,197,94,0.12)"
    >
      <div className="flex flex-col gap-4">
        <PrefCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xs flex-1">
              <PrefSelect
                label="Display currency"
                value={draft}
                onValueChange={setDraft}
                options={CURRENCY_OPTIONS}
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium tracking-wider text-[#5A6A85] uppercase">
                Preview
              </p>
              <p className="text-[15px] font-semibold text-white">
                {preview.symbol} 1,23,456
              </p>
            </div>
          </div>
        </PrefCard>

        <div className="flex items-start gap-2.5 rounded-xl border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] p-3.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#FBBF24]" />
          <p className="text-[12px] leading-relaxed text-[#A8B4CC]">
            Changing your currency only relabels amounts already in Moniqo — it does not convert
            them. If you switch from INR to USD, a balance of ₹50,000 will display as $50,000.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#1E2B42] pt-4">
          {error && <p className="mr-auto text-[12px] text-red-400">{error}</p>}
          {saved && !dirty && (
            <span className="mr-auto flex items-center gap-1.5 text-[12px] text-[#22C55E]">
              <CheckCircle2 size={13} />
              Saved
            </span>
          )}
          <Button
            size="sm"
            disabled={!dirty || saving}
            className="bg-[#6C3AED] text-white hover:bg-[#5B2FD0]"
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save currency"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
