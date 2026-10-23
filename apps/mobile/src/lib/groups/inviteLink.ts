const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://chatbox.link").replace(/\/$/, "");

// Shareable https link (opens the web app's join page) and the in-app deep link.
export const buildGroupInviteDisplayLink = (inviteCode: string) => `${WEB_URL}/join/${inviteCode}`;

export const buildGroupInviteDeepLink = (inviteCode: string) => `chat-box://join/${inviteCode}`;
