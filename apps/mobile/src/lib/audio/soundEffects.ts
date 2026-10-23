import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import { store } from "@/src/redux/store/store";

export type TSoundEffect = "messageSent" | "messageReceived" | "voiceNoteStart" | "voiceNoteCancel" | "callRinging";

const SOUND_SOURCES: Record<TSoundEffect, number> = {
	messageSent: require("../../../assets/sounds/message-sent.wav"),
	messageReceived: require("../../../assets/sounds/message-received.wav"),
	voiceNoteStart: require("../../../assets/sounds/voice-note-start.wav"),
	voiceNoteCancel: require("../../../assets/sounds/voice-note-cancel.wav"),
	callRinging: require("../../../assets/sounds/call-ringing.wav"),
};

let audioModeConfigured = false;
const players = new Map<TSoundEffect, AudioPlayer>();

/**
 * "Never interrupt background music abruptly; use ducking/mixing audio
 * session categories" — `interruptionMode: "duckOthers"` is expo-audio's
 * real, typed equivalent of `AVAudioSessionCategoryAmbient`-with-ducking on
 * iOS (and the matching Android audio focus behavior): background audio
 * lowers in volume for the duration of the effect and recovers afterward,
 * rather than stopping outright. Configured once, lazily, on first play.
 */
const ensureAudioMode = async () => {
	if (audioModeConfigured) return;
	audioModeConfigured = true;
	await setAudioModeAsync({
		playsInSilentMode: true,
		interruptionMode: "duckOthers",
		shouldPlayInBackground: false,
	});
};

const getPlayer = (effect: TSoundEffect): AudioPlayer => {
	let player = players.get(effect);
	if (!player) {
		player = createAudioPlayer(SOUND_SOURCES[effect]);
		players.set(effect, player);
	}
	return player;
};

/**
 * Plays a short UI sound effect, gated by Settings -> Notifications ->
 * "In-App Sounds". Reads the Redux store directly (module-level singleton,
 * same pattern as `callEngineManager.ts`) so any call site — a Redux
 * reducer's side effect, a gesture callback, a realtime event handler — can
 * fire a sound without needing to be a React component wired up with
 * `useSelector`.
 */
export const playSoundEffect = async (effect: TSoundEffect): Promise<void> => {
	const enabled = store.getState().settings.notifications.inAppSounds;
	if (!enabled) return;

	try {
		await ensureAudioMode();
		const player = getPlayer(effect);
		await player.seekTo(0);
		player.play();
	} catch {
		// Best-effort — a missing/unloaded player should never crash the
		// action (sending a message, starting a recording) it's decorating.
	}
};

/**
 * The outgoing call screen's ringback tone — unlike the one-shot effects
 * above, this needs to keep playing for as long as the call is ringing, so
 * it gets its own start/stop pair instead of a single `playSoundEffect`
 * call. `loop: true` repeats the melodic two-note `call-ringing.wav`
 * (including its trailing silence, giving a natural ring-pause-ring cadence)
 * until `stopCallRingingLoop()` is called on connect/hangup.
 */
export const startCallRingingLoop = async (): Promise<void> => {
	const enabled = store.getState().settings.notifications.inAppSounds;
	if (!enabled) return;

	try {
		await ensureAudioMode();
		const player = getPlayer("callRinging");
		player.loop = true;
		await player.seekTo(0);
		player.play();
	} catch {
		// Best-effort — see playSoundEffect.
	}
};

export const stopCallRingingLoop = (): void => {
	try {
		const player = players.get("callRinging");
		player?.pause();
	} catch {
		// Best-effort — see playSoundEffect.
	}
};
