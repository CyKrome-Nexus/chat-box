import { IChatRibbon } from "@/src/interfaces/list-interface";

const TIMER_MS: Record<Exclude<IChatRibbon["disappearingTimer"], undefined>, number> = {
    off: 0,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
};

/** Returns the `expiresAt` a new message should carry, or undefined if the chat has no active timer. */
export const computeExpiresAt = (
    timer: IChatRibbon["disappearingTimer"],
    sentAt: number = Date.now()
): number | undefined => {
    if (!timer || timer === "off") return undefined;
    return sentAt + TIMER_MS[timer];
};

export const DISAPPEARING_TIMER_LABELS: Record<Exclude<IChatRibbon["disappearingTimer"], undefined>, string> = {
    off: "Off",
    "24h": "24 Hours",
    "7d": "7 Days",
    "90d": "90 Days",
};
