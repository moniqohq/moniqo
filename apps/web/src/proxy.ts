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

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { disabledFeatureRoutes } from "@/features/feature-flags";

const AUTH_COOKIE = "moniqo_refresh";

const PROTECTED_PATHS = [
  "/dashboard",
  "/accounts",
  "/budgets",
  "/envelopes",
  "/transactions",
  "/goals",
  "/reports",
  "/settings",
];
const AUTH_PATHS = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && token) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const disabled = disabledFeatureRoutes();
  if (disabled.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/accounts/:path*",
    "/budgets/:path*",
    "/envelopes/:path*",
    "/transactions/:path*",
    "/goals/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
