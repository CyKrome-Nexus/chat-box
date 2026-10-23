import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LayoutDashboard, MessageSquare, MessagesSquare, Search, Users } from "lucide-react";
import { motion } from "motion/react";
import { useDeferredValue, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router";

import type { AdminConversation, AdminMessage, AdminPage, AdminStats, AdminUser } from "@chatbox/shared";

import { Avatar, Button, Spinner } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { keys } from "@/lib/query";
import { cn, formatListTime } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users, end: false },
  { to: "/admin/chats", label: "Chats", icon: MessagesSquare, end: false },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare, end: false },
];

export const AdminLayout = () => (
  <div className="flex min-h-dvh flex-col bg-[var(--bg)] lg:flex-row">
    <aside className="flex shrink-0 flex-col gap-1 bg-ink p-4 text-white lg:w-64 lg:p-6">
      <Link to="/" className="mb-6 flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> Back to chats
      </Link>
      <p className="mb-4 hidden text-xl font-semibold lg:block">Admin</p>
      <nav className="flex gap-1 overflow-x-auto lg:flex-col">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                isActive ? "bg-brand-500 text-white" : "text-white/70 hover:bg-white/10",
              )
            }
          >
            <Icon className="size-4" /> {label}
          </NavLink>
        ))}
      </nav>
    </aside>
    <main className="min-w-0 flex-1 p-4 sm:p-8">
      <Outlet />
    </main>
  </div>
);

const StatCard = ({ label, value, delay }: { label: string; value: number; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: "spring", stiffness: 300, damping: 30 }}
    className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
  >
    <p className="text-sm text-[var(--text-muted)]">{label}</p>
    <p className="mt-2 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
  </motion.div>
);

