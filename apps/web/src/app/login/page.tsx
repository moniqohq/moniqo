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
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShieldCheck,
  BarChart3,
  Users2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Loader2,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import type { ApiAuthTokens, ApiUser, ApiListResponse, ApiBudget } from "@/lib/api-types";

// ── Brand icons ─────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="#1877F2" aria-hidden>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.885v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

// ── Vault SVG illustration ───────────────────────────────────────────────────

function VaultIllustration() {
  return (
    <div className="relative mt-auto w-full select-none" aria-hidden>
      <svg
        viewBox="0 0 310 230"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[300px]"
      >
        <defs>
          <radialGradient id="vBody" cx="45%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#1e1450" />
            <stop offset="100%" stopColor="#09071e" />
          </radialGradient>
          <radialGradient id="vInner" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#150f3a" />
            <stop offset="100%" stopColor="#070520" />
          </radialGradient>
          <radialGradient id="vDial" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#3b22a8" />
            <stop offset="100%" stopColor="#1c0f68" />
          </radialGradient>
          <radialGradient id="vDialInner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#251580" />
            <stop offset="100%" stopColor="#120a50" />
          </radialGradient>
          <radialGradient id="vShield" cx="45%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#1e1450" />
            <stop offset="100%" stopColor="#090720" />
          </radialGradient>
          <linearGradient id="vCoinTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b22a8" />
            <stop offset="100%" stopColor="#1c0f68" />
          </linearGradient>
          <linearGradient id="vCoinSide" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1c0f68" />
            <stop offset="100%" stopColor="#09061a" />
          </linearGradient>
          <filter id="vGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="vSoftGlow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ground glow */}
        <ellipse
          cx="125"
          cy="218"
          rx="95"
          ry="8"
          fill="#6C3AED"
          fillOpacity="0.35"
          filter="url(#vSoftGlow)"
        />

        {/* ── Coin stacks (left) ── */}
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x="8" y={183 - i * 9} width="44" height="9" rx="1" fill="url(#vCoinSide)" />
            <ellipse
              cx="30"
              cy={183 - i * 9}
              rx="22"
              ry="5.5"
              fill="url(#vCoinTop)"
              stroke="#6C3AED"
              strokeOpacity="0.4"
              strokeWidth="0.5"
            />
          </g>
        ))}

        {/* ── Safe body ── */}
        <rect
          x="52"
          y="38"
          width="166"
          height="170"
          rx="14"
          fill="url(#vBody)"
          stroke="#6C3AED"
          strokeOpacity="0.45"
          strokeWidth="1.2"
          filter="url(#vGlow)"
        />

        {/* Safe face inner recess */}
        <rect
          x="66"
          y="52"
          width="138"
          height="142"
          rx="9"
          fill="url(#vInner)"
          stroke="#6C3AED"
          strokeOpacity="0.2"
          strokeWidth="0.6"
        />

        {/* Corner screws */}
        {[
          [76, 62],
          [194, 62],
          [76, 183],
          [194, 183],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="4"
            fill="#150f3a"
            stroke="#6C3AED"
            strokeOpacity="0.35"
            strokeWidth="0.8"
          />
        ))}

        {/* Main dial ring outer */}
        <circle
          cx="135"
          cy="123"
          r="48"
          fill="url(#vDial)"
          stroke="#6C3AED"
          strokeOpacity="0.65"
          strokeWidth="1.5"
          filter="url(#vGlow)"
        />

        {/* Dial ring inner */}
        <circle
          cx="135"
          cy="123"
          r="38"
          fill="url(#vDialInner)"
          stroke="#6C3AED"
          strokeOpacity="0.3"
          strokeWidth="0.8"
        />

        {/* Dial notches */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 135 + 43 * Math.cos(rad);
          const y1 = 123 + 43 * Math.sin(rad);
          const x2 = 135 + 38 * Math.cos(rad);
          const y2 = 123 + 38 * Math.sin(rad);
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#6C3AED"
              strokeOpacity="0.5"
              strokeWidth="1"
            />
          );
        })}

        {/* M text */}
        <text
          x="135"
          y="132"
          textAnchor="middle"
          fill="white"
          fontSize="30"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ filter: "drop-shadow(0 0 8px rgba(108,58,237,0.9))" }}
        >
          M
        </text>

        {/* Handle bar (right side) */}
        <rect
          x="208"
          y="82"
          width="10"
          height="72"
          rx="5"
          fill="url(#vDial)"
          stroke="#6C3AED"
          strokeOpacity="0.45"
          strokeWidth="0.8"
        />
        <circle
          cx="213"
          cy="82"
          r="6"
          fill="url(#vDial)"
          stroke="#6C3AED"
          strokeOpacity="0.45"
          strokeWidth="0.8"
        />
        <circle
          cx="213"
          cy="154"
          r="6"
          fill="url(#vDial)"
          stroke="#6C3AED"
          strokeOpacity="0.45"
          strokeWidth="0.8"
        />

        {/* ── Shield (right side) ── */}
        <g transform="translate(238, 95)" filter="url(#vGlow)">
          <path
            d="M31 2 L58 12 L58 36 C58 52 31 65 31 65 C31 65 4 52 4 36 L4 12 Z"
            fill="url(#vShield)"
            stroke="#6C3AED"
            strokeOpacity="0.65"
            strokeWidth="1.2"
          />
          {/* Checkmark */}
          <path
            d="M16 35 L26 45 L46 22"
            stroke="#6C3AED"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#vGlow)"
          />
        </g>

        {/* ── Floating particles ── */}
        <rect
          x="240"
          y="42"
          width="9"
          height="9"
          rx="1"
          transform="rotate(45 244.5 46.5)"
          fill="#6C3AED"
          fillOpacity="0.65"
        />
        <rect
          x="22"
          y="100"
          width="7"
          height="7"
          rx="0.5"
          transform="rotate(45 25.5 103.5)"
          fill="#6C3AED"
          fillOpacity="0.45"
        />
        <rect
          x="268"
          y="148"
          width="6"
          height="6"
          rx="0.5"
          transform="rotate(45 271 151)"
          fill="#8B5CF6"
          fillOpacity="0.55"
        />
        <circle cx="18" cy="68" r="2.5" fill="#6C3AED" fillOpacity="0.5" />
        <circle cx="255" cy="75" r="2" fill="#8B5CF6" fillOpacity="0.45" />
        <circle cx="280" cy="185" r="1.8" fill="#6C3AED" fillOpacity="0.4" />
      </svg>

      {/* CSS glow underneath */}
      <div className="pointer-events-none absolute bottom-1 left-[20%] h-3 w-[55%] rounded-full bg-[#6C3AED] opacity-30 blur-2xl" />
    </div>
  );
}

