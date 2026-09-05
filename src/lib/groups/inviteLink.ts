/**
 * The ticket's `chatbox.link/join/[code]` display URL. Actually *opening*
 * this app from a link (rather than just displaying/sharing the string)
 * uses the app's own `chat-box://join/[code]` scheme instead — see
 * docs/architecture/groups.md for why a `chatbox.link` universal link isn't
 * wired up (no real web domain/App Links config in this environment).
 */
export const buildGroupInviteDisplayLink = (inviteCode: string) => `https://chatbox.link/join/${inviteCode}`;

export const buildGroupInviteDeepLink = (inviteCode: string) => `chat-box://join/${inviteCode}`;
