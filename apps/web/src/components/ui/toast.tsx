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

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { zIndex } from "@/constants/tokens";

export type ToastType = "success" | "warning" | "error";

const ICON_BY_TYPE: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={12} className="text-[#22C55E]" />,
  warning: <AlertTriangle size={12} className="text-[#F59E0B]" />,
  error: <AlertTriangle size={12} className="text-[#EF4444]" />,
};

const BORDER_BG_BY_TYPE: Record<ToastType, string> = {
  success: "border-[#22C55E]/30 bg-[#0B1A10]",
  warning: "border-[#F59E0B]/30 bg-[#1A1408]",
  error: "border-[#EF4444]/30 bg-[#1A0808]",
};

const ICON_BG_BY_TYPE: Record<ToastType, string> = {
  success: "bg-[#22C55E]/15",
  warning: "bg-[#F59E0B]/15",
  error: "bg-[#EF4444]/15",
};

const TEXT_BY_TYPE: Record<ToastType, string> = {
  success: "text-[#4ADE80]",
  warning: "text-[#FBBF24]",
  error: "text-[#FCA5A5]",
};

export interface ToastState {
  type: ToastType;
  message: string;
}

/**
 * Shared toast, extracted from the goals delete flow
 * (components/goals/DeleteGoalDialog.tsx) so other features don't need to
 * copy the same fixed-position banner. Uses the app's reserved toast z-index
 * (constants/tokens.ts).
 */
export function Toast({
  show,
  type,
  message,
}: {
  show: boolean;
  type: ToastType;
  message: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          style={{ zIndex: zIndex.toast }}
          className={cn(
            "fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 shadow-xl shadow-black/50",
            BORDER_BG_BY_TYPE[type],
          )}
        >
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full",
              ICON_BG_BY_TYPE[type],
            )}
          >
            {ICON_BY_TYPE[type]}
          </div>
          <span className={cn("text-[13px] font-medium", TEXT_BY_TYPE[type])}>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Holds the current toast and shows it for `durationMs` before hiding. */
export function useToast(durationMs = 3000) {
  const [state, setState] = useState<ToastState | null>(null);
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState({ type, message });
      setShow(true);
      timeoutRef.current = setTimeout(() => setShow(false), durationMs);
    },
    [durationMs],
  );

  return {
    toast: state,
    show,
    showToast,
    ToastNode: state ? <Toast show={show} type={state.type} message={state.message} /> : null,
  };
}
