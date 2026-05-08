import {
    Source,
    Manga,
    Chapter,
    ChapterDetails,
    HomeSection,
    SearchRequest,
    PagedResults,
    SourceInfo,
    ContentRating,
    BadgeColor,
    Request,
    Response,
    SourceManga,
    PartialSourceManga,
    TagSection,
    HomeSectionType,
    SourceIntents,
} from "paperback-extensions-common";

import { Parser } from "./Parser";
import { API_BASE, DOMAIN, CONTENT_TYPES, PUBLICATION_STATUS, ORDER_OPTIONS, normalizeString } from "./Common";
import { signUrl } from "./ComixHash";
import {
    getFilters,
    getContentRatingMax,
    getTrendingLimit,
    tagFilterSettings,
    contentSettings,
    chapterSettings,
    resetSettings,
    warmUpTagCache,
    getTagFilterEnabled,
    getTagBlacklist,
    getTagWhitelistMode,
    getTagAndMode,
    getTypeFilter,
} from "./Settings";

export const ComixToInfo: SourceInfo = {
    version: "1.5.6",
    name: "ComixTo",
    icon: "icon.png",
    author: "Michiya52",
    authorWebsite: "https://michiya52.github.io/pb-extensions/0.8",
    description: "Comix.to Extension with advanced filters. Fork of AthK extensions for Paperback 0.8 (Updated by Michiya52)",
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: DOMAIN,
    sourceTags: [
        {
            text: "English",
            type: BadgeColor.GREY,
        },
    ],
    intents:
        SourceIntents.MANGA_CHAPTERS |
        SourceIntents.HOMEPAGE_SECTIONS |
        SourceIntents.CLOUDFLARE_BYPASS_REQUIRED |
        SourceIntents.SETTINGS_UI,
};

const keepAlive = <T>(obj: T): T => {
    return obj;
};

