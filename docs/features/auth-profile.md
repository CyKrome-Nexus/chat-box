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
