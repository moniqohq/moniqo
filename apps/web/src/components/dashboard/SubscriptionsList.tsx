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
import { RefreshCw } from "lucide-react";

export function SubscriptionsList() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-5 py-8 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: "rgba(108,58,237,0.12)" }}
      >
        <RefreshCw size={22} className="text-[#6C3AED]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#A8B4CC]">Subscriptions coming soon</p>
        <p className="mt-1 text-[12px] text-[#3A4A60]">Track recurring expenses here</p>
      </div>
    </div>
  );
}
