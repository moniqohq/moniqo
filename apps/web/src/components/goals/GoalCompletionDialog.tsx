'use client'

import { useState, useEffect, useId } from 'react'
import { motion, AnimatePresence, useAnimate, stagger } from 'framer-motion'
import { X, CheckCircle2, Calendar, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompletionGoal {
  id: string
  title: string
  icon: string
  targetAmount: number
  savedAmount: number
  completedAt: Date
  createdAt: Date
}

export interface GoalCompletionDialogProps {
  open: boolean
  goal: CompletionGoal | null
  userName?: string
  onClose: () => void
  onViewSummary?: (id: string) => void
  onCreateNewGoal?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-IN')
}

function monthsBetween(a: Date, b: Date) {
  return Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth())
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Confetti Pieces ──────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#7C3AED', '#A855F7', '#EC4899', '#F472B6',
  '#3B82F6', '#60A5FA', '#EAB308', '#FCD34D',
  '#06B6D4', '#F97316',
]

interface ConfettiPiece {
  id: number
  x: number
  y: number
  rot: number
  color: string
  w: number
  h: number
  delay: number
  duration: number
  drift: number
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
  }))
}

const CONFETTI_PIECES = makeConfetti(32)

function ConfettiPiece({ piece }: { piece: ConfettiPiece }) {
  return (
    <motion.div
      className="absolute rounded-[2px] pointer-events-none"
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
        ease: 'easeInOut',
      }}
    />
  )
}

function ConfettiField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {CONFETTI_PIECES.map(p => <ConfettiPiece key={p.id} piece={p} />)}
    </div>
  )
}

// ─── GoalCompletionHero ───────────────────────────────────────────────────────

function GoalCompletionHero({ icon }: { icon: string }) {
  const uid = useId().replace(/:/g, '')
  return (
    <div className="relative flex items-center justify-center w-[160px] h-[160px]">
      {/* Outer golden aura */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'radial-gradient(circle, rgba(250,189,0,0.35) 0%, rgba(250,120,0,0.15) 50%, transparent 70%)',
          filter: 'blur(6px)',
        }}
      />

      {/* Second pulse ring */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{ inset: -8, borderColor: 'rgba(250,189,0,0.35)' }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      />

      {/* Purple glow circle */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(108,58,237,0.6) 0%, transparent 70%)',
          filter: 'blur(16px)',
        }}
      />

      {/* Main icon circle */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
        className="relative w-[140px] h-[140px] rounded-full flex items-center justify-center z-10"
        style={{
          background: 'linear-gradient(145deg, #5B21B6 0%, #7C3AED 40%, #6D28D9 100%)',
          boxShadow: '0 0 0 3px rgba(250,189,0,0.5), 0 0 40px rgba(108,58,237,0.7), 0 0 80px rgba(108,58,237,0.3)',
        }}
      >
        <span className="text-[64px] select-none">{icon}</span>
      </motion.div>

      {/* Sparkle dots */}
      {[
        { top: '4%',  left: '20%', delay: 0.6, size: 5 },
        { top: '8%',  right: '18%', delay: 1.1, size: 4 },
        { top: '45%', left: '2%',  delay: 0.8, size: 3 },
        { top: '45%', right: '2%', delay: 1.4, size: 3 },
        { bottom: '8%', left: '22%', delay: 0.5, size: 4 },
        { bottom: '5%', right: '20%', delay: 1.2, size: 5 },
      ].map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{ ...s, width: s.size, height: s.size }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.4, 0.8] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ─── GoalAchievementBadge ─────────────────────────────────────────────────────

function GoalAchievementBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.7, type: 'spring', stiffness: 300, damping: 22 }}
      className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-white text-[14px] font-semibold"
      style={{
        background: 'linear-gradient(135deg, #6C3AED 0%, #9B5CF6 50%, #EC4899 100%)',
        boxShadow: '0 4px 20px rgba(108,58,237,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset',
      }}
    >
      <CheckCircle2 size={16} strokeWidth={2.5} />
      Goal Achieved!
    </motion.div>
  )
}

