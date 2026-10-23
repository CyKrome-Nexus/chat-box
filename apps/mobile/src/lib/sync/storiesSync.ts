import type { Story } from "@chatbox/shared";

import { mediaApi, storiesApi } from "@/src/lib/api/services";
import type { IStory } from "@/src/interfaces/story-interface";
import { store } from "@/src/redux/store/store";
import { addStory, deleteStory, hydrateStories } from "@/src/redux/features/storiesSlice";

const mimeFor = (type: "image" | "video", uri: string) => {
    if (type === "video") return "video/mp4";
    return /\.png$/i.test(uri) ? "image/png" : /\.webp$/i.test(uri) ? "image/webp" : "image/jpeg";
};

export const toLocalStory = (story: Story, myId: string): IStory => ({
    id: story.id,
    authorId: story.author.id === myId ? "me" : story.author.id,
    authorName: story.author.name,
    authorAvatar: story.author.avatarUrl ? { url: story.author.avatarUrl } : undefined,
    type: story.kind,
    uri: story.media?.url,
    caption: story.kind !== "text" ? (story.text ?? undefined) : undefined,
    textContent: story.kind === "text" ? (story.text ?? undefined) : undefined,
    backgroundColor: story.backgroundColor ?? undefined,
    createdAt: Date.parse(story.createdAt),
    expiresAt: Date.parse(story.expiresAt),
    views: [],
    privacy: "contacts",
    viewedByMe: story.viewedByMe,
    viewCount: story.viewCount ?? undefined,
});

const myId = () => store.getState().user?.id ?? "";

export const syncStories = async () => {
    const stories = await storiesApi.feed();
    store.dispatch(hydrateStories(stories.map((story) => toLocalStory(story, myId()))));
};

export const publishStory = async (input: {
    type: "image" | "video" | "text";
    uri?: string;
    text?: string;
    backgroundColor?: string;
    audienceUserIds?: string[];
}): Promise<IStory> => {
    let media;
    if (input.type !== "text" && input.uri) {
        const name = input.uri.split("/").pop() ?? `story.${input.type === "video" ? "mp4" : "jpg"}`;
        const uploaded = await mediaApi.upload({ uri: input.uri, name, type: mimeFor(input.type, input.uri) });
        media = { kind: input.type, key: uploaded.key, mimeType: uploaded.mimeType, size: uploaded.size };
    }
    const story = await storiesApi.create({
        kind: input.type,
        media,
        text: input.text,
        backgroundColor: input.backgroundColor,
        audienceUserIds: input.audienceUserIds,
    });
    const local = toLocalStory(story, myId());
    store.dispatch(addStory(local));
    return local;
};

export const markStoryViewed = (storyId: string) => storiesApi.view(storyId).catch(() => undefined);

export const removeStory = async (storyId: string) => {
    store.dispatch(deleteStory(storyId));
    await storiesApi.remove(storyId).catch(() => undefined);
};
