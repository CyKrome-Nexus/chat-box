type TPauseHandler = () => void;
type TPlayHandler = () => void;

/**
 * Enforces single-track audio playback across the whole chat: each
 * AudioMessageBubble registers its pause handler when it starts playing, and
 * this manager calls the previously-active handler before recording the new
 * one, so starting playback on one bubble always pauses whichever other
 * bubble was playing.
 *
 * Also tracks each conversation's voice-note order and every mounted
 * bubble's play trigger, so finishing one voice note can auto-play the next
 * one in the thread (continuous playback).
 */
class AudioPlaybackManager {
    private activeId: string | null = null;
    private activePause: TPauseHandler | null = null;
    private sequences = new Map<string, string[]>();
    private playHandlers = new Map<string, TPlayHandler>();

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

    /** Called (e.g. from Chat.tsx) whenever a conversation's message list changes. */
    registerSequence(conversationId: string, orderedMessageIds: string[]) {
        this.sequences.set(conversationId, orderedMessageIds);
    }

    registerPlayHandler(messageId: string, onPlay: TPlayHandler) {
        this.playHandlers.set(messageId, onPlay);
        return () => {
            this.playHandlers.delete(messageId);
        };
    }

    playNext(conversationId: string, currentMessageId: string) {
        const sequence = this.sequences.get(conversationId);
        if (!sequence) return;

        const index = sequence.indexOf(currentMessageId);
        if (index === -1 || index === sequence.length - 1) return;

        const nextId = sequence[index + 1];
        this.playHandlers.get(nextId)?.();
    }
}

export const audioPlaybackManager = new AudioPlaybackManager();
