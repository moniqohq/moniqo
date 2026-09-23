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

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { SectionCard } from "@/components/shared/SectionCard";
import { PrefCard, PrefSelect } from "./primitives";
import { Button } from "@/components/ui/button";
import { dateFormatOptions, formatWithToken, type DateFormatToken } from "@/lib/date-format";
import { usePreferencesStore } from "@/stores/preferences.store";
import { useAuthStore } from "@/stores/auth.store";
import { patchUser } from "@/lib/api/users";
import { ApiError } from "@/lib/api-client";

// Common IANA timezones. Not exhaustive — Intl.supportedValuesOf("timeZone")
// would be, but that API isn't available in every runtime we target yet.
const TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
];

export function DateSettingsView() {
  const storeUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const dateFormat = usePreferencesStore((s) => s.dateFormat);
  const timezone = usePreferencesStore((s) => s.timezone);
  const setPreferences = usePreferencesStore((s) => s.setPreferences);

  const detectedTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [draftFormat, setDraftFormat] = useState<DateFormatToken>(dateFormat);
  const [draftTz, setDraftTz] = useState(timezone ?? detectedTz);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const options = dateFormatOptions().map((o) => ({ value: o.value, label: o.preview }));
  const tzOptions = Array.from(new Set([draftTz, ...TIMEZONES])).map((tz) => ({
    value: tz,
    label: tz,
  }));

  const dirty = draftFormat !== dateFormat || draftTz !== (timezone ?? detectedTz);

  async function handleSave() {
    if (!storeUser) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await patchUser(storeUser.id, {
        date_format: draftFormat,
        timezone: draftTz,
      });
      setUser(updated);
      setPreferences({ dateFormat: updated.date_format, timezone: updated.timezone });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save date preferences.");
    } finally {
      setSaving(false);
    }
  }

  const now = new Date();

  return (
    <SectionCard
      title="Date & Time"
      description="Choose how dates and your timezone are displayed across Moniqo."
      icon={CalendarDays}
      iconColor="#60A5FA"
      iconBg="rgba(59,130,246,0.12)"
    >
      <div className="flex flex-col gap-4">
        <PrefCard>
          <div className="flex flex-col gap-4">
            <PrefSelect
              label="Date format"
              value={draftFormat}
              onValueChange={(v) => setDraftFormat(v as DateFormatToken)}
              options={options}
            />
            <PrefSelect
              label="Timezone"
              value={draftTz}
              onValueChange={setDraftTz}
              options={tzOptions}
            />
          </div>
        </PrefCard>

        <PrefCard>
          <p className="mb-2 text-[11px] font-medium tracking-wider text-[#5A6A85] uppercase">
            Preview
          </p>
          <p className="text-[15px] font-semibold text-white">
            {formatWithToken(draftFormat, now)}
          </p>
        </PrefCard>

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
            {saving ? "Saving…" : "Save date & time"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
