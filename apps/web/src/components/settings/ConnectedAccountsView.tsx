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

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/shared/SectionCard";
import { Button } from "@/components/ui/button";
import { OIDC_PROVIDERS, type OidcProvider } from "@/components/icons/ProviderIcons";
import { listIdentities, linkProvider, unlinkProvider } from "@/lib/api/auth";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";

type Banner = { type: "success" | "error"; text: string };

export function ConnectedAccountsView() {
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [linked, setLinked] = useState<Set<OidcProvider> | null>(null);
  const [pending, setPending] = useState<OidcProvider | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(() => {
    const linkedParam = searchParams.get("linked");
    const errorParam = searchParams.get("error");
    if (linkedParam) {
      return { type: "success", text: `${capitalize(linkedParam)} account linked.` };
    }
    if (errorParam === "oauth_failed") {
      return { type: "error", text: "That didn't work — please try again." };
    }
    return null;
  });

  useEffect(() => {
    let cancelled = false;
    listIdentities()
      .then((identities) => {
        if (cancelled) return;
        setLinked(new Set(identities.map((i) => i.provider)));
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("Couldn't load your connected accounts. Please refresh the page.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleLink(provider: OidcProvider) {
    if (!accessToken) return;
    setBanner(null);
    linkProvider(provider, accessToken);
  }

  async function handleUnlink(provider: OidcProvider) {
    setBanner(null);
    setPending(provider);
    try {
      await unlinkProvider(provider);
      setLinked((prev) => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });
      setBanner({ type: "success", text: `${capitalize(provider)} account unlinked.` });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setBanner({ type: "error", text: message });
    } finally {
      setPending(null);
    }
  }

  return (
    <SectionCard
      title="Connected accounts"
      description="Sign in faster by linking a third-party account. You can link more than one."
      icon={Link2}
      iconColor="#60A5FA"
      iconBg="rgba(59,130,246,0.12)"
      noPadding
    >
      <div className="flex flex-col gap-4 p-5">
        {banner && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style={{
              background: banner.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
              border: `1px solid ${banner.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
              color: banner.type === "error" ? "#FCA5A5" : "#86EFAC",
            }}
          >
            {banner.type === "error" ? (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            {banner.text}
          </div>
        )}

        {loadError && <p className="text-sm text-[#FCA5A5]">{loadError}</p>}

        <div className="overflow-hidden rounded-xl border border-[#1E2B42]">
          {OIDC_PROVIDERS.map(({ id, label, icon }, i) => {
            const isLinked = linked?.has(id) ?? false;
            const last = i === OIDC_PROVIDERS.length - 1;
            return (
              <div
                key={id}
                className={
                  "flex items-center justify-between gap-3 bg-[#0F1623] px-5 py-4" +
                  (last ? "" : " border-b border-[#1A2640]")
                }
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A0E1A]">
                    {icon}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white">{label}</p>
                    <p className="mt-0.5 text-[12px] text-[#5A6A85]">
                      {linked === null ? "Checking…" : isLinked ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>

                {linked === null ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#5A6A85]" />
                ) : isLinked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending === id}
                    onClick={() => handleUnlink(id)}
                  >
                    {pending === id ? "Unlinking…" : "Unlink"}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!accessToken}
                    onClick={() => handleLink(id)}
                  >
                    Link
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
