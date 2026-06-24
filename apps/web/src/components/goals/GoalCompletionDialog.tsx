"use client";

import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence, useAnimate, stagger } from "framer-motion";
import { X, CheckCircle2, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompletionGoal {
  id: string;
  title: string;
  icon: string;
  targetAmount: number;
  savedAmount: number;
  completedAt: Date;
  createdAt: Date;
}

export interface GoalCompletionDialogProps {
  open: boolean;
  goal: CompletionGoal | null;
  userName?: string;
  onClose: () => void;
  onViewSummary?: (id: string) => void;
  onCreateNewGoal?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

function monthsBetween(a: Date, b: Date) {
  return Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth());
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Confetti Pieces ──────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#7C3AED",
  "#A855F7",
  "#EC4899",
  "#F472B6",
  "#3B82F6",
  "#60A5FA",
  "#EAB308",
  "#FCD34D",
  "#06B6D4",
  "#F97316",
];

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rot: number;
  color: string;
  w: number;
  h: number;
  delay: number;
  duration: number;
  drift: number;
}

function makeConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 75,
    rot: Math.random() * 360,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    w: 8 + Math.random() * 10,
    h: 6 + Math.random() * 6,
    delay: Math.random() * 2,
    duration: 4 + Math.random() * 3,
    drift: (Math.random() - 0.5) * 30,
  }));
}

const CONFETTI_PIECES = makeConfetti(32);

function ConfettiPiece({ piece }: { piece: ConfettiPiece }) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-[2px]"
      style={{
        left: `${piece.x}%`,
        top: `${piece.y}%`,
        width: piece.w,
        height: piece.h,
        backgroundColor: piece.color,
        rotate: piece.rot,
        opacity: 0,
      }}
      animate={{
        opacity: [0, 0.9, 0.7, 0],
        y: [0, -18, 10, -8],
        x: [0, piece.drift, -piece.drift * 0.4, piece.drift * 0.2],
        rotate: [piece.rot, piece.rot + 120, piece.rot + 240, piece.rot + 360],
        scale: [0.6, 1, 0.9, 0.7],
      }}
      transition={{
        duration: piece.duration,
        delay: piece.delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function ConfettiField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {CONFETTI_PIECES.map((p) => (
        <ConfettiPiece key={p.id} piece={p} />
      ))}
    </div>
  );
}

// ─── GoalCompletionHero ───────────────────────────────────────────────────────

function GoalCompletionHero({ icon }: { icon: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <div className="relative flex h-[160px] w-[160px] items-center justify-center">
      {/* Outer golden aura */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(circle, rgba(250,189,0,0.35) 0%, rgba(250,120,0,0.15) 50%, transparent 70%)",
          filter: "blur(6px)",
        }}
      />

      {/* Second pulse ring */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{ inset: -8, borderColor: "rgba(250,189,0,0.35)" }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />

      {/* Purple glow circle */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(108,58,237,0.6) 0%, transparent 70%)",
          filter: "blur(16px)",
        }}
      />

      {/* Main icon circle */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
        className="relative z-10 flex h-[140px] w-[140px] items-center justify-center rounded-full"
        style={{
          background: "linear-gradient(145deg, #5B21B6 0%, #7C3AED 40%, #6D28D9 100%)",
          boxShadow:
            "0 0 0 3px rgba(250,189,0,0.5), 0 0 40px rgba(108,58,237,0.7), 0 0 80px rgba(108,58,237,0.3)",
        }}
      >
        <span className="select-none text-[64px]">{icon}</span>
      </motion.div>

      {/* Sparkle dots */}
      {[
        { top: "4%", left: "20%", delay: 0.6, size: 5 },
        { top: "8%", right: "18%", delay: 1.1, size: 4 },
        { top: "45%", left: "2%", delay: 0.8, size: 3 },
        { top: "45%", right: "2%", delay: 1.4, size: 3 },
        { bottom: "8%", left: "22%", delay: 0.5, size: 4 },
        { bottom: "5%", right: "20%", delay: 1.2, size: 5 },
      ].map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{ ...s, width: s.size, height: s.size }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.4, 0.8] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── GoalAchievementBadge ─────────────────────────────────────────────────────

function GoalAchievementBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.7, type: "spring", stiffness: 300, damping: 22 }}
      className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[14px] font-semibold text-white"
      style={{
        background: "linear-gradient(135deg, #6C3AED 0%, #9B5CF6 50%, #EC4899 100%)",
        boxShadow: "0 4px 20px rgba(108,58,237,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset",
      }}
    >
      <CheckCircle2 size={16} strokeWidth={2.5} />
      Goal Achieved!
    </motion.div>
  );
}

// ─── GoalSummaryCard ──────────────────────────────────────────────────────────

