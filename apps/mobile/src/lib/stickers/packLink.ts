/**
 * The ticket's `chatbox.app/addstickers/[pack_id]` display URL. As with the
 * group invite links (see groups.md), actually *opening the app and
 * installing the pack* uses the app's own `chat-box://` scheme instead —
 * `chatbox.app` isn't a real, resolvable web domain in this environment.
 */
export const buildStickerPackDisplayLink = (packId: string) => `https://chatbox.app/addstickers/${packId}`;

export const buildStickerPackDeepLink = (packId: string) => `chat-box://addstickers/${packId}`;
