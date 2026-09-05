import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * There is no authentication backend in this repository yet. This service
 * simulates one against AsyncStorage so sign-up/login/password-reset are
 * fully functional end-to-end for development and testing — swapping it for
 * real API calls later only requires rewriting the bodies of these
 * functions, not any of the call sites in the auth screens.
 */

const USERS_KEY = "chatbox:auth:users";
const OTP_KEY = "chatbox:auth:otp";
const OTP_TTL_MS = 5 * 60 * 1000;

export interface IStoredUser {
    identifier: string;
    name: string;
    password: string;
    avatarUrl?: string;
    about?: string;
}

export class AuthError extends Error {}

const getUsers = async (): Promise<IStoredUser[]> => {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
};

const saveUsers = (users: IStoredUser[]) => AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

const normalize = (identifier: string) => identifier.trim().toLowerCase();

export const signUp = async ({
    name,
    identifier,
    password,
}: {
    name: string;
    identifier: string;
    password: string;
}): Promise<IStoredUser> => {
    const users = await getUsers();
    const key = normalize(identifier);

    if (users.some((u) => u.identifier === key)) {
        throw new AuthError("An account with this phone/email already exists.");
    }

    const user: IStoredUser = { identifier: key, name, password };
    await saveUsers([...users, user]);
    return user;
};

export const login = async ({
    identifier,
    password,
}: {
    identifier: string;
    password: string;
}): Promise<IStoredUser> => {
    const users = await getUsers();
    const user = users.find((u) => u.identifier === normalize(identifier));

    if (!user || user.password !== password) {
        throw new AuthError("Invalid credentials. Please check and try again.");
    }

    return user;
};

/**
 * Simulates dispatching an OTP via SMS/email. There's nowhere to actually
 * deliver it to, so the OTP is returned directly for the UI to surface
 * (e.g. in an Alert) — a real backend would send it out-of-band instead.
 */
export const requestPasswordReset = async (identifier: string): Promise<{ otp: string }> => {
    const users = await getUsers();
    const key = normalize(identifier);

    if (!users.some((u) => u.identifier === key)) {
        throw new AuthError("No account found with this phone/email.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const raw = await AsyncStorage.getItem(OTP_KEY);
    const otps: Record<string, { otp: string; expiresAt: number }> = raw ? JSON.parse(raw) : {};
    otps[key] = { otp, expiresAt: Date.now() + OTP_TTL_MS };
    await AsyncStorage.setItem(OTP_KEY, JSON.stringify(otps));

    return { otp };
};

export const resetPassword = async ({
    identifier,
    otp,
    newPassword,
}: {
    identifier: string;
    otp: string;
    newPassword: string;
}): Promise<void> => {
    const key = normalize(identifier);
    const raw = await AsyncStorage.getItem(OTP_KEY);
    const otps: Record<string, { otp: string; expiresAt: number }> = raw ? JSON.parse(raw) : {};
    const entry = otps[key];

    if (!entry || entry.otp !== otp.trim()) {
        throw new AuthError("Incorrect verification code.");
    }
    if (Date.now() > entry.expiresAt) {
        throw new AuthError("This verification code has expired. Request a new one.");
    }

    const users = await getUsers();
    const index = users.findIndex((u) => u.identifier === key);
    if (index === -1) {
        throw new AuthError("No account found with this phone/email.");
    }

    users[index] = { ...users[index], password: newPassword };
    await saveUsers(users);

    delete otps[key];
    await AsyncStorage.setItem(OTP_KEY, JSON.stringify(otps));
};