function GoalSummaryCard({ goal, completedDate }: { goal: CompletionGoal; completedDate: string }) {
  const uid = useId().replace(/:/g, "");
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(100), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.4 }}
      className="overflow-hidden rounded-2xl border border-[#1E2B42]"
      style={{ background: "linear-gradient(135deg, #0F1730 0%, #0D1525 100%)" }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        {/* Left: icon + title */}
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-[22px]"
            style={{
              background: "linear-gradient(145deg, #5B21B6, #7C3AED)",
              boxShadow: "0 0 16px rgba(108,58,237,0.5)",
            }}
          >
            {goal.icon}
          </div>
          <div>
            <p className="text-[17px] font-bold text-white">{goal.title}</p>
            <p className="mt-0.5 text-[13px] text-[#5A6A85]">{completedDate}</p>
          </div>
        </div>

        {/* Right: amount */}
        <div className="flex-shrink-0 text-right">
          <p className="text-[22px] font-bold text-[#22C55E]">₹{fmt(goal.savedAmount)}</p>
          <p className="text-[13px] text-[#5A6A85]">of ₹{fmt(goal.targetAmount)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-4">
        <div className="relative h-3 overflow-hidden rounded-full bg-[#1A2438]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: "linear-gradient(90deg, #6C3AED 0%, #9B5CF6 40%, #EC4899 100%)",
              boxShadow: "0 0 12px rgba(236,72,153,0.5)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 1.2, delay: 1.4, ease: [0.34, 1.06, 0.64, 1] }}
          />
        </div>
        <div className="mt-1.5 flex justify-end">
          <motion.span
            className="text-[12px] font-semibold text-[#22C55E]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4 }}
          >
            100%
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── AchievementStatsGrid ─────────────────────────────────────────────────────

function StatCard({
  icon,
  iconBg,
  iconColor,
  title,
  value,
  valueColor,
  description,
  delay,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  value: string;
  valueColor: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, type: "spring", stiffness: 260, damping: 22 }}
      className="flex-1 rounded-2xl border border-[#1E2B42] p-5"
      style={{ background: "linear-gradient(145deg, #0F1730 0%, #0D1525 100%)" }}
    >
      <div
        className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: iconBg, border: `1px solid ${iconColor}30` }}
      >
        {icon}
      </div>
      <p className="mb-1 text-[12px] font-medium text-[#7A8BA8]">{title}</p>
      <p className="mb-1 text-[22px] font-bold leading-none" style={{ color: valueColor }}>
        {value}
      </p>
      <p className="text-[12px] text-[#5A6A85]">{description}</p>
    </motion.div>
  );
}

function AchievementStatsGrid({ goal, months }: { goal: CompletionGoal; months: number }) {
  const monthlyAvg = Math.round(goal.savedAmount / months);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="mb-4 flex items-center justify-center gap-2"
      >
        <Sparkles size={16} className="text-[#EAB308]" />
        <h3 className="text-[15px] font-semibold text-white">Your Amazing Achievement</h3>
      </motion.div>

      <div className="flex gap-3">
        <StatCard
          icon={<CheckCircle2 size={20} className="text-[#22C55E]" strokeWidth={2} />}
          iconBg="rgba(34,197,94,0.12)"
          iconColor="#22C55E"
          title="Total Saved"
          value={`₹${fmt(goal.savedAmount)}`}
          valueColor="#22C55E"
          description="100% of your target"
          delay={1.5}
        />
        <StatCard
          icon={<Calendar size={20} className="text-[#A855F7]" strokeWidth={2} />}
          iconBg="rgba(168,85,247,0.12)"
          iconColor="#A855F7"
          title="Completed In"
          value={`${months} Months`}
          valueColor="#C4B5FD"
          description="Ahead of your target"
          delay={1.65}
        />
        <StatCard
          icon={<Sparkles size={20} className="text-[#EAB308]" strokeWidth={2} />}
          iconBg="rgba(234,179,8,0.12)"
          iconColor="#EAB308"
          title="Monthly Average"
          value={`₹${fmt(monthlyAvg)}`}
          valueColor="#FCD34D"
          description="You stayed consistent!"
          delay={1.8}
        />
      </div>
    </div>
  );
}

// ─── WhatsNextCard ────────────────────────────────────────────────────────────

function WhatsNextCard({ onCreateNewGoal }: { onCreateNewGoal?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.0, duration: 0.4 }}
      className="flex items-center gap-4 rounded-2xl border border-[#1E2B42] px-5 py-4"
      style={{ background: "linear-gradient(135deg, #0F1730 0%, #0D1525 100%)" }}
    >
      <span className="flex-shrink-0 select-none text-[36px]">🥳</span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold text-white">What&apos;s next?</p>
        <p className="mt-0.5 text-[13px] text-[#5A6A85]">
          Set a new goal and keep your momentum going.
        </p>
      </div>
      <button
        onClick={onCreateNewGoal}
        className="h-10 flex-shrink-0 rounded-xl border border-[#6C3AED]/50 bg-[rgba(108,58,237,0.08)] px-5 text-[13.5px] font-medium text-[#C4B5FD] transition-all hover:border-[#7C3AED] hover:bg-[rgba(108,58,237,0.18)] hover:text-white"
      >
        Create New Goal
      </button>
    </motion.div>
  );
}

