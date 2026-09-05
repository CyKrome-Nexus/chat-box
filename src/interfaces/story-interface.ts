import { IAvatar } from "./list-interface";

export type TStoryPrivacy = "contacts" | "contactsExcept" | "onlyShareWith";

export interface IStoryView {
    viewerId: string;
    viewerName: string;
    viewedAt: number;
}

export interface IStory {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar?: IAvatar;
    type: "image" | "video" | "text";
    uri?: string;
    caption?: string;
    /** Text status only. */
    textContent?: string;
    backgroundColor?: string;
    createdAt: number;
    expiresAt: number;
    views: IStoryView[];
    privacy: TStoryPrivacy;
    /** Ids excluded (contactsExcept) or exclusively included (onlyShareWith), depending on `privacy`. */
    audienceIds?: string[];
    /** "Save to Personal Archive" — exempts this story from the 24h expiry sweep. See stories-pipeline.md. */
    archivedByAuthor?: boolean;
    /**
     * Real per-story ephemeral Sender Key distribution (see e2ee-crypto.md's
     * Sender Keys) — one encrypted envelope per audience member's own
     * pairwise E2EE channel, carrying the key material needed to decrypt
     * this story's media. Populated by distributeStoryKey().
     */
    keyDistribution?: Record<string, string>;
}
