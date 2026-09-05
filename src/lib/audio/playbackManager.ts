type TPauseHandler = () => void;

/**
 * Enforces single-track audio playback across the whole chat: each
 * AudioMessageBubble registers its pause handler when it starts playing, and
 * this manager calls the previously-active handler before recording the new
 * one, so starting playback on one bubble always pauses whichever other
 * bubble was playing.
 */
class AudioPlaybackManager {
    private activeId: string | null = null;
    private activePause: TPauseHandler | null = null;

    setActive(id: string, onPause: TPauseHandler) {
        if (this.activeId && this.activeId !== id) {
            this.activePause?.();
        }
        this.activeId = id;
        this.activePause = onPause;
    }

    clearIfActive(id: string) {
        if (this.activeId === id) {
            this.activeId = null;
            this.activePause = null;
        }
    }
}

export const audioPlaybackManager = new AudioPlaybackManager();
