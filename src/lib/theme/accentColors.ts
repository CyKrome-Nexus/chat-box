export interface IAccentPreset {
	key: string;
	label: string;
	value: string;
}

/** The 8 curated presets from the ticket. Default is Emerald, matching the
 * app's existing hardcoded brand color (`Colors.focused`, `#24786D`) so
 * switching the theme engine on doesn't change anyone's look by default. */
export const ACCENT_PRESETS: IAccentPreset[] = [
	{ key: "emerald", label: "Emerald Green", value: "#24786D" },
	{ key: "ocean", label: "Ocean Blue", value: "#1E6FD9" },
	{ key: "royal", label: "Royal Purple", value: "#6C3CE0" },
	{ key: "sunset", label: "Sunset Orange", value: "#E8752E" },
	{ key: "ruby", label: "Ruby Red", value: "#D63A4C" },
	{ key: "midnight", label: "Midnight Cyan", value: "#0D8A98" },
	{ key: "rosegold", label: "Rose Gold", value: "#C77B85" },
	{ key: "mono", label: "Monochrome", value: "#3A3A3A" },
];

export const DEFAULT_ACCENT_COLOR = ACCENT_PRESETS[0].value;

const HEX_COLOR_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export const isValidHexColor = (value: string): boolean => HEX_COLOR_RE.test(value.trim());

/** Normalizes "#abc" / "abc" / "#AABBCC" input into a canonical "#aabbcc",
 * or null if it isn't a valid hex color — used to validate the custom picker's
 * free-text hex input before it's allowed to become the app's accent color. */
export const normalizeHexColor = (value: string): string | null => {
	const trimmed = value.trim();
	const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
	if (!isValidHexColor(withHash)) return null;

	if (withHash.length === 4) {
		const [, r, g, b] = withHash;
		return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
	}
	return withHash.toLowerCase();
};
