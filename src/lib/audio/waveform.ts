/**
 * expo-audio doesn't expose live amplitude metering for an in-progress
 * recording, and extracting a true waveform from a finished file needs a
 * decoding step this app doesn't have a backend for yet. Until that exists,
 * bubbles render a deterministic pseudo-waveform seeded from the message id,
 * so the same voice message always looks the same rather than reshuffling on
 * every re-render.
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
