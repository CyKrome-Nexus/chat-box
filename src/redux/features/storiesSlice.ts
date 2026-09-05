import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IStory } from "@/src/interfaces/story-interface";

const DAY_MS = 24 * 60 * 60 * 1000;

interface StoriesState {
    stories: IStory[];
}

const seedStory = (
    id: string,
    authorId: string,
    authorName: string,
    avatarUrl: string,
    hoursAgo: number,
    overrides: Partial<IStory> = {}
): IStory => ({
    id,
    authorId,
    authorName,
    authorAvatar: { url: avatarUrl },
    type: "image",
    uri: `https://picsum.photos/seed/${id}/800/1400`,
    createdAt: Date.now() - hoursAgo * 60 * 60 * 1000,
    expiresAt: Date.now() - hoursAgo * 60 * 60 * 1000 + DAY_MS,
    views: [],
    privacy: "contacts",
    ...overrides,
});

// A few demo stories from existing seeded contacts (chatsSlice) so the
// carousel/viewer/progress-bar UI has something real to exercise — there's
// no backend for other real devices to post from. See stories.md.
const initialState: StoriesState = {
    stories: [
        seedStory("story-aarav-1", "aarav-mehta", "Aarav Mehta", "https://randomuser.me/api/portraits/men/12.jpg", 2),
        seedStory("story-priya-1", "priya-sharma", "Priya Sharma", "https://randomuser.me/api/portraits/women/18.jpg", 5, {
            type: "text",
            uri: undefined,
            textContent: "Working from a cafe today ☕️",
            backgroundColor: "#F5A623",
        }),
        seedStory("story-rohan-1", "rohan-singh", "Rohan Singh", "https://randomuser.me/api/portraits/men/45.jpg", 20),
    ],
};

export const storiesSlice = createSlice({
    name: "stories",
    initialState,
    reducers: {
        addStory: (state, action: PayloadAction<IStory>) => {
            state.stories.push(action.payload);
        },
        viewStory: (
            state,
            action: PayloadAction<{ storyId: string; viewerId: string; viewerName: string }>
        ) => {
            const story = state.stories.find((s) => s.id === action.payload.storyId);
            if (!story) return;
            if (story.views.some((v) => v.viewerId === action.payload.viewerId)) return;
            story.views.push({
                viewerId: action.payload.viewerId,
                viewerName: action.payload.viewerName,
                viewedAt: Date.now(),
            });
        },
        deleteStory: (state, action: PayloadAction<string>) => {
            state.stories = state.stories.filter((s) => s.id !== action.payload);
        },
        /** Auto-expiry sweep — see useStoriesExpirySweep.ts. */
        purgeExpiredStories: (state) => {
            const now = Date.now();
            state.stories = state.stories.filter((s) => s.expiresAt > now);
        },
    },
});

export const { addStory, viewStory, deleteStory, purgeExpiredStories } = storiesSlice.actions;
export default storiesSlice.reducer;
