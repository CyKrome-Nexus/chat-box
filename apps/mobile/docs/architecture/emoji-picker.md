# Emoji Picker

## Overview

Tapping the sticker/emoji icon in the chat input bar toggles an in-place emoji panel
(`src/components/messages/EmojiPicker.tsx`) that replaces the space the system keyboard would
occupy — the input bar's `bottom` offset switches between `keyboardOffset` and the picker's fixed
`EMOJI_PICKER_HEIGHT` (280), and the two are mutually exclusive: opening the picker calls
`Keyboard.dismiss()`, and focusing the `TextInput` closes the picker.

## Data

`src/constants/emojis.ts` defines `EMOJI_CATEGORIES`: 8 categories (Smileys, People, Nature,
Food, Activity, Travel, Objects, Symbols), each a curated, hand-picked emoji list (not the full
Unicode set — this repo has no emoji-data dependency) with a `name` and `keywords` array used for
search matching.

## Search, Categories, Recents

- A search box filters the flattened emoji list by `name`/`keywords` substring match; when a
  query is active, the category tab strip is hidden and results replace the grid.
- The tab strip has one entry per category plus a leading "Recent" (clock icon) tab.
- `src/hooks/useRecentEmojis.ts` persists up to 24 most-recently-used emoji characters in
  `@react-native-async-storage/async-storage` under `chatbox:recent-emojis`, most-recent-first,
  deduplicated. Selecting any emoji calls `addRecent` before inserting it.

## Cursor-Position Insertion

`Chat.tsx` tracks the `TextInput`'s `selection` as controlled state (`onSelectionChange`).
`handleSelectEmoji` splices the chosen emoji into `text` at `selection.start`/`end` (replacing any
selected range) and moves the controlled `selection` to just after the inserted emoji, so emojis
land at the cursor rather than always at the end of the message.
