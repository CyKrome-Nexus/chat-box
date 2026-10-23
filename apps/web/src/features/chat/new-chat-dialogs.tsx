import { Check, Plus, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useState } from "react";
import { useNavigate } from "react-router";

import { LIMITS, type PublicUser } from "@chatbox/shared";

import { Avatar, Button, Dialog, EmptyState, Spinner } from "@/components/ui";
import { useCurrentUser } from "@/features/auth/auth-context";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useContacts, useCreateGroup, useStartDirect, useUserSearch } from "./queries";

const PeoplePicker = ({
  query,
  onQuery,
  onPick,
  selected,
}: {
  query: string;
  onQuery: (value: string) => void;
  onPick: (user: PublicUser) => void;
  selected?: Set<string>;
}) => {
  const deferred = useDeferredValue(query);
  const search = useUserSearch(deferred);
  const contacts = useContacts();
  const people = deferred.trim() ? (search.data ?? []) : (contacts.data ?? []).map((contact) => contact.user);
  const loading = deferred.trim() ? search.isFetching : contacts.isLoading;

  return (
    <>
      <label className="flex h-12 items-center gap-2 rounded-2xl bg-[var(--field)] px-4">
        <Search className="size-4 text-[var(--text-muted)]" />
        <input
          autoFocus
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search by name or @username"
          className="w-full bg-transparent text-sm outline-none"
        />
        {query ? (
          <button type="button" aria-label="Clear" onClick={() => onQuery("")}>
            <X className="size-4" />
          </button>
        ) : null}
      </label>
      <p className="mt-5 mb-2 text-sm font-medium text-[var(--text-muted)]">
        {deferred.trim() ? "People" : "My contacts"}
      </p>
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8 text-brand-500">
            <Spinner />
          </div>
        ) : people.length === 0 ? (
          <EmptyState
            icon={<Search className="size-6" />}
            title={deferred.trim() ? "No one found" : "No contacts yet"}
            body="Try searching for someone by name or @username."
          />
        ) : (
          <ul>
            {people.map((user) => {
              const isSelected = selected?.has(user.id) ?? false;
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => onPick(user)}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-[var(--field)]"
                  >
                    <Avatar name={user.name} src={user.avatarUrl} size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{user.name}</span>
                      <span className="block truncate text-xs text-[var(--text-muted)]">
                        {user.handle ? `@${user.handle}` : (user.about ?? "")}
                      </span>
                    </span>
                    {selected ? (
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full border-2 transition-colors",
                          isSelected ? "border-brand-500 bg-brand-500 text-white" : "border-[var(--border)]",
                        )}
                      >
                        {isSelected ? <Check className="size-3.5" strokeWidth={3} /> : null}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
};

export const NewChatDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const start = useStartDirect();

  const pick = async (user: PublicUser) => {
    const conversation = await start.mutateAsync(user.id);
    setQuery("");
    onClose();
    navigate(`/c/${conversation.id}`);
  };

  return (
    <Dialog open={open} onClose={onClose} title="New chat">
      <PeoplePicker query={query} onQuery={setQuery} onPick={(user) => void pick(user)} />
      {start.error ? <p className="mt-3 text-sm text-danger">{errorMessage(start.error)}</p> : null}
    </Dialog>
  );
};

export const NewGroupDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const create = useCreateGroup();
  const [step, setStep] = useState<"members" | "details">("members");
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Map<string, PublicUser>>(new Map());
  const [name, setName] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const close = () => {
    setStep("members");
    setQuery("");
    setMembers(new Map());
    setName("");
    setTags([]);
    create.reset();
    onClose();
  };

  const toggle = (user: PublicUser) => {
    const next = new Map(members);
    if (next.has(user.id)) next.delete(user.id);
    else next.set(user.id, user);
    setMembers(next);
  };

  const addTag = () => {
    const tag = tagDraft.trim();
    if (tag && !tags.includes(tag) && tags.length < LIMITS.groupTagsMax)
      setTags([...tags, tag.slice(0, LIMITS.groupTagMax)]);
    setTagDraft("");
  };

  const submit = async () => {
    const conversation = await create.mutateAsync({
      name: name.trim(),
      tags,
      memberIds: [...members.keys()],
    });
    close();
    navigate(`/c/${conversation.id}`);
  };

  return (
    <Dialog open={open} onClose={close} title="Create Group" className="sm:max-w-lg">
      <AnimatePresence mode="wait" initial={false}>
        {step === "members" ? (
          <motion.div
            key="members"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
          >
            {members.size ? (
              <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
                {[...members.values()].map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggle(user)}
                    className="relative shrink-0"
                    aria-label={`Remove ${user.name}`}
                  >
                    <Avatar name={user.name} src={user.avatarUrl} size={52} />
                    <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-[var(--bg-elevated)] shadow">
                      <X className="size-3" />
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            <PeoplePicker
              query={query}
              onQuery={setQuery}
              onPick={toggle}
              selected={new Set(members.keys())}
            />
            <Button className="mt-6 w-full" disabled={members.size === 0} onClick={() => setStep("details")}>
              Next · {members.size} selected
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
          >
            <p className="text-sm text-[var(--text-muted)]">Group name</p>
            <input
              autoFocus
              value={name}
              maxLength={LIMITS.groupNameMax}
              onChange={(event) => setName(event.target.value)}
              placeholder="Make Group for Team Work"
              className="mt-2 w-full bg-transparent text-3xl leading-tight font-medium outline-none placeholder:text-[var(--text-muted)]/60"
            />
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTags(tags.filter((item) => item !== tag))}
                  className="rounded-full bg-brand-50 px-4 py-2 text-sm dark:bg-ink-soft"
                >
                  {tag}
                </button>
              ))}
              {tags.length < LIMITS.groupTagsMax ? (
                <input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addTag())}
                  onBlur={addTag}
                  placeholder="+ Add tag"
                  className="w-28 rounded-full bg-[var(--field)] px-4 py-2 text-sm outline-none"
                />
              ) : null}
            </div>
            <p className="mt-6 text-sm text-[var(--text-muted)]">Group Admin</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={me.name} src={me.avatarUrl} size={52} />
              <div>
                <p className="font-medium">{me.name}</p>
                <p className="text-xs text-[var(--text-muted)]">Group Admin</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-[var(--text-muted)]">Invited Members</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {[...members.values()].map((user) => (
                <Avatar key={user.id} name={user.name} src={user.avatarUrl} size={60} />
              ))}
              <button
                type="button"
                onClick={() => setStep("members")}
                aria-label="Add more members"
                className="flex size-[60px] items-center justify-center rounded-full border border-dashed border-[var(--text-muted)]/50 text-[var(--text-muted)]"
              >
                <Plus className="size-5" />
              </button>
            </div>
            {create.error ? <p className="mt-4 text-sm text-danger">{errorMessage(create.error)}</p> : null}
            <Button
              className="mt-8 w-full"
              loading={create.isPending}
              disabled={!name.trim()}
              onClick={() => void submit()}
            >
              Create
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
};
