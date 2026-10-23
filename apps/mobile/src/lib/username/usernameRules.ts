/**
 * The ticket's exact format rules: 4–32 chars, alphanumeric + underscore,
 * can't start with a digit or underscore, no consecutive underscores.
 * Checked as a single regex plus one extra pass for the "no __" rule (regex
 * negative lookahead for repeated chars is awkward to keep readable).
 */
const USERNAME_SHAPE_RE = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;

export interface IUsernameFormatResult {
	valid: boolean;
	reason?: string;
}

export const validateUsernameFormat = (raw: string): IUsernameFormatResult => {
	const value = raw.trim();

	if (value.length < 4 || value.length > 32) {
		return { valid: false, reason: "Must be 4–32 characters" };
	}
	if (!/^[A-Za-z]/.test(value)) {
		return { valid: false, reason: "Must start with a letter" };
	}
	if (!/^[A-Za-z0-9_]+$/.test(value)) {
		return { valid: false, reason: "Only letters, numbers, and underscores" };
	}
	if (value.includes("__")) {
		return { valid: false, reason: "Can't contain consecutive underscores" };
	}
	if (!USERNAME_SHAPE_RE.test(value)) {
		return { valid: false, reason: "Invalid username" };
	}

	return { valid: true };
};

/** Case-insensitive uniqueness key — "@John_Doe" and "@john_doe" collide. */
export const usernameKey = (handle: string) => handle.trim().toLowerCase();
