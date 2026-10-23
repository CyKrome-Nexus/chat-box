/**
 * Client-side adaptive video quality: polls `getStats()` for the outbound
 * video track's packet loss and dynamically re-scales the sender's
 * resolution/bitrate. This needs no server support — it's a real,
 * self-contained use of the standard WebRTC stats + `RTCRtpSender.setParameters`
 * APIs — unlike the signaling/TURN pieces documented in
 * docs/architecture/audio-calling-engine.md.
 */

interface IQualityTier {
    label: "720p" | "480p" | "360p";
    scaleResolutionDownBy: number;
    maxBitrate: number;
    maxFramerate: number;
}

const QUALITY_TIERS: IQualityTier[] = [
    { label: "720p", scaleResolutionDownBy: 1, maxBitrate: 1_500_000, maxFramerate: 30 },
    { label: "480p", scaleResolutionDownBy: 1.5, maxBitrate: 700_000, maxFramerate: 24 },
    { label: "360p", scaleResolutionDownBy: 2, maxBitrate: 350_000, maxFramerate: 15 },
];

const POLL_INTERVAL_MS = 4000;
const PACKET_LOSS_DOWNGRADE_THRESHOLD = 0.05; // 5%
const PACKET_LOSS_UPGRADE_THRESHOLD = 0.01; // 1%

export class AdaptiveBitrateController {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private tierIndex = 0;
    private lastPacketsSent = 0;
    private lastPacketsLost = 0;

    onTierChange: ((tier: IQualityTier) => void) | null = null;

    /** `pc` is the raw RTCPeerConnection from CallPeerConnection.getRawConnection(). */
    start(pc: { getSenders: () => any[] }) {
        this.stop();
        this.intervalId = setInterval(() => this.evaluate(pc), POLL_INTERVAL_MS);
    }

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = null;
    }

    private async evaluate(pc: { getSenders: () => any[] }) {
        const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (!videoSender) return;

        try {
            const stats = await videoSender.getStats();
            let packetsSent = 0;
            let packetsLost = 0;

            stats.forEach((report: any) => {
                if (report.type === "outbound-rtp" && report.kind === "video") {
                    packetsSent = report.packetsSent ?? 0;
                }
                if (report.type === "remote-inbound-rtp" && report.kind === "video") {
                    packetsLost = report.packetsLost ?? 0;
                }
            });

            const deltaSent = Math.max(0, packetsSent - this.lastPacketsSent);
            const deltaLost = Math.max(0, packetsLost - this.lastPacketsLost);
            this.lastPacketsSent = packetsSent;
            this.lastPacketsLost = packetsLost;

            if (deltaSent === 0) return;
            const lossRatio = deltaLost / (deltaSent + deltaLost);

            if (lossRatio > PACKET_LOSS_DOWNGRADE_THRESHOLD && this.tierIndex < QUALITY_TIERS.length - 1) {
                this.tierIndex += 1;
                await this.applyTier(videoSender);
            } else if (lossRatio < PACKET_LOSS_UPGRADE_THRESHOLD && this.tierIndex > 0) {
                this.tierIndex -= 1;
                await this.applyTier(videoSender);
            }
        } catch {
            // getStats() report shapes vary by platform/codec; skip this cycle
            // rather than crash the call over a stats-parsing edge case.
        }
    }

    private async applyTier(sender: any) {
        const tier = QUALITY_TIERS[this.tierIndex];
        const params = sender.getParameters();
        params.encodings = [
            {
                ...(params.encodings?.[0] || {}),
                scaleResolutionDownBy: tier.scaleResolutionDownBy,
                maxBitrate: tier.maxBitrate,
                maxFramerate: tier.maxFramerate,
            },
        ];
        await sender.setParameters(params);
        this.onTierChange?.(tier);
    }
}
