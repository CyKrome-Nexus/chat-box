# Production Status & Stories Pipeline

Builds on [Ephemeral Stories & Status](./stories.md) — read that first. This ticket asked for a
production-scale *media pipeline* (transcoding, CDN, HLS) around stories, plus several real
client-side improvements to privacy, view tracking, and lifecycle. Unlike most of this ticket's
title, several of these pieces are genuinely client-achievable and are implemented for real; the
transcoding/CDN half is not, for the same reasons documented in
[Media Editor](./media-editor.md) and [E2EE Media](./e2ee-media.md).

## What's Real

- **Preloading engine**: `StoriesCarousel.tsx` prefetches (`Image.prefetch`) the first photo of the
  next few unviewed authors' stories whenever the carousel's contents change — real prefetching,
  not a stub, though it only covers static images (video/Lottie stickers have no equivalent
  cross-platform "prefetch the first 2 seconds" API available without native work).
- **Video-clock-synced progress bar**: the segmented progress bar's fill for a video story is now
  driven by the actual `expo-video` player's `currentTime`/`duration` (polled alongside the existing
  tick interval) instead of the fixed 8-second timer [Stories](./stories.md) used — text/image
  stories still use a fixed duration (there's no "playback clock" for a still image to sync to).
- **Granular audience privacy, for real**: `StoryAudienceModal.tsx` is a contact multi-select shown
  before posting whenever `Settings > Account > Status Privacy` is set to "Contacts Except…" or
  "Only Share With…", collecting real `audienceIds`. `resolveStoryAudience()` computes the actual
  list of conversation ids allowed to see a story from the three tiers.
- **Ephemeral broadcast-key encryption, reusing Sender Keys**: `distributeStoryKey()` treats a
  posted story as a one-off "group" (its own story id as the group id, the resolved audience as
  members) and calls the exact same Sender Keys engine built for group E2EE
  ([e2ee-crypto.md](./e2ee-crypto.md)) to generate a key and distribute it — genuinely encrypted once
  per audience member through *their own* established pairwise Double Ratchet channel. There's no
  second real device to actually decrypt the result on the receiving end (same limitation
  `e2ee-crypto.md` documents for the base engine), so this proves the key-generation-and-distribution
  mechanics are real without proving end-to-end delivery to another person.
- **View receipts respect the viewer's own privacy setting**: `story-viewer.tsx` now checks
  `settings.privacy.readReceipts` (the same [Read Receipts](./security-privacy.md) toggle that
  already gates message read receipts) before recording a view — if you've turned off read receipts,
  opening someone else's story no longer adds you to their viewer list.
- **Muted Updates accordion**: `StoriesCarousel.tsx` splits authors into muted/unmuted groups (via
  the existing per-chat `muted` flag from [Chat Organization](./chat-organization.md)) and collapses
  muted authors' rings behind a "Muted (N)" toggle at the end of the row.
- **Save to Personal Archive**: a new archive toggle (own story only, next to Delete) sets
  `archivedByAuthor`, which `useStoriesExpirySweep`'s purge now explicitly skips — an archived story
  survives past its normal 24h `expiresAt` instead of being swept.

## What's Not Implemented (and Why)

- **Video transcoding to multiple resolution profiles / fragmented MP4 / HLS**: needs a real
  server-side (or at minimum a heavy native, e.g. ffmpeg-based) video processing pipeline — the exact
  same gap already documented for video compression in
  [In-App Camera & Media Editor](./media-editor.md). Story videos are still sent at their original
  recorded resolution/bitrate.
- **CDN/object-storage purge worker**: there's no CDN or object storage in this repo at all (see
  [E2EE Media](./e2ee-media.md)) — the 24h expiry sweep already purges the *local* Redux/SQLite
  record, which is the entire storage layer that exists here.
- **Real-time view-count push updates** (i.e., an author seeing a viewer count update live while
  someone else is watching, across two real devices) — there's no realtime channel connecting two
  real devices in this environment ([Realtime Messaging](./realtime-messaging.md)); views recorded
  by `simulateStoryViews()`'s demo timers do update the local Redux store immediately, which is as
  "real-time" as a single-device demo can honestly claim to be.
