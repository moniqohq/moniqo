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

// Loads Facebook's JS SDK on demand — not on page load, and never eagerly —
// so no request to connect.facebook.net happens until a visitor actually
// chooses Facebook. The SDK's `authResponse.accessToken` it hands back is
// never trusted as an identity by itself: the backend re-verifies it against
// Facebook's Graph API before anything about the user is trusted (see
// docs/apis/06-auth-oidc-api.md, "Facebook Token Flow").

declare global {
  interface Window {
    FB?: {
      init(params: { appId: string; cookie: boolean; xfbml: boolean; version: string }): void;
      login(callback: (response: FacebookLoginStatusResponse) => void, options?: { scope?: string }): void;
    };
  }
}

interface FacebookLoginStatusResponse {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: { accessToken: string };
}

// Pinned to match the version the backend's debug_token/me calls use
// (internal/auth/oidc/facebook/facebook.go) — not load-bearing for
// correctness, but keeps both sides talking about the same API surface.
const FACEBOOK_SDK_VERSION = "v21.0";
const FACEBOOK_SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";

let sdkReady: Promise<void> | null = null;

function loadFacebookSdkOnce(): Promise<void> {
  return new Promise((resolve, reject) => {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId) {
      reject(new Error("facebook login is not configured"));
      return;
    }

    const script = document.createElement("script");
    script.src = FACEBOOK_SDK_SRC;
    script.async = true;
    script.onload = () => {
      if (!window.FB) {
        reject(new Error("facebook sdk failed to initialize"));
        return;
      }
      // cookie: false and xfbml: false deliberately — Moniqo's own session
      // (Zustand + HttpOnly refresh cookie) is the only session that
      // matters here, and there is no Facebook social-plugin markup to
      // parse. logPageView() from Facebook's stock snippet is omitted too:
      // it ships a page-view event to Meta on every load, which this app
      // has no reason to do.
      window.FB.init({ appId, cookie: false, xfbml: false, version: FACEBOOK_SDK_VERSION });
      resolve();
    };
    script.onerror = () => reject(new Error("failed to load facebook sdk"));
    document.body.appendChild(script);
  });
}

async function loadFacebookSdk(): Promise<void> {
  if (window.FB) return;
  sdkReady ??= loadFacebookSdkOnce();
  try {
    await sdkReady;
  } catch (err) {
    sdkReady = null; // let a later click retry instead of failing forever
    throw err;
  }
}

// facebookLogin resolves to an access token, or null if the visitor
// dismissed the popup or declined permission — callers should treat null as
// a silent no-op, not an error.
export async function facebookLogin(): Promise<string | null> {
  await loadFacebookSdk();
  return new Promise((resolve) => {
    window.FB!.login(
      (response) => {
        resolve(response.status === "connected" ? (response.authResponse?.accessToken ?? null) : null);
      },
      { scope: "email,public_profile" },
    );
  });
}
