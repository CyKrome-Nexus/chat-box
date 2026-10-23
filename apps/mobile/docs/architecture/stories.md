# Ephemeral Stories & Status (24-Hour Updates)

## Data Model & Slice (`storiesSlice.ts`)

`IStory` (`src/interfaces/story-interface.ts`) covers all three post types (`image`/`video`/`text`)
in one shape, plus `views: IStoryView[]` and a `privacy` field. Seeded with three demo stories from
existing seeded contacts (`chatsSlice`'s Aarav/Priya/Rohan) so the carousel/viewer have real content
to exercise without a backend or other real devices to actually post from.

**Not persisted to SQLite** — unlike the rest of this app's data, stories are intentionally
in-memory-only (lost on app restart). They're 24-hour-ephemeral by design, and a production version
would source them from a server sync anyway rather than a local table; persisting a feature whose
entire premise is "temporary" seemed like the wrong place to spend this ticket's scope.

## Carousel (`StoriesCarousel.tsx`)

Sits above the chat list's filter pills (`(tabs)/messages.tsx`'s `FlatList` header). "My Status"
always comes first (with a "+" badge opening `StoryCreateSheet`); every other author with an active
story follows, sorted so unviewed-by-me authors come before fully-viewed ones. The ring color
(`Colors.focused` vs. gray) is a plain border rather than an actual segmented gradient ring — a
single-color ring conveys "has an unviewed status" just as clearly and avoids a much fussier
multi-arc SVG for a per-item indicator that isn't the ticket's segmented-progress requirement (that
applies to the *viewer's* top bar, not the avatar ring).

## Story Creator

Three entry points from `StoryCreateSheet`:

- **Text**: `/story-text-editor` — a `LinearGradient` background (6 preset gradients), centered
  large text input, and the existing `EmojiPicker` component in a bottom sheet for emoji insertion.
- **Camera**: routes to `/camera-capture?target=story`, which (once captured) hands off to
  `/media-editor?target=story` — **reusing** the full crop/rotate/doodle/text-overlay/sticker editor
  built for chat attachments in [In-App Camera & Media Editor](./media-editor.md), rather than
  building a second bespoke editor. `media-editor.tsx` checks a `target` param: when it's `"story"`,
  the "View Once" toggle (meaningless for a status) is hidden, and the finished attachment goes to a
  new `storyComposerBridge` (identical one-shot singleton pattern to `mediaComposerBridge`) instead
  of the chat-attachment bridge.
- **Gallery**: picks directly via `expo-image-picker`, then routes into the same `/media-editor`
  editor for consistency (captions/stickers/text overlay apply here too).

## Story Player (`/story-viewer`)

- **Segmented progress bars**: one track per story in the current author's group, filled based on
  elapsed time vs. a fixed per-type duration (`DURATION_MS`: 5s for image/text, 8s for video). This
  is a fixed duration, not driven by the actual decoded length of a video file — getting the real
  duration reliably before `expo-video`'s player reports it introduces a loading-state race that
  wasn't worth the complexity for a status viewer; 8s covers the typical short status clip.
- **Tap navigation**: a `Pressable` covers the media; releasing in the left third rewinds
  (`prev()`), the right two-thirds advances (`next()`) — both cross into the previous/next author's
  story group at the ends of the current one, or close the viewer entirely at either boundary of the
  whole list.
- **Press-and-hold to pause**: `onPressIn` starts a 200ms timer; if it fires before `onPressOut`,
  the touch is treated as a hold (pauses the progress timer and the video player) rather than a tap.
- **Swipe up to reply**: a `Gesture.Pan()` (disabled on your own story) opens a small reply modal;
  sending composes a new message directly into that author's conversation (`authorId` doubles as the
  demo `conversationId`, matching the seeded contacts), with the story's media attached as context
  and the reply text prefixed with "↩️ Replied to status:".
- **Viewer analytics**: your own status shows an "N views" bar opening a sheet listing each viewer's
  name and timestamp. Since there's no backend or second real device to actually view your status,
  `simulateStoryViews()` schedules two demo contacts to "view" it 10s and 22s after posting — the
  same simulated-receipt pattern already used for message delivery/read status
  ([Message Actions](./message-actions.md)) — clearly documented as fabricated demo data, not a real
  view count.

## Privacy & Expiry

- **Status privacy** (`Settings > Account > Status Privacy`): a global default
  (`settings.privacy.statusPrivacy`) of My Contacts / Contacts Except… / Only Share With…, applied
  to every new story's `privacy` field. The "Except…"/"Only Share With…" **audience picker UI is not
  implemented** — with no backend and no other real devices to actually restrict delivery to, a
  contact-multi-select screen would produce a setting with no real distribution effect to enforce;
  the three-way default mode is real and stored, but per-post custom audiences are out of scope here.
- **Auto-expiry**: `useStoriesExpirySweep()` (mounted once in `AppGate`) purges any story past its
  `expiresAt` (created time + 24h) every 30 seconds, plus once immediately on startup.
