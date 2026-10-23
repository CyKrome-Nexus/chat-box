import { useMemo } from "react";
import { useSelector } from "react-redux";

import { IMessage } from "@/src/interfaces/message-interface";
import { extractUrls } from "@/src/lib/media/linkPreview";

export interface IMediaGalleryItem {
    messageId: string;
    timestamp: number;
    uri: string;
    type: "image" | "video";
    viewOnce?: boolean;
}

export interface IDocGalleryItem {
    messageId: string;
    timestamp: number;
    uri?: string;
    name?: string;
    size?: number;
    mimeType?: string;
}

export interface IAudioGalleryItem {
    messageId: string;
    timestamp: number;
    uri?: string;
    duration?: number;
}

export interface ILinkGalleryItem {
    messageId: string;
    timestamp: number;
    url: string;
}

/**
 * Derives the four Shared Media Gallery tabs (Media/Docs/Links/Audio) from
 * the conversation's already-loaded message list — see
 * docs/architecture/media-gallery.md.
 */
export const useConversationMedia = (conversationId: string) => {
    const messages = useSelector(
        (state: any) => state.messages.byConversation[conversationId] as IMessage[] | undefined
    ) || [];

    return useMemo(() => {
        const media: IMediaGalleryItem[] = [];
        const docs: IDocGalleryItem[] = [];
        const audio: IAudioGalleryItem[] = [];
        const links: ILinkGalleryItem[] = [];

        for (const message of messages) {
            const attachment = message.attachment;
            if (attachment?.type === "image" || attachment?.type === "video") {
                media.push({
                    messageId: message.id,
                    timestamp: message.timestamp,
                    uri: attachment.uri || "",
                    type: attachment.type,
                    viewOnce: attachment.viewOnce,
                });
            } else if (attachment?.type === "document") {
                docs.push({
                    messageId: message.id,
                    timestamp: message.timestamp,
                    uri: attachment.uri,
                    name: attachment.name,
                    size: attachment.size,
                    mimeType: attachment.mimeType,
                });
            } else if (attachment?.type === "audio") {
                audio.push({
                    messageId: message.id,
                    timestamp: message.timestamp,
                    uri: attachment.uri,
                    duration: attachment.duration,
                });
            }

            if (message.text) {
                for (const url of extractUrls(message.text)) {
                    links.push({ messageId: message.id, timestamp: message.timestamp, url });
                }
            }
        }

        const byNewest = <T extends { timestamp: number }>(items: T[]) =>
            [...items].sort((a, b) => b.timestamp - a.timestamp);

        return {
            media: byNewest(media),
            docs: byNewest(docs),
            audio: byNewest(audio),
            links: byNewest(links),
        };
    }, [messages]);
};
