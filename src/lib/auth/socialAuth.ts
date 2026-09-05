export interface ISocialProfile {
    provider: "google" | "facebook" | "apple";
    identifier: string;
    name: string;
    avatarUrl?: string;
}

/** Minimal base64url JWT payload decode — good enough to read an OIDC id_token's claims. */
export const decodeJwtPayload = (token: string): Record<string, any> => {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
        atob(padded)
            .split("")
            .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
            .join("")
    );
    return JSON.parse(json);
};

export const fetchFacebookProfile = async (accessToken: string): Promise<ISocialProfile> => {
    const response = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || "Facebook sign-in failed.");
    }

    return {
        provider: "facebook",
        identifier: data.email || `facebook:${data.id}`,
        name: data.name,
        avatarUrl: data.picture?.data?.url,
    };
};
