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

import { useQuery } from "@tanstack/react-query";

import { search } from "@/lib/api/search";
import { qk } from "@/lib/query-keys";
import type { ApiSearchResults } from "@/lib/api/types";
import { useDebouncedValue } from "./use-debounced-value";

/** Minimum query length before a search request is issued (matches the API). */
export const MIN_SEARCH_LEN = 2;

const EMPTY_RESULTS: ApiSearchResults = {
  transactions: [],
  accounts: [],
  envelopes: [],
  budgets: [],
};

/**
 * Debounced global search scoped to the active budget. Returns empty results
 * (and issues no request) until the trimmed query reaches MIN_SEARCH_LEN.
 */
export function useSearch(budgetId: number | null, query: string) {
  const debounced = useDebouncedValue(query.trim(), 250);
  const enabled = budgetId != null && debounced.length >= MIN_SEARCH_LEN;

  const result = useQuery({
    queryKey: qk.search(budgetId ?? -1, debounced),
    queryFn: () => search(budgetId as number, debounced),
    enabled,
    staleTime: 30_000,
  });

  return {
    results: result.data ?? EMPTY_RESULTS,
    isLoading: enabled && result.isLoading,
    isActive: enabled,
  };
}
