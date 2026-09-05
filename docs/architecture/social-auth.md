# Social Authentication (Google, Apple, Facebook)

## Overview

The Facebook/Google/Apple buttons rendered by `BContainer` on the onboarding screen
(`src/app/(root)/index.tsx`) and the login screen (`src/app/(root)/auth.tsx`) are wired to real
OAuth flows via `src/hooks/useSocialAuth.ts`. There are no OAuth app credentials (Google Cloud
project, Meta developer app) configured in this repository, so the flows read client IDs from
`EXPO_PUBLIC_*` env vars and are otherwise fully implemented — supplying real credentials is the
only remaining step to make them functional.

## `BContainer` / `BIcon` Per-Button Handlers

`BContainer` gained an optional `onPressAt?: (index: number) => void` prop, called with the
pressed icon's index in the `svgs` array (`BIcon` already supported a single `onPress`; this just
threads a per-index callback through the loop that renders one `BIcon` per svg). Both auth screens
pass `handleSocialPress`, which maps `[facebook, google, apple]` indices to the matching provider.

## Providers

- **Google**: `expo-auth-session/providers/google`'s `useIdTokenAuthRequest`, configured with
  `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `_ANDROID_CLIENT_ID` / `_WEB_CLIENT_ID`. On success, the
  returned OIDC `id_token` is decoded client-side (`decodeJwtPayload` in
  `src/lib/auth/socialAuth.ts` — a minimal base64url JWT payload decode, not signature
  verification) to read `name`/`email`/`picture`.
- **Facebook**: `expo-auth-session/providers/facebook`'s `useAuthRequest`, configured with
  `EXPO_PUBLIC_FACEBOOK_CLIENT_ID`. On success, the access token is exchanged for profile fields
  via a `fetch` to the Graph API (`fetchFacebookProfile`).
- **Apple**: `expo-apple-authentication`'s `signInAsync` — no client ID needed; it uses the app's
  bundle identifier and the `usesAppleSignIn: true` / `expo-apple-authentication` plugin entries in
  `app.json`. iOS-only; `useSocialAuth` shows an explanatory alert on other platforms or when the
  device doesn't support it (e.g. simulator without Apple ID configured).

If a provider's client ID env var isn't set, pressing its button shows a "not configured" alert
instead of attempting (and confusingly failing) an OAuth request.

## Account Creation & Linking

`src/lib/auth/authService.ts`'s `upsertSocialUser({ provider, identifier, name, avatarUrl })`
looks up an existing local account by identifier (the provider's email, or a provider-scoped
fallback id for providers that don't share one) and creates it on first sign-in — mirroring what a
real backend's "exchange token → find-or-create user → issue session" flow would do, minus an
actual token exchange since there's no backend to exchange with yet.
