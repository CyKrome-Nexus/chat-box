export interface ILinkPreview {
    url: string;
    title?: string;
    description?: string;
    image?: string;
}

const URL_REGEX = /https?:\/\/[^\s]+/gi;

export const extractUrls = (text: string): string[] => text.match(URL_REGEX) || [];

const cache = new Map<string, ILinkPreview>();

const matchMeta = (html: string, property: string): string | undefined => {
    const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
        "i"
    );
    const match = html.match(re) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, "i"));
    return match?.[1];
};

const matchTitleTag = (html: string): string | undefined => html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];

/**
 * Fetches a URL's raw HTML and regex-extracts its OpenGraph tags — a real
 * network fetch + real parse, not a stub, but a lightweight one: no headless
 * DOM/JS rendering, so single-page apps that inject OG tags client-side
 * won't resolve. See docs/architecture/media-gallery.md.
 */
export const fetchLinkPreview = async (url: string): Promise<ILinkPreview> => {
    const cached = cache.get(url);
    if (cached) return cached;

    const preview: ILinkPreview = { url };
    try {
        const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        const html = await response.text();
        preview.title = matchMeta(html, "og:title") || matchTitleTag(html);
        preview.description = matchMeta(html, "og:description") || matchMeta(html, "description");
        preview.image = matchMeta(html, "og:image");
    } catch {
        // Offline, blocked, or non-HTML resource — the caller falls back to a
        // bare-URL card.
    }

    cache.set(url, preview);
    return preview;
};
