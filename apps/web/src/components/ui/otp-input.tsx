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

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

// A fixed-length numeric code input built from `length` single-digit boxes.
// Deliberately hand-rolled rather than pulling in the `input-otp` package:
// this repo has stayed on native inputs + @base-ui/react primitives rather
// than accreting UI libraries, and a one-time 6-box control isn't worth a
// new dependency (and the license-compatibility review that would invite).
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  error = false,
  autoFocus = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRefs.current[0]?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  function setDigit(index: number, digit: string) {
    const chars = value.padEnd(length, " ").split("");
    chars[index] = digit;
    const next = chars.join("").replace(/ +$/, "");
    onChange(next);
    if (next.length === length && !next.includes(" ")) {
      onComplete?.(next);
    }
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setDigit(index, "");
      return;
    }
    // Handle a paste (or fast typing) landing multiple digits in one box by
    // distributing them across this box and the ones after it.
    const chars = value.padEnd(length, " ").split("");
    for (let i = 0; i < digits.length && index + i < length; i++) {
      chars[index + i] = digits[i];
    }
    const next = chars.join("").replace(/ +$/, "");
    onChange(next);
    const nextIndex = Math.min(index + digits.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
    if (next.length === length && !next.includes(" ")) {
      onComplete?.(next);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (value[index]) {
        setDigit(index, "");
      } else if (index > 0) {
        e.preventDefault();
        setDigit(index - 1, "");
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;
    e.preventDefault();
    handleChange(index, pasted);
  }

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="Verification code">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          value={value[i] ?? ""}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          className={cn(
            "h-12 w-11 rounded-lg border bg-[#0F1623] text-center text-lg text-white transition-all",
            "focus:ring-2 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-[#F87171]/50 focus:border-[#F87171]/70 focus:ring-[#F87171]/20"
              : "border-[#1E2B42] focus:border-[#6C3AED] focus:ring-[#6C3AED]/25",
          )}
        />
      ))}
    </div>
  );
}
