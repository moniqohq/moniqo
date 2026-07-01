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
import {
  BarChart3,
  ShieldCheck,
  Users2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  UserRound,
  Phone,
  ChevronDown,
} from "lucide-react";

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

// ── Wallet / card device illustration ────────────────────────────────────────

function WalletIllustration() {
  return (
    <div className="relative mt-auto w-full select-none" aria-hidden>
      <svg
        viewBox="0 0 310 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[300px]"
      >
        <defs>
          {/* Device body */}
          <radialGradient id="wBody" cx="40%" cy="25%" r="75%">
            <stop offset="0%" stopColor="#221660" />
            <stop offset="100%" stopColor="#080520" />
          </radialGradient>
          {/* Card behind device */}
          <radialGradient id="wCard" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#2d1a80" />
            <stop offset="100%" stopColor="#0f0835" />
          </radialGradient>
          {/* Device screen / face inner */}
          <radialGradient id="wFace" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1e1260" />
            <stop offset="100%" stopColor="#09061e" />
          </radialGradient>
          {/* Logo circle */}
          <radialGradient id="wLogo" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#4a28c4" />
            <stop offset="100%" stopColor="#2510a0" />
          </radialGradient>
          {/* Shield */}
          <radialGradient id="wShield" cx="45%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#1e1450" />
            <stop offset="100%" stopColor="#080520" />
          </radialGradient>
          {/* Coins */}
          <linearGradient id="wCoinTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b22a8" />
            <stop offset="100%" stopColor="#1c0f68" />
          </linearGradient>
          <linearGradient id="wCoinSide" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a0f5e" />
            <stop offset="100%" stopColor="#08051a" />
          </linearGradient>
          <filter id="wGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="wSoftGlow">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ground glow */}
        <ellipse
          cx="140"
          cy="228"
          rx="100"
          ry="9"
          fill="#6C3AED"
          fillOpacity="0.38"
          filter="url(#wSoftGlow)"
        />

        {/* ── Credit card (behind device, slightly tilted) ── */}
        <g transform="rotate(-8, 155, 155)">
          <rect
            x="70"
            y="80"
            width="145"
            height="100"
            rx="14"
            fill="url(#wCard)"
            stroke="#6C3AED"
            strokeOpacity="0.4"
            strokeWidth="1"
          />
          {/* Card chip */}
          <rect
            x="92"
            y="100"
            width="28"
            height="22"
            rx="4"
            fill="#2d1a80"
            stroke="#6C3AED"
            strokeOpacity="0.35"
            strokeWidth="0.8"
          />
          {/* Card strip lines */}
          <rect x="70" y="130" width="145" height="14" fill="#1a0f60" fillOpacity="0.6" />
          {/* Card number dots */}
          {[0, 1, 2, 3].map((g) => (
            <g key={g}>
              {[0, 1, 2, 3].map((d) => (
                <circle
                  key={d}
                  cx={92 + g * 38 + d * 8}
                  cy={155}
                  r="2.5"
                  fill="#6C3AED"
                  fillOpacity="0.5"
                />
              ))}
            </g>
          ))}
        </g>

        {/* ── Main device body (tall rectangle, like phone/wallet) ── */}
        <rect
          x="80"
          y="28"
          width="115"
          height="182"
          rx="18"
          fill="url(#wBody)"
          stroke="#6C3AED"
          strokeOpacity="0.5"
          strokeWidth="1.3"
          filter="url(#wGlow)"
        />

        {/* Device inner bezel */}
        <rect
          x="90"
          y="38"
          width="95"
          height="162"
          rx="13"
          fill="url(#wFace)"
          stroke="#6C3AED"
          strokeOpacity="0.2"
          strokeWidth="0.6"
        />

        {/* Top notch / camera bar */}
        <rect
          x="118"
          y="44"
          width="40"
          height="7"
          rx="3.5"
          fill="#120e30"
          stroke="#6C3AED"
          strokeOpacity="0.2"
          strokeWidth="0.5"
        />

        {/* ── M logo circle ── */}
        <circle
          cx="137"
          cy="130"
          r="38"
          fill="url(#wLogo)"
          stroke="#6C3AED"
          strokeOpacity="0.65"
          strokeWidth="1.5"
          filter="url(#wGlow)"
        />
        <circle
          cx="137"
          cy="130"
          r="30"
          fill="#1e1260"
          stroke="#6C3AED"
          strokeOpacity="0.28"
          strokeWidth="0.7"
        />
        <text
          x="137"
          y="139"
          textAnchor="middle"
          fill="white"
          fontSize="28"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ filter: "drop-shadow(0 0 8px rgba(108,58,237,0.9))" }}
        >
          M
        </text>

        {/* Side button */}
        <rect
          x="195"
          y="88"
          width="5"
          height="36"
          rx="2.5"
          fill="#1e1460"
          stroke="#6C3AED"
          strokeOpacity="0.4"
          strokeWidth="0.6"
        />

        {/* ── Shield (right of device) ── */}
        <g transform="translate(222, 100)" filter="url(#wGlow)">
          <path
            d="M28 2 L54 12 L54 34 C54 50 28 62 28 62 C28 62 2 50 2 34 L2 12 Z"
            fill="url(#wShield)"
            stroke="#6C3AED"
            strokeOpacity="0.65"
            strokeWidth="1.2"
          />
          <path
            d="M14 33 L23 42 L42 20"
            stroke="#6C3AED"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#wGlow)"
          />
        </g>

        {/* ── Coin stacks (bottom left) ── */}
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x="18" y={193 - i * 9} width="46" height="9" rx="1" fill="url(#wCoinSide)" />
            <ellipse
              cx="41"
              cy={193 - i * 9}
              rx="23"
              ry="5.5"
              fill="url(#wCoinTop)"
              stroke="#6C3AED"
              strokeOpacity="0.4"
              strokeWidth="0.5"
            />
          </g>
        ))}

        {/* ── Floating particles ── */}
        <rect
          x="248"
          y="36"
          width="9"
          height="9"
          rx="1"
          transform="rotate(45 252.5 40.5)"
          fill="#6C3AED"
          fillOpacity="0.65"
        />
        <rect
          x="16"
          y="90"
          width="7"
          height="7"
          rx="0.5"
          transform="rotate(45 19.5 93.5)"
          fill="#6C3AED"
          fillOpacity="0.45"
        />
        <rect
          x="270"
          y="160"
          width="6"
          height="6"
          rx="0.5"
          transform="rotate(45 273 163)"
          fill="#8B5CF6"
          fillOpacity="0.5"
        />
        <circle cx="14" cy="58" r="2.5" fill="#6C3AED" fillOpacity="0.45" />
        <circle cx="260" cy="68" r="2" fill="#8B5CF6" fillOpacity="0.4" />
        <circle cx="286" cy="195" r="1.8" fill="#6C3AED" fillOpacity="0.38" />
        <circle cx="58" cy="24" r="1.5" fill="#8B5CF6" fillOpacity="0.35" />
      </svg>

      {/* CSS glow base */}
      <div className="pointer-events-none absolute bottom-1 left-[18%] h-3 w-[58%] rounded-full bg-[#6C3AED] opacity-30 blur-2xl" />
    </div>
  );
}

