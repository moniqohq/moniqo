# Feature Flags

## Why this exists

Moniqo's web app ships V2 features (Reports, Goals, Recurring transactions, …) that are
partially built ahead of the V1 release. This is a **temporary, compile-time** mechanism to
hide those features cleanly until they're ready — not a permanent feature-management
platform. There is no runtime configuration, no environment variables, no database, no
per-user targeting, and no percentage rollouts. A flag is either `true` or `false` in source
and that's it.

The single source of truth is [`src/features/feature-flags.ts`](src/features/feature-flags.ts).
No flag value should ever be duplicated or hardcoded anywhere else.

## How to add a feature flag

1. Add a key to `FeatureFlags` in `src/features/feature-flags.ts`, set to `false`.
2. If the feature has a dedicated route (e.g. `/goals`), add it to `FEATURE_ROUTES` mapping
   the path to the flag name, and add the matching path to `config.matcher` in
   [`src/proxy.ts`](src/proxy.ts) so direct navigation is blocked.
3. If the feature has a nav entry, tag it with `flag: "yourFlagName"` in the nav item array
   in [`src/components/shared/Sidebar.tsx`](src/components/shared/Sidebar.tsx). The existing
   filter hides it automatically — no per-component checks needed.
4. If the feature is a widget/section with no dedicated route (like the dashboard
   Subscriptions card), wrap its single mount site in
   `{isFeatureEnabled("yourFlagName") && ( ... )}` rather than adding checks inside the
   component itself.

## How to enable a feature

Flip its value in `FeatureFlags` from `false` to `true`. That's the entire change — nav
items reappear, routes become reachable, widgets render. No other code changes needed.

## How to permanently remove a flag

Once a feature is finished and always-on, delete:

1. The key from `FeatureFlags` in `feature-flags.ts`.
2. Its entry in `FEATURE_ROUTES` (if any).
3. The matcher entry in `proxy.ts` (if any) — the route protection itself can stay if still
   needed for other reasons (e.g. auth), just drop the feature-flag matcher path.
4. The `flag: "..."` tag on the nav item in `Sidebar.tsx`.
5. The `isFeatureEnabled(...)` wrapper around the widget/section, unwrapping the JSX.

Each of these is a few-line deletion — no architectural refactor required.

## Best practices

- Gate at the **registration point** (nav array, route matcher, single widget mount site),
  not inside leaf components. Avoid scattering `if (!FeatureFlags.x) return null` throughout
  a component tree.
- Keep flag names as camelCase feature names, not implementation details (`goals`, not
  `showGoalsWidgetV2`).
- Don't build conditional logic on top of flags beyond simple boolean gates — if a feature
  needs staged rollout, targeting, or A/B testing, that's a different (and heavier) system
  than this one.
