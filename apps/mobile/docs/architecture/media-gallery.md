# Full-Screen Media Lightbox, Document Viewer & Shared Media Gallery

## Lightbox (`MediaViewerModal.tsx` + `LightboxPage.tsx`)

`MediaViewerModal` now takes the whole conversation's media list (`ILightboxItem[]` — built by
`Chat.tsx` from `state.messages.byConversation[conversationId]`, chronologically ordered) plus the
tapped message's id, instead of a single `uri` (the old single-image API). A horizontal, paging
`FlatList` renders one `LightboxPage` per item:

- **Pinch-to-zoom** (images only) and **pan-to-dismiss** live on each page (`LightboxPage.tsx`),
  ported from the previous single-image `MediaViewerModal`. `Gesture.Pan()` gets `failOffsetX`
  on image pages so a clearly-horizontal drag yields to the FlatList's own paging instead of
  fighting it; vertical drags still drive the dismiss animation.
- **Horizontal gallery swipe**: the FlatList itself, in `pagingEnabled` mode. `scrollEnabled` is
  turned off while the current page reports itself zoomed in (`onZoomChange`), so pinch-zoom pan
  gestures don't fight page-swipe gestures.
- **Top action bar**: Share (`expo-sharing`), Save to device gallery (`expo-media-library`,
  permission-gated), Forward (`ForwardSheet.tsx` — picks a destination from the existing chats
  list and composes the same attachment into that conversation), Delete (a new `deleteMessage`
  reducer in `messagesSlice`, confirmed via `Alert`).
- Videos render via `expo-video`'s `VideoView` with native controls; they don't autoplay (multiple
  pages can be mounted at once by the FlatList's windowing, and autoplaying every one would overlap
  audio).

`AttachmentContent.tsx`'s image/video tap handler was renamed `onPressImage` → `onPressMedia` and
now reports the **message id** instead of a bare URI, so the lightbox can look the tapped item up
in the conversation-wide list and know where to start paging from.

## In-Chat Document Viewer

- `src/lib/media/documentIcon.ts` maps a file's extension (falling back to `mimeType`) to a
  distinct icon + color per the ticket (PDF, Word, Excel, Zip, generic) — used both in the chat
  bubble's document card (`AttachmentContent.tsx`) and the gallery's Docs tab.
- Tapping a document card opens `/document-preview` (a new top-level `fullScreenModal` route),
  which renders PDFs inline via `react-native-webview` pointed at the local `file://` uri.
  WKWebView on iOS renders local PDFs natively; recent Chromium-based Android WebView builds
  generally bundle PDFium and can too, but that's not guaranteed on every OEM/Android version — the
  screen always offers an "Open Externally" (`expo-sharing`) fallback, and non-PDF documents
  (docx/xlsx/zip) skip straight to that fallback since there's no in-app renderer for them here.

## Shared Media Gallery (`/shared-media`)

Reached from a new, intentionally minimal `/contact-info` screen (tap the chat header's
avatar/name), which is this ticket's required entry point — group info is out of scope until
groups exist (#33). `src/hooks/useConversationMedia.ts` derives all four tabs from the same
already-loaded `state.messages.byConversation[conversationId]` used everywhere else in the app (no
separate media index/table):

- **Media**: image/video attachments, 3-column grid.
- **Docs**: document attachments, with the same type icon as the in-chat card.
- **Audio**: audio attachments (voice notes).
- **Links**: every `https?://` URL found in message text (`extractUrls`), rendered as OpenGraph
  preview cards.

### Link Previews (`src/lib/media/linkPreview.ts`)

A real `fetch()` of the URL's HTML followed by a regex-based extraction of `og:title`,
`og:description`, and `og:image` (falling back to `<title>`/`<meta name="description">`), with an
in-memory cache so re-rendering the Links tab doesn't refetch. This is a genuine network
fetch-and-parse, not a stub — but it's not a headless browser: single-page apps that inject their
OG tags via client-side JS after load won't resolve (the raw HTML fetched has no rendered content
yet). A production version would run this server-side with a real renderer (e.g. a headless
Chromium unfurl service) rather than from the client.

## Known Limitations

- Chat-bubble and gallery-grid thumbnails for **video** attachments render the video file's own
  URI through an `Image` component, which doesn't decode a video frame — this was already the
  existing (pre-ticket) behavior for video thumbnails in `AttachmentContent.tsx` and is unchanged
  here; a real thumbnail needs a frame-extraction step (e.g. `expo-video-thumbnails`), which is a
  reasonable follow-up but wasn't part of this ticket's requirements.
- "Delete" in the lightbox removes the message from local Redux/SQLite state only — there's no
  message-delivery backend to also delete it for a recipient.
- Forwarding composes directly into the target conversation's local state, same as every other
  compose path in this repo — there's still no real backend to relay it to another device.
