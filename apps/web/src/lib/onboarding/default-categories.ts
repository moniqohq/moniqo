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

// Suggested envelope-budgeting starter categories for wizard step 5.
// Grouping is purely a visual affordance here — envelopes are created flat
// via the existing POST /envelopes endpoint; there is no group concept in
// the backend schema.

export interface DefaultCategory {
  group: string;
  title: string;
  description: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    group: "Immediate Obligations",
    title: "Rent/Mortgage",
    description: "Monthly housing payment",
  },
  { group: "Immediate Obligations", title: "Electricity", description: "Power bill" },
  { group: "Immediate Obligations", title: "Water", description: "Water and sewage" },
  { group: "Immediate Obligations", title: "Internet", description: "Home internet service" },
  { group: "Immediate Obligations", title: "Phone", description: "Mobile and landline" },
  {
    group: "Immediate Obligations",
    title: "Groceries",
    description: "Food and household supplies",
  },
  {
    group: "Immediate Obligations",
    title: "Transportation",
    description: "Fuel, transit, rideshare",
  },
  {
    group: "Immediate Obligations",
    title: "Insurance",
    description: "Health, auto, home insurance",
  },
  { group: "True Expenses", title: "Car Maintenance", description: "Repairs and servicing" },
  { group: "True Expenses", title: "Home Maintenance", description: "Repairs and upkeep" },
  { group: "True Expenses", title: "Medical", description: "Doctor visits and prescriptions" },
  { group: "True Expenses", title: "Gifts", description: "Birthdays, holidays, celebrations" },
  { group: "True Expenses", title: "Annual Subscriptions", description: "Yearly renewals" },
  { group: "True Expenses", title: "Emergency Fund", description: "Unplanned expenses" },
  { group: "Quality of Life", title: "Dining Out", description: "Restaurants and takeout" },
  { group: "Quality of Life", title: "Entertainment", description: "Movies, streaming, events" },
  { group: "Quality of Life", title: "Hobbies", description: "Personal interests" },
  { group: "Quality of Life", title: "Personal Care", description: "Haircuts, grooming, wellness" },
  { group: "Quality of Life", title: "Travel", description: "Trips and vacations" },
  { group: "Quality of Life", title: "Miscellaneous", description: "Everything else" },
];

export const DEFAULT_CATEGORY_GROUPS = [
  "Immediate Obligations",
  "True Expenses",
  "Quality of Life",
] as const;
