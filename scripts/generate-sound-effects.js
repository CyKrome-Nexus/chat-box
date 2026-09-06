#!/usr/bin/env node
/**
 * Generates the app's UI sound effects as real, valid 16-bit PCM WAV files
 * via procedural sine-wave synthesis — there's no licensed sound library
 * available in this environment, so these are honestly-disclosed generated
 * tones (attack/decay-enveloped sine sweeps), not fabricated-but-implied
 * "professional" sound design. See docs/architecture/sound-haptics.md.
 *
 * Run with: node scripts/generate-sound-effects.js
 */
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, "..", "assets", "sounds");

/** Writes a mono 16-bit PCM WAV file from an array of [-1, 1] float samples. */
function writeWav(filePath, samples) {
	const dataSize = samples.length * 2;
	const buffer = Buffer.alloc(44 + dataSize);

	buffer.write("RIFF", 0);
	buffer.writeUInt32LE(36 + dataSize, 4);
	buffer.write("WAVE", 8);
	buffer.write("fmt ", 12);
	buffer.writeUInt32LE(16, 16); // fmt chunk size
	buffer.writeUInt16LE(1, 20); // PCM
	buffer.writeUInt16LE(1, 22); // mono
	buffer.writeUInt32LE(SAMPLE_RATE, 24);
	buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
	buffer.writeUInt16LE(2, 32); // block align
	buffer.writeUInt16LE(16, 34); // bits per sample
	buffer.write("data", 36);
	buffer.writeUInt32LE(dataSize, 40);

	for (let i = 0; i < samples.length; i++) {
		const clamped = Math.max(-1, Math.min(1, samples[i]));
		buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
	}

	fs.writeFileSync(filePath, buffer);
	console.log(`wrote ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

/** Linear-attack, exponential-decay envelope — avoids audible clicks at the
 * start/end of a tone and gives every effect a natural "pluck" shape. */
function envelope(t, duration, attack = 0.005) {
	if (t < attack) return t / attack;
	const release = duration - attack;
	return Math.exp(-4 * (t - attack) / release);
}

/** A single tone, optionally sweeping from startFreq to endFreq. */
function tone(duration, startFreq, endFreq = startFreq, amplitude = 0.5) {
	const n = Math.floor(SAMPLE_RATE * duration);
	const samples = new Array(n);
	for (let i = 0; i < n; i++) {
		const t = i / SAMPLE_RATE;
		const freq = startFreq + (endFreq - startFreq) * (t / duration);
		// Integrate frequency for a proper chirp phase instead of naively
		// using instantaneous freq*t (which would click on a sweep).
		const phase = 2 * Math.PI * (startFreq * t + ((endFreq - startFreq) * t * t) / (2 * duration));
		samples[i] = Math.sin(phase) * amplitude * envelope(t, duration);
	}
	return samples;
}

function concat(...chunks) {
	return chunks.flat();
}

function silence(duration) {
	return new Array(Math.floor(SAMPLE_RATE * duration)).fill(0);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// Message Sent — subtle soft swoosh/pop: quick upward chirp.
writeWav(path.join(OUT_DIR, "message-sent.wav"), tone(0.12, 520, 880, 0.4));

// Message Received — crisp high note alert: short bright two-note chime.
writeWav(
	path.join(OUT_DIR, "message-received.wav"),
	concat(tone(0.09, 1046, 1046, 0.45), silence(0.02), tone(0.14, 1568, 1568, 0.4))
);

// Voice Note Start — low ping.
writeWav(path.join(OUT_DIR, "voice-note-start.wav"), tone(0.1, 440, 440, 0.4));

// Voice Note Cancel — slide whoosh: downward sweep.
writeWav(path.join(OUT_DIR, "voice-note-cancel.wav"), tone(0.22, 700, 180, 0.35));

// Call Outgoing Ringing — melodic short call tone loop segment (two notes).
writeWav(
	path.join(OUT_DIR, "call-ringing.wav"),
	concat(tone(0.3, 622, 622, 0.4), silence(0.08), tone(0.3, 784, 784, 0.4), silence(0.3))
);

// Bundled per-contact notification tone library (Settings -> Contact Info ->
// Custom Notifications -> message tone / call ringtone) — distinct from the
// in-app SFX above, same honest procedural-synthesis disclosure.
const TONES_DIR = path.join(__dirname, "..", "assets", "sounds", "tones");
fs.mkdirSync(TONES_DIR, { recursive: true });

writeWav(path.join(TONES_DIR, "classic.wav"), concat(tone(0.12, 880, 880, 0.4), silence(0.06), tone(0.12, 880, 880, 0.4)));
writeWav(
	path.join(TONES_DIR, "chime.wav"),
	concat(tone(0.15, 659, 659, 0.35), silence(0.03), tone(0.15, 988, 988, 0.35), silence(0.03), tone(0.25, 1318, 1318, 0.3))
);
writeWav(
	path.join(TONES_DIR, "marimba.wav"),
	concat(tone(0.1, 523, 523, 0.4), silence(0.02), tone(0.1, 659, 659, 0.4), silence(0.02), tone(0.18, 784, 784, 0.35))
);
writeWav(path.join(TONES_DIR, "bell.wav"), tone(0.6, 1046, 1046, 0.45));

console.log("Done.");
