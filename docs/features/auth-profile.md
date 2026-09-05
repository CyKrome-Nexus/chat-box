# Authentication, Profile & Username Privacy

## Overview
Covers:
- **Authentication**: Phone and email sign-up/login, password recovery, and social OAuth.
- **Session Persistence**: Hardware-backed token storage via SecureStore.
- **Global Usernames**: Unique `@username` handles (`^[a-zA-Z0-9_]{4,32}$`), universal profile deep links (`chatbox.link/@username`), and dynamic QR codes.
- **Phone Privacy**: Strict visibility toggles (`Nobody`) allowing full app operation via username without exposing telephone numbers.
- **Multi-Account Switching**: Seamless switching between up to 5 concurrent accounts.

## Shared `TextInput` Component

`src/components/inputs/TextInput.tsx` backs every auth form field (email, password, etc.).

- `maxLength` defaults to `20` for password fields and `254` otherwise, but an explicit
  `maxLength` prop always takes precedence: `maxLength ?? (isPassword ? 20 : 254)`. The
  parentheses are required — `??` binds tighter than a bare ternary would suggest, so without
  them a truthy custom `maxLength` still gets discarded in favor of the ternary's `20`.
- Password visibility is tracked as `{ status, text }` and toggled functionally
  (`setShowPassword(prev => ({ status: !prev.status, ... }))`) to avoid a stale-closure bug where
  the toggle read the outer-scope `showPassword` instead of the latest state.
- The show/hide control is an `Ionicons` `eye-outline` / `eye-off-outline` icon button with a
  10pt `hitSlop` and an `accessibilityLabel`, replacing the earlier plain-text "Show Password"
  toggle.
- It also accepts an optional `error` string (rendered below the field, red bottom border) and a
  `leftAccessory` node (used by the sign-up phone field's `CountryCodePicker`).

## Real Sign-Up, Login & Forgot Password

There is no auth backend in this repo. `src/lib/auth/authService.ts` simulates one against
AsyncStorage — `signUp`, `login`, `requestPasswordReset`, `resetPassword` — so the full flow works
end-to-end for development/testing; swapping in real API calls only means rewriting the bodies of
these four functions, not any call site in `auth.tsx` or `forgot-password.tsx`.

- **Login** accepts an email *or* phone number identifier (`isEmailOrPhone` in
  `src/lib/auth/validators.ts`) plus a password.
- **Sign-up** collects Name, Phone (with a `CountryCodePicker` prefix — `src/components/inputs/CountryCodePicker.tsx`,
  a small fixed list since there's no full country-code dataset dependency here), Password, and
  Confirm Password. The stored identifier is `{countryCode}{phone}`. This also fixes the original
  bug where the sign-up button called the login handler, which checked an `email` field that
  didn't exist in sign-up mode.
- Both forms compute per-field inline error strings live from a `useMemo` (shown only once a
  field is non-empty, so a pristine form doesn't show errors) and disable the submit button
  (`isFormValid`) until every field passes: password requires 8+ chars with a letter and a number,
  confirm-password must match, phone must match a loose E.164 pattern.
- **Forgot Password** (`src/app/(root)/forgot-password.tsx`) is a two-step screen: request a code
  for an email/phone, then enter the 6-digit OTP plus a new password. Since there's no SMS/email
  delivery backend, `requestPasswordReset` returns the OTP directly and the screen surfaces it via
  an `Alert` so the flow is demonstrable; a real backend would deliver it out-of-band instead and
  the screen wouldn't need to change.
