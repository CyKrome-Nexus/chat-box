import AsyncStorage from "@react-native-async-storage/async-storage";

import { usernameKey, validateUsernameFormat } from "./usernameRules";

/**
 * There is no backend to host a real global username directory (see
 * docs/architecture/username-system.md), so — exactly like
 * `src/lib/auth/authService.ts` simulates account storage — this simulates
 * one against AsyncStorage. On a single device this can only ever really
 * contain this device's own claimed handle, but every function here does the
 * genuine case-insensitive-uniqueness/claim/release/lookup work a real
 * `PUT /usernames/:handle` backend would do; swapping AsyncStorage for a
 * fetch() call is the only thing a real backend integration would change.
 */

const REGISTRY_KEY = "chatbox:username:registry";

export interface IUsernameRecord {
	handle: string; // canonical case, as claimed
	userId: string;
	name: string;
	avatarUrl?: string;
}

type TRegistry = Record<string, IUsernameRecord>; // keyed by usernameKey(handle)

const getRegistry = async (): Promise<TRegistry> => {
	const raw = await AsyncStorage.getItem(REGISTRY_KEY);
	return raw ? JSON.parse(raw) : {};
};

const saveRegistry = (registry: TRegistry) => AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));

export type TUsernameAvailability = "available" | "taken" | "invalid";

/** Real format + uniqueness check. `ownerId` lets a user "re-check" their own
 * already-claimed handle without it reporting itself as taken. */
export const checkUsernameAvailability = async (raw: string, ownerId?: string): Promise<{ status: TUsernameAvailability; reason?: string }> => {
	const format = validateUsernameFormat(raw);
	if (!format.valid) return { status: "invalid", reason: format.reason };

	const registry = await getRegistry();
	const existing = registry[usernameKey(raw)];
	if (existing && existing.userId !== ownerId) {
		return { status: "taken" };
	}
	return { status: "available" };
};

/** Claims `handle` for `userId`, releasing whatever handle that user held
 * before (a user can only hold one public handle at a time). Throws if the
 * format is invalid or the handle is already owned by someone else. */
export const claimUsername = async (raw: string, userId: string, name: string, avatarUrl?: string): Promise<string> => {
	const format = validateUsernameFormat(raw);
	if (!format.valid) throw new Error(format.reason || "Invalid username");

	const registry = await getRegistry();
	const key = usernameKey(raw);
	const existing = registry[key];
	if (existing && existing.userId !== userId) {
		throw new Error("This username is already taken.");
	}

	// Release any previous handle this user held.
	for (const existingKey of Object.keys(registry)) {
		if (registry[existingKey].userId === userId && existingKey !== key) {
			delete registry[existingKey];
		}
	}

	const canonical = raw.trim();
	registry[key] = { handle: canonical, userId, name, avatarUrl };
	await saveRegistry(registry);
	return canonical;
};

export const releaseUsername = async (userId: string): Promise<void> => {
	const registry = await getRegistry();
	for (const key of Object.keys(registry)) {
		if (registry[key].userId === userId) delete registry[key];
	}
	await saveRegistry(registry);
};

export const lookupByHandle = async (raw: string): Promise<IUsernameRecord | null> => {
	const registry = await getRegistry();
	return registry[usernameKey(raw)] || null;
};

/** Powers the global search bar's "@" prefix mode — a real prefix match over
 * every registered handle. In this single-device environment the registry
 * only ever contains this device's own claimed handle, so results here are
 * necessarily limited to "yourself" until a real backend-hosted registry
 * exists; the matching logic itself is exactly what a `GET
 * /usernames/search?q=` endpoint would run server-side. */
export const searchUsernames = async (query: string, limit = 20): Promise<IUsernameRecord[]> => {
	const registry = await getRegistry();
	const needle = usernameKey(query);
	if (!needle) return [];

	return Object.values(registry)
		.filter((record) => usernameKey(record.handle).startsWith(needle))
		.slice(0, limit);
};
