import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IStory } from "@/src/interfaces/story-interface";

interface StoriesState {
    stories: IStory[];
}

const initialState: StoriesState = {
    stories: [],
};

export const storiesSlice = createSlice({
    name: "stories",
    initialState,
    reducers: {
        addStory: (state, action: PayloadAction<IStory>) => {
            state.stories = state.stories.filter((s) => s.id !== action.payload.id).concat(action.payload);
        },
        hydrateStories: (state, action: PayloadAction<IStory[]>) => {
            const archived = state.stories.filter((s) => s.archivedByAuthor);
            const ids = new Set(action.payload.map((s) => s.id));
            state.stories = action.payload.concat(archived.filter((s) => !ids.has(s.id)));
        },
        viewStory: (
            state,
            action: PayloadAction<{ storyId: string; viewerId: string; viewerName: string }>
        ) => {
            const story = state.stories.find((s) => s.id === action.payload.storyId);
            if (!story) return;
            story.viewedByMe = true;
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
        /** "Save to Personal Archive" — exempts the story from the expiry sweep below. */
        toggleArchiveStory: (state, action: PayloadAction<string>) => {
            const story = state.stories.find((s) => s.id === action.payload);
            if (story) story.archivedByAuthor = !story.archivedByAuthor;
        },
        setStoryKeyDistribution: (
            state,
            action: PayloadAction<{ storyId: string; keyDistribution: Record<string, string> }>
        ) => {
            const story = state.stories.find((s) => s.id === action.payload.storyId);
            if (story) story.keyDistribution = action.payload.keyDistribution;
        },
        /** Auto-expiry sweep — see useStoriesExpirySweep.ts. Archived stories are kept regardless of age. */
        purgeExpiredStories: (state) => {
            const now = Date.now();
            state.stories = state.stories.filter((s) => s.archivedByAuthor || s.expiresAt > now);
        },
    },
});

export const {
    addStory,
    hydrateStories,
    viewStory,
    deleteStory,
    toggleArchiveStory,
    setStoryKeyDistribution,
    purgeExpiredStories,
} = storiesSlice.actions;
export default storiesSlice.reducer;
