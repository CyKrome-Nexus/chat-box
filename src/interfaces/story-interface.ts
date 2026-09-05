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
}