export const AdminDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: keys.admin("stats", null),
    queryFn: () => api.get<AdminStats>("/admin/stats"),
  });
  if (isLoading) return <Spinner className="text-brand-500" />;
  if (error || !data) return <p className="text-danger">{errorMessage(error)}</p>;
  const peak = Math.max(1, ...data.messagesLast7Days.map((day) => day.count));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Users" value={data.users} delay={0} />
        <StatCard label="Active (24h)" value={data.activeUsers24h} delay={0.04} />
        <StatCard label="Direct chats" value={data.directChats} delay={0.08} />
        <StatCard label="Groups" value={data.groups} delay={0.12} />
        <StatCard label="Messages" value={data.messages} delay={0.16} />
      </div>
      <section className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
        <p className="font-semibold">Messages · last 7 days</p>
        <div
          className="mt-6 flex h-56 items-end gap-3"
          role="img"
          aria-label="Messages per day for the last 7 days"
        >
          {data.messagesLast7Days.map((day, index) => (
            <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-xs font-medium tabular-nums">{day.count}</span>
              <motion.div
                className="w-full max-w-12 rounded-t-xl bg-brand-500"
                initial={{ height: 0 }}
                animate={{ height: `${(day.count / peak) * 100}%` }}
                transition={{ delay: 0.1 + index * 0.04, type: "spring", stiffness: 160, damping: 24 }}
                style={{ minHeight: 4 }}
              />
              <span className="text-xs text-[var(--text-muted)]">
                {new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const useAdminList = <T,>(section: string, search: string, page: number, extra = "") => {
  const q = useDeferredValue(search);
  return useQuery({
    queryKey: keys.admin(section, { q, page, extra }),
    queryFn: () =>
      api.get<AdminPage<T>>(
        `/admin/${section}?page=${page}&pageSize=25${q ? `&q=${encodeURIComponent(q)}` : ""}${extra}`,
      ),
    placeholderData: keepPreviousData,
  });
};

const TableShell = ({
  title,
  search,
  onSearch,
  page,
  onPage,
  data,
  loading,
  children,
}: {
  title: string;
  search?: string;
  onSearch?: (value: string) => void;
  page: number;
  onPage: (page: number) => void;
  data: AdminPage<unknown> | undefined;
  loading: boolean;
  children: ReactNode;
}) => {
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {onSearch ? (
          <label className="flex h-11 w-full max-w-xs items-center gap-2 rounded-2xl bg-[var(--field)] px-4">
            <Search className="size-4 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        ) : null}
      </div>
      <div className="mt-6 overflow-x-auto rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)]">
        <table className={cn("w-full text-left text-sm transition-opacity", loading && "opacity-60")}>
          {children}
        </table>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3 text-sm">
        <span className="text-[var(--text-muted)]">
          Page {page} of {pages} · {data?.total.toLocaleString() ?? 0} total
        </span>
        <Button
          variant="secondary"
          className="h-9 px-4"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          className="h-9 px-4"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

const th = "px-5 py-3 font-medium text-[var(--text-muted)]";
const td = "px-5 py-3 border-t border-[var(--border)]";

export const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const { data, isFetching } = useAdminList<AdminUser>("users", search, page);

  const update = async (user: AdminUser, body: { disabled?: boolean; role?: "user" | "admin" }) => {
    if (!window.confirm(`Apply this change to ${user.name}? They will be signed out of all devices.`)) return;
    try {
      await api.patch(`/admin/users/${user.id}`, body);
      await client.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (error) {
      window.alert(errorMessage(error));
    }
  };

  return (
    <TableShell
      title="Users"
      search={search}
      onSearch={(value) => {
        setSearch(value);
        setPage(1);
      }}
      page={page}
      onPage={setPage}
      data={data}
      loading={isFetching}
    >
      <thead>
        <tr>
          <th className={th}>User</th>
          <th className={th}>Contact</th>
          <th className={th}>Chats</th>
          <th className={th}>Groups</th>
          <th className={th}>Joined</th>
          <th className={th}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {(data?.items ?? []).map((user) => (
          <tr key={user.id} className={cn(user.disabled && "opacity-50")}>
            <td className={td}>
              <span className="flex items-center gap-3">
                <Avatar name={user.name} src={user.avatarUrl} size={36} />
                <span>
                  <span className="block font-medium">{user.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {user.handle ? `@${user.handle}` : ""} {user.role === "admin" ? "· Admin" : ""}
                  </span>
                </span>
              </span>
            </td>
            <td className={td}>{user.email ?? user.phone ?? "—"}</td>
            <td className={td}>{user.directChats}</td>
            <td className={td}>{user.groups}</td>
            <td className={td}>{formatListTime(user.createdAt)}</td>
            <td className={td}>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void update(user, { disabled: !user.disabled })}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    user.disabled ? "bg-brand-50 text-brand-600" : "bg-danger/10 text-danger",
                  )}
                >
                  {user.disabled ? "Enable" : "Disable"}
                </button>
                <button
                  type="button"
                  onClick={() => void update(user, { role: user.role === "admin" ? "user" : "admin" })}
                  className="rounded-full bg-[var(--field)] px-3 py-1 text-xs font-semibold"
                >
                  {user.role === "admin" ? "Revoke admin" : "Make admin"}
                </button>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
};

export const AdminChats = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isFetching } = useAdminList<AdminConversation>("conversations", search, page);
  return (
    <TableShell
      title="Chats"
      search={search}
      onSearch={(value) => {
        setSearch(value);
        setPage(1);
      }}
      page={page}
      onPage={setPage}
      data={data}
      loading={isFetching}
    >
      <thead>
        <tr>
          <th className={th}>Name</th>
          <th className={th}>Type</th>
          <th className={th}>Members</th>
          <th className={th}>Messages</th>
          <th className={th}>Created by</th>
          <th className={th}>Created</th>
        </tr>
      </thead>
      <tbody>
        {(data?.items ?? []).map((conversation) => (
          <tr key={conversation.id}>
            <td className={td}>
              <span className="flex items-center gap-3">
                <Avatar name={conversation.name ?? "Direct"} src={conversation.avatarUrl} size={36} />
                <span className="font-medium">{conversation.name ?? "Direct chat"}</span>
              </span>
            </td>
            <td className={td}>{conversation.type === "group" ? "Group" : "Direct"}</td>
            <td className={td}>{conversation.memberCount}</td>
            <td className={td}>
              <Link
                to={`/admin/messages?conversationId=${conversation.id}`}
                className="text-brand-600 hover:underline"
              >
                {conversation.messageCount}
              </Link>
            </td>
            <td className={td}>{conversation.createdBy?.name ?? "—"}</td>
            <td className={td}>{formatListTime(conversation.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
};

export const AdminMessages = () => {
  const [page, setPage] = useState(1);
  const conversationId = new URLSearchParams(window.location.search).get("conversationId");
  const { data, isFetching } = useAdminList<AdminMessage>(
    "messages",
    "",
    page,
    conversationId ? `&conversationId=${conversationId}` : "",
  );
  return (
    <TableShell title="Messages" page={page} onPage={setPage} data={data} loading={isFetching}>
      <thead>
        <tr>
          <th className={th}>Sender</th>
          <th className={th}>Kind</th>
          <th className={th}>Chat</th>
          <th className={th}>Attachments</th>
          <th className={th}>Status</th>
          <th className={th}>Sent</th>
        </tr>
      </thead>
      <tbody>
        {(data?.items ?? []).map((message) => (
          <tr key={message.id}>
            <td className={td}>{message.sender?.name ?? "System"}</td>
            <td className={td}>{message.kind}</td>
            <td className={td}>{message.conversationType === "group" ? "Group" : "Direct"}</td>
            <td className={td}>{message.attachmentCount}</td>
            <td className={td}>{message.deleted ? "Deleted" : "—"}</td>
            <td className={td}>{formatListTime(message.createdAt)}</td>
          </tr>
        ))}
      </tbody>
      <caption className="caption-bottom px-5 py-3 text-left text-xs text-[var(--text-muted)]">
        Message contents are encrypted at rest and never shown in the admin panel.
      </caption>
    </TableShell>
  );
};