export class ComixTo extends Source {
    parser = new Parser();
    stateManager = App.createSourceStateManager();
    requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    Referer: `${DOMAIN}/`,
                    "User-Agent": await this.requestManager.getDefaultUserAgent(),
                };
                return request;
            },
            interceptResponse: async (response: Response): Promise<Response> => {
                return response;
            },
        },
    });

    // -- Capabilities --
    async supportsTagExclusion(): Promise<boolean> {
        return true;
    }

    // -- Settings Menu --
    async getSourceMenu(): Promise<any> {
        return keepAlive(
            App.createDUISection({
                id: "main",
                header: "Source Settings",
                isHidden: false,
                rows: async () =>
                    keepAlive([
                        contentSettings(this.stateManager),
                        chapterSettings(this.stateManager),
                        tagFilterSettings(this.stateManager, this.requestManager),
                        resetSettings(this.stateManager),
                    ]),
            })
        );
    }

    async getTagFilterState(): Promise<{
        filteredTermIds: Set<number>;
        tagWhitelistMode: boolean;
        tagAndMode: boolean;
        typeFilter: Set<string>;
    }> {
        const enabled = await getTagFilterEnabled(this.stateManager);
        if (!enabled) {
            return {
                filteredTermIds: new Set(),
                tagWhitelistMode: false,
                tagAndMode: false,
                typeFilter: new Set(),
            };
        }

        const [blacklist, whitelistMode, andMode, typeFilterList] = await Promise.all([
            getTagBlacklist(this.stateManager),
            getTagWhitelistMode(this.stateManager),
            getTagAndMode(this.stateManager),
            getTypeFilter(this.stateManager),
        ]);

        return {
            filteredTermIds: new Set(blacklist.map((id: string) => parseInt(id, 10))),
            tagWhitelistMode: whitelistMode,
            tagAndMode: andMode,
            typeFilter: new Set(typeFilterList),
        };
    }

    getMangaShareUrl(mangaId: string): string {
        return `${DOMAIN}/title/${mangaId}`;
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: signUrl(`${API_BASE}/manga/${mangaId}?includes[]=author&includes[]=artist`),
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        this.checkResponseError(response);
        const json = JSON.parse(response.data ?? "{}");
        if (json.status !== "ok")
            throw new Error(
                `Failed to fetch manga details (API ${json.status}: ${json.message ?? "no message"})`
            );
        return this.parser.parseMangaDetails(json.result, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const chapters: any[] = [];
        let page = 1;
        let lastPage = 1;

        do {
            const request = App.createRequest({
                url: signUrl(
                    `${API_BASE}/manga/${mangaId}/chapters?page=${page}&limit=100&order[number]=desc`
                ),
                method: "GET",
            });
            const response = await this.requestManager.schedule(request, 1);
            this.checkResponseError(response);
            const json = JSON.parse(response.data ?? "{}");
            if (json.status !== "ok")
                throw new Error(
                    `Failed to fetch chapters (page ${page}) (API ${json.status}: ${json.message ?? "no message"})`
                );
            chapters.push(...json.result.items);
            lastPage = json.result.meta?.lastPage ?? 1;
            page++;
        } while (page <= lastPage);

        const appFilters = await getFilters(this.stateManager);

        return this.parser.parseChapters(chapters, appFilters);
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = App.createRequest({
            url: signUrl(`${API_BASE}/chapters/${chapterId}`),
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        this.checkResponseError(response);
        const json = JSON.parse(response.data ?? "{}");
        if (json.status !== "ok")
            throw new Error(
                `Failed to fetch chapter pages (API ${json.status}: ${json.message ?? "no message"})`
            );
        return this.parser.parseChapterDetails(json.result, mangaId, chapterId);
    }

    async getHomePageSections(
        sectionCallback: (section: HomeSection) => void
    ): Promise<void> {
        const limitArray = await getTrendingLimit(this.stateManager);
        const days = limitArray[0] ?? "30";
        const maxRating = await getContentRatingMax(this.stateManager);

        const sections = [
            App.createHomeSection({
                id: "trending",
                title: "Popular (Trending)",
                containsMoreItems: true,
                type: HomeSectionType.featured,
            }),
            App.createHomeSection({
                id: "latest",
                title: "Latest Updates",
                containsMoreItems: true,
                type: HomeSectionType.singleRowNormal,
            }),
            App.createHomeSection({
                id: "new",
                title: "Recently Added",
                containsMoreItems: true,
                type: HomeSectionType.singleRowNormal,
            }),
            App.createHomeSection({
                id: "follows_new",
                title: "Most Follows · New Comics",
                containsMoreItems: true,
                type: HomeSectionType.singleRowLarge,
            }),
            App.createHomeSection({
                id: "follows",
                title: "Most Followed",
                containsMoreItems: true,
                type: HomeSectionType.singleRowLarge,
            }),
        ];

        const promises: Promise<void>[] = [];

        promises.push(
            this.fetchHomeData(
                `${API_BASE}/manga/top?type=trending&days=${days}&limit=15&content_rating=${maxRating}`,
                sections[0],
                sectionCallback
            )
        );
        promises.push(
            this.fetchHomeData(
                `${API_BASE}/manga?order[chapter_updated_at]=desc&limit=15&includes[]=author`,
                sections[1],
                sectionCallback
            )
        );
        promises.push(
            this.fetchHomeData(
                `${API_BASE}/manga?order[created_at]=desc&limit=15&includes[]=author`,
                sections[2],
                sectionCallback
            )
        );
        promises.push(
            this.fetchHomeData(
                `${API_BASE}/manga/top?type=follows&days=${days}&limit=15&content_rating=${maxRating}`,
                sections[3],
                sectionCallback
            )
        );
        promises.push(
            this.fetchHomeData(
                `${API_BASE}/manga?order[follows_total]=desc&limit=15&includes[]=author`,
                sections[4],
                sectionCallback
            )
        );

        await Promise.all(promises);
    }

    async fetchHomeData(
        url: string,
        section: HomeSection,
        callback: (section: HomeSection) => void
    ): Promise<void> {
        const request = App.createRequest({ url: signUrl(url), method: "GET" });
        const response = await this.requestManager.schedule(request, 1);
        this.checkResponseError(response);
        const json = JSON.parse(response.data ?? "{}");

        const [maxRating, { filteredTermIds, tagWhitelistMode, tagAndMode, typeFilter }] =
            await Promise.all([
                getContentRatingMax(this.stateManager),
                this.getTagFilterState(),
            ]);

        const items = Array.isArray(json.result) ? json.result : json.result?.items;
        if (items) {
            section.items = this.parser.parseMangaList(
                items,
                maxRating,
                filteredTermIds,
                tagWhitelistMode,
                typeFilter,
                tagAndMode
            );
        }
        callback(section);
    }

    async getViewMoreItems(
        homepageSectionId: string,
        metadata: any
    ): Promise<PagedResults> {
        const page = metadata?.page ?? 1;
        const limitArray = await getTrendingLimit(this.stateManager);
        const days = limitArray[0] ?? "30";
        const maxRating = await getContentRatingMax(this.stateManager);

        let url = "";
        let isTopEndpoint = false;
        switch (homepageSectionId) {
            case "trending":
                url = `${API_BASE}/manga/top?type=trending&days=${days}&limit=50&content_rating=${maxRating}`;
                isTopEndpoint = true;
                break;
            case "follows_new":
                url = `${API_BASE}/manga/top?type=follows&days=${days}&limit=50&content_rating=${maxRating}`;
                isTopEndpoint = true;
                break;
            case "follows":
                url = `${API_BASE}/manga?order[follows_total]=desc&limit=20&page=${page}&includes[]=author`;
                break;
            case "latest":
                url = `${API_BASE}/manga?order[chapter_updated_at]=desc&limit=20&page=${page}&includes[]=author`;
                break;
            case "new":
                url = `${API_BASE}/manga?order[created_at]=desc&limit=20&page=${page}&includes[]=author`;
                break;
            default:
                return App.createPagedResults({ results: [], metadata: undefined });
        }

        const request = App.createRequest({ url: signUrl(url), method: "GET" });
        const response = await this.requestManager.schedule(request, 1);
        this.checkResponseError(response);
        const json = JSON.parse(response.data ?? "{}");

        const { filteredTermIds, tagWhitelistMode, tagAndMode, typeFilter } = await this.getTagFilterState();

        const rawItems = Array.isArray(json.result) ? json.result : json.result?.items ?? [];
        const items = this.parser.parseMangaList(
            rawItems,
            maxRating,
            filteredTermIds,
            tagWhitelistMode,
            typeFilter,
            tagAndMode
        );

        const nextPage = isTopEndpoint ? undefined : (items.length > 0 ? { page: page + 1 } : undefined);

        return App.createPagedResults({
            results: items,
            metadata: nextPage,
        });
    }

    // -- Advanced Search --
    async getSearchTags(): Promise<TagSection[]> {
        const fetchTags = async (type: string) => {
            try {
                const req = App.createRequest({
                    // /tags/search caps at limit=50 in v1; >50 returns 422.
                    url: signUrl(`${API_BASE}/tags/search?type=${type}&limit=50`),
                    method: "GET",
                });
                const res = await this.requestManager.schedule(req, 1);
                if (res.status < 200 || res.status >= 300) return [];
                const json = JSON.parse(res.data ?? "{}");
                return Array.isArray(json.result) ? json.result : [];
            } catch {
                return [];
            }
        };

        const [genres, themes, formats, demographics] = await Promise.all([
            fetchTags("genre"),
            fetchTags("tag"),
            fetchTags("format"),
            fetchTags("demographic"),
        ]);

        const sections: TagSection[] = [];

        sections.push(
            App.createTagSection({
                id: "type",
                label: "Content Type",
                tags: CONTENT_TYPES.map((x) =>
                    App.createTag({ id: `type-${x.id}`, label: x.label })
                ),
            })
        );

        sections.push(
            App.createTagSection({
                id: "order",
                label: "Order (pick one, default: Best Match)",
                tags: ORDER_OPTIONS.map((x) =>
                    App.createTag({ id: `order-${x.id}`, label: x.label })
                ),
            })
        );

        sections.push(
            App.createTagSection({
                id: "status",
                label: "Status",
                tags: PUBLICATION_STATUS.map((x) =>
                    App.createTag({ id: `status-${x.id}`, label: x.label })
                ),
            })
        );

        sections.push(
            ...this.parser.parseTagSections(genres, themes, formats, demographics)
        );

        sections.push(
            App.createTagSection({
                id: "mode",
                label: "Genre Inclusion Mode (default- AND)",
                tags: [
                    App.createTag({
                        id: "logic-mode",
                        label: "Green=AND | Red=OR",
                    }),
                ],
            })
        );

        return sections;
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const page = metadata?.page ?? 1;

        const orderTag = (query.includedTags ?? []).find((t: any) =>
            t.id.startsWith("order-")
        );
        const orderKey = orderTag ? orderTag.id.replace("order-", "") : "relevance";
        
        let url = `${API_BASE}/manga?order[${orderKey}]=desc&page=${page}&limit=20`;

        if (query.title) {
            url += `&keyword=${encodeURIComponent(normalizeString(query.title)).replace(/%20/g, "+")}`;
        }

        let genresMode = "and";
        if (query.excludedTags?.some((t: any) => t.id === "logic-mode")) {
            genresMode = "or";
        }

        const allTags = [...(query.includedTags ?? [])].filter(
            (t: any) => t.id !== "logic-mode" && !t.id.startsWith("order-")
        );
        const excludedTags = [...(query.excludedTags ?? [])].filter(
            (t: any) => t.id !== "logic-mode"
        );

        const genreIds: string[] = [];
        const typeIds: string[] = [];
        const statusIds: string[] = [];
        const demographicIds: string[] = [];

        for (const tag of allTags) {
            if (tag.id.startsWith("genre-")) {
                genreIds.push(tag.id.replace("genre-", ""));
            } else if (tag.id.startsWith("tag-")) {
                genreIds.push(tag.id.replace("tag-", ""));
            } else if (tag.id.startsWith("format-")) {
                genreIds.push(tag.id.replace("format-", ""));
            } else if (tag.id.startsWith("demographic-")) {
                demographicIds.push(tag.id.replace("demographic-", ""));
            } else if (tag.id.startsWith("type-")) {
                typeIds.push(tag.id.replace("type-", ""));
            } else if (tag.id.startsWith("status-")) {
                statusIds.push(tag.id.replace("status-", ""));
            }
        }

        for (const id of genreIds) url += `&genres[]=${id}`;
        for (const id of typeIds) url += `&types[]=${id}`;
        for (const id of statusIds) url += `&statuses[]=${id}`;
        for (const id of demographicIds) url += `&demographics[]=${id}`;

        if (excludedTags.length > 0) {
            for (const tag of excludedTags) {
                if (tag.id.startsWith("genre-") || tag.id.startsWith("tag-")) {
                    const cleanId = tag.id.replace(/^(genre-|tag-)/, "");
                    url += `&genres[]=-${cleanId}`;
                }
            }
        }

        if (
            genreIds.length > 0 ||
            excludedTags.some(
                (t: any) => t.id.startsWith("genre-") || t.id.startsWith("tag-")
            )
        ) {
            url += `&genres_mode=${genresMode}`;
        }

        const request = App.createRequest({ url: signUrl(url), method: "GET" });
        const response = await this.requestManager.schedule(request, 1);
        this.checkResponseError(response);
        const json = JSON.parse(response.data ?? "{}");

        const [maxRating, { filteredTermIds, tagWhitelistMode, tagAndMode, typeFilter }] =
            await Promise.all([
                getContentRatingMax(this.stateManager),
                this.getTagFilterState(),
            ]);

        const items = this.parser.parseMangaList(
            json.result.items,
            maxRating,
            filteredTermIds,
            tagWhitelistMode,
            typeFilter,
            tagAndMode
        );

        let nextPage: any = undefined;
        if (json.result.meta?.lastPage && json.result.meta.lastPage > page) {
            nextPage = { page: page + 1 };
        } else if (items.length >= 20) {
            nextPage = { page: page + 1 };
        }

        return App.createPagedResults({
            results: items,
            metadata: nextPage,
        });
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: DOMAIN,
            method: "GET",
            headers: {
                Referer: `${DOMAIN}/`,
                "User-Agent": await this.requestManager.getDefaultUserAgent(),
            },
        });
    }

    checkResponseError(response: any): void {
        const data = response.data ?? "";
        const preview = data.substring(0, 300).replace(/\s+/g, " ");
        const headers = response.headers ?? {};
        const ct = headers["Content-Type"] ?? headers["content-type"] ?? "?";
        const server = headers["Server"] ?? headers["server"] ?? "?";
        const cfRay = headers["Cf-Ray"] ?? headers["cf-ray"] ?? "?";
        const reqUrl = response.request?.url ?? "?";

        if (response.status === 403 || response.status === 503) {
            console.log(`[checkErr] BLOCKED status=${response.status} ct=${ct} server=${server} cf-ray=${cfRay} url=${reqUrl} preview="${preview}"`);
            throw new Error("Cloudflare Bypass Required");
        }
        if (response.status < 200 || response.status >= 300) {
            console.log(`[checkErr] HTTP-FAIL status=${response.status} ct=${ct} url=${reqUrl} preview="${preview}"`);
            throw new Error(`HTTP ${response.status}: Unexpected response from server`);
        }
        if (data.trimStart().startsWith("<")) {
            console.log(`[checkErr] HTML-BODY status=${response.status} ct=${ct} server=${server} cf-ray=${cfRay} url=${reqUrl} preview="${preview}"`);
            throw new Error("Cloudflare Bypass Required");
        }
    }
}
