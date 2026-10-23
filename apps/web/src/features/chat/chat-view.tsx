import {
  ArrowLeft,
  BarChart3,
  Info,
  Paperclip,
  Pencil,
  Phone,
  Reply,
  SendHorizontal,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Link, useParams } from "react-router";

import {
  LIMITS,
  conversationAvatar,
  conversationTitle,
  deliveryStatus,
  directPeer,
  type AttachmentInput,
  type Conversation,
  type Message,
} from "@chatbox/shared";

import { Avatar, EmptyState, IconButton, Spinner } from "@/components/ui";
import { useCurrentUser } from "@/features/auth/auth-context";
import { api, errorMessage } from "@/lib/api";
import { usePresence, useTypingUsers } from "@/lib/live-store";
import { cache } from "@/lib/query";
import { cn, formatDay, formatLastSeen } from "@/lib/utils";
import { ConversationInfo } from "./conversation-info";
import { emitTyping, MessageBubble } from "./message-bubble";
import { PollComposer } from "./poll-composer";
import { markConversationRead, uploadFile, useConversation, useMessages, useSendMessage } from "./queries";

const attachmentKindFor = (file: File): AttachmentInput["kind"] => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
};

const imageSize = (file: File) =>
  new Promise<{ width?: number; height?: number }>((resolve) => {
    if (!file.type.startsWith("image/")) return resolve({});
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => resolve({});
    image.src = url;
  });

const Header = ({
  conversation,
  myId,
  onInfo,
}: {
  conversation: Conversation;
  myId: string;
  onInfo: () => void;
}) => {
  const peer = directPeer(conversation, myId);
  const presence = usePresence(peer?.id);
  const typing = useTypingUsers(conversation.id).filter((id) => id !== myId);
  const title = conversationTitle(conversation, myId);
  const names = typing
    .map((id) => conversation.members.find((member) => member.user.id === id)?.user.name.split(" ")[0])
    .filter(Boolean);

  const subtitle = typing.length
    ? conversation.type === "group"
      ? `${names.join(", ")} typing…`
      : "typing…"
    : conversation.type === "group"
      ? `${conversation.members.length} members`
      : formatLastSeen(presence?.lastSeenAt ?? null, presence?.online ?? false);

  return (
    <header className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 shadow-[0_8px_24px_-20px_rgba(0,0,0,0.25)] sm:px-6">
      <Link
        to="/"
        aria-label="Back"
        className="-ml-1 inline-flex size-10 items-center justify-center rounded-full hover:bg-[var(--field)] lg:hidden"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <button type="button" onClick={onInfo} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar
          name={title}
          src={conversationAvatar(conversation, myId)}
          size={44}
          online={peer ? (presence?.online ?? false) : undefined}
        />
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold">{title}</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={subtitle}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              className={cn(
                "block truncate text-xs",
                typing.length ? "text-brand-500" : "text-[var(--text-muted)]",
              )}
            >
              {subtitle || " "}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>
      <IconButton label="Voice calls are available in the mobile app" disabled className="opacity-40">
        <Phone className="size-5" />
      </IconButton>
      <IconButton label="Video calls are available in the mobile app" disabled className="opacity-40">
        <Video className="size-5" />
      </IconButton>
      <IconButton label="Chat info" onClick={onInfo}>
        <Info className="size-5" />
      </IconButton>
    </header>
  );
};

