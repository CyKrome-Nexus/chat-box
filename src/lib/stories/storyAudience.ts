import { IChatRibbon } from "@/src/interfaces/list-interface";
import { TStoryPrivacy } from "@/src/interfaces/story-interface";

/** Resolves which conversation ids can see a story, given the ticket's three privacy tiers. */
export const resolveStoryAudience = (
    allChats: IChatRibbon[],
    privacy: TStoryPrivacy,
    audienceIds: string[] = []
): string[] => {
    const allContactIds = allChats.filter((c) => !c.isGroup && !c.isBroadcast).map((c) => c.id);

    if (privacy === "onlyShareWith") return audienceIds;
    if (privacy === "contactsExcept") return allContactIds.filter((id) => !audienceIds.includes(id));
    return allContactIds; // "contacts"
};
