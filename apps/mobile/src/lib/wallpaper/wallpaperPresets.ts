export interface IGradientPreset {
	key: string;
	label: string;
	colors: [string, string];
}

/** 20+ linear-gradient presets rendered with expo-linear-gradient (a real,
 * already-installed dependency) — no image assets needed. */
export const GRADIENT_PRESETS: IGradientPreset[] = [
	{ key: "emerald-mist", label: "Emerald Mist", colors: ["#134E4A", "#24786D"] },
	{ key: "ocean-deep", label: "Ocean Deep", colors: ["#0B1F3A", "#1E6FD9"] },
	{ key: "royal-dusk", label: "Royal Dusk", colors: ["#2E1065", "#6C3CE0"] },
	{ key: "sunset-glow", label: "Sunset Glow", colors: ["#7C2D12", "#E8752E"] },
	{ key: "ruby-night", label: "Ruby Night", colors: ["#4C0519", "#D63A4C"] },
	{ key: "midnight-teal", label: "Midnight Teal", colors: ["#042F2E", "#0D8A98"] },
	{ key: "rose-gold", label: "Rose Gold", colors: ["#5B2A34", "#C77B85"] },
	{ key: "mono-slate", label: "Mono Slate", colors: ["#111111", "#3A3A3A"] },
	{ key: "lavender-fields", label: "Lavender Fields", colors: ["#3B2E5A", "#9B8AC4"] },
	{ key: "peach-sky", label: "Peach Sky", colors: ["#FDCB82", "#EE8C8C"] },
	{ key: "forest-floor", label: "Forest Floor", colors: ["#1B3A1A", "#5B8C5A"] },
	{ key: "cotton-candy", label: "Cotton Candy", colors: ["#FBC2EB", "#A6C1EE"] },
	{ key: "steel-blue", label: "Steel Blue", colors: ["#232526", "#414345"] },
	{ key: "citrus-punch", label: "Citrus Punch", colors: ["#F09819", "#EDDE5D"] },
	{ key: "deep-space", label: "Deep Space", colors: ["#000000", "#434343"] },
	{ key: "mint-breeze", label: "Mint Breeze", colors: ["#A8E6CE", "#3D84A8"] },
	{ key: "coral-reef", label: "Coral Reef", colors: ["#FF9A8B", "#FF6A88"] },
	{ key: "golden-hour", label: "Golden Hour", colors: ["#FFD194", "#D1913C"] },
	{ key: "arctic-ice", label: "Arctic Ice", colors: ["#83A4D4", "#B6FBFF"] },
	{ key: "plum-wine", label: "Plum Wine", colors: ["#42275A", "#734B6D"] },
	{ key: "amber-dusk", label: "Amber Dusk", colors: ["#3E2723", "#D68910"] },
];

export const DEFAULT_GRADIENT_KEY = GRADIENT_PRESETS[0].key;

export const getGradientPreset = (key?: string): IGradientPreset =>
	GRADIENT_PRESETS.find((preset) => preset.key === key) || GRADIENT_PRESETS[0];

export const DOODLE_TINT_PRESETS = ["#24786D", "#1E6FD9", "#6C3CE0", "#D63A4C", "#3A3A3A"];
