import { clsx, type ClassValue } from "clsx";
import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";

export const cn = (...values: ClassValue[]) => clsx(values);

export const formatListTime = (iso: string): string => {
  const date = new Date(iso);
  if (Date.now() - date.getTime() < 60_000) return "now";
  if (Date.now() - date.getTime() < 60 * 60_000) return `${formatDistanceToNowStrict(date)} ago`;
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd/MM/yy");
};

export const formatTime = (iso: string): string => format(new Date(iso), "hh:mm a");

export const formatDay = (iso: string): string => {
  const date = new Date(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, d MMMM");
};

export const formatLastSeen = (iso: string | null, online: boolean): string => {
  if (online) return "Active now";
  if (!iso) return "";
  return `Last seen ${formatDistanceToNowStrict(new Date(iso))} ago`;
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const newClientId = (): string => crypto.randomUUID();

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
