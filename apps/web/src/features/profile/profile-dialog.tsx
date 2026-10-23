import { useQuery } from "@tanstack/react-query";
import { Camera, LogOut, Monitor, Moon, Shield, Sun, Trash2 } from "lucide-react";
import { useDeferredValue, useRef, useState, type ChangeEvent } from "react";

import {
  handleSchema,
  LIMITS,
  updateProfileSchema,
  type CurrentUser,
  type PrivacySettings,
  type SessionInfo,
  type Visibility,
} from "@chatbox/shared";

import { Avatar, Button, Dialog } from "@/components/ui";
import { useAuth, useCurrentUser } from "@/features/auth/auth-context";
import { api, errorMessage } from "@/lib/api";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const VISIBILITY: { value: Visibility; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "contacts", label: "My contacts" },
  { value: "nobody", label: "Nobody" },
];

const Segmented = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
}) => (
  <div className="flex rounded-2xl bg-[var(--field)] p-1">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-colors",
          value === option.value ? "bg-[var(--bg-elevated)] shadow-sm" : "text-[var(--text-muted)]",
        )}
      >
        {option.icon}
        {option.label}
      </button>
    ))}
  </div>
);

const HandleField = ({
  value,
  onChange,
  original,
}: {
  value: string;
  onChange: (value: string) => void;
  original: string | null;
}) => {
  const deferred = useDeferredValue(value);
  const parsed = handleSchema.safeParse(deferred);
  const check = useQuery({
    queryKey: ["handle", deferred.toLowerCase()],
    queryFn: () =>
      api.get<{ available: boolean }>(`/users/handle-availability?handle=${encodeURIComponent(deferred)}`),
    enabled: parsed.success && deferred.toLowerCase() !== original,
    staleTime: 30_000,
  });
  const hint = !value
    ? "Optional — lets people find you without your phone number"
    : !parsed.success
      ? parsed.error.issues[0]?.message
      : deferred.toLowerCase() === original
        ? "This is your username"
        : check.isFetching
          ? "Checking…"
          : check.data?.available
            ? "Available"
            : "Already taken";
  const good = !value || (parsed.success && (deferred.toLowerCase() === original || check.data?.available));
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-[var(--text-muted)]">Username</span>
      <span className="flex h-11 items-center rounded-2xl bg-[var(--field)] px-4">
        <span className="text-[var(--text-muted)]">@</span>
        <input
          value={value}
          maxLength={LIMITS.handleMax}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent outline-none"
        />
      </span>
      <span className={cn("text-xs", good ? "text-[var(--text-muted)]" : "text-danger")}>{hint}</span>
    </label>
  );
};

