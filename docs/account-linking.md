# Account / social-identity linking

Lets a signed-in user attach a social (OAuth) identity — e.g. Google — to their
**existing** account, even when the social provider's email **differs** from the
account's email. Managed from an **Account** dialog opened from the app header.

## Why this exists

Supabase's *automatic* identity linking only merges identities that share the
same email. So if a user's Google email differs from the email they signed up
with, clicking "Continue with Google" while signed out creates a **separate**
account. The only way to attach a differently-emailed provider to the existing
account is `supabase.auth.linkIdentity()`, called **while already signed in** —
which is what the Account dialog does.

## Required Supabase setting (do this once, or the feature is inert)

**Enable manual identity linking on the live project.** Until it is on,
`linkIdentity()` returns a `Manual linking is disabled` error (the Account dialog
surfaces this inline, so a stuck link tells you the toggle is still off).

- Supabase Dashboard → **Authentication → Sign In / Providers** (advanced
  settings) → enable **Manual linking** (`security_manual_linking_enabled`).

This is a hosted-project auth setting; nothing under `supabase/` applies it. The
OAuth providers you want to link (Google, etc.) must also be enabled and appear
in the app's live provider discovery — see the redirect-URL note in
[`../supabase/README.md`](../supabase/README.md); linking reuses the same
`/auth/callback` return path as magic-link and social sign-in.

## How it works

1. The Account dialog lists the user's current identities
   (`supabase.auth.getUserIdentities()`), and offers a **Link {provider}** button
   for each enabled provider not yet linked.
2. Linking calls `supabase.auth.linkIdentity({ provider, options: { redirectTo } })`,
   a **full-page redirect** to the provider, returning via `/auth/callback` where
   the session already exists. The new identity arrives live through
   `onAuthStateChange` (`USER_UPDATED`) — no manual refresh.
3. Because the redirect discards in-memory state, the dialog stashes a marker in
   `sessionStorage` (`trove:pending-identity-link`); `App.vue` reads and clears it
   on the next load to show a "linked" toast.
4. **Unlink** calls `supabase.auth.unlinkIdentity(identity)`. Supabase refuses to
   remove the **last** identity, so the UI disables Unlink when only one remains.

## Code map

| File | Role |
| --- | --- |
| `src/core/auth.ts` | `linkIdentity`, `getIdentities`, `unlinkIdentity` on `useAuth()` (memory-backend no-ops; reuse `callbackUrl()`) |
| `src/core/auth-providers.ts` | Shared `providerGlyphs` + live `enabledOAuthProviders` discovery |
| `src/app/components/AccountOverlay.vue` | The dialog (built on `BaseOverlay`) |
| `src/app/components/ProviderGlyph.vue` | Shared monochrome provider mark |
| `src/app/composables/useAccountPrompt.ts` | Open/close singleton for the dialog |
| `src/app/components/AppHeader.vue` | Account button (emits `account`) |
| `src/app/App.vue` | Mounts the dialog; fires the post-redirect "linked" toast |

## Verifying end to end

There is no test suite; the gate is `npm run typecheck` (run by `task build`).
For the full flow (requires the setting above + a second Google account whose
email differs):

1. `task dev`, sign in with an email/password account.
2. Header → **Account** → **Link Google** → complete OAuth with the differing
   Google account → page returns to `/`, a "Google account linked." toast fires,
   and reopening Account lists both identities.
3. **Unlink** Google → it disappears; Unlink is disabled at the last identity.
4. Confirm that Google login now signs into this account instead of creating a
   new one.
