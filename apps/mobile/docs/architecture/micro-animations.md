# Fluid Micro-Animations & Gesture Interactions

## Swipe-to-Reply (`MessageBubble`)

Each bubble is wrapped in a `Gesture.Pan()` (`activeOffsetX([10, 999])`, `failOffsetY([-12, 12])`
so it only activates on a deliberately horizontal drag and yields to the FlatList's vertical
scroll otherwise):

- The row's `translateX` follows the drag rubber-banded — linear up to
  `SWIPE_REPLY_THRESHOLD` (56px), then damped to 25% of further movement, capped at
  `SWIPE_REPLY_MAX` (84px) — so it never feels like it's about to swipe the bubble away.
- A reply arrow icon fades/scales in to the left of the bubble as the drag approaches the
  threshold (`replyIconStyle`, driven by the same `translateX`).
- Crossing the threshold fires one `expo-haptics` `Haptics.impactAsync(Light)` (guarded by a ref
  so it fires once per gesture, not every frame past the threshold).
- On release past the threshold, `onSwipeReply(message)` is called (wired to `setReplyTo` in
  `Chat.tsx`) and the row always springs back to `translateX: 0` regardless of outcome.

`Chat.tsx` renders `ReplyPreviewBar` above the input bar while `replyTo` is set, and `handleSend`
attaches a lightweight quote (`IMessage.replyTo: { text, isSender }`) to the outgoing message.
`MessageBubble` renders that quote as a small accent-bordered block above the bubble's own text.
This is intentionally a lightweight quote-on-send, not the full reply-threading/jump-to-message
system — that's covered by the separate Message Actions Menu ticket.

## Keyboard-Interactive Input Bar

`react-native-keyboard-controller`'s `KeyboardProvider` wraps the app root
(`src/app/_layout.tsx`), and `Chat.tsx`'s entire bottom control stack (reply banner, input row,
emoji picker) is wrapped in `KeyboardStickyView` instead of a manual `Keyboard.addListener` +
`setState` + absolute-positioned `bottom` offset (the old approach, which is what causes the
"jumping/flickering input bar" the ticket calls out — state-driven repositioning always lags a
frame or more behind the native keyboard animation). `KeyboardStickyView` tracks the keyboard's
native animation frame-by-frame on both platforms, so the bar locks to the top of the keyboard
with no jump. The emoji picker (a custom, non-native "keyboard") isn't driven by this — it's just
normal flow content rendered below the input row when open, since it and the real keyboard are
mutually exclusive (opening one dismisses the other).

## Morphing Send/Mic Button

`Chat.tsx` renders both the mic button and the send button in the same fixed-size
`actionButtonSlot`, absolutely positioned on top of each other. A shared value `sendMorph`
(`withTiming` over 180ms, driven by `text.trim()` presence) cross-fades and cross-scales them
(`micMorphStyle` / `sendMorphStyle`) instead of showing/hiding two separate buttons. `pointerEvents`
is toggled per-button (`"none"` on whichever is currently invisible) so a tap always reaches the
visually-active one, and the mic's own press-and-hold-to-record `Gesture.Pan` (see
`docs/architecture/voice-messages.md`) is unaffected — it just becomes untouchable while text is
present.

## Media Lightbox: Entrance & Drag-to-Dismiss

`MediaViewerModal` (`docs/architecture/media-attachments.md`) now:

- Animates in with a fade + slight scale-up (`entrance` shared value, `withTiming` 220ms) on every
  open — shared values are reset in a `useEffect` keyed on `uri` since the component stays mounted
  between opens rather than remounting per image.
- When not zoomed in (`scale <= 1.05`), a vertical drag on the image translates it down and fades
  the backdrop proportionally; crossing 120px of drag or a fast-enough flick
  (`velocityY > 800`) dismisses the modal, otherwise both spring back. When zoomed in, the same
  pan gesture instead pans around the zoomed image as before.

This is a drag-to-dismiss lightbox, not a literal shared-element transition (animating from the
exact on-screen bounding rect of the tapped bubble's thumbnail) — implementing true shared-element
geometry would need measuring each thumbnail's layout and passing it through navigation state,
which is a materially larger change than this ticket's other items; the fade/scale entrance is a
close visual approximation without that added complexity.

## Animated Status Ticks

`MessageBubble`'s `StatusTicks` wraps each icon in an `Animated.View` keyed by status
(`key="pending"`, `key="sent"`, `key={status}` for delivered/read) with `entering={ZoomIn}` /
`exiting={ZoomOut}` — so clock → sent → delivered → read transitions animate in/out instead of the
icon just snapping to its new state.
