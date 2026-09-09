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
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowRight, ArrowLeft, Shield, Loader2, CheckCircle2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

// ── Schema ────────────────────────────────────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type ForgotPasswordFields = z.infer<typeof forgotPasswordSchema>;

// ── Page component ────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFields>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotPasswordFields) {
    setBannerError(null);
    try {
      await apiFetch<null>("/api/v1/auth/password-reset", {
        method: "POST",
        body: JSON.stringify({ email: data.email }),
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setBannerError("Too many attempts. Please wait a while before trying again.");
        } else {
          setBannerError(err.message);
        }
      } else {
        setBannerError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080C14] p-4 md:p-8 lg:p-10">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[5%] h-[500px] w-[500px] rounded-full bg-[#6C3AED] opacity-[0.07] blur-[140px]" />
        <div className="absolute right-[5%] bottom-[-5%] h-[400px] w-[400px] rounded-full bg-[#6C3AED] opacity-[0.06] blur-[120px]" />
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: i % 5 === 0 ? "2px" : "1px",
              height: i % 5 === 0 ? "2px" : "1px",
              top: `${(i * 37 + 5) % 100}%`,
              left: `${(i * 53 + 3) % 100}%`,
              opacity: 0.08 + (i % 5) * 0.04,
            }}
          />
        ))}
      </div>

      {/* ── Main card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex w-full max-w-[480px] flex-col overflow-hidden"
        style={{
          background: "rgba(13, 18, 32, 0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(30, 43, 66, 0.75)",
          borderRadius: "28px",
          boxShadow: "0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(108,58,237,0.06)",
        }}
      >
        <div className="flex flex-col px-8 py-10 md:px-10">
          {/* Logo */}
          <motion.div
            custom={0}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mb-8 flex items-center gap-3"
          >
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[18px] font-black text-white"
              style={{
                background: "linear-gradient(135deg, #7C4AFF 0%, #5B28D6 100%)",
                boxShadow: "0 0 20px rgba(108,58,237,0.55)",
              }}
            >
              M
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Moniqo</span>
          </motion.div>

          {success ? (
            /* ── Success state ── */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-6 py-4 text-center"
            >
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.3)",
                }}
              >
                <CheckCircle2 className="h-10 w-10 text-[#22C55E]" />
              </div>
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">Check your email</h2>
                <p className="text-sm leading-relaxed text-[#5A6A85]">
                  If an account exists for that email address, we&apos;ve sent a link to reset
                  your password.
                </p>
              </div>
              <Link
                href="/login"
                className="flex items-center gap-2 text-sm font-medium text-[#8B5CF6] transition-colors duration-150 hover:text-[#A78BFA]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </motion.div>
          ) : (
            <>
              {/* Heading */}
              <motion.div custom={1} initial="hidden" animate="show" variants={fadeUp} className="mb-8">
                <h2 className="mb-1.5 text-2xl font-bold text-white lg:text-3xl">
                  Forgot your password?
                </h2>
                <p className="text-sm text-[#5A6A85]">
                  Enter your email and we&apos;ll send you a link to reset it.
                </p>
              </motion.div>

              <motion.form
                custom={2}
                initial="hidden"
                animate="show"
                variants={fadeUp}
                className="space-y-5"
                onSubmit={handleSubmit(onSubmit)}
              >
                {/* Banner */}
                {bannerError && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#FCA5A5",
                    }}
                  >
                    {bannerError}
                  </div>
                )}

                {/* Email field */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[#A8B4CC]">Email address</label>
                  <div className="group relative">
                    <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5A6A85] transition-colors duration-150 group-focus-within:text-[#8B5CF6]" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      autoComplete="email"
                      {...register("email")}
                      className="h-12 w-full rounded-xl pr-4 pl-11 text-sm text-[#E8EEF8] placeholder-[#5A6A85] transition-all duration-200 outline-none"
                      style={{
                        background: "#0A0E1A",
                        border: `1px solid ${errors.email ? "#EF4444" : "#1E2B42"}`,
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = errors.email ? "#EF4444" : "#6C3AED")
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = errors.email ? "#EF4444" : "#1E2B42")
                      }
                    />
                  </div>
                  {errors.email && <p className="text-xs text-[#FCA5A5]">{errors.email.message}</p>}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:opacity-92 hover:shadow-[0_0_28px_rgba(108,58,237,0.55)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #7C4AFF 0%, #6333E8 100%)",
                    boxShadow: "0 4px 24px rgba(108,58,237,0.4)",
                  }}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 text-sm font-medium text-[#8B5CF6] transition-colors duration-150 hover:text-[#A78BFA]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>

                {/* Security message */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Shield className="h-3.5 w-3.5 flex-shrink-0 text-[#5A6A85]" />
                  <span className="text-xs text-[#5A6A85]">
                    Your security is our priority. We never share your data.
                  </span>
                </div>
              </motion.form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
