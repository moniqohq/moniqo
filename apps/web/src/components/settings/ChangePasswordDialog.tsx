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

import { forwardRef, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { changePassword } from "@/lib/api/users";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

// ── Schema ────────────────────────────────────────────────────────────────
// Mirrors the strength rules enforced server-side (internal/validator/user.go):
// 8-72 bytes, at least one uppercase, one lowercase, one digit.

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72)
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[a-z]/, "Must contain a lowercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFields = z.infer<typeof changePasswordSchema>;

const REQUIREMENTS = [
  "At least 8 characters long",
  "At least one uppercase letter",
  "At least one lowercase letter",
  "At least one number",
];

// ── Password field ───────────────────────────────────────────────────────

const PasswordField = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    show: boolean;
    onToggleShow: () => void;
    error?: string;
  }
>(function PasswordField({ show, onToggleShow, error, ...inputProps }, ref) {
  return (
    <div className="relative">
      <Lock
        size={13}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#5A6A85]"
      />
      <input
        {...inputProps}
        ref={ref}
        type={show ? "text" : "password"}
        className={cn(
          "h-9 w-full rounded-lg border bg-[#0F1623] pr-9 pl-9 text-sm text-white transition-all",
          "placeholder:text-[#3A4A60] focus:ring-2 focus:outline-none",
          error
            ? "border-[#F87171]/50 focus:border-[#F87171]/70 focus:ring-[#F87171]/20"
            : "border-[#1E2B42] focus:border-[#6C3AED] focus:ring-[#6C3AED]/25",
        )}
      />
      <button
        type="button"
        onClick={onToggleShow}
        tabIndex={-1}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-[#5A6A85] transition-colors hover:text-[#A8B4CC]"
      >
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
});

// ── Dialog ────────────────────────────────────────────────────────────────

export interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFields>({ resolver: zodResolver(changePasswordSchema) });
  const currentPasswordReg = register("currentPassword");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      reset();
      setBannerError(null);
      setSuccess(false);
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open, reset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleClose() {
    if (isSubmitting || success) return;
    onOpenChange(false);
  }

  async function onSubmit(data: ChangePasswordFields) {
    if (!userId) return;
    setBannerError(null);
    try {
      await changePassword(userId, {
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });
      // The server invalidated every session (including this one) as part of
      // the password change, so the client must sign out and re-authenticate.
      setSuccess(true);
      setTimeout(() => {
        clearAuth();
        router.push("/login");
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("currentPassword", { message: "Current password is incorrect" });
          return;
        }
        if (err.fields?.length) {
          for (const fe of err.fields) {
            const field = fe.field === "new_password" ? "newPassword" : null;
            if (field) setError(field, { message: fe.error });
          }
          if (!err.fields.some((fe) => fe.field === "new_password")) {
            setBannerError(err.message);
          }
          return;
        }
        setBannerError(err.message);
      } else {
        setBannerError("Something went wrong. Please try again.");
      }
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) handleClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="w-full max-w-md rounded-2xl border border-[#1A2640] bg-[#0A1120] shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#131E30] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6C3AED] shadow-sm shadow-[#6C3AED]/40">
                  <Lock size={14} className="text-white" strokeWidth={2} />
                </span>
                <h2 className="text-[15px] font-semibold text-white">Change Password</h2>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {success ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <CheckCircle2 size={32} className="text-[#34D399]" />
                <p className="text-sm font-medium text-white">Password updated</p>
                <p className="text-xs text-[#5A6A85]">
                  For your security, you&apos;ve been signed out everywhere. Redirecting to sign in…
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium tracking-wide text-[#5A6A85] uppercase">
                    Current password
                  </label>
                  <PasswordField
                    {...currentPasswordReg}
                    ref={(el) => {
                      currentPasswordReg.ref(el);
                      firstInputRef.current = el;
                    }}
                    show={showCurrent}
                    onToggleShow={() => setShowCurrent((v) => !v)}
                    error={errors.currentPassword?.message}
                    autoComplete="current-password"
                  />
                  {errors.currentPassword && (
                    <p className="text-xs text-[#FCA5A5]">{errors.currentPassword.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium tracking-wide text-[#5A6A85] uppercase">
                    New password
                  </label>
                  <PasswordField
                    {...register("newPassword")}
                    show={showNew}
                    onToggleShow={() => setShowNew((v) => !v)}
                    error={errors.newPassword?.message}
                    autoComplete="new-password"
                  />
                  {errors.newPassword && (
                    <p className="text-xs text-[#FCA5A5]">{errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium tracking-wide text-[#5A6A85] uppercase">
                    Confirm new password
                  </label>
                  <PasswordField
                    {...register("confirmPassword")}
                    show={showConfirm}
                    onToggleShow={() => setShowConfirm((v) => !v)}
                    error={errors.confirmPassword?.message}
                    autoComplete="new-password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-[#FCA5A5]">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <ul className="flex flex-col gap-1 pt-1">
                  {REQUIREMENTS.map((req) => (
                    <li key={req} className="flex items-center gap-2 text-[11px] text-[#5A6A85]">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-[#3A4A60]" />
                      {req}
                    </li>
                  ))}
                </ul>

                {bannerError && (
                  <p className="rounded-lg bg-[#F87171]/10 px-3.5 py-2.5 text-sm text-[#F87171]">
                    {bannerError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="rounded-lg border border-[#1E2B42] px-4 py-2 text-sm text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all",
                      "bg-[#6C3AED] shadow-sm shadow-[#6C3AED]/30 hover:bg-[#7C4AFF] focus:ring-2 focus:ring-[#6C3AED]/40 focus:outline-none",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                    Update password
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