export const ProfileDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const me = useCurrentUser();
  const { setUser, signOut } = useAuth();
  const [theme, setTheme] = useTheme();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: me.name, handle: me.handle ?? "", about: me.about ?? "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get<{ items: SessionInfo[] }>("/auth/sessions")).items,
    enabled: open,
  });

  const save = async () => {
    const parsed = updateProfileSchema.safeParse({
      name: form.name,
      about: form.about.trim() || null,
      handle: form.handle.trim() || null,
    });
    if (!parsed.success)
      return setMessage({ tone: "error", text: parsed.error.issues[0]?.message ?? "Check your details" });
    setSaving(true);
    try {
      setUser(await api.patch<CurrentUser>("/users/me", parsed.data));
      setMessage({ tone: "ok", text: "Profile saved" });
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const setPrivacy = async (patch: Partial<PrivacySettings>) => {
    setUser({ ...me, privacy: { ...me.privacy, ...patch } });
    try {
      setUser(await api.patch<CurrentUser>("/users/me/privacy", patch));
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
    }
  };

  const onAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    try {
      setUser(await api.put<CurrentUser>("/users/me/avatar", body));
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
    }
  };

  const revoke = async (id: string) => {
    await api.delete(`/auth/sessions/${id}`).catch(() => undefined);
    await sessions.refetch();
  };

  const deleteAccount = async () => {
    const password = me.hasPassword
      ? window.prompt("Enter your password to permanently delete your account")
      : "";
    if (password === null || (!me.hasPassword && !window.confirm("Permanently delete your account?"))) return;
    try {
      await api.post("/auth/account/delete", { password: password || undefined });
      await signOut();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Settings" className="sm:max-w-lg">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => avatarInput.current?.click()}
          className="group relative"
          aria-label="Change profile photo"
        >
          <Avatar name={me.name} src={me.avatarUrl} size={72} />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-5" />
          </span>
        </button>
        <input
          ref={avatarInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => void onAvatar(event)}
        />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{me.name}</p>
          <p className="truncate text-sm text-[var(--text-muted)]">{me.email ?? me.phone}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--text-muted)]">Display name</span>
          <input
            value={form.name}
            maxLength={LIMITS.nameMax}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="h-11 rounded-2xl bg-[var(--field)] px-4 outline-none"
          />
        </label>
        <HandleField
          value={form.handle}
          original={me.handle}
          onChange={(handle) => setForm({ ...form, handle })}
        />
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--text-muted)]">About</span>
          <input
            value={form.about}
            maxLength={LIMITS.aboutMax}
            onChange={(event) => setForm({ ...form, about: event.target.value })}
            placeholder="Never give up 💪"
            className="h-11 rounded-2xl bg-[var(--field)] px-4 outline-none"
          />
        </label>
        {message ? (
          <p className={cn("text-sm", message.tone === "ok" ? "text-brand-600" : "text-danger")}>
            {message.text}
          </p>
        ) : null}
        <Button loading={saving} onClick={() => void save()}>
          Save profile
        </Button>
      </div>

      <section className="mt-8">
        <p className="mb-3 text-sm font-medium text-[var(--text-muted)]">Appearance</p>
        <Segmented<ThemePreference>
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: "Light", icon: <Sun className="size-4" /> },
            { value: "dark", label: "Dark", icon: <Moon className="size-4" /> },
            { value: "system", label: "System", icon: <Monitor className="size-4" /> },
          ]}
        />
      </section>

      <section className="mt-8 flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
          <Shield className="size-4" /> Privacy
        </p>
        {(["lastSeen", "profilePhoto", "about"] as const).map((key) => (
          <div key={key} className="flex flex-col gap-2">
            <span className="text-sm">
              {{ lastSeen: "Last seen & online", profilePhoto: "Profile photo", about: "About" }[key]}
            </span>
            <Segmented<Visibility>
              value={me.privacy[key]}
              options={VISIBILITY}
              onChange={(value) => void setPrivacy({ [key]: value })}
            />
          </div>
        ))}
        {(["readReceipts", "discoverableByPhone", "discoverableByEmail"] as const).map((key) => (
          <label
            key={key}
            className="flex items-center justify-between rounded-2xl bg-[var(--field)] px-4 py-3 text-sm"
          >
            {
              {
                readReceipts: "Read receipts",
                discoverableByPhone: "Find me by phone number",
                discoverableByEmail: "Find me by email",
              }[key]
            }
            <input
              type="checkbox"
              checked={me.privacy[key]}
              onChange={(event) => void setPrivacy({ [key]: event.target.checked })}
              className="size-5 accent-[var(--color-brand-500)]"
            />
          </label>
        ))}
      </section>

      <section className="mt-8">
        <p className="mb-3 text-sm font-medium text-[var(--text-muted)]">Active sessions</p>
        <ul className="flex flex-col gap-1">
          {(sessions.data ?? []).map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-[var(--field)]"
            >
              <span className="text-sm">
                <span className="font-medium">
                  {session.deviceName ?? session.platform ?? "Unknown device"}
                </span>
                <span className="block text-xs text-[var(--text-muted)]">
                  {session.current
                    ? "This device"
                    : `Last active ${new Date(session.lastUsedAt).toLocaleDateString()}`}
                </span>
              </span>
              {!session.current ? (
                <button
                  type="button"
                  onClick={() => void revoke(session.id)}
                  className="text-sm font-medium text-danger"
                >
                  Sign out
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 flex flex-col gap-2">
        <Button variant="secondary" onClick={() => void signOut()}>
          <LogOut className="size-4" /> Sign out
        </Button>
        <button
          type="button"
          onClick={() => void deleteAccount()}
          className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-danger"
        >
          <Trash2 className="size-4" /> Delete account
        </button>
      </section>
    </Dialog>
  );
};
