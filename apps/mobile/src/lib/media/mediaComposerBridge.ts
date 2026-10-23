import { IAttachment } from "@/src/interfaces/message-interface";

export type TComposerResult = { attachment: IAttachment; caption: string } | null;

type TListener = (result: TComposerResult) => void;

/**
 * The camera-capture and media-editor screens live outside the Chat screen's
 * component tree (top-level fullScreenModal routes), so there's no prop path
 * to hand the finished attachment back. This singleton — same pattern as
 * callEngineManager for the calling engine — lets Chat.tsx register a
 * one-shot callback right before navigating in, which media-editor.tsx
 * invokes right before navigating back out.
 */
class MediaComposerBridge {
	private listener: TListener | null = null;

	waitForResult(listener: TListener) {
		this.listener = listener;
	}

	submit(result: TComposerResult) {
		this.listener?.(result);
		this.listener = null;
	}
}

export const mediaComposerBridge = new MediaComposerBridge();
