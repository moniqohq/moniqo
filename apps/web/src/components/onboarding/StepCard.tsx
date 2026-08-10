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

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  error?: string | null;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  submitting?: boolean;
  hideNext?: boolean;
}

export function StepCard({
  title,
  description,
  children,
  error,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  submitting,
  hideNext,
}: StepCardProps) {
  return (
    <div
      className="w-full rounded-2xl border border-[#1E2B42] bg-[#0A1120] p-6 shadow-2xl shadow-black/60 sm:p-8"
      style={{ background: "rgba(13, 18, 32, 0.9)" }}
    >
      <h1 className="mb-1.5 text-xl font-bold text-white sm:text-2xl">{title}</h1>
      {description && <p className="mb-6 text-sm text-[#5A6A85]">{description}</p>}

      <div className="space-y-5">{children}</div>

      {error && (
        <p className="mt-4 rounded-lg bg-[#F87171]/10 px-3.5 py-2.5 text-sm text-[#F87171]">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-[#1E2B42] px-4 py-2.5 text-sm font-medium text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white"
          >
            Back
          </button>
        ) : (
          <span />
        )}

        {!hideNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || submitting}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all",
              "bg-gradient-to-r from-[#7C4AFF] to-[#6333E8] shadow-[0_0_20px_rgba(108,58,237,0.4)] hover:opacity-95",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