// ── Feature data ─────────────────────────────────────────────────────────────

const features = [
  {
    Icon: ShieldCheck,
    title: "Bank-level security",
    desc: "Your data is encrypted and always protected.",
  },
  {
    Icon: BarChart3,
    title: "Smarter financial insights",
    desc: "Track, analyze and grow your money with clarity.",
  },
  {
    Icon: Users2,
    title: "Built for life together",
    desc: "Share, plan and achieve your financial goals together.",
  },
];

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function setAuthCookie(token: string) {
  document.cookie = `moniqo_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

type LoginFields = z.infer<typeof loginSchema>;

// ── Page component ────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setActiveBudget = useUIStore((s) => s.setActiveBudget);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [bannerMsg, setBannerMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFields>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginFields) {
    setBannerMsg(null);
    try {
      const tokens = await apiFetch<ApiAuthTokens>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const user = await apiFetch<ApiUser>(
        `/api/v1/users/${parseUserIdFromToken(tokens.access_token)}`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      setAuth(user, tokens.access_token, tokens.refresh_token);
      setAuthCookie(tokens.access_token);

      try {
        const budgetsBody = await apiFetch<ApiListResponse<ApiBudget>>("/api/v1/budgets");
        if (budgetsBody.data.length > 0) {
          setActiveBudget(budgetsBody.data[0].id);
        }
      } catch {
        // non-fatal: proceed to dashboard even if budget fetch fails
      }

      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setBannerMsg({
            type: "info",
            text: "Your account isn't verified yet — check your email for the verification link.",
          });
        } else if (err.status === 401) {
          setError("password", { message: "Invalid email or password." });
        } else {
          setBannerMsg({ type: "error", text: err.message });
        }
      } else {
        setBannerMsg({ type: "error", text: "Something went wrong. Please try again." });
      }
    }
  }

  function parseUserIdFromToken(token: string): number {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return Number(payload.sub);
    } catch {
      throw new Error("invalid token");
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

      {/* ── Main container ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex w-full max-w-[1120px] flex-col overflow-hidden lg:flex-row"
        style={{
          background: "rgba(13, 18, 32, 0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(30, 43, 66, 0.75)",
          borderRadius: "28px",
          boxShadow: "0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(108,58,237,0.06)",
          minHeight: "680px",
        }}
      >
        {/* ════════════════ LEFT PANEL ════════════════ */}
        <div className="relative flex flex-col overflow-hidden px-8 py-8 lg:w-[42%] lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-56 bg-gradient-to-t from-[#6C3AED]/10 to-transparent" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6C3AED] opacity-[0.04] blur-[80px]" />

          {/* Logo */}
          <motion.div
            custom={0}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mb-10 flex items-center gap-3"
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

          {/* Headline */}
          <motion.div custom={1} initial="hidden" animate="show" variants={fadeUp} className="mb-8">
            <h1
              className="mb-2 leading-tight font-black"
              style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}
            >
              <span style={{ color: "#8B5CF6" }}>Welcome</span>{" "}
              <span className="text-white">back</span>
            </h1>
            <p className="text-base text-[#5A6A85]">Good to see you again!</p>
          </motion.div>

          {/* Feature list */}
          <div className="space-y-5">
            {features.map(({ Icon, title, desc }, i) => (
              <motion.div
                key={title}
                custom={i + 2}
                initial="hidden"
                animate="show"
                variants={fadeUp}
                className="flex items-start gap-4"
              >
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: "rgba(108, 58, 237, 0.14)",
                    border: "1px solid rgba(108, 58, 237, 0.28)",
                    boxShadow: "0 0 14px rgba(108, 58, 237, 0.14)",
                  }}
                >
                  <Icon className="h-5 w-5 text-[#8B5CF6]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#5A6A85]">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Vault illustration */}
          <motion.div
            custom={6}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="flex flex-1 items-end"
          >
            <VaultIllustration />
          </motion.div>

          {/* Copyright */}
          <p className="relative z-10 mt-4 text-xs text-[#5A6A85]">
            © 2025 Moniqo. All rights reserved.
          </p>
        </div>

        {/* ════════════════ RIGHT PANEL ════════════════ */}
        <div
          className="flex flex-col px-6 py-8 lg:w-[58%] lg:px-10 lg:py-10"
          style={{ borderLeft: "1px solid rgba(30, 43, 66, 0.6)" }}
        >
          {/* Top row */}
          <motion.div
            custom={0}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mb-10 flex items-center justify-end gap-3"
          >
            <span className="text-sm text-[#5A6A85]">New to Moniqo?</span>
            <Link
              href="/signup"
              className="rounded-xl px-5 py-2 text-sm font-semibold text-[#8B5CF6] transition-all duration-200 hover:bg-[#6C3AED]/12 active:scale-[0.98]"
              style={{ border: "1px solid rgba(108, 58, 237, 0.55)" }}
            >
              Create account
            </Link>
          </motion.div>

          {/* Form area centered */}
          <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center">
            {/* Form heading */}
            <motion.div
              custom={1}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="mb-8"
            >
              <h2 className="mb-1.5 text-2xl font-bold text-white lg:text-3xl">
                Login to your account
              </h2>
              <p className="text-sm text-[#5A6A85]">Enter your credentials to continue</p>
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
              {bannerMsg && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    background:
                      bannerMsg.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)",
                    border: `1px solid ${bannerMsg.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)"}`,
                    color: bannerMsg.type === "error" ? "#FCA5A5" : "#93C5FD",
                  }}
                >
                  {bannerMsg.text}
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

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#A8B4CC]">Password</label>
                <div className="group relative">
                  <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5A6A85] transition-colors duration-150 group-focus-within:text-[#8B5CF6]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    {...register("password")}
                    className="h-12 w-full rounded-xl pr-12 pl-11 text-sm text-[#E8EEF8] placeholder-[#5A6A85] transition-all duration-200 outline-none"
                    style={{
                      background: "#0A0E1A",
                      border: `1px solid ${errors.password ? "#EF4444" : "#1E2B42"}`,
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = errors.password ? "#EF4444" : "#6C3AED")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = errors.password ? "#EF4444" : "#1E2B42")
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#5A6A85] transition-colors duration-150 hover:text-[#A8B4CC]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-[#FCA5A5]">{errors.password.message}</p>
                )}
              </div>

              {/* Remember me + forgot password */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={rememberMe}
                    onClick={() => setRememberMe(!rememberMe)}
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded transition-all duration-200"
                    style={{
                      background: rememberMe ? "#6C3AED" : "transparent",
                      border: `1.5px solid ${rememberMe ? "#6C3AED" : "#1E2B42"}`,
                      boxShadow: rememberMe ? "0 0 10px rgba(108,58,237,0.45)" : "none",
                    }}
                  >
                    {rememberMe && (
                      <svg
                        className="h-3 w-3 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <div>
                    <p className="text-sm leading-none font-medium text-[#A8B4CC]">Remember me</p>
                    <p className="mt-1 text-xs text-[#5A6A85]">Not recommended on shared devices</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex-shrink-0 text-sm font-medium whitespace-nowrap text-[#8B5CF6] transition-colors duration-150 hover:text-[#A78BFA]"
                >
                  Forgot password?
                </button>
              </div>

              {/* Login button */}
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
                    Login
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-[#1E2B42]" />
                <span className="text-sm text-[#5A6A85]">or continue with</span>
                <div className="h-px flex-1 bg-[#1E2B42]" />
              </div>

              {/* Social buttons */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Google", icon: <GoogleIcon /> },
                  { label: "Apple", icon: <AppleIcon /> },
                  { label: "Facebook", icon: <FacebookIcon /> },
                ].map(({ label, icon }) => (
                  <button
                    key={label}
                    type="button"
                    className="flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-medium text-[#A8B4CC] transition-all duration-200 hover:bg-[#1E2B42]/70 hover:text-white active:scale-[0.98]"
                    style={{
                      background: "#0A0E1A",
                      border: "1px solid #1E2B42",
                    }}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Security message */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <Shield className="h-3.5 w-3.5 flex-shrink-0 text-[#5A6A85]" />
                <span className="text-xs text-[#5A6A85]">
                  Your security is our priority. We never share your data.
                </span>
              </div>
            </motion.form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
