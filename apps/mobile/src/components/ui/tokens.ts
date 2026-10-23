export const palette = {
	ink: "#000E08",
	inkSoft: "#051D13",
	brand: "#20A090",
	brandDark: "#24786D",
	brandSoft: "#F2F8F7",
	muted: "#797C7B",
	line: "#EEFAF8",
	divider: "#F5F6F6",
	field: "#F3F6F6",
	bubble: "#F2F7FB",
	danger: "#EA3736",
	online: "#0FE16D",
	white: "#FFFFFF",
	storyRing: "#FFC746",
} as const;

export const fonts = {
	regular: "Inter_400Regular",
	medium: "Inter_500Medium",
	semibold: "Inter_600SemiBold",
	bold: "Inter_700Bold",
} as const;

export const radii = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
	sheet: 40,
	full: 999,
} as const;

export const spacing = {
	gutter: 24,
} as const;

export const springs = {
	press: { damping: 18, stiffness: 420, mass: 0.6 },
	gentle: { damping: 22, stiffness: 220 },
	snappy: { damping: 26, stiffness: 520 },
} as const;
