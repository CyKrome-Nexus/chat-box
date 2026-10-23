import type { SocialProvider } from "@chatbox/shared";

// Provider token handed to the API, which verifies it server-side before creating a session.
export interface ISocialCredential {
    provider: SocialProvider;
    token: string;
    name?: string;
}
