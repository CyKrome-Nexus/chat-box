export const PROFILE_LINK_PREFIX = "https://chatbox.link/@";

export const buildProfileLink = (username: string) =>
    `${PROFILE_LINK_PREFIX}${encodeURIComponent(username)}`;

/** Returns the extracted username if `value` is a chatbox.link profile URL, otherwise null. */
export const parseProfileLink = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed.startsWith(PROFILE_LINK_PREFIX)) return null;

    const username = trimmed.slice(PROFILE_LINK_PREFIX.length);
    return username ? decodeURIComponent(username) : null;
};
