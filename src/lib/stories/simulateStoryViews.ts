import { viewStory } from "@/src/redux/features/storiesSlice";

const DEMO_VIEWERS = [
    { viewerId: "aarav-mehta", viewerName: "Aarav Mehta" },
    { viewerId: "priya-sharma", viewerName: "Priya Sharma" },
];

/**
 * There's no backend/other real devices to actually view a posted status, so
 * this simulates a couple of demo contacts "viewing" it a little while
 * after posting — purely so the Viewer Analytics sheet in story-viewer.tsx
 * has real (if fabricated) data to show. Mirrors the same simulated-receipt
 * pattern used for message delivery/read status elsewhere in this repo.
 */
export const simulateStoryViews = (dispatch: (action: ReturnType<typeof viewStory>) => void, storyId: string) => {
    DEMO_VIEWERS.forEach((viewer, index) => {
        setTimeout(
            () => dispatch(viewStory({ storyId, ...viewer })),
            10000 + index * 12000
        );
    });
};
