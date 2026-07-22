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

import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

// The backend's `POST /api/v1/auth/link/:provider` requires a Bearer JWT, but
// the access token is memory-only in the browser (never a cookie) and this
// step must end in a real top-level browser navigation to the identity
// provider (so the resulting flow cookie and provider login UI behave like
// any other same-site navigation, exactly as the unauthenticated login flow
// already does). A plain `<a href>`/`location.href` navigation can't carry a
// custom header, so this route bridges the two: it receives the token from a
// same-origin form POST, forwards it to the backend as an Authorization
// header, and turns the backend's redirect (plus its flow cookie) into a
// redirect from our own origin that the browser follows natively.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const form = await req.formData();
  const token = form.get("token");

  if (typeof token !== "string" || token === "") {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  }

  const backendRes = await fetch(
    `${BACKEND_BASE_URL}/api/v1/auth/link/${encodeURIComponent(provider)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      redirect: "manual",
    },
  );

  const location = backendRes.headers.get("location");
  if (!location || backendRes.status < 300 || backendRes.status >= 400) {
    return NextResponse.redirect(new URL("/settings/connections?error=oauth_failed", req.url));
  }

  const redirectRes = NextResponse.redirect(location, 302);
  const setCookie = backendRes.headers.get("set-cookie");
  if (setCookie) redirectRes.headers.set("set-cookie", setCookie);
  return redirectRes;
}
