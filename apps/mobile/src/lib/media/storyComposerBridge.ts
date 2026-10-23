export type TStoryComposerResult = { uri: string; type: "image" | "video"; caption: string } | null;

type TListener = (result: TStoryComposerResult) => void;

/**
 * Same one-shot cross-route bridge pattern as `mediaComposerBridge.ts`, used
 * to hand a captured/picked photo or video back from `/camera-capture` or
 * `/media-editor` (both opened with `?target=story`) to whichever screen
 * triggered story creation.
 */
class StoryComposerBridge {
	private listener: TListener | null = null;

	waitForResult(listener: TListener) {
		this.listener = listener;
	}

	submit(result: TStoryComposerResult) {
		this.listener?.(result);
		this.listener = null;
	}
}

export const storyComposerBridge = new StoryComposerBridge();