// ─── GoalCompletionActions ────────────────────────────────────────────────────

function GoalCompletionActions({
  onViewSummary,
  onCelebrate,
}: {
  onViewSummary?: () => void;
  onCelebrate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.2, duration: 0.35 }}
      className="flex gap-3 pt-1"
    >
      <button
        onClick={onViewSummary}
        className="h-13 flex-1 rounded-xl border border-[#1E2B42] bg-[#0D1525] py-3.5 text-[14.5px] font-semibold text-white transition-all hover:border-[#2A3A54] hover:bg-[#111B2D]"
      >
        View Goal Summary
      </button>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onCelebrate}
        className="h-13 relative flex-1 overflow-hidden rounded-xl py-3.5 text-[14.5px] font-bold text-white transition-all"
        style={{
          background: "linear-gradient(135deg, #6C3AED 0%, #9B5CF6 40%, #EC4899 100%)",
          boxShadow: "0 8px 32px rgba(108,58,237,0.55), 0 0 0 1px rgba(255,255,255,0.1) inset",
        }}
      >
        {/* Shimmer sweep */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
          }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
        />
        <span className="relative z-10">Awesome! Let&apos;s Celebrate 🎉</span>
      </motion.button>
    </motion.div>
  );
}

// ─── GoalCompletionDialog (main) ──────────────────────────────────────────────

export function GoalCompletionDialog({
  open,
  goal,
  userName = "Saqib",
  onClose,
  onViewSummary,
  onCreateNewGoal,
}: GoalCompletionDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!goal) return null;

  const completionMonths = monthsBetween(goal.createdAt, goal.completedAt);
  const completedDateStr = `Completed on ${formatDate(goal.completedAt)}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Scroll container */}
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", damping: 26, stiffness: 340 }}
              style={{ maxWidth: 680 }}
              className="relative my-auto w-full overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Goal achievement: ${goal.title}`}
            >
              {/* ── Background gradient ── */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, #0D0B1E 0%, #0A0E1A 40%, #080C14 100%)",
                }}
              />

              {/* Purple center glow */}
              <div
                className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
                style={{
                  width: 500,
                  height: 300,
                  background:
                    "radial-gradient(ellipse, rgba(108,58,237,0.28) 0%, rgba(108,58,237,0.08) 50%, transparent 70%)",
                  filter: "blur(1px)",
                }}
              />

              {/* Pink glow - bottom-left */}
              <div
                className="pointer-events-none absolute -left-20 bottom-32"
                style={{
                  width: 300,
                  height: 300,
                  background: "radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)",
                }}
              />

              {/* Gold glow - top right area */}
              <div
                className="pointer-events-none absolute right-8 top-8"
                style={{
                  width: 200,
                  height: 200,
                  background: "radial-gradient(circle, rgba(250,189,0,0.07) 0%, transparent 70%)",
                }}
              />

              {/* Confetti */}
              <ConfettiField />

              {/* Close button */}
              <div className="relative z-20">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#1E2B42] bg-[#111B2D] text-[#5A6A85] transition-all hover:border-[#2A3A55] hover:bg-[#1A2540] hover:text-white focus:outline-none"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* ── Content ── */}
              <div className="relative z-10 space-y-5 px-7 pb-7 pt-10">
                {/* Hero section */}
                <div className="flex flex-col items-center gap-4">
                  <GoalCompletionHero icon={goal.icon} />
                  <GoalAchievementBadge />

                  <div className="space-y-2 text-center">
                    <motion.h1
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9, duration: 0.4 }}
                      className="text-[34px] font-bold leading-tight tracking-tight text-white"
                    >
                      Congratulations, {userName}! 🎉
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.05, duration: 0.4 }}
                      className="mx-auto max-w-[500px] text-[15px] leading-relaxed text-[#7A8BA8]"
                    >
                      You&apos;ve reached your goal.{" "}
                      <span className="block">
                        Your discipline today will take you to more amazing places.
                      </span>
                    </motion.p>
                  </div>
                </div>

                {/* Goal Summary Card */}
                <GoalSummaryCard goal={goal} completedDate={completedDateStr} />

                {/* Achievement Stats */}
                <AchievementStatsGrid goal={goal} months={completionMonths} />

                {/* What's Next */}
                <WhatsNextCard
                  onCreateNewGoal={() => {
                    onClose();
                    onCreateNewGoal?.();
                  }}
                />

                {/* Footer Actions */}
                <GoalCompletionActions
                  onViewSummary={() => {
                    onClose();
                    onViewSummary?.(goal.id);
                  }}
                  onCelebrate={onClose}
                />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
