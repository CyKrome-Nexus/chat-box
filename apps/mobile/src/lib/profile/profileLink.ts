export const PROFILE_LINK_PREFIX = "https://chatbox.link/@";
/** The ticket's alternate canonical form — same target, different domain
 * convention (chatbox.me/username vs. chatbox.link/@username). Both are
 * parsed; `buildProfileLink` emits the primary one. */
export const PROFILE_LINK_PREFIX_ALT = "https://chatbox.me/";

export const buildProfileLink = (handle: string) => `${PROFILE_LINK_PREFIX}${encodeURIComponent(handle)}`;

/** Returns the extracted @handle if `value` is a chatbox.link/chatbox.me
 * profile URL, otherwise null. */
export const parseProfileLink = (value: string): string | null => {
    const trimmed = value.trim();

    if (trimmed.startsWith(PROFILE_LINK_PREFIX)) {
        const handle = trimmed.slice(PROFILE_LINK_PREFIX.length);
        return handle ? decodeURIComponent(handle) : null;
    }
    if (trimmed.startsWith(PROFILE_LINK_PREFIX_ALT)) {
        const handle = trimmed.slice(PROFILE_LINK_PREFIX_ALT.length);
        return handle ? decodeURIComponent(handle) : null;
    }
    return null;
};
