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

import type { WireNature } from "@/lib/envelope-nature";

// Suggested envelope-budgeting starter categories for wizard step 5.
// Grouping is purely a visual affordance here — envelopes are created flat
// via the existing POST /envelopes endpoint; there is no group concept in
// the backend schema.
//
// `nature` classifies each starter envelope on the want/should/need/must
// scale. It must be supplied at creation: the API sets nature once and
// rejects any later change via PUT or PATCH, so an envelope created without
// one stays unclassified forever.

export interface DefaultCategory {
  group: string;
  title: string;
  description: string;
  nature: WireNature;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    group: "Immediate Obligations",
    title: "Rent/Mortgage",
    description: "Monthly housing payment",
    nature: "must",
  },
  {
    group: "Immediate Obligations",
    title: "Electricity",
    description: "Power bill",
    nature: "must",
  },
  {
    group: "Immediate Obligations",
    title: "Water",
    description: "Water and sewage",
    nature: "must",
  },
  {
    group: "Immediate Obligations",
    title: "Internet",
    description: "Home internet service",
    nature: "need",
  },
  {
    group: "Immediate Obligations",
    title: "Phone",
    description: "Mobile and landline",
    nature: "need",
  },
  {
    group: "Immediate Obligations",
    title: "Groceries",
    description: "Food and household supplies",
    nature: "must",
  },
  {
    group: "Immediate Obligations",
    title: "Transportation",
    description: "Fuel, transit, rideshare",
    nature: "need",
  },
  {
    group: "Immediate Obligations",
    title: "Insurance",
    description: "Health, auto, home insurance",
    nature: "must",
  },
  {
    group: "True Expenses",
    title: "Car Maintenance",
    description: "Repairs and servicing",
    nature: "need",
  },
  {
    group: "True Expenses",
    title: "Home Maintenance",
    description: "Repairs and upkeep",
    nature: "should",
  },
  {
    group: "True Expenses",
    title: "Medical",
    description: "Doctor visits and prescriptions",
    nature: "must",
  },
  {
    group: "True Expenses",
    title: "Gifts",
    description: "Birthdays, holidays, celebrations",
    nature: "want",
  },
  {
    group: "True Expenses",
    title: "Annual Subscriptions",
    description: "Yearly renewals",
    nature: "should",
  },
  {
    group: "True Expenses",
    title: "Emergency Fund",
    description: "Unplanned expenses",
    nature: "should",
  },
  {
    group: "Quality of Life",
    title: "Dining Out",
    description: "Restaurants and takeout",
    nature: "want",
  },
  {
    group: "Quality of Life",
    title: "Entertainment",
    description: "Movies, streaming, events",
    nature: "want",
  },
  { group: "Quality of Life", title: "Hobbies", description: "Personal interests", nature: "want" },
  {
    group: "Quality of Life",
    title: "Personal Care",
    description: "Haircuts, grooming, wellness",
    nature: "should",
  },
  { group: "Quality of Life", title: "Travel", description: "Trips and vacations", nature: "want" },
  {
    group: "Quality of Life",
    title: "Miscellaneous",
    description: "Everything else",
    nature: "want",
  },
];

export const DEFAULT_CATEGORY_GROUPS = [
  "Immediate Obligations",
  "True Expenses",
  "Quality of Life",
] as const;
