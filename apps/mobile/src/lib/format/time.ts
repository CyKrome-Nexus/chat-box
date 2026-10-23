const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const pad = (value: number) => String(value).padStart(2, "0");

export const formatClock = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    return `${pad(hours % 12 || 12)}:${pad(date.getMinutes())} ${hours < 12 ? "AM" : "PM"}`;
};

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

// "now", "5 min ago", "2 hr ago", "Yesterday", weekday, or dd/mm/yy.
export const formatRelative = (timestamp: number | undefined): string => {
    if (!timestamp) return "";
    const diff = Date.now() - timestamp;
    if (diff < MINUTE) return "now";
    if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
    const date = new Date(timestamp);
    const today = new Date();
    if (isSameDay(date, today)) return `${Math.floor(diff / HOUR)} hr ago`;
    const yesterday = new Date(today.getTime() - DAY);
    if (isSameDay(date, yesterday)) return "Yesterday";
    if (diff < 6 * DAY) return date.toLocaleDateString(undefined, { weekday: "long" });
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(2)}`;
};

// "Today, 09:30 AM" style used by the call log.
export const formatCallTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today.getTime() - DAY);
    const day = isSameDay(date, today)
        ? "Today"
        : isSameDay(date, yesterday)
          ? "Yesterday"
          : Date.now() - timestamp < 6 * DAY
            ? date.toLocaleDateString(undefined, { weekday: "long" })
            : `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(2)}`;
    return `${day}, ${formatClock(timestamp)}`;
};

export const formatLastSeen = (online: boolean, lastSeen?: number): string => {
    if (online) return "Active now";
    if (!lastSeen) return "";
    return `Last seen ${formatRelative(lastSeen)}`;
};

export const formatDuration = (seconds: number): string => {
    const total = Math.max(0, Math.round(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = total % 60;
    return hours ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
};
