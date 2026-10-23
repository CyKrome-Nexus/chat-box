import type { AuthResponse, SocialProvider } from "@chatbox/shared";

import { ApiError } from "@/src/lib/api/client";
import { toLocalUser } from "@/src/lib/api/mappers";
import { authApi } from "@/src/lib/api/services";
import { tokenStore } from "@/src/lib/api/tokenStore";
import type { IUser } from "@/src/interfaces/user-interface";
import { saveSession } from "./session";

export class AuthError extends Error {}

const run = async <T>(task: () => Promise<T>): Promise<T> => {
    try {
        return await task();
    } catch (error) {
        throw new AuthError(error instanceof ApiError || error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
};

// Persists tokens + profile for the given account slot and returns the local user.
export const establishSession = async (response: AuthResponse, accountId?: string): Promise<IUser> => {
    if (accountId) await tokenStore.load(accountId);
    await tokenStore.save(response.tokens);
    const user = toLocalUser(response.user);
    await saveSession(user, accountId);
    return user;
};

const splitIdentifier = (identifier: string) =>
    identifier.includes("@") ? { email: identifier.trim().toLowerCase() } : { phone: identifier.replace(/[\s()-]/g, "") };

export const signUp = ({ name, identifier, password }: { name: string; identifier: string; password: string }, accountId?: string) =>
    run(async () => establishSession(await authApi.register({ name, password, ...splitIdentifier(identifier) }), accountId));

export const login = ({ identifier, password }: { identifier: string; password: string }, accountId?: string) =>
    run(async () => establishSession(await authApi.login({ identifier, password }), accountId));

export const socialSignIn = (
    { provider, token, name }: { provider: SocialProvider; token: string; name?: string },
    accountId?: string,
) => run(async () => establishSession(await authApi.social({ provider, token, name }), accountId));

export const requestPasswordReset = (identifier: string) => run(() => authApi.forgotPassword(identifier.trim()));

export const resetPassword = ({ identifier, otp, newPassword }: { identifier: string; otp: string; newPassword: string }) =>
    run(() => authApi.resetPassword(identifier.trim(), otp.trim(), newPassword));

export const deleteAccount = (password?: string) => run(() => authApi.deleteAccount(password));
