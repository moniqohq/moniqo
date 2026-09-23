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

/**
 * Fans a single-item async operation out over many items, with a bounded
 * number in flight at once, and never rejects — every outcome (success or
 * failure) is reported per item instead. There is no backend bulk endpoint
 * for transactions, so this is how the UI composes existing single-resource
 * endpoints (PATCH/DELETE by id) into a "bulk" action while still reporting
 * which items failed, rather than collapsing everything into one all-or-
 * nothing error.
 */

export interface BulkResult<T> {
  succeeded: T[];
  failed: { item: T; error: string }[];
}

export interface RunBulkOptions {
  /** Maximum number of operations in flight at once. Defaults to 6. */
  concurrency?: number;
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unexpected error";
}

/**
 * Runs `fn` for every item in `items`, at most `concurrency` at a time.
 * Resolves once every item has settled — it never rejects.
 */
export async function runBulk<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  options: RunBulkOptions = {},
): Promise<BulkResult<T>> {
  const concurrency = Math.max(1, options.concurrency ?? 6);
  const succeeded: T[] = [];
  const failed: { item: T; error: string }[] = [];

  let next = 0;
  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      try {
        await fn(item);
        succeeded.push(item);
      } catch (err) {
        failed.push({ item, error: toErrorMessage(err) });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);

  return { succeeded, failed };
}
