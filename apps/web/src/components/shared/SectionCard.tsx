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
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  noHeaderBorder?: boolean;
}

export function SectionCard({
  title,
  description,
  actions,
  icon: Icon,
  iconColor = "#6C3AED",
  iconBg = "rgba(108,58,237,0.15)",
  children,
  className,
  noPadding,
  noHeaderBorder,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]",
        className,
      )}
    >
      {(title || actions || Icon) && (
        <div
          className={cn(
            "flex items-center justify-between px-5 py-4",
            !noHeaderBorder && "border-b border-[#1E2B42]",
          )}
        >
          <div>
            {title && <h2 className="text-[14px] font-semibold text-white">{title}</h2>}
            {description && <p className="mt-0.5 text-[12px] text-[#5A6A85]">{description}</p>}
          </div>
          {(actions || Icon) && (
            <div className="flex items-center gap-2">
              {actions}
              {Icon && (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: iconBg }}
                >
                  <Icon size={18} style={{ color: iconColor }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className={cn("flex-1", noPadding ? "" : "p-5")}>{children}</div>
    </div>
  );
}
