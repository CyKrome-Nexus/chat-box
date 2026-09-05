/**
 * Deterministic pseudo-waveform seeded from a message id — used only as a
 * fallback for voice messages that don't carry real captured samples (e.g.
 * older messages recorded before this file existed). New recordings capture
 * real amplitude samples during recording (see useVoiceRecorder's live
 * metering) and store them on the message's attachment, so this is a
 * fallback path, not the primary source of waveform data.
 */
export const generateWaveform = (seed: string, bars = 32): number[] => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
    }

    const samples: number[] = [];
    let value = hash;
    for (let i = 0; i < bars; i++) {
        value = (value * 1103515245 + 12345) & 0x7fffffff;
        const normalized = (value % 1000) / 1000;
        samples.push(0.25 + normalized * 0.75);
    }
    return samples;
};

/** Downsamples a (possibly long) real waveform capture to a fixed bar count via bucket-averaging. */
export const resampleWaveform = (samples: number[], targetCount: number): number[] => {
    if (samples.length === 0) return new Array(targetCount).fill(0.15);
    if (samples.length <= targetCount) return samples;

    const bucketSize = samples.length / targetCount;
    const resampled: number[] = [];
    for (let i = 0; i < targetCount; i++) {
        const start = Math.floor(i * bucketSize);
        const end = Math.max(start + 1, Math.floor((i + 1) * bucketSize));
        const bucket = samples.slice(start, end);
        resampled.push(bucket.reduce((sum, v) => sum + v, 0) / bucket.length);
    }
    return resampled;
};
