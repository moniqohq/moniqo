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
import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConnectedAccountsView } from "@/components/settings/ConnectedAccountsView";

export const metadata = { title: "Connected accounts — Moniqo" };

export default function ConnectionsPage() {
  return (
    <div className="layout-page space-y-6 py-6">
      <PageHeader
        title="Connected accounts"
        description="Manage the third-party accounts linked to your Moniqo login."
        actions={
          <Link
            href="/settings"
            className="flex items-center gap-1 text-[13px] font-medium text-[#8B5CF6] hover:text-[#A78BFA]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to settings
          </Link>
        }
      />
      <Suspense>
        <ConnectedAccountsView />
      </Suspense>
    </div>
  );
}