// ─── GoalSummaryCard ──────────────────────────────────────────────────────────

function GoalSummaryCard({ goal, completedDate }: { goal: CompletionGoal; completedDate: string }) {
  const uid = useId().replace(/:/g, '')
  const [barWidth, setBarWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(100), 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.4 }}
      className="rounded-2xl border border-[#1E2B42] overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0F1730 0%, #0D1525 100%)' }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        {/* Left: icon + title */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-[22px] flex-shrink-0"
            style={{
              background: 'linear-gradient(145deg, #5B21B6, #7C3AED)',
              boxShadow: '0 0 16px rgba(108,58,237,0.5)',
            }}
          >
            {goal.icon}
          </div>
          <div>
            <p className="text-[17px] font-bold text-white">{goal.title}</p>
            <p className="text-[13px] text-[#5A6A85] mt-0.5">{completedDate}</p>
          </div>
        </div>

        {/* Right: amount */}
        <div className="text-right flex-shrink-0">
          <p className="text-[22px] font-bold text-[#22C55E]">₹{fmt(goal.savedAmount)}</p>
          <p className="text-[13px] text-[#5A6A85]">of ₹{fmt(goal.targetAmount)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-4">
        <div className="relative h-3 bg-[#1A2438] rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #6C3AED 0%, #9B5CF6 40%, #EC4899 100%)',
              boxShadow: '0 0 12px rgba(236,72,153,0.5)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 1.2, delay: 1.4, ease: [0.34, 1.06, 0.64, 1] }}
          />
        </div>
        <div className="flex justify-end mt-1.5">
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
  )
}

// ─── AchievementStatsGrid ─────────────────────────────────────────────────────

function StatCard({
  icon, iconBg, iconColor, title, value, valueColor, description, delay,
}: {
  icon: React.ReactNode; iconBg: string; iconColor: string
  title: string; value: string; valueColor: string
  description: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 260, damping: 22 }}
      className="flex-1 rounded-2xl border border-[#1E2B42] p-5"
      style={{ background: 'linear-gradient(145deg, #0F1730 0%, #0D1525 100%)' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: iconBg, border: `1px solid ${iconColor}30` }}
      >
        {icon}
      </div>
      <p className="text-[12px] text-[#7A8BA8] font-medium mb-1">{title}</p>
      <p className="text-[22px] font-bold leading-none mb-1" style={{ color: valueColor }}>
        {value}
      </p>
      <p className="text-[12px] text-[#5A6A85]">{description}</p>
    </motion.div>
  )
}

function AchievementStatsGrid({ goal, months }: { goal: CompletionGoal; months: number }) {
  const monthlyAvg = Math.round(goal.savedAmount / months)

  return (
    <div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="flex items-center justify-center gap-2 mb-4"
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
  )
}

// ─── WhatsNextCard ────────────────────────────────────────────────────────────

function WhatsNextCard({ onCreateNewGoal }: { onCreateNewGoal?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.0, duration: 0.4 }}
      className="flex items-center gap-4 rounded-2xl border border-[#1E2B42] px-5 py-4"
      style={{ background: 'linear-gradient(135deg, #0F1730 0%, #0D1525 100%)' }}
    >
      <span className="text-[36px] flex-shrink-0 select-none">🥳</span>
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-bold text-white">What's next?</p>
        <p className="text-[13px] text-[#5A6A85] mt-0.5">Set a new goal and keep your momentum going.</p>
      </div>
      <button
        onClick={onCreateNewGoal}
        className="flex-shrink-0 h-10 px-5 rounded-xl text-[13.5px] font-medium text-[#C4B5FD] border border-[#6C3AED]/50 bg-[rgba(108,58,237,0.08)] hover:bg-[rgba(108,58,237,0.18)] hover:border-[#7C3AED] hover:text-white transition-all"
      >
        Create New Goal
      </button>
    </motion.div>
  )
}

// ─── GoalCompletionActions ────────────────────────────────────────────────────

