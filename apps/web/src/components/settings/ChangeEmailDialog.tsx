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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { requestEmailChange, verifyEmailChange, cancelEmailChange } from "@/lib/api/users";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { OtpInput } from "@/components/ui/otp-input";
import { cn } from "@/lib/utils";
import type { ApiUser } from "@/lib/api-types";

// ── Schema ────────────────────────────────────────────────────────────────

const confirmSchema = z.object({
  currentPassword: z.string().optional(),
});

type ConfirmFields = z.infer<typeof confirmSchema>;

// ── Password field ───────────────────────────────────────────────────────
// Structural copy of ChangePasswordDialog's PasswordField — kept local since
// that one isn't exported.

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

// ── Countdown ─────────────────────────────────────────────────────────────

function useCountdown(expiresAt: string | null): string {
  const [remaining, setRemaining] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!expiresAt) {
      setRemaining("");
      return;
    }
    const target = new Date(expiresAt).getTime();
    function tick() {
      const ms = Math.max(0, target - Date.now());
      const totalSeconds = Math.floor(ms / 1000);
      const mm = Math.floor(totalSeconds / 60);
      const ss = totalSeconds % 60;
      setRemaining(`${mm}:${ss.toString().padStart(2, "0")}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return remaining;
}

// ── Dialog ────────────────────────────────────────────────────────────────

type Phase = "confirm" | "code" | "locked" | "success";

export interface ChangeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newEmail: string;
  onChanged: (user: ApiUser) => void;
}

export function ChangeEmailDialog({
  open,
  onOpenChange,
  newEmail,
  onChanged,
}: ChangeEmailDialogProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const hasPassword = useAuthStore((s) => s.user?.has_password ?? true);

  const [phase, setPhase] = useState<Phase>("confirm");
  const [showPassword, setShowPassword] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const countdown = useCountdown(phase === "code" ? expiresAt : null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmFields>({ resolver: zodResolver(confirmSchema) });
  const currentPasswordReg = register("currentPassword");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setPhase("confirm");
      setBannerError(null);
      setCode("");
      setCodeError(null);
      setAttemptsRemaining(3);
      reset();
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open, reset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function isBusy() {
    return isSubmitting || verifying;
  }

  async function handleClose() {
    if (isBusy()) return;
    // Dropping a live code from the dialog kills it server-side too, so it
    // can't sit in the new inbox for the rest of its 15-minute lifetime.
    if (phase === "code" && userId) {
      cancelEmailChange(userId).catch(() => {
        // Best-effort: the code will simply expire on its own otherwise.
      });
    }
    onOpenChange(false);
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) handleClose();
  }

  async function onSubmitConfirm(data: ConfirmFields) {
    if (!userId) return;
    setBannerError(null);
    try {
      const status = await requestEmailChange(userId, {
        new_email: newEmail,
        current_password: data.currentPassword,
      });
      setExpiresAt(status.expires_at ?? null);
      setAttemptsRemaining(status.attempts_remaining);
      setPhase("code");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setBannerError("Current password is incorrect.");
          return;
        }
        if (err.status === 409) {
          setBannerError("That email address is already in use.");
          return;
        }
        if (err.status === 429) {
          setBannerError("Too many attempts. Please try again later.");
          return;
        }
        setBannerError(err.message);
      } else {
        setBannerError("Something went wrong. Please try again.");
      }
    }
  }

  async function submitCode(value: string) {
    if (!userId || verifying) return;
    setVerifying(true);
    setCodeError(null);
    try {
      const updated = await verifyEmailChange(userId, value);
      setPhase("success");
      setTimeout(() => onChanged(updated), 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setPhase("locked");
          return;
        }
        if (err.fields?.length) {
          const fe = err.fields.find((f) => f.field === "code");
          if (fe) {
            const match = /(\d+) attempts remaining/.exec(fe.error);
            if (match) setAttemptsRemaining(Number(match[1]));
            setCodeError(fe.error);
            setCode("");
            return;
          }
        }
        setCodeError(err.message);
      } else {
        setCodeError("Something went wrong. Please try again.");
      }
      setCode("");
    } finally {
      setVerifying(false);
    }
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
                  <Mail size={14} className="text-white" strokeWidth={2} />
                </span>
                <h2 className="text-[15px] font-semibold text-white">Change Email</h2>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {phase === "confirm" && (
              <form onSubmit={handleSubmit(onSubmitConfirm)} className="space-y-4 px-6 py-5">
                <p className="text-sm text-[#A8B4CC]">
                  We&apos;ll send a 6-digit code to{" "}
                  <strong className="text-white">{newEmail}</strong>.
                </p>

                {hasPassword && (
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
                      show={showPassword}
                      onToggleShow={() => setShowPassword((v) => !v)}
                      error={errors.currentPassword?.message}
                      autoComplete="current-password"
                    />
                  </div>
                )}

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
                    Send code
                  </button>
                </div>
              </form>
            )}

            {phase === "code" && (
              <div className="space-y-4 px-6 py-5">
                <p className="text-center text-sm text-[#A8B4CC]">
                  Enter the 6-digit code sent to <strong className="text-white">{newEmail}</strong>.
                </p>

                <OtpInput
                  key={attemptsRemaining}
                  value={code}
                  onChange={setCode}
                  onComplete={submitCode}
                  disabled={verifying}
                  error={!!codeError}
                  autoFocus
                />

                {codeError && <p className="text-center text-xs text-[#FCA5A5]">{codeError}</p>}

                <div className="flex items-center justify-between text-xs text-[#5A6A85]">
                  <span>{attemptsRemaining} attempts remaining</span>
                  {countdown && <span>Expires in {countdown}</span>}
                </div>

                <p className="text-center text-xs text-[#5A6A85]">
                  Didn&apos;t get the code? Close this and start again — codes can&apos;t be resent.
                </p>

                {verifying && (
                  <div className="flex justify-center">
                    <Loader2 size={16} className="animate-spin text-[#6C3AED]" />
                  </div>
                )}
              </div>
            )}

            {phase === "locked" && (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <ShieldAlert size={32} className="text-[#F87171]" />
                <p className="text-sm font-medium text-white">Too many incorrect codes</p>
                <p className="text-xs text-[#5A6A85]">
                  For security, this request has been locked. Try again in 30 minutes.
                </p>
                <button
                  onClick={() => onOpenChange(false)}
                  className="mt-2 rounded-lg border border-[#1E2B42] px-4 py-2 text-sm text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white"
                >
                  Close
                </button>
              </div>
            )}

            {phase === "success" && (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <CheckCircle2 size={32} className="text-[#34D399]" />
                <p className="text-sm font-medium text-white">Email updated</p>
                <p className="text-xs text-[#5A6A85]">
                  Your email address is now <strong className="text-white">{newEmail}</strong>.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