const Composer = ({
  conversation,
  replyTo,
  editing,
  onClearContext,
  onSend,
}: {
  conversation: Conversation;
  replyTo: Message | null;
  editing: Message | null;
  onClearContext: () => void;
  onSend: (input: { text?: string; attachments?: AttachmentInput[]; kind: Message["kind"] }) => Promise<void>;
}) => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editing) setText(editing.text ?? "");
    textarea.current?.focus();
  }, [editing, replyTo]);

  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [text]);

  const stopTyping = useCallback(() => {
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
      emitTyping(conversation.id, false);
    }
  }, [conversation.id]);

  useEffect(() => stopTyping, [stopTyping]);

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    if (!typingTimer.current) emitTyping(conversation.id, true);
    else clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 3000);
  };

  const submit = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setError(null);
    stopTyping();
    if (editing) {
      setBusy(true);
      try {
        await api.patch(`/messages/${editing.id}`, { text: value });
        setText("");
        onClearContext();
      } catch (failure) {
        setError(errorMessage(failure));
      } finally {
        setBusy(false);
      }
      return;
    }
    setText("");
    onSend({ kind: "text", text: value }).catch((failure: unknown) => {
      setText(value);
      setError(errorMessage(failure));
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
    if (event.key === "Escape" && (replyTo || editing)) {
      setText("");
      onClearContext();
    }
  };

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])].slice(0, LIMITS.attachmentsPerMessage);
    event.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const attachments = await Promise.all(
        files.map(async (file) => {
          const [uploaded, size] = await Promise.all([uploadFile(file), imageSize(file)]);
          return {
            kind: attachmentKindFor(file),
            key: uploaded.key,
            name: file.name,
            mimeType: uploaded.mimeType,
            size: uploaded.size,
            ...size,
          } satisfies AttachmentInput;
        }),
      );
      const kinds = new Set(attachments.map((attachment) => attachment.kind));
      const kind = kinds.size === 1 ? (attachments[0]?.kind ?? "document") : "document";
      await onSend({ kind, attachments, text: text.trim() || undefined });
      setText("");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const blocked = conversation.type === "group" && conversation.settings.onlyAdminsCanSend;

  return (
    <div className="border-t border-[var(--border)] px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-6">
      <AnimatePresence>
        {replyTo || editing ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-2 flex items-center gap-3 rounded-2xl bg-[var(--field)] px-4 py-2">
              {editing ? (
                <Pencil className="size-4 text-brand-500" />
              ) : (
                <Reply className="size-4 text-brand-500" />
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-brand-600 dark:text-brand-400">
                  {editing ? "Edit message" : `Reply to ${replyTo?.sender?.name ?? ""}`}
                </p>
                <p className="truncate text-[var(--text-muted)]">
                  {(editing ?? replyTo)?.text ?? "Attachment"}
                </p>
              </div>
              <IconButton
                label="Cancel"
                onClick={() => {
                  setText("");
                  onClearContext();
                }}
                className="size-8"
              >
                <X className="size-4" />
              </IconButton>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {error ? <p className="mb-2 text-sm text-danger">{error}</p> : null}
      <div className="flex items-end gap-2">
        <IconButton
          label="Attach files"
          onClick={() => fileInput.current?.click()}
          disabled={busy || Boolean(editing)}
        >
          {busy ? <Spinner className="size-5 text-brand-500" /> : <Paperclip className="size-5" />}
        </IconButton>
        {conversation.type === "group" ? (
          <IconButton label="Create poll" onClick={() => setPollOpen(true)} disabled={Boolean(editing)}>
            <BarChart3 className="size-5" />
          </IconButton>
        ) : null}
        <input ref={fileInput} type="file" multiple hidden onChange={(event) => void onFiles(event)} />
        <textarea
          ref={textarea}
          rows={1}
          value={text}
          maxLength={LIMITS.messageTextMax}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={blocked ? "Only admins can send messages" : "Write your message"}
          className="scrollbar-thin max-h-40 min-h-11 flex-1 resize-none rounded-2xl bg-[var(--field)] px-4 py-3 text-[15px] leading-5 outline-none placeholder:text-[var(--text-muted)]"
        />
        <motion.button
          type="button"
          aria-label={editing ? "Save edit" : "Send"}
          onClick={() => void submit()}
          disabled={!text.trim()}
          whileTap={{ scale: 0.9 }}
          animate={{ scale: text.trim() ? 1 : 0.92, opacity: text.trim() ? 1 : 0.5 }}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white"
        >
          <SendHorizontal className="size-5" />
        </motion.button>
      </div>
      <PollComposer open={pollOpen} onClose={() => setPollOpen(false)} conversationId={conversation.id} />
    </div>
  );
};

const Thread = ({ conversation }: { conversation: Conversation }) => {
  const me = useCurrentUser();
  const {
    data: messages = [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMessages(conversation.id);
  const send = useSendMessage(me);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const previousHeight = useRef(0);
  const last = messages.at(-1);
  const myRole = conversation.members.find((member) => member.user.id === me.id)?.role;

  useEffect(() => {
    setReplyTo(null);
    setEditing(null);
    stickToBottom.current = true;
  }, [conversation.id]);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    if (stickToBottom.current) element.scrollTop = element.scrollHeight;
    else if (previousHeight.current && element.scrollTop < 40)
      element.scrollTop = element.scrollHeight - previousHeight.current;
    previousHeight.current = element.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    const onVisible = () =>
      document.visibilityState === "visible" && markConversationRead(conversation, last, me.id);
    onVisible();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [conversation, last, me.id]);

  const onScroll = () => {
    const element = scroller.current;
    if (!element) return;
    stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
    if (element.scrollTop < 200 && hasNextPage && !isFetchingNextPage) {
      previousHeight.current = element.scrollHeight;
      void fetchNextPage();
    }
  };

  const onSend = async (input: { text?: string; attachments?: AttachmentInput[]; kind: Message["kind"] }) => {
    stickToBottom.current = true;
    const reply = replyTo;
    setReplyTo(null);
    await send({
      conversationId: conversation.id,
      kind: input.kind as Exclude<Message["kind"], "system">,
      text: input.text,
      attachments: input.attachments,
      replyToId: reply?.id,
    });
  };

  useEffect(() => {
    if (conversation.unreadCount > 0)
      cache.patchConversation(conversation.id, (item) => ({ ...item, unreadCount: 0 }));
  }, [conversation.id, conversation.unreadCount]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header conversation={conversation} myId={me.id} onInfo={() => setInfoOpen(true)} />
      <div
        ref={scroller}
        onScroll={onScroll}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6"
      >
        {isFetchingNextPage ? (
          <div className="flex justify-center py-2 text-brand-500">
            <Spinner className="size-4" />
          </div>
        ) : null}
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-brand-500">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<SendHorizontal className="size-6" />}
            title="No messages yet"
            body="Send the first message to start the conversation."
          />
        ) : (
          messages.map((message, index) => {
            const previous = messages[index - 1];
            const newDay =
              !previous ||
              new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
            const showSender =
              newDay || previous?.sender?.id !== message.sender?.id || previous?.kind === "system";
            return (
              <div key={message.clientId ?? message.id}>
                {newDay ? (
                  <div className="my-4 flex justify-center">
                    <span className="rounded-lg bg-[var(--field)] px-3 py-1 text-xs font-medium">
                      {formatDay(message.createdAt)}
                    </span>
                  </div>
                ) : null}
                <MessageBubble
                  message={message}
                  myId={me.id}
                  isGroup={conversation.type === "group"}
                  showSender={showSender}
                  status={deliveryStatus(message, conversation, me.id)}
                  onReply={setReplyTo}
                  onEdit={setEditing}
                  canModerate={conversation.type === "group" && (myRole === "owner" || myRole === "admin")}
                />
              </div>
            );
          })
        )}
      </div>
      <Composer
        conversation={conversation}
        replyTo={replyTo}
        editing={editing}
        onClearContext={() => {
          setReplyTo(null);
          setEditing(null);
        }}
        onSend={onSend}
      />
      <ConversationInfo open={infoOpen} onClose={() => setInfoOpen(false)} conversation={conversation} />
    </div>
  );
};

export const ChatView = () => {
  const { conversationId } = useParams();
  const conversation = useConversation(conversationId);
  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center text-brand-500">
        <Spinner />
      </div>
    );
  }
  return <Thread key={conversation.id} conversation={conversation} />;
};

export const NoChatSelected = () => (
  <div className="hidden flex-1 items-center justify-center lg:flex">
    <EmptyState
      icon={<SendHorizontal className="size-6" />}
      title="Select a chat"
      body="Pick a conversation from the list or start a new one."
    />
  </div>
);
