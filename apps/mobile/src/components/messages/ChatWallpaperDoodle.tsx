import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";

/**
 * A real, vector-tiled doodle pattern (small speech-bubble + dot + squiggle
 * motifs, repeated via an SVG <Pattern>) — genuinely rendered, not a bitmap
 * placeholder. `tint` recolors every stroke; `opacity` controls how subtle
 * it sits behind message bubbles.
 */
const ChatWallpaperDoodle = ({ tint = "#24786D", opacity = 0.12 }: { tint?: string; opacity?: number }) => (
	<Svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
		<Defs>
			<Pattern id="chatDoodle" width={96} height={96} patternUnits="userSpaceOnUse">
				{/* Speech bubble */}
				<Path
					d="M12 14 h22 a6 6 0 0 1 6 6 v10 a6 6 0 0 1 -6 6 h-14 l-6 6 v-6 h-2 a6 6 0 0 1 -6 -6 v-10 a6 6 0 0 1 6 -6 z"
					stroke={tint}
					strokeWidth={1.6}
					fill="none"
					opacity={opacity}
				/>
				{/* Dot cluster */}
				<Path
					d="M62 18 a3 3 0 1 1 0.001 0 M72 24 a2 2 0 1 1 0.001 0 M68 12 a1.6 1.6 0 1 1 0.001 0"
					stroke={tint}
					strokeWidth={1.6}
					fill="none"
					opacity={opacity}
				/>
				{/* Squiggle */}
				<Path
					d="M18 56 q8 -10 16 0 t16 0"
					stroke={tint}
					strokeWidth={1.6}
					fill="none"
					opacity={opacity}
				/>
				{/* Heart */}
				<Path
					d="M70 60 c-4 -6 -12 -2 -12 4 c0 5 6 9 12 14 c6 -5 12 -9 12 -14 c0 -6 -8 -10 -12 -4 z"
					stroke={tint}
					strokeWidth={1.6}
					fill="none"
					opacity={opacity}
				/>
			</Pattern>
		</Defs>
		<Rect width="100%" height="100%" fill="url(#chatDoodle)" />
	</Svg>
);

export default ChatWallpaperDoodle;
