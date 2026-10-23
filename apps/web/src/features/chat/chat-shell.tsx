import { LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useParams } from "react-router";

import { Avatar } from "@/components/ui";
import { useCurrentUser } from "@/features/auth/auth-context";
import { ProfileDialog } from "@/features/profile/profile-dialog";
import { cn } from "@/lib/utils";
import { ConversationList } from "./conversation-list";
import { NewChatDialog, NewGroupDialog } from "./new-chat-dialogs";
import { useRealtime } from "./use-realtime";

export const ChatShell = () => {
  const me = useCurrentUser();
  const { conversationId } = useParams();
  const [dialog, setDialog] = useState<"chat" | "group" | "profile" | null>(null);
  useRealtime(me.id, conversationId ?? null);

  return (
    <div className="flex h-dvh overflow-hidden bg-ink">
      <aside
        className={cn("flex w-full flex-col lg:w-[400px] lg:shrink-0", conversationId && "hidden lg:flex")}
      >
        <header className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),1.25rem)] pb-6 text-white">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="" className="size-9 rounded-xl" />
            <h1 className="text-xl font-semibold">Chatbox</h1>
          </div>
          <div className="flex items-center gap-2">
            {me.role === "admin" ? (
              <Link
                to="/admin"
                aria-label="Admin dashboard"
                className="flex size-11 items-center justify-center rounded-full border border-white/15 hover:bg-white/10"
              >
                <LayoutDashboard className="size-5" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setDialog("profile")}
              aria-label="Settings"
              className="rounded-full ring-2 ring-white/10 transition-transform hover:scale-105"
            >
              <Avatar name={me.name} src={me.avatarUrl} size={44} />
            </button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col rounded-t-[var(--radius-sheet)] bg-[var(--bg-elevated)] lg:rounded-tr-none">
          <div className="mx-auto mt-3 h-1 w-8 rounded-full bg-[var(--border)] lg:hidden" />
          <ConversationList
            myId={me.id}
            onNewChat={() => setDialog("chat")}
            onNewGroup={() => setDialog("group")}
          />
        </div>
      </aside>
      <main
        className={cn(
          "min-w-0 flex-1 flex-col bg-[var(--bg)] lg:my-3 lg:mr-3 lg:rounded-[2rem] lg:border lg:border-[var(--border)]",
          conversationId ? "flex" : "hidden lg:flex",
        )}
      >
        <Outlet />
      </main>
      <NewChatDialog open={dialog === "chat"} onClose={() => setDialog(null)} />
      <NewGroupDialog open={dialog === "group"} onClose={() => setDialog(null)} />
      {dialog === "profile" ? <ProfileDialog open onClose={() => setDialog(null)} /> : null}
    </div>
  );
};