// ── Password strength ─────────────────────────────────────────────────────────

type StrengthLevel = "empty" | "weak" | "fair" | "good" | "strong";

function getStrength(password: string): StrengthLevel {
  if (!password) return "empty";
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "good";
  return "strong";
}

const strengthMeta: Record<StrengthLevel, { label: string; color: string; segments: number }> = {
  empty: { label: "", color: "#1E2B42", segments: 0 },
  weak: { label: "Weak", color: "#EF4444", segments: 1 },
  fair: { label: "Fair", color: "#F59E0B", segments: 2 },
  good: { label: "Good", color: "#3B82F6", segments: 3 },
  strong: { label: "Strong", color: "#22C55E", segments: 4 },
};

function PasswordStrengthBar({ password }: { password: string }) {
  const level = getStrength(password);
  const { label, color, segments } = strengthMeta[level];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#5A6A85]">Password strength:</span>
        <span className="text-xs font-semibold" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              background: seg <= segments ? color : "#1E2B42",
              boxShadow: seg <= segments ? `0 0 6px ${color}60` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Feature list data ─────────────────────────────────────────────────────────

const features = [
  {
    Icon: BarChart3,
    title: "Smart insights",
    desc: "Understand your money and make better decisions.",
  },
  {
    Icon: ShieldCheck,
    title: "Bank-level security",
    desc: "Your data is encrypted and always protected.",
  },
  {
    Icon: Users2,
    title: "Built for life together",
    desc: "Plan, share and achieve your financial goals together.",
  },
];

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.07,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

// ── Input style helpers ───────────────────────────────────────────────────────

const inputBase = {
  background: "#0A0E1A",
  border: "1px solid #1E2B42",
} as const;

function focusOn(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#6C3AED";
  e.currentTarget.style.boxShadow = "0 0 0 1.5px #6C3AED, 0 0 16px rgba(108,58,237,0.18)";
}
function focusOff(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#1E2B42";
  e.currentTarget.style.boxShadow = "none";
}

// ── Page component ────────────────────────────────────────────────────────────

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080C14] p-4 md:p-8 lg:p-10">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[8%] h-[480px] w-[480px] rounded-full bg-[#6C3AED] opacity-[0.07] blur-[140px]" />
        <div className="absolute bottom-[-5%] left-[5%] h-[380px] w-[380px] rounded-full bg-[#6C3AED] opacity-[0.06] blur-[120px]" />
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: i % 5 === 0 ? "2px" : "1px",
              height: i % 5 === 0 ? "2px" : "1px",
              top: `${(i * 41 + 7) % 100}%`,
              left: `${(i * 59 + 11) % 100}%`,
              opacity: 0.07 + (i % 5) * 0.035,
            }}
          />
        ))}
      </div>

      {/* ── Main container ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
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
          <motion.div custom={1} initial="hidden" animate="show" variants={fadeUp} className="mb-4">
            <h1
              className="mb-3 leading-[1.15] font-black"
              style={{ fontSize: "clamp(1.9rem, 3.8vw, 2.6rem)" }}
            >
              <span className="text-white">Your money.</span>
              <br />
              <span style={{ color: "#8B5CF6" }}>Smarter</span>{" "}
              <span className="text-white">together.</span>
            </h1>
            <p className="max-w-[280px] text-sm leading-relaxed text-[#5A6A85]">
              Join Moniqo and experience the future of personal finance.
            </p>
          </motion.div>

          {/* Feature list */}
          <div className="mt-2 space-y-4">
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

          {/* Illustration */}
          <motion.div
            custom={6}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="flex flex-1 items-end"
          >
            <WalletIllustration />
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
            className="mb-6 flex items-center justify-end gap-3"
          >
            <span className="text-sm text-[#5A6A85]">Already have an account?</span>
            <Link
              href="/login"
              className="rounded-xl px-5 py-2 text-sm font-semibold text-[#8B5CF6] transition-all duration-200 hover:bg-[#6C3AED]/12 active:scale-[0.98]"
              style={{ border: "1px solid rgba(108, 58, 237, 0.55)" }}
            >
              Log in
            </Link>
          </motion.div>

          {/* Form heading */}
          <motion.div
            custom={1}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mx-auto mb-6 w-full max-w-[460px]"
          >
            <h2 className="mb-1.5 text-2xl font-bold text-white lg:text-3xl">
              Create your account
            </h2>
            <p className="text-sm text-[#5A6A85]">Let&apos;s get you started with Moniqo.</p>
          </motion.div>

          {/* Form */}
          <motion.div
            custom={2}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mx-auto w-full max-w-[460px] space-y-4"
          >
            {/* Full name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#A8B4CC]">Full name</label>
              <div className="group relative">
                <UserRound className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5A6A85] transition-colors duration-150 group-focus-within:text-[#8B5CF6]" />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  className="h-12 w-full rounded-xl pr-4 pl-11 text-sm text-[#E8EEF8] placeholder-[#5A6A85] transition-all duration-200 outline-none"
                  style={inputBase}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#A8B4CC]">Email address</label>
              <div className="group relative">
                <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5A6A85] transition-colors duration-150 group-focus-within:text-[#8B5CF6]" />
                <input
                  type="email"
                  placeholder="Enter your email address"
                  autoComplete="email"
                  className="h-12 w-full rounded-xl pr-4 pl-11 text-sm text-[#E8EEF8] placeholder-[#5A6A85] transition-all duration-200 outline-none"
                  style={inputBase}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#A8B4CC]">Password</label>
              <div className="group relative">
                <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5A6A85] transition-colors duration-150 group-focus-within:text-[#8B5CF6]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-xl pr-12 pl-11 text-sm text-[#E8EEF8] placeholder-[#5A6A85] transition-all duration-200 outline-none"
                  style={inputBase}
                  onFocus={focusOn}
                  onBlur={focusOff}
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
              <PasswordStrengthBar password={password} />
            </div>

            {/* Phone number (optional) */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#A8B4CC]">
                Phone number <span className="font-normal text-[#5A6A85]">(optional)</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex h-12 flex-shrink-0 items-center gap-2 rounded-xl px-3 transition-all duration-200 hover:border-[#2A3A54]"
                  style={{ background: "#0A0E1A", border: "1px solid #1E2B42" }}
                >
                  <span className="text-base leading-none">🇮🇳</span>
                  <span className="text-sm font-medium text-[#A8B4CC]">+91</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#5A6A85]" />
                </button>
                <div className="group relative flex-1">
                  <Phone className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5A6A85] transition-colors duration-150 group-focus-within:text-[#8B5CF6]" />
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                    className="h-12 w-full rounded-xl pr-4 pl-11 text-sm text-[#E8EEF8] placeholder-[#5A6A85] transition-all duration-200 outline-none"
                    style={inputBase}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 pt-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={agreed}
                onClick={() => setAgreed(!agreed)}
                className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded transition-all duration-200"
                style={{
                  background: agreed ? "#6C3AED" : "transparent",
                  border: `1.5px solid ${agreed ? "#6C3AED" : "#1E2B42"}`,
                  boxShadow: agreed ? "0 0 10px rgba(108,58,237,0.45)" : "none",
                }}
              >
                {agreed && (
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
              <p className="text-sm leading-relaxed text-[#A8B4CC]">
                I agree to Moniqo&apos;s{" "}
                <button
                  type="button"
                  className="text-[#8B5CF6] underline-offset-2 transition-colors duration-150 hover:text-[#A78BFA] hover:underline"
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  className="text-[#8B5CF6] underline-offset-2 transition-colors duration-150 hover:text-[#A78BFA] hover:underline"
                >
                  Privacy Policy
                </button>
              </p>
            </div>

            {/* Create account button */}
            <button
              type="submit"
              className="mt-1 flex h-14 w-full items-center justify-center gap-2.5 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:opacity-92 hover:shadow-[0_0_28px_rgba(108,58,237,0.55)] active:scale-[0.99]"
              style={{
                background: "linear-gradient(135deg, #7C4AFF 0%, #6333E8 100%)",
                boxShadow: "0 4px 24px rgba(108,58,237,0.4)",
              }}
            >
              Create account
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-[#1E2B42]" />
              <span className="text-sm text-[#5A6A85]">or sign up with</span>
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
                  style={{ background: "#0A0E1A", border: "1px solid #1E2B42" }}
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
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