function GoalCompletionActions({ onViewSummary, onCelebrate }: {
  onViewSummary?: () => void; onCelebrate: () => void
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
        className="flex-1 h-13 py-3.5 rounded-xl text-[14.5px] font-semibold text-white border border-[#1E2B42] bg-[#0D1525] hover:bg-[#111B2D] hover:border-[#2A3A54] transition-all"
      >
        View Goal Summary
      </button>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onCelebrate}
        className="flex-1 h-13 py-3.5 rounded-xl text-[14.5px] font-bold text-white transition-all relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #6C3AED 0%, #9B5CF6 40%, #EC4899 100%)',
          boxShadow: '0 8px 32px rgba(108,58,237,0.55), 0 0 0 1px rgba(255,255,255,0.1) inset',
        }}
      >
        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
          }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
        />
        <span className="relative z-10">Awesome! Let's Celebrate 🎉</span>
      </motion.button>
    </motion.div>
  )
}

// ─── GoalCompletionDialog (main) ──────────────────────────────────────────────

export function GoalCompletionDialog({
  open, goal, userName = 'Saqib', onClose, onViewSummary, onCreateNewGoal,
}: GoalCompletionDialogProps) {

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!goal) return null

  const completionMonths = monthsBetween(goal.createdAt, goal.completedAt)
  const completedDateStr = `Completed on ${formatDate(goal.completedAt)}`

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Scroll container */}
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-4 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              style={{ maxWidth: 680 }}
              className="relative w-full my-auto rounded-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Goal achievement: ${goal.title}`}
            >
              {/* ── Background gradient ── */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, #0D0B1E 0%, #0A0E1A 40%, #080C14 100%)',
                }}
              />

              {/* Purple center glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
                style={{
                  width: 500, height: 300,
                  background: 'radial-gradient(ellipse, rgba(108,58,237,0.28) 0%, rgba(108,58,237,0.08) 50%, transparent 70%)',
                  filter: 'blur(1px)',
                }}
              />

              {/* Pink glow - bottom-left */}
              <div
                className="absolute bottom-32 -left-20 pointer-events-none"
                style={{
                  width: 300, height: 300,
                  background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
                }}
              />

              {/* Gold glow - top right area */}
              <div
                className="absolute top-8 right-8 pointer-events-none"
                style={{
                  width: 200, height: 200,
                  background: 'radial-gradient(circle, rgba(250,189,0,0.07) 0%, transparent 70%)',
                }}
              />

              {/* Confetti */}
              <ConfettiField />

              {/* Close button */}
              <div className="relative z-20">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#111B2D] border border-[#1E2B42] flex items-center justify-center text-[#5A6A85] hover:text-white hover:bg-[#1A2540] hover:border-[#2A3A55] transition-all focus:outline-none"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* ── Content ── */}
              <div className="relative z-10 px-7 pt-10 pb-7 space-y-5">

                {/* Hero section */}
                <div className="flex flex-col items-center gap-4">
                  <GoalCompletionHero icon={goal.icon} />
                  <GoalAchievementBadge />

                  <div className="text-center space-y-2">
                    <motion.h1
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9, duration: 0.4 }}
                      className="text-[34px] font-bold text-white leading-tight tracking-tight"
                    >
                      Congratulations, {userName}! 🎉
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.05, duration: 0.4 }}
                      className="text-[15px] text-[#7A8BA8] leading-relaxed max-w-[500px] mx-auto"
                    >
                      You've reached your goal.{' '}
                      <span className="block">Your discipline today will take you to more amazing places.</span>
                    </motion.p>
                  </div>
                </div>

                {/* Goal Summary Card */}
                <GoalSummaryCard goal={goal} completedDate={completedDateStr} />

                {/* Achievement Stats */}
                <AchievementStatsGrid goal={goal} months={completionMonths} />

                {/* What's Next */}
                <WhatsNextCard onCreateNewGoal={() => { onClose(); onCreateNewGoal?.() }} />

                {/* Footer Actions */}
                <GoalCompletionActions
                  onViewSummary={() => { onClose(); onViewSummary?.(goal.id) }}
                  onCelebrate={onClose}
                />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
