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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Eye, EyeOff, Lock, User as UserIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth.store";
import { deleteAccount } from "@/lib/api/users";
import { ApiError } from "@/lib/api-client";

// Deletion permanently removes the account and any budgets the user solely
// owns; budgets shared with other members are not touched by this dialog —
// the backend blocks deletion (409) until ownership is transferred. Deleted
// data leaves the live application immediately; it may still exist in
// database backups until the normal backup retention period expires.
const AFFECTED_DATA = [
  "Your profile and login credentials",
  "Budgets you solely own, and their accounts, envelopes, and transactions",
  "Goals and other personal data tied to your account",
  "All active sessions and connected sign-in methods",
];

function buildSchema(expectedUsername: string) {
  return z.object({
    username: z
      .string()
      .refine((v) => v === expectedUsername, { message: "Username doesn't match" }),
    password: z.string().min(1, "Required").max(72),
  });
}

type DeleteAccountFields = { username: string; password: string };

export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const schema = buildSchema(user?.username ?? "");
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeleteAccountFields>({ resolver: zodResolver(schema) });

  function handleClose() {
    if (isSubmitting) return;
    reset();
    setBannerMsg(null);
    setShowPassword(false);
    onClose();
  }

  async function onSubmit(data: DeleteAccountFields) {
    if (!user) return;
    setBannerMsg(null);
    try {
      await deleteAccount(user.id, data.password);
      clearAuth();
      router.push("/login");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("password", { message: "Current password is incorrect." });
        } else if (err.status === 401) {
          setBannerMsg("Your session has expired. Please log in again.");
        } else {
          // Covers 409 (no password credential set, or sole owner of a
          // shared budget — the backend names the blocking budget) and any
          // other failure.
          setBannerMsg(err.message);
        }
      } else {
        setBannerMsg("Something went wrong. Please check your connection and try again.");
      }
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] min-w-0 gap-0 overflow-hidden rounded-xl border-[rgba(239,68,68,0.25)] bg-[#0D1520] p-0 sm:max-w-[480px]"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4 border-b border-[#1E2B42] px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(239,68,68,0.12)]">
            <AlertTriangle size={18} className="text-[#F87171]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] leading-tight font-semibold text-white">Delete account</p>
            <p className="mt-0.5 text-[12px] text-[#5A6A85]">This action is permanent.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5A6A85] transition-all hover:bg-[#1E2B42] hover:text-[#A8B4CC]"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-5">
          <div className="rounded-xl border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.06)] px-4 py-3.5">
            <p className="text-[12px] leading-relaxed text-[#A8B4CC]">
              Deleting your account cannot be undone. The following will be removed from Moniqo
              immediately:
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {AFFECTED_DATA.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12px] text-[#A8B4CC]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#F87171]" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-[#5A6A85]">
              Budgets you share with other members are not deleted — you&apos;ll need to transfer
              ownership first. Removed data may still exist in backups until they expire under our
              normal retention schedule.
            </p>
          </div>

          {bannerMsg && (
            <div className="rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3.5 py-2.5 text-[12px] text-[#FCA5A5]">
              {bannerMsg}
            </div>
          )}

          {/* Type username to confirm */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#A8B4CC]">
              Type <span className="font-semibold text-white">{user.username}</span> to confirm
            </label>
            <div className="group relative">
              <UserIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#5A6A85]" />
              <input
                type="text"
                autoComplete="off"
                {...register("username")}
                className="h-11 w-full rounded-xl border border-[#1E2B42] bg-[#0A0E1A] pr-4 pl-10 text-sm text-[#E8EEF8] placeholder-[#5A6A85] transition-colors outline-none focus:border-[#6C3AED]"
              />
            </div>
            {errors.username && <p className="text-xs text-[#FCA5A5]">{errors.username.message}</p>}
          </div>

          {/* Current password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#A8B4CC]">Current password</label>
            <div className="group relative">
              <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#5A6A85]" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...register("password")}
                className="h-11 w-full rounded-xl border border-[#1E2B42] bg-[#0A0E1A] pr-11 pl-10 text-sm text-[#E8EEF8] placeholder-[#5A6A85] transition-colors outline-none focus:border-[#6C3AED]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-[#5A6A85] transition-colors hover:text-[#A8B4CC]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-[#FCA5A5]">{errors.password.message}</p>}
          </div>

          {/* ── Actions ────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-[#A8B4CC] transition-colors hover:bg-[#1E2B42] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium text-white transition-all",
                "bg-[#EF4444] hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {isSubmitting ? "Deleting…" : "Permanently delete account"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
