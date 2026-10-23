import { createRemoteJWKSet, jwtVerify } from "jose";

import type { SocialProvider } from "@chatbox/shared";

import { env } from "@/config/env";
import { AppError, unauthorized } from "./errors";

export interface SocialProfile {
  provider: SocialProvider;
  providerId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
}

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

const notConfigured = (provider: string) =>
  new AppError(501, "PROVIDER_NOT_CONFIGURED", `${provider} sign-in is not configured on this server`);

const verifyGoogle = async (idToken: string): Promise<SocialProfile> => {
  if (env.GOOGLE_CLIENT_IDS.length === 0) throw notConfigured("Google");
  const { payload } = await jwtVerify(idToken, googleKeys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.GOOGLE_CLIENT_IDS,
  });
  return {
    provider: "google",
    providerId: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : null,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : null,
    avatarUrl: typeof payload.picture === "string" ? payload.picture : null,
  };
};

const verifyApple = async (identityToken: string): Promise<SocialProfile> => {
  if (env.APPLE_CLIENT_IDS.length === 0) throw notConfigured("Apple");
  const { payload } = await jwtVerify(identityToken, appleKeys, {
    issuer: "https://appleid.apple.com",
    audience: env.APPLE_CLIENT_IDS,
  });
  return {
    provider: "apple",
    providerId: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : null,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: null,
    avatarUrl: null,
  };
};

const verifyFacebook = async (accessToken: string): Promise<SocialProfile> => {
  if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) throw notConfigured("Facebook");
  const appToken = `${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`;
  const debug = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`,
  ).then(
    (response) =>
      response.json() as Promise<{ data?: { is_valid?: boolean; app_id?: string; user_id?: string } }>,
  );
  if (!debug.data?.is_valid || debug.data.app_id !== env.FACEBOOK_APP_ID || !debug.data.user_id)
    throw unauthorized();

  const profile = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`,
  ).then(
    (response) =>
      response.json() as Promise<{
        id?: string;
        name?: string;
        email?: string;
        picture?: { data?: { url?: string } };
      }>,
  );
  if (profile.id !== debug.data.user_id) throw unauthorized();
  return {
    provider: "facebook",
    providerId: profile.id,
    email: profile.email?.toLowerCase() ?? null,
    emailVerified: Boolean(profile.email),
    name: profile.name ?? null,
    avatarUrl: profile.picture?.data?.url ?? null,
  };
};

export const verifySocialToken = async (provider: SocialProvider, token: string): Promise<SocialProfile> => {
  try {
    if (provider === "google") return await verifyGoogle(token);
    if (provider === "apple") return await verifyApple(token);
    return await verifyFacebook(token);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw unauthorized("Could not verify your sign-in with this provider");
  }
};
