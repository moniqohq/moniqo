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

import { CheckCircle2, ChevronDown, Circle, RotateCcw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  count: number;
  onClear: () => void;
  onMarkCleared: () => void;
  onMarkUncleared: () => void;
  onMarkReconciled: () => void;
  onDelete: () => void;
  /** True while a bulk action's requests are in flight. */
  loading: boolean;
}

/**
 * Rendered in the transactions filter bar only while one or more rows are
 * selected. Every action here is composed from the same single-transaction
 * operations already exposed in the per-row menu (TxRow) — there is no
 * separate bulk API.
 */
export function BulkActionsBar({
  count,
  onClear,
  onMarkCleared,
  onMarkUncleared,
  onMarkReconciled,
  onDelete,
  loading,
}: Props) {
  return (
    <div className="flex w-full items-center gap-3 border-b border-[#131E30] bg-[rgba(108,58,237,0.06)] px-4 py-2.5">
      <span className="text-sm font-medium text-[#C8D4E8]">{count} selected</span>
      <button
        onClick={onClear}
        disabled={loading}
        className="inline-flex items-center gap-1 text-sm text-[#6C3AED] transition-colors hover:text-[#7C4AFF] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <X size={12} />
        Clear
      </button>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-[#1A2640] px-3 py-1.5 text-sm text-[#A8B4CC]",
              "bg-[#080D1A] hover:border-[#2A3A54] hover:text-white",
              "focus:ring-2 focus:ring-[#6C3AED]/25 focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {loading ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : null}
            {loading ? "Applying…" : "Actions"}
            <ChevronDown size={11} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 border border-[#1A2640] bg-[#0D1B2E]">
            <DropdownMenuItem onClick={onMarkCleared}>
              <CheckCircle2 size={14} />
              Mark as cleared
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMarkUncleared}>
              <Circle size={14} />
              Mark as uncleared
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMarkReconciled}>
              <RotateCcw size={14} />
              Mark as reconciled
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 size={14} />
              Delete {count}…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
