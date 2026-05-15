import {
    Chapter,
    ChapterDetails,
    HomeSection,
    MangaUpdates,
    PagedResults,
    PartialSourceManga,
    RequestHeaders,
    Response,
    SearchRequest,
    Section,
    SourceInfo,
    TagType,
} from "paperback-extensions-common";
import { Parser, ChapterFilters } from "./Parser";
import { API_BASE, DOMAIN, CONTENT_RATINGS, ORDER_OPTIONS, CONTENT_TYPES, PUBLICATION_STATUS } from "./Common";
import { signUrl } from "./ComixHash";
import { Settings } from "./Settings";

export const ComixToInfo: SourceInfo = {
    version: "1.5.8",
    name: "ComixTo",
    description: "Read manga from ComixTo",
    author: "Michiya52",
    authorWebsite: "https://github.com/Michiya52",
    icon: "icon.png",
    contentRating: 4,
    websiteBaseURL: DOMAIN,
    sourceTags: [{ text: "English", id: 1 }],
};

export class ComixTo extends Source {
    private stateManager = createDatabaseManager();
    private requestManager = createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...request.headers,
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    Accept: "application/json",
                    "Accept-Language": "en-US,en;q=0.9",
                    Referer: DOMAIN + "/",
                    Origin: DOMAIN,
                };
                return request;
            },
            interceptResponse: async (response: Response): Promise<Response> => {
                return response;
            },
        },
    });

    private parser = new Parser();
    private settings = new Settings(this.stateManager, this.requestManager);

    override getSourceInfo(): SourceInfo {
        return ComixToInfo;
    }

    override getSourceMenu(): Section {
        return App.createSection({
            id: "source_menu",
            header: "ComixTo Settings",
            rows: async () => [
                App.createButton({
                    id: "trending_settings",
                    label: "Content & Trending Settings",
                    onTap: async () => {
                        App.pushUiSection({
                            sections: await this.settings.contentSettings().sections(),
                        });
                    },
                }),
                App.createButton({
                    id: "chapter_settings",
                    label: "Chapter & Group Settings",
                    onTap: async () => {
                        App.pushUiSection({
                            sections: await this.settings.chapterSettings().sections(),
                        });
                    },
                }),
                App.createButton({
                    id: "tag_filter_settings",
                    label: "Tag Filter Settings",
                    onTap: async () => {
                        App.pushUiSection({
                            sections: await this.settings.tagFilterSettings().sections(),
                        });
                    },
                }),
                App.createButton({
                    id: "reset_settings",
                    label: "Reset All Settings",
                    onTap: async () => {
                        await this.settings.resetSettings();
                    },
                }),
            ],
        });
    }

    private async getTagFilterState(): Promise<{
        filteredTermIds: Set<number>;
        filteredTerms: Set<string>;
        modes: { whitelist: boolean; andMode: boolean };
        typeFilter: Set<string>;
    }> {
        const enabled = await this.settings.getTagFilterEnabled();
        const whitelist = await this.settings.getTagFilterWhitelist();
        const andMode = await this.settings.getTagFilterAndMode();
        const selectedTagIds = await this.settings.getSelectedTagIds();
        const selectedContentType = await this.settings.getSelectedContentType();

        return {
            filteredTermIds: new Set(enabled ? selectedTagIds : []),
            filteredTerms: new Set(),
            modes: { whitelist, andMode },
            typeFilter: new Set(selectedContentType ? [selectedContentType] : []),
        };
    }

    override async getMangaDetails(mangaId: string): Promise<any> {
        const url = signUrl(
            `${API_BASE}/v1/titles/${mangaId}?includes=authors,artists`
        );

        const response = await this.requestManager.schedule(
            App.createRequest({ url, method: "GET" }),
            1
        );

        const data =
            typeof response.data === "string"
                ? JSON.parse(response.data)
                : response.data;

        return this.parser.parseMangaDetails(data.data, mangaId);
    }

    override async getChapters(mangaId: string): Promise<Chapter[]> {
        const chapters: Chapter[] = [];
        const pageSize = 100;
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const url = signUrl(
                `${API_BASE}/v1/titles/${mangaId}/chapters?page=${page}&limit=${pageSize}&order=desc&order_by=number`
            );

            const response = await this.requestManager.schedule(
                App.createRequest({ url, method: "GET" }),
                1
            );

            const data =
                typeof response.data === "string"
                    ? JSON.parse(response.data)
                    : response.data;
            this.checkResponseError(data);

            const items = data.data?.chapters || [];
            if (items.length === 0) {
                hasMore = false;
            } else {
                // Group and filter chapters
                const filters: ChapterFilters = {
                    showVolume: await this.settings.getShowVolume(),
                    showTitle: await this.settings.getShowTitle(),
                    showUploader: await this.settings.getShowUploader(),
                    uploaders: await this.settings.getUploadersFiltering(),
                    oneVersionOnly: await this.settings.getOneVersionOnly(),
                    removeDuplicates: await this.settings.getRemoveDuplicates(),
                };

                const parsed = this.parser.parseChapters(items, filters);
                chapters.push(...parsed);
            }

            page++;
        }

        return chapters;
    }

    override async getChapterDetails(
        mangaId: string,
        chapterId: string
    ): Promise<ChapterDetails> {
        const url = signUrl(`${API_BASE}/v1/chapters/${chapterId}`);

        try {
            const response = await this.requestManager.schedule(
                App.createRequest({
                    url,
                    method: "GET",
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        Accept: "application/json",
                        Referer: DOMAIN + "/",
                    },
                }),
                1
            );

            this.checkResponseError(response);

            let data = response.data;
            if (typeof data === "string") {
                try {
                    data = JSON.parse(data);
                } catch {
                    throw new Error("Failed to parse response JSON");
                }
            }

            if (!data || !data.data) {
                throw new Error("Invalid chapter data returned from API");
            }

            return this.parser.parseChapterDetails(data.data, mangaId, chapterId);
        } catch (error) {
            console.error(`Error fetching chapter ${chapterId}:`, error);
            throw error;
        }
    }

    override async getHomePageSections(
        sectionCallback: (section: Section) => void
    ): Promise<void> {
        const sections = [
            {
                id: "1",
                label: "Trending",
                request: `${API_BASE}/v1/titles/trending?order=trending`,
            },
            {
                id: "2",
                label: "Latest Updated",
                request: `${API_BASE}/v1/titles?order_by=chapter_updated_at&order=desc`,
            },
            { id: "3", label: "Newest", request: `${API_BASE}/v1/titles` },
            {
                id: "4",
                label: "Most Followed",
                request: `${API_BASE}/v1/titles?order_by=follows_total&order=desc`,
            },
            {
                id: "5",
                label: "Most Followed (Recent)",
                request: `${API_BASE}/v1/titles?order_by=follows_7d&order=desc`,
            },
        ];

        const tagFilter = await this.getTagFilterState();

        for (const section of sections) {
            const homeSection = App.createHomeSection({
                id: section.id,
                title: section.label,
                view_type: "scrollable",
                containsUpdates: false,
            });

            let items: PartialSourceManga[] = [];

            try {
                const url = signUrl(section.request);
                const response = await this.requestManager.schedule(
                    App.createRequest({ url, method: "GET" }),
                    1
                );

                const data =
                    typeof response.data === "string"
                        ? JSON.parse(response.data)
                        : response.data;
                this.checkResponseError(data);

                const maxRating = await this.settings.getContentRatingMax();
                items = this.parser.parseMangaList(
                    data.data?.titles || [],
                    maxRating,
                    tagFilter.filteredTermIds,
                    tagFilter.modes.whitelist,
                    tagFilter.typeFilter,
                    tagFilter.modes.andMode
                );
            } catch (error) {
                console.error(`Error fetching ${section.label}:`, error);
            }

            homeSection.items = items;
            sectionCallback(homeSection);
        }
    }

    override async getViewMoreItems(
        homepageSectionId: string,
        metadata: any
    ): Promise<PagedResults> {
        let page = metadata?.page || 1;
        let url = "";

        const sectionMap: Record<string, string> = {
            "1": `${API_BASE}/v1/titles/trending?order=trending&page=${page}`,
            "2": `${API_BASE}/v1/titles?order_by=chapter_updated_at&order=desc&page=${page}`,
            "3": `${API_BASE}/v1/titles?page=${page}`,
            "4": `${API_BASE}/v1/titles?order_by=follows_total&order=desc&page=${page}`,
            "5": `${API_BASE}/v1/titles?order_by=follows_7d&order=desc&page=${page}`,
        };

        url = sectionMap[homepageSectionId] || "";

        const tagFilter = await this.getTagFilterState();
        const maxRating = await this.settings.getContentRatingMax();

        const signedUrl = signUrl(url);
        const response = await this.requestManager.schedule(
            App.createRequest({ url: signedUrl, method: "GET" }),
            1
        );

        const data =
            typeof response.data === "string"
                ? JSON.parse(response.data)
                : response.data;
        this.checkResponseError(data);

        const items = this.parser.parseMangaList(
            data.data?.titles || [],
            maxRating,
            tagFilter.filteredTermIds,
            tagFilter.modes.whitelist,
            tagFilter.typeFilter,
            tagFilter.modes.andMode
        );

        return App.createPagedResults({
            results: items,
            metadata: { page: page + 1 },
        });
    }

    override async getSearchTags(): Promise<TagType[]> {
        return [
            App.createTagSection({
                id: "type",
                label: "Type",
                tags: CONTENT_TYPES.map((t) =>
                    App.createTag({ id: t.id, label: t.label })
                ),
            }),
            App.createTagSection({
                id: "order",
                label: "Order By",
                tags: ORDER_OPTIONS.map((o) =>
                    App.createTag({ id: o.id, label: o.label })
                ),
            }),
            App.createTagSection({
                id: "status",
                label: "Status",
                tags: PUBLICATION_STATUS.map((s) =>
                    App.createTag({ id: s.id, label: s.label })
                ),
            }),
            App.createTagSection({
                id: "genre",
                label: "Genre",
                tags: [],
            }),
            App.createTagSection({
                id: "theme",
                label: "Theme",
                tags: [],
            }),
            App.createTagSection({
                id: "format",
                label: "Format",
                tags: [],
            }),
            App.createTagSection({
                id: "demographic",
                label: "Demographic",
                tags: [],
            }),
        ];
    }

    override async getSearchResults(
        query: SearchRequest,
        metadata: any
    ): Promise<PagedResults> {
        const page = metadata?.page || 1;

        let queryParams = `_=${Date.now()}&title=${encodeURIComponent(query.title || "")}`;

        // Handle type filter
        const typeTag = query.includedTags?.find((t) => t.id === "type");
        if (typeTag) {
            queryParams += `&types=${typeTag.value}`;
        }

        // Handle order
        const orderTag = query.includedTags?.find((t) => t.id === "order");
        if (orderTag) {
            queryParams += `&order_by=${orderTag.value}&order=desc`;
        }

        // Handle status
        const statusTag = query.includedTags?.find((t) => t.id === "status");
        if (statusTag) {
            queryParams += `&status=${statusTag.value}`;
        }

        // Collect genre, theme, format, demographic tags
        const genreTags =
            query.includedTags?.filter((t) => t.id === "genre") || [];
        const themeTags =
            query.includedTags?.filter((t) => t.id === "theme") || [];
        const formatTags =
            query.includedTags?.filter((t) => t.id === "format") || [];
        const demographicTags =
            query.includedTags?.filter((t) => t.id === "demographic") || [];

        const allTermTags = [
            ...genreTags,
            ...themeTags,
            ...formatTags,
            ...demographicTags,
        ];

        if (allTermTags.length > 0) {
            const isAndMode = false;
            const termIds = allTermTags.map((t) => t.value).join(",");
            queryParams += `&includes=${termIds}`;
            if (isAndMode) {
                queryParams += "&include_all_terms=true";
            }
        }

        queryParams += `&page=${page}`;

        const url = signUrl(`${API_BASE}/v1/titles?${queryParams}`);

        const response = await this.requestManager.schedule(
            App.createRequest({ url, method: "GET" }),
            1
        );

        const data =
            typeof response.data === "string"
                ? JSON.parse(response.data)
                : response.data;
        this.checkResponseError(data);

        const maxRating = await this.settings.getContentRatingMax();
        const items = this.parser.parseMangaList(
            data.data?.titles || [],
            maxRating
        );

        return App.createPagedResults({
            results: items,
            metadata: { page: page + 1 },
        });
    }

    override async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: DOMAIN,
            method: "GET",
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                Accept: "*/*",
                Referer: DOMAIN + "/",
            },
        });
    }

    private checkResponseError(response: any): void {
        // Check for HTTP error status
        if (response.status && response.status >= 400) {
            throw new Error(`HTTP Error ${response.status}: ${response.statusText || "Unknown error"}`);
        }

        // Check for Cloudflare protection in response
        const responseData = typeof response.data === "string" ? response.data : "";
        if (responseData.includes("Cloudflare") || responseData.includes("cf-error")) {
            throw new Error(
                "Cloudflare protection detected. The extension requires Cloudflare bypass."
            );
        }

        // Check for blocked response
        if (response.status === 403) {
            throw new Error("Access denied by server (403). Possible Cloudflare challenge.");
        }

        if (response.status === 503) {
            throw new Error(
                "Service temporarily unavailable (503). Server may be under maintenance or Cloudflare is active."
            );
        }
    }

    override globalRequestHeaders(): RequestHeaders {
        return {};
    }

    override async filterUpdatedMangaFromPagedResults(
        response: Response,
        lastFetchDate: Date
    ): Promise<MangaUpdates> {
        const items: PartialSourceManga[] = [];
        for (const item of items) {
            if (item.chapterUpdatedDate && item.chapterUpdatedDate > lastFetchDate) {
                items.push(item);
            }
        }

        return App.createMangaUpdates({
            ids: items.map((i) => i.mangaId),
        });
    }
}
