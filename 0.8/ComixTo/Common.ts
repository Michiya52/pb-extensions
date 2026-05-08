export const API_BASE = "https://comix.to/api/v1";
export const DOMAIN = "https://comix.to";

export function normalizeString(str: string): string {
    return str
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
}

export function parseRelativeTime(s: string | undefined): Date {
    if (!s) return new Date();
    const m = s.match(/^(\d+)\s*(s|m|h|d|w|mos|mo|y)\b/i);
    if (!m) return new Date();
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const ms: Record<string, number> = {
        s: 1e3,
        m: 6e4,
        h: 60 * 6e4,
        d: 24 * 60 * 6e4,
        w: 7 * 24 * 60 * 6e4,
        mo: 30 * 24 * 60 * 6e4,
        mos: 30 * 24 * 60 * 6e4,
        y: 365 * 24 * 60 * 6e4,
    };
    return new Date(Date.now() - n * (ms[unit] ?? 0));
}

export const CONTENT_TYPES = [
    { id: "manga", label: "Manga" },
    { id: "manhwa", label: "Manhwa" },
    { id: "manhua", label: "Manhua" },
    { id: "other", label: "Other" },
];

export const PUBLICATION_STATUS = [
    { id: "finished", label: "Finished" },
    { id: "releasing", label: "Releasing" },
    { id: "on_hiatus", label: "On Hiatus" },
    { id: "discontinued", label: "Discontinued" },
    { id: "not_yet_released", label: "Not Yet Released" },
];

export const ORDER_OPTIONS = [
    { id: "relevance", label: "Best Match" },
    { id: "chapter_updated_at", label: "Updated Date" },
    { id: "created_at", label: "Created Date" },
    { id: "views_7d", label: "Most Views (7 Days)" },
    { id: "views_30d", label: "Most Views (1 Month)" },
    { id: "views_90d", label: "Most Views (3 Months)" },
    { id: "views_total", label: "Total Views" },
    { id: "follows_total", label: "Most Follows" },
];

export const CONTENT_RATINGS = [
    { id: "safe", label: "Safe" },
    { id: "suggestive", label: "Suggestive" },
    { id: "erotica", label: "Erotica" },
    { id: "pornographic", label: "Pornographic" },
];

export function isRatingAllowed(rating: string | null | undefined, maxRating: string): boolean {
    const ratingIdx = CONTENT_RATINGS.findIndex((r) => r.id === rating);
    const maxIdx = CONTENT_RATINGS.findIndex((r) => r.id === maxRating);
    if (ratingIdx === -1) return false;
    if (maxIdx === -1) return true;
    return ratingIdx <= maxIdx;
}

