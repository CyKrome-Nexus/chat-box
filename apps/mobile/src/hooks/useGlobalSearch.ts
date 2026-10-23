import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { searchMessages } from "@/src/lib/db/searchRepo";
import { IAttachment, IMessage, TAttachmentType } from "@/src/interfaces/message-interface";
import { IChatRibbon, IContactRibbon } from "@/src/interfaces/list-interface";
import { extractUrls } from "@/src/lib/media/linkPreview";

export type TSearchFilter = "chats" | "photos" | "videos" | "links" | "audio" | "documents";

export interface IMessageSearchResult {
    message: IMessage;
    chat: IChatRibbon | undefined;
}

const ATTACHMENT_TYPE_BY_FILTER: Partial<Record<TSearchFilter, TAttachmentType[]>> = {
    photos: ["image"],
    videos: ["video", "video_note"],
    audio: ["audio"],
    documents: ["document"],
};

const DEBOUNCE_MS = 200;

/**
 * Drives both the global search screen and its filter chips. Message text
 * search goes through SQLite FTS5 (`searchRepo.ts`); chat/contact-name
 * search and the media-type filters are simple in-memory scans over
 * already-loaded Redux state — there's no reason to hit SQLite for a
 * handful of chat ribbons.
 */
export const useGlobalSearch = (rawQuery: string, filter: TSearchFilter | null, contacts: IContactRibbon[]) => {
    const [query, setQuery] = useState(rawQuery);
    const chats = useSelector((state: any) => state.chats.chats as IChatRibbon[]);
    const byConversation = useSelector(
        (state: any) => state.messages.byConversation as Record<string, IMessage[]>
    );

    useEffect(() => {
        const timer = setTimeout(() => setQuery(rawQuery), DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [rawQuery]);

    const [messageHits, setMessageHits] = useState<IMessageSearchResult[]>([]);

    useEffect(() => {
        let cancelled = false;
        if (!query.trim() || filter) {
            setMessageHits([]);
            return;
        }
        searchMessages(query).then((hits) => {
            if (cancelled) return;
            const resolved = hits
                .map((hit) => {
                    const message = byConversation[hit.conversationId]?.find((m) => m.id === hit.messageId);
                    if (!message) return null;
                    return { message, chat: chats.find((c) => c.id === hit.conversationId) };
                })
                .filter((r): r is IMessageSearchResult => !!r);
            setMessageHits(resolved);
        });
        return () => {
            cancelled = true;
        };
    }, [query, filter, byConversation, chats]);

    const matchedChats = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.trim().toLowerCase();
        return chats.filter((c) => c.name.toLowerCase().includes(q));
    }, [chats, query]);

    const matchedContacts = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.trim().toLowerCase();
        return contacts.filter(
            (c) => c.name.toLowerCase().includes(q) || c.phoneNumber?.toLowerCase().includes(q)
        );
    }, [contacts, query]);

    const mediaResults = useMemo(() => {
        if (!filter || filter === "chats") return [];
        const q = query.trim().toLowerCase();

        if (filter === "links") {
            const results: { message: IMessage; chat?: IChatRibbon; url: string }[] = [];
            for (const [conversationId, messages] of Object.entries(byConversation)) {
                for (const message of messages) {
                    for (const url of extractUrls(message.text || "")) {
                        if (!q || url.toLowerCase().includes(q)) {
                            results.push({ message, chat: chats.find((c) => c.id === conversationId), url });
                        }
                    }
                }
            }
            return results.sort((a, b) => b.message.timestamp - a.message.timestamp);
        }

        const wantedTypes = ATTACHMENT_TYPE_BY_FILTER[filter] || [];
        const results: { message: IMessage; chat?: IChatRibbon; attachment: IAttachment }[] = [];
        for (const [conversationId, messages] of Object.entries(byConversation)) {
            for (const message of messages) {
                const attachment = message.attachment;
                if (!attachment || !wantedTypes.includes(attachment.type)) continue;
                if (q && !(attachment.name?.toLowerCase().includes(q) || message.text?.toLowerCase().includes(q))) continue;
                results.push({ message, chat: chats.find((c) => c.id === conversationId), attachment });
            }
        }
        return results.sort((a, b) => b.message.timestamp - a.message.timestamp);
    }, [byConversation, chats, filter, query]);

    return {
        query,
        chats: filter && filter !== "chats" ? [] : matchedChats,
        contacts: filter && filter !== "chats" ? [] : matchedContacts,
        messages: filter ? [] : messageHits,
        media: mediaResults,
    };
};
