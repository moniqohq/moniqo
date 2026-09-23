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

// Envelope "nature" classifies an envelope's spending category on a
// want/should/need/must scale. It is set once at creation and is immutable
// thereafter — the API rejects any attempt to change it via PUT or PATCH.

/** Wire/DB representation, as sent to and returned by the API. */
export type WireNature = "want" | "should" | "need" | "must";

/** UI representation used by the envelope modals (capitalized labels). */
export type Nature = "Want" | "Should" | "Need" | "Must";

export function toWireNature(nature: Nature): WireNature {
  return nature.toLowerCase() as WireNature;
}

export function fromWireNature(nature: WireNature | null | undefined): Nature | "" {
  switch (nature) {
    case "want":
      return "Want";
    case "should":
      return "Should";
    case "need":
      return "Need";
    case "must":
      return "Must";
    default:
      return "";
  }
}
