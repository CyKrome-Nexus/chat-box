import { createAudioPlayer } from "expo-audio";

export interface INotificationTone {
	key: string;
	label: string;
	source: number;
}

/** The bundled tone library for per-contact custom notifications — real,
 * procedurally-synthesized WAV files (see scripts/generate-sound-effects.js),
 * distinct from the in-app SFX set in soundEffects.ts. */
export const MESSAGE_TONES: INotificationTone[] = [
	{ key: "default", label: "Default", source: require("../../../assets/sounds/message-received.wav") },
	{ key: "classic", label: "Classic", source: require("../../../assets/sounds/tones/classic.wav") },
	{ key: "chime", label: "Chime", source: require("../../../assets/sounds/tones/chime.wav") },
	{ key: "marimba", label: "Marimba", source: require("../../../assets/sounds/tones/marimba.wav") },
	{ key: "bell", label: "Bell", source: require("../../../assets/sounds/tones/bell.wav") },
];

export const CALL_RINGTONES: INotificationTone[] = [
	{ key: "default", label: "Default", source: require("../../../assets/sounds/call-ringing.wav") },
	{ key: "chime", label: "Chime", source: require("../../../assets/sounds/tones/chime.wav") },
	{ key: "bell", label: "Bell", source: require("../../../assets/sounds/tones/bell.wav") },
];

/** Plays a bundled tone by key, or a device-picked file by its URI (see
 * `CustomNotificationsScreen`'s document picker) — one-shot preview playback,
 * a fresh player each call since previews are infrequent enough that a
 * cached-player pool (like soundEffects.ts uses for hot-path SFX) isn't
 * worth the bookkeeping here. */
export const previewTone = (toneKeyOrUri: string, library: INotificationTone[]) => {
	const bundled = library.find((tone) => tone.key === toneKeyOrUri);
	const player = createAudioPlayer(bundled ? bundled.source : { uri: toneKeyOrUri });
	player.play();
};
