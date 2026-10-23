import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  BellOff,
  Camera,
  Copy,
  Crown,
  Link2,
  LogOut,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";

import {
  conversationAvatar,
  conversationTitle,
  directPeer,
  type Conversation,
  type Message,
  type Page,
  type PublicUser,
} from "@chatbox/shared";

import { Avatar, Button, Dialog, Spinner } from "@/components/ui";
import { useCurrentUser } from "@/features/auth/auth-context";
import { api, errorMessage } from "@/lib/api";
import { cache, keys, queryClient } from "@/lib/query";
import { cn } from "@/lib/utils";
import { useUserSearch } from "./queries";

const DISAPPEARING = [
  { label: "Off", value: null },
  { label: "24 hours", value: 24 * 60 * 60 },
  { label: "7 days", value: 7 * 24 * 60 * 60 },
  { label: "90 days", value: 90 * 24 * 60 * 60 },
];

const Row = ({
  icon,
  label,
  onClick,
  danger,
  children,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  children?: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left hover:bg-[var(--field)]",
      danger && "text-danger",
    )}
  >
    <span
      className={cn(
        "flex size-10 items-center justify-center rounded-full",
        danger ? "bg-danger/10" : "bg-[var(--field)]",
      )}
    >
      {icon}
    </span>
    <span className="flex-1 font-medium">{label}</span>
    {children}
  </button>
);

const SharedMedia = ({ conversationId }: { conversationId: string }) => {
  const { data } = useQuery({
    queryKey: ["media", conversationId],
    queryFn: () => api.get<Page<Message>>(`/conversations/${conversationId}/media?kind=media&limit=9`),
  });
  const images = (data?.items ?? []).flatMap((message) =>
    message.attachments.filter((attachment) => attachment.kind === "image"),
  );
  if (images.length === 0) return null;
  return (
    <section className="mt-6">
      <p className="mb-3 text-sm font-medium text-[var(--text-muted)]">Media shared</p>
      <div className="grid grid-cols-3 gap-2">
        {images.slice(0, 6).map((image) => (
          <a
            key={image.key}
            href={image.url}
            target="_blank"
            rel="noreferrer"
            className="aspect-square overflow-hidden rounded-2xl"
          >
            <img
              src={image.url}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform hover:scale-105"
            />
          </a>
        ))}
      </div>
    </section>
  );
};

const AddMembers = ({ conversation, onDone }: { conversation: Conversation; onDone: () => void }) => {
  const [query, setQuery] = useState("");
  const results = useUserSearch(query);
  const existing = new Set(conversation.members.map((member) => member.user.id));
  const add = async (user: PublicUser) => {
    cache.upsertConversation(
      await api.post<Conversation>(`/conversations/${conversation.id}/members`, { userIds: [user.id] }),
    );
    onDone();
  };
  return (
    <div className="mt-3 rounded-2xl bg-[var(--field)] p-3">
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search people to add"
        className="w-full bg-transparent px-1 py-2 text-sm outline-none"
      />
      {(results.data ?? [])
        .filter((user) => !existing.has(user.id))
        .map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => void add(user)}
            className="flex w-full items-center gap-3 rounded-xl px-1 py-2 hover:bg-[var(--bg-elevated)]"
          >
            <Avatar name={user.name} src={user.avatarUrl} size={36} />
            <span className="truncate text-sm font-medium">{user.name}</span>
          </button>
        ))}
    </div>
  );
};

