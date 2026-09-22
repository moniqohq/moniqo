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
import { Wallet2, CheckCircle2, Trash2, AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/shared/SectionCard";
import { PrefCard, PrefSelect } from "./primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBudgets } from "@/hooks/use-budgets";
import { useUIStore } from "@/stores/ui.store";
import { patchBudget, deleteBudget } from "@/lib/api/budget";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

export function BudgetSettingsView() {
  const { data: budgets, isLoading, refetch } = useBudgets();
  const activeBudgetId = useUIStore((s) => s.activeBudgetId);
  const setActiveBudget = useUIStore((s) => s.setActiveBudget);

  const activeBudget = budgets.find((b) => b.id === activeBudgetId) ?? budgets[0];

  const [draftBudgetId, setDraftBudgetId] = useState(activeBudget?.id);
  const [name, setName] = useState(activeBudget?.name ?? "");
  const [notes, setNotes] = useState(activeBudget?.notes ?? "");
  if (activeBudget && draftBudgetId !== activeBudget.id) {
    setDraftBudgetId(activeBudget.id);
    setName(activeBudget.name);
    setNotes(activeBudget.notes ?? "");
  }
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (isLoading) {
    return (
      <SectionCard title="Budget Settings" icon={Wallet2} iconColor="#34D399" iconBg="rgba(34,197,94,0.12)">
        <p className="text-[13px] text-[#5A6A85]">Loading budget…</p>
      </SectionCard>
    );
  }

  if (!activeBudget) {
    return (
      <SectionCard title="Budget Settings" icon={Wallet2} iconColor="#34D399" iconBg="rgba(34,197,94,0.12)">
        <p className="text-[13px] text-[#5A6A85]">No budget selected yet.</p>
      </SectionCard>
    );
  }

  const dirty = name !== activeBudget.name || notes !== (activeBudget.notes ?? "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await patchBudget(activeBudget.id, { title: name, notes: notes || null });
      await refetch();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save budget settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteBudget(activeBudget.id);
      const remaining = budgets.filter((b) => b.id !== activeBudget.id);
      if (remaining[0]) setActiveBudget(remaining[0].id);
      await refetch();
      setConfirmingDelete(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete budget.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        title="Budget Settings"
        description="Rename this budget or switch to a different one."
        icon={Wallet2}
        iconColor="#34D399"
        iconBg="rgba(34,197,94,0.12)"
      >
        <div className="flex flex-col gap-4">
          {budgets.length > 1 && (
            <PrefCard>
              <PrefSelect
                label="Active budget"
                value={String(activeBudget.id)}
                onValueChange={(v) => setActiveBudget(Number(v))}
                options={budgets.map((b) => ({ value: String(b.id), label: b.name }))}
              />
            </PrefCard>
          )}

          <PrefCard>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] font-medium tracking-wider text-[#5A6A85] uppercase">
                  Budget name
                </Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="text-[13px]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] font-medium tracking-wider text-[#5A6A85] uppercase">
                  Notes
                </Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="text-[13px]" />
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-[#5A6A85]">
                <span>Created {formatDate(activeBudget.createdAt, "medium")}</span>
              </div>
            </div>
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
              disabled={!dirty || saving || !name.trim()}
              className="bg-[#6C3AED] text-white hover:bg-[#5B2FD0]"
              onClick={handleSave}
            >
              {saving ? "Saving…" : "Save budget"}
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Danger Zone"
        description="Deleting a budget soft-deletes it — transactions are preserved for audit, but the budget and its accounts/envelopes are archived."
        icon={AlertTriangle}
        iconColor="#F87171"
        iconBg="rgba(248,113,113,0.12)"
      >
        {!confirmingDelete ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-[rgba(248,113,113,0.4)] text-[#F87171] hover:bg-[rgba(248,113,113,0.1)]"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 size={13} />
            Delete this budget
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-[#A8B4CC]">
              Are you sure you want to delete <span className="font-semibold text-white">{activeBudget.name}</span>?
              This cannot be undone from the UI.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#F87171] text-white hover:bg-[#EF4444]"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Confirm delete"}
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
