import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";

import type { Conversation, InvitePreview } from "@chatbox/shared";

import { Avatar, Button, EmptyState, Spinner } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { cache } from "@/lib/query";

export const JoinInvitePage = () => {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const preview = useQuery({
    queryKey: ["invite", code],
    queryFn: () => api.get<InvitePreview>(`/invites/${code}`),
    retry: false,
  });
  const join = useMutation({
    mutationFn: () => api.post<Conversation>(`/invites/${code}/join`),
    onSuccess: (conversation) => {
      cache.upsertConversation(conversation);
      navigate(`/c/${conversation.id}`, { replace: true });
    },
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink p-6">
      <div className="w-full max-w-sm rounded-[2rem] bg-[var(--bg-elevated)] p-8 text-center animate-fade-in">
        {preview.isLoading ? (
          <Spinner className="text-brand-500" />
        ) : preview.data ? (
          <>
            <Avatar name={preview.data.name} src={preview.data.avatarUrl} size={88} className="mx-auto" />
            <h1 className="mt-4 text-2xl font-semibold">{preview.data.name}</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{preview.data.memberCount} members</p>
            {preview.data.description ? <p className="mt-4 text-sm">{preview.data.description}</p> : null}
            {join.error ? <p className="mt-4 text-sm text-danger">{errorMessage(join.error)}</p> : null}
            <Button
              className="mt-8 w-full"
              loading={join.isPending}
              onClick={() =>
                preview.data?.alreadyMember ? navigate(`/c/${preview.data.conversationId}`) : join.mutate()
              }
            >
              {preview.data.alreadyMember ? "Open group" : "Join group"}
            </Button>
          </>
        ) : (
          <EmptyState
            icon="🔗"
            title="Invite not found"
            body="This invite link is invalid or has been revoked."
          />
        )}
      </div>
    </div>
  );
};