export const ConversationInfo = ({
  open,
  onClose,
  conversation,
}: {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
}) => {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(conversation.name ?? "");

  const isGroup = conversation.type === "group";
  const peer = directPeer(conversation, me.id);
  const myRole = conversation.members.find((member) => member.user.id === me.id)?.role;
  const isAdmin = myRole === "owner" || myRole === "admin";
  const canEdit = isGroup && (isAdmin || !conversation.settings.onlyAdminsCanEditInfo);
  const muted = Boolean(conversation.mutedUntil && Date.parse(conversation.mutedUntil) > Date.now());

  const profile = useQuery({
    queryKey: ["users", peer?.id],
    queryFn: () => api.get<PublicUser>(`/users/${peer?.id}`),
    enabled: open && Boolean(peer),
  });

  const run = async (task: () => Promise<unknown>) => {
    setError(null);
    try {
      await task();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const update = (body: Record<string, unknown>) =>
    run(async () =>
      cache.upsertConversation(await api.patch<Conversation>(`/conversations/${conversation.id}`, body)),
    );

  const memberAction = (userId: string, action: "admin" | "member" | "remove") =>
    run(async () => {
      const result =
        action === "remove"
          ? await api.delete<Conversation>(`/conversations/${conversation.id}/members/${userId}`)
          : await api.patch<Conversation>(`/conversations/${conversation.id}/members/${userId}`, {
              role: action,
            });
      cache.upsertConversation(result);
    });

  const leave = () =>
    run(async () => {
      if (!window.confirm(isGroup ? "Leave this group?" : "Delete this chat for you?")) return;
      await api.post(`/conversations/${conversation.id}/leave`);
      cache.removeConversation(conversation.id);
      onClose();
      navigate("/");
    });

  const deleteGroup = () =>
    run(async () => {
      if (!window.confirm("Delete this group for everyone? This can't be undone.")) return;
      await api.delete(`/conversations/${conversation.id}?scope=everyone`);
      cache.removeConversation(conversation.id);
      onClose();
      navigate("/");
    });

  const toggleMute = () =>
    run(async () => {
      const mutedUntil = muted ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      await api.put(`/conversations/${conversation.id}/mute`, { mutedUntil });
      cache.patchConversation(conversation.id, (item) => ({ ...item, mutedUntil }));
    });

  const toggleBlock = () =>
    run(async () => {
      if (!peer) return;
      const blocked = profile.data?.isBlocked;
      if (blocked) await api.delete(`/users/${peer.id}/block`);
      else await api.put(`/users/${peer.id}/block`);
      await queryClient.invalidateQueries({ queryKey: ["users", peer.id] });
    });

  const toggleContact = () =>
    run(async () => {
      if (!peer) return;
      if (profile.data?.isContact) await api.delete(`/contacts/${peer.id}`);
      else await api.post("/contacts", { userId: peer.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users", peer.id] }),
        queryClient.invalidateQueries({ queryKey: keys.contacts }),
      ]);
    });

  const invite = () =>
    run(async () => {
      const { inviteCode } = await api.post<{ inviteCode: string }>(
        `/conversations/${conversation.id}/invite`,
      );
      cache.patchConversation(conversation.id, (item) => ({ ...item, inviteCode }));
    });

  const onAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    void run(async () =>
      cache.upsertConversation(await api.put<Conversation>(`/conversations/${conversation.id}/avatar`, form)),
    );
  };

  const inviteUrl = conversation.inviteCode
    ? `${window.location.origin}/join/${conversation.inviteCode}`
    : null;
  const title = conversationTitle(conversation, me.id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isGroup ? "Group info" : "Contact info"}
      className="sm:max-w-lg"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Avatar name={title} src={conversationAvatar(conversation, me.id)} size={96} />
          {canEdit ? (
            <>
              <button
                type="button"
                aria-label="Change group photo"
                onClick={() => avatarInput.current?.click()}
                className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg"
              >
                <Camera className="size-4" />
              </button>
              <input ref={avatarInput} type="file" accept="image/*" hidden onChange={onAvatar} />
            </>
          ) : null}
        </div>
        {renaming ? (
          <form
            className="mt-4 flex w-full gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void update({ name }).then(() => setRenaming(false));
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 flex-1 rounded-2xl bg-[var(--field)] px-4 outline-none"
            />
            <Button type="submit" className="h-11">
              Save
            </Button>
          </form>
        ) : (
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setRenaming(true)}
            className="mt-4 text-2xl font-semibold"
          >
            {title}
          </button>
        )}
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {isGroup ? `${conversation.members.length} members` : peer?.handle ? `@${peer.handle}` : ""}
        </p>
        {isGroup && conversation.tags.length ? (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {conversation.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-brand-50 px-3 py-1 text-xs dark:bg-ink-soft">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {!isGroup && profile.data ? (
        <dl className="mt-6 flex flex-col gap-4">
          {profile.data.about ? (
            <div>
              <dt className="text-sm text-[var(--text-muted)]">About</dt>
              <dd className="text-[17px]">{profile.data.about}</dd>
            </div>
          ) : null}
          {profile.data.email ? (
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Email Address</dt>
              <dd className="text-[17px]">{profile.data.email}</dd>
            </div>
          ) : null}
          {profile.data.phone ? (
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Phone Number</dt>
              <dd className="text-[17px]">{profile.data.phone}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <SharedMedia conversationId={conversation.id} />

      {isGroup ? (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--text-muted)]">Members</p>
            {isAdmin || !conversation.settings.onlyAdminsCanAddMembers ? (
              <button
                type="button"
                onClick={() => setAdding(!adding)}
                className="flex items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-400"
              >
                <UserPlus className="size-4" /> Add
              </button>
            ) : null}
          </div>
          {adding ? <AddMembers conversation={conversation} onDone={() => setAdding(false)} /> : null}
          <ul className="mt-2">
            {conversation.members.map((member) => (
              <li
                key={member.user.id}
                className="group flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-[var(--field)]"
              >
                <Avatar name={member.user.name} src={member.user.avatarUrl} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {member.user.id === me.id ? "You" : member.user.name}
                  </span>
                  {member.role !== "member" ? (
                    <span className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400">
                      {member.role === "owner" ? <Crown className="size-3" /> : <Shield className="size-3" />}
                      {member.role === "owner" ? "Owner" : "Admin"}
                    </span>
                  ) : null}
                </span>
                {isAdmin && member.user.id !== me.id && member.role !== "owner" ? (
                  <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {member.role === "member" ? (
                      <button
                        type="button"
                        title="Make admin"
                        onClick={() => void memberAction(member.user.id, "admin")}
                        className="rounded-full p-2 hover:bg-[var(--bg-elevated)]"
                      >
                        <Shield className="size-4" />
                      </button>
                    ) : myRole === "owner" ? (
                      <button
                        type="button"
                        title="Remove admin"
                        onClick={() => void memberAction(member.user.id, "member")}
                        className="rounded-full p-2 hover:bg-[var(--bg-elevated)]"
                      >
                        <Shield className="size-4 text-[var(--text-muted)]" />
                      </button>
                    ) : null}
                    {member.role === "member" || myRole === "owner" ? (
                      <button
                        type="button"
                        title="Remove from group"
                        onClick={() => void memberAction(member.user.id, "remove")}
                        className="rounded-full p-2 text-danger hover:bg-[var(--bg-elevated)]"
                      >
                        <UserMinus className="size-4" />
                      </button>
                    ) : null}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 flex flex-col gap-1">
        <label className="flex items-center gap-4 rounded-2xl px-3 py-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-[var(--field)]">⏱</span>
          <span className="flex-1 font-medium">Disappearing messages</span>
          <select
            value={conversation.disappearingSeconds ?? ""}
            disabled={isGroup && !canEdit}
            onChange={(event) =>
              void update({ disappearingSeconds: event.target.value ? Number(event.target.value) : null })
            }
            className="rounded-xl bg-[var(--field)] px-3 py-2 text-sm outline-none"
          >
            {DISAPPEARING.map((option) => (
              <option key={option.label} value={option.value ?? ""}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Row
          icon={<BellOff className="size-5" />}
          label={muted ? "Unmute notifications" : "Mute notifications"}
          onClick={() => void toggleMute()}
        />
        {isGroup && isAdmin ? (
          inviteUrl ? (
            <Row
              icon={<Copy className="size-5" />}
              label="Copy invite link"
              onClick={() => void navigator.clipboard.writeText(inviteUrl)}
            >
              <span className="max-w-40 truncate text-xs text-[var(--text-muted)]">
                {inviteUrl.replace(/^https?:\/\//, "")}
              </span>
            </Row>
          ) : (
            <Row
              icon={<Link2 className="size-5" />}
              label="Create invite link"
              onClick={() => void invite()}
            />
          )
        ) : null}
        {!isGroup && profile.data ? (
          <>
            <Row
              icon={<UserPlus className="size-5" />}
              label={profile.data.isContact ? "Remove from contacts" : "Add to contacts"}
              onClick={() => void toggleContact()}
            />
            <Row
              icon={<Ban className="size-5" />}
              label={profile.data.isBlocked ? `Unblock ${peer?.name ?? ""}` : `Block ${peer?.name ?? ""}`}
              danger
              onClick={() => void toggleBlock()}
            />
          </>
        ) : null}
        <Row
          icon={isGroup ? <LogOut className="size-5" /> : <Trash2 className="size-5" />}
          label={isGroup ? "Leave group" : "Delete chat"}
          danger
          onClick={() => void leave()}
        />
        {isGroup && myRole === "owner" ? (
          <Row
            icon={<Trash2 className="size-5" />}
            label="Delete group for everyone"
            danger
            onClick={() => void deleteGroup()}
          />
        ) : null}
      </section>
      {profile.isLoading ? <Spinner className="mx-auto mt-4 block text-brand-500" /> : null}
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </Dialog>
  );
};
