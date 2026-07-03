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
import { ReconcileAccountView } from "@/components/accounts/ReconcileAccountView";

export const metadata = { title: "Reconcile Account — Moniqo" };

interface Props {
  params: Promise<{ budgetId: string; accountId: string }>;
}

export default async function ReconcileAccountPage({ params }: Props) {
  const { budgetId, accountId } = await params;
  return (
    <ReconcileAccountView budgetId={parseInt(budgetId, 10)} accountId={parseInt(accountId, 10)} />
  );
}
