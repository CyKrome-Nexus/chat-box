import {
  Check,
  CheckCheck,
  Clock,
  Copy,
  FileText,
  MapPin,
  Pencil,
  Reply,
  SmilePlus,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useState } from "react";

import { previewText, type DeliveryStatus, type Message } from "@chatbox/shared";

import { Avatar } from "@/components/ui";
import { api } from "@/lib/api";
import { cache } from "@/lib/query";
import { getSocket } from "@/lib/socket";
import { cn, formatBytes, formatTime } from "@/lib/utils";
import { PENDING_PREFIX } from "./queries";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const StatusIcon = ({ status }: { status: DeliveryStatus }) => {
  if (status === "pending") return <Clock className="size-3" />;
  if (status === "sent") return <Check className="size-3.5" />;
  return <CheckCheck className={cn("size-3.5", status === "read" && "text-sky-300")} />;
};

const PollCard = ({ message, myId, mine }: { message: Message; myId: string; mine: boolean }) => {
  const poll = message.poll;
  if (!poll) return null;
  const total = new Set(poll.options.flatMap((option) => option.voterIds)).size;

  const vote = async (optionId: string) => {
    const current = poll.options
      .filter((option) => option.voterIds.includes(myId))
      .map((option) => option.id);
    const next = poll.allowMultiple
      ? current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId]
      : current.includes(optionId)
        ? []
        : [optionId];
    cache.patchMessage(message.conversationId, message.id, (item) => ({
      ...item,
      poll: item.poll && {
        ...item.poll,
        options: item.poll.options.map((option) => ({
          ...option,
          voterIds: next.includes(option.id)
            ? [...new Set([...option.voterIds, myId])]
            : option.voterIds.filter((id) => id !== myId),
        })),
      },
    }));
    await api.put(`/messages/${message.id}/vote`, { optionIds: next }).catch(() => undefined);
  };

  return (
    <div className="w-72 max-w-full">
      <p className="mb-3 text-[15px] font-semibold">{poll.question}</p>
      <div className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const votes = option.voterIds.length;
          const chosen = option.voterIds.includes(myId);
          const share = total ? votes / total : 0;
          return (
            <button
              key={option.id}
              type="button"
              disabled={message.id.startsWith(PENDING_PREFIX)}
              onClick={() => void vote(option.id)}
              className={cn(
                "relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors",
                mine
                  ? "border-white/25 hover:bg-white/10"
                  : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-brand-400",
              )}
            >
              <motion.span
                className={cn(
                  "absolute inset-y-0 left-0",
                  mine ? "bg-white/15" : "bg-brand-50 dark:bg-brand-700/30",
                )}
                initial={false}
                animate={{ width: `${share * 100}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
              />
              <span className="relative flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    chosen
                      ? mine
                        ? "border-white bg-white text-brand-600"
                        : "border-brand-500 bg-brand-500 text-white"
                      : "border-current opacity-50",
                  )}
                >
                  {chosen ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{option.text}</span>
                  {option.description ? (
                    <span className="block text-xs opacity-70">{option.description}</span>
                  ) : null}
                </span>
                <span className="text-xs font-semibold tabular-nums">{votes}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs opacity-70">
        {total} {total === 1 ? "vote" : "votes"}
        {poll.allowMultiple ? " · multiple choice" : ""}
      </p>
    </div>
  );
};

const Attachments = ({ message }: { message: Message }) => (
  <div className="flex flex-col gap-1.5">
    {message.attachments.map((attachment) => {
      if (attachment.kind === "image" || attachment.kind === "sticker") {
        return (
          <a key={attachment.key} href={attachment.url} target="_blank" rel="noreferrer">
            <img
              src={attachment.url}
              alt={attachment.name ?? "Image"}
              loading="lazy"
              decoding="async"
              className="max-h-80 w-full max-w-xs rounded-2xl object-cover"
              style={
                attachment.width && attachment.height
                  ? { aspectRatio: `${attachment.width} / ${attachment.height}` }
                  : undefined
              }
            />
          </a>
        );
      }
      if (attachment.kind === "video" || attachment.kind === "video_note") {
        return (
          <video
            key={attachment.key}
            src={attachment.url}
            controls
            preload="metadata"
            className={cn(
              "max-h-80 max-w-xs rounded-2xl",
              attachment.kind === "video_note" && "size-56 rounded-full object-cover",
            )}
          />
        );
      }
      if (attachment.kind === "audio") {
        return (
          <audio
            key={attachment.key}
            src={attachment.url}
            controls
            preload="metadata"
            className="h-10 w-64 max-w-full"
          />
        );
      }
      return (
        <a
          key={attachment.key}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          download={attachment.name ?? true}
          className="flex items-center gap-3 rounded-xl bg-black/5 p-3 dark:bg-white/5"
        >
          <FileText className="size-8 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{attachment.name ?? "Document"}</span>
            <span className="text-xs opacity-70">{formatBytes(attachment.size)}</span>
          </span>
        </a>
      );
    })}
  </div>
);

interface BubbleProps {
  message: Message;
  myId: string;
  isGroup: boolean;
  showSender: boolean;
  status: DeliveryStatus;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  canModerate: boolean;
}

export const MessageBubble = memo(
  ({ message, myId, isGroup, showSender, status, onReply, onEdit, canModerate }: BubbleProps) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const mine = message.sender?.id === myId;
    const pending = message.id.startsWith(PENDING_PREFIX);

    if (message.kind === "system") {
      return (
        <div className="my-2 flex justify-center">
          <span className="rounded-full bg-[var(--field)] px-3 py-1 text-xs text-[var(--text-muted)]">
            {message.text}
          </span>
        </div>
      );
    }

    const deleted = Boolean(message.deletedAt);
    const react = async (emoji: string) => {
      setMenuOpen(false);
      const existing = message.reactions.find((reaction) => reaction.userIds.includes(myId))?.emoji;
      await api
        .put(`/messages/${message.id}/reaction`, { emoji: existing === emoji ? null : emoji })
        .catch(() => undefined);
    };
    const remove = async (scope: "me" | "everyone") => {
      setMenuOpen(false);
      if (
        !window.confirm(
          scope === "everyone" ? "Delete this message for everyone?" : "Delete this message for you?",
        )
      )
        return;
      await api.delete(`/messages/${message.id}?scope=${scope}`).catch(() => undefined);
    };
    const editable =
      mine &&
      !deleted &&
      message.kind === "text" &&
      Date.now() - Date.parse(message.createdAt) < 15 * 60 * 1000;

    return (
      <motion.div
        initial={pending ? { opacity: 0, y: 8, scale: 0.98 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 36 }}
        className={cn(
          "group flex gap-3",
          mine ? "justify-end" : "justify-start",
          showSender ? "mt-4" : "mt-1",
        )}
        id={`message-${message.id}`}
      >
        {!mine && isGroup ? (
          <span className="w-10 shrink-0">
            {showSender ? (
              <Avatar name={message.sender?.name ?? "?"} src={message.sender?.avatarUrl} size={40} />
            ) : null}
          </span>
        ) : null}
        <div
          className={cn("relative flex max-w-[min(32rem,78%)] flex-col", mine ? "items-end" : "items-start")}
        >
          {showSender && !mine && isGroup ? (
            <p className="mb-1 text-sm font-medium">{message.sender?.name}</p>
          ) : null}
          <div
            onContextMenu={(event) => {
              if (deleted || pending) return;
              event.preventDefault();
              setMenuOpen(true);
            }}
            className={cn(
              "relative rounded-2xl px-4 py-2.5 text-[15px] leading-snug break-words whitespace-pre-wrap",
              mine ? "rounded-tr-md bg-brand-500 text-white" : "rounded-tl-md bg-[var(--bubble-in)]",
              deleted && "italic opacity-70",
              pending && "opacity-80",
            )}
          >
            {message.replyTo ? (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(`message-${message.replyTo?.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
                className={cn(
                  "mb-2 block w-full rounded-lg border-l-4 px-2.5 py-1.5 text-left text-xs",
                  mine ? "border-white/70 bg-white/15" : "border-brand-500 bg-black/5 dark:bg-white/5",
                )}
              >
                <span className="block font-semibold">
                  {message.replyTo.senderId === myId ? "You" : message.replyTo.senderName}
                </span>
                <span className="line-clamp-2 opacity-80">
                  {previewText({
                    kind: message.replyTo.kind,
                    text: message.replyTo.text,
                    deleted: !message.replyTo.text && message.replyTo.kind === "text",
                  })}
                </span>
              </button>
            ) : null}
            {deleted ? (
              "This message was deleted"
            ) : (
              <>
                {message.sticker && !message.attachments.length ? (
                  <span className="block text-6xl leading-none" role="img" aria-label="Sticker">
                    {message.sticker.emoji ?? "🙂"}
                  </span>
                ) : null}
                {message.attachments.length ? <Attachments message={message} /> : null}
                {message.kind === "poll" ? <PollCard message={message} myId={myId} mine={mine} /> : null}
                {message.location ? (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${message.location.latitude}&mlon=${message.location.longitude}#map=16/${message.location.latitude}/${message.location.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 underline-offset-2 hover:underline"
                  >
                    <MapPin className="size-4" /> {message.location.label ?? "Shared location"}
                  </a>
                ) : null}
                {message.text && message.kind !== "poll" ? (
                  <p className={cn(message.attachments.length > 0 && "mt-2")}>{message.text}</p>
                ) : null}
              </>
            )}
            {!deleted && !pending ? (
              <button
                type="button"
                aria-label="Message actions"
                onClick={() => setMenuOpen(true)}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--field)]",
                  mine ? "-left-10" : "-right-10",
                )}
              >
                <SmilePlus className="size-4" />
              </button>
            ) : null}
          </div>
          {message.reactions.length ? (
            <div
              className={cn(
                "-mt-2 z-10 flex gap-0.5 rounded-full bg-[var(--bg-elevated)] px-1.5 py-0.5 text-sm shadow-sm ring-1 ring-[var(--border)]",
                mine ? "mr-2" : "ml-2",
              )}
            >
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() => void react(reaction.emoji)}
                  className="flex items-center gap-0.5"
                >
                  {reaction.emoji}
                  {reaction.userIds.length > 1 ? (
                    <span className="text-[11px] text-[var(--text-muted)]">{reaction.userIds.length}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
          <span className="mt-1 flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
            {message.editedAt && !deleted ? "Edited · " : ""}
            {formatTime(message.createdAt)}
            {mine && !deleted ? <StatusIcon status={pending ? "pending" : status} /> : null}
          </span>

          <AnimatePresence>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 600, damping: 36 }}
                  className={cn(
                    "absolute top-full z-40 mt-1 w-56 origin-top overflow-hidden rounded-2xl bg-[var(--bg-elevated)] shadow-xl ring-1 ring-[var(--border)]",
                    mine ? "right-0" : "left-0",
                  )}
                >
                  <div className="flex justify-between border-b border-[var(--border)] px-2 py-2">
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => void react(emoji)}
                        className="rounded-full p-1 text-xl transition-transform hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <MenuItem
                    icon={<Reply className="size-4" />}
                    label="Reply"
                    onClick={() => {
                      setMenuOpen(false);
                      onReply(message);
                    }}
                  />
                  {message.text ? (
                    <MenuItem
                      icon={<Copy className="size-4" />}
                      label="Copy"
                      onClick={() => {
                        setMenuOpen(false);
                        void navigator.clipboard.writeText(message.text ?? "");
                      }}
                    />
                  ) : null}
                  {editable ? (
                    <MenuItem
                      icon={<Pencil className="size-4" />}
                      label="Edit"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(message);
                      }}
                    />
                  ) : null}
                  <MenuItem
                    icon={<Trash2 className="size-4" />}
                    label="Delete for me"
                    danger
                    onClick={() => void remove("me")}
                  />
                  {mine || canModerate ? (
                    <MenuItem
                      icon={<Trash2 className="size-4" />}
                      label="Delete for everyone"
                      danger
                      onClick={() => void remove("everyone")}
                    />
                  ) : null}
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  },
);
MessageBubble.displayName = "MessageBubble";

const MenuItem = ({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--field)]",
      danger && "text-danger",
    )}
  >
    {icon}
    {label}
  </button>
);

export const emitTyping = (conversationId: string, isTyping: boolean) =>
  getSocket()?.emit("typing:update", { conversationId, isTyping });
