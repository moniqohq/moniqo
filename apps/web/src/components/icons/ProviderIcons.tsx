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

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

export function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="#1877F2" aria-hidden>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.885v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

export type OidcProvider = "google" | "microsoft" | "facebook";

// "redirect" providers navigate to /api/v1/auth/login/:provider and log in
// via the backend's OIDC redirect flow. "facebook" is "sdk": there is no
// redirect endpoint for it at all — the caller must use the Facebook JS SDK
// (see @/lib/facebook-sdk) and POST the resulting access token to
// /api/v1/auth/facebook/login or /link instead. See
// docs/apis/06-auth-oidc-api.md for why.
export type OidcProviderKind = "redirect" | "sdk";

interface OidcProviderMeta {
  id: OidcProvider;
  label: string;
  icon: React.ReactNode;
  kind: OidcProviderKind;
}

const ALL_OIDC_PROVIDERS: OidcProviderMeta[] = [
  { id: "google", label: "Google", icon: <GoogleIcon />, kind: "redirect" },
  { id: "microsoft", label: "Microsoft", icon: <MicrosoftIcon />, kind: "redirect" },
  { id: "facebook", label: "Facebook", icon: <FacebookIcon />, kind: "sdk" },
];

// Facebook is omitted entirely when NEXT_PUBLIC_FACEBOOK_APP_ID is unset,
// mirroring the backend's "unconfigured provider is simply absent" rule
// (internal/config/config.go) rather than showing a button that would fail
// at click time.
export const OIDC_PROVIDERS: OidcProviderMeta[] = ALL_OIDC_PROVIDERS.filter(
  (p) => p.id !== "facebook" || Boolean(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID),
);
