import { BellOff, Plus, Search, Trash2, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { NavLink } from "react-router";

import {
  conversationAvatar,
  conversationTitle,
  directPeer,
  previewText,
  type Conversation,
} from "@chatbox/shared";

import { Avatar, EmptyState, IconButton, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { usePresence, useTypingUsers } from "@/lib/live-store";
import { cache } from "@/lib/query";
import { cn, formatListTime } from "@/lib/utils";
import { useConversations } from "./queries";

const ConversationRow = ({ conversation, myId }: { conversation: Conversation; myId: string }) => {
  const peer = directPeer(conversation, myId);
  const presence = usePresence(peer?.id);
  const typing = useTypingUsers(conversation.id).length > 0;
  const title = conversationTitle(conversation, myId);
  const muted = Boolean(conversation.mutedUntil && Date.parse(conversation.mutedUntil) > Date.now());
  const last = conversation.lastMessage;
  const preview = last
    ? `${conversation.type === "group" && last.senderName && last.kind !== "system" ? `${last.senderId === myId ? "You" : last.senderName.split(" ")[0]}: ` : ""}${previewText(last)}`
    : "Say hello 👋";

  const toggleMute = async (event: React.MouseEvent) => {
    event.preventDefault();
    const mutedUntil = muted ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    cache.patchConversation(conversation.id, (item) => ({ ...item, mutedUntil }));
    await api.put(`/conversations/${conversation.id}/mute`, { mutedUntil }).catch(() => undefined);
  };

  const remove = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (!window.confirm(`Delete your chat with ${title}? Messages will be cleared for you only.`)) return;
    cache.removeConversation(conversation.id);
    await api.delete(`/conversations/${conversation.id}?scope=me`).catch(() => undefined);
  };

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
    >
      <NavLink
        to={`/c/${conversation.id}`}
        className={({ isActive }) =>
          cn(
            "group relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors",
            isActive ? "bg-brand-50 dark:bg-ink-soft" : "hover:bg-[var(--field)]",
          )
        }
      >
        <Avatar
          name={title}
          src={conversationAvatar(conversation, myId)}
          size={52}
          online={peer ? (presence?.online ?? false) : undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[17px] font-medium">{title}</p>
            {last ? (
              <time className="shrink-0 text-xs text-[var(--text-muted)]">
                {formatListTime(last.createdAt)}
              </time>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className={cn("truncate text-[13px]", typing ? "text-brand-500" : "text-[var(--text-muted)]")}>
              {typing ? "typing…" : preview}
            </p>
            <span className="flex shrink-0 items-center gap-1">
              {muted ? <BellOff className="size-3.5 text-[var(--text-muted)]" /> : null}
              {conversation.unreadCount > 0 ? (
                <motion.span
                  key={conversation.unreadCount}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white",
                    muted ? "bg-[var(--text-muted)]" : "bg-danger",
                  )}
                >
                  {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                </motion.span>
              ) : null}
            </span>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <IconButton
            label={muted ? "Unmute" : "Mute"}
            onClick={toggleMute}
            className="size-9 bg-ink text-white hover:bg-ink-soft"
          >
            <BellOff className="size-4" />
          </IconButton>
          <IconButton
            label="Delete chat"
            onClick={remove}
            className="size-9 bg-danger text-white hover:bg-danger/90"
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </NavLink>
    </motion.li>
  );
};

export const ConversationList = ({
  myId,
  onNewChat,
  onNewGroup,
}: {
  myId: string;
  onNewChat: () => void;
  onNewGroup: () => void;
}) => {
  const { data, isLoading } = useConversations();
  const [filter, setFilter] = useState("");

  const items = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((conversation) =>
      conversationTitle(conversation, myId).toLowerCase().includes(term),
    );
  }, [data, filter, myId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-2xl bg-[var(--field)] px-3">
          <Search className="size-4 text-[var(--text-muted)]" />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <IconButton
          label="New chat"
          onClick={onNewChat}
          className="bg-brand-500 text-white hover:bg-brand-600"
        >
          <Plus className="size-5" />
        </IconButton>
        <IconButton label="New group" onClick={onNewGroup} className="bg-[var(--field)]">
          <Users className="size-5" />
        </IconButton>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {isLoading ? (
          <div className="flex justify-center py-10 text-brand-500">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Search className="size-6" />}
            title={filter ? "No matches" : "No chats yet"}
            body={filter ? undefined : "Start a conversation with the + button."}
          />
        ) : (
          <ul className="flex flex-col gap-0.5">
            <AnimatePresence initial={false}>
              {items.map((conversation) => (
                <ConversationRow key={conversation.id} conversation={conversation} myId={myId} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
};
