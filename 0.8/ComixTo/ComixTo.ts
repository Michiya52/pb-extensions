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
    createRequestObject,
    createPagedResults,
    createRequestManager,
    createSourceStateManager,
    createDUINavigationButton,
    createDUIForm,
    createDUISection,
    createDUISwitch,
    createDUISelect,
    createDUIBinding,
    SourceStateManager,
    DUISection,
} from "paperback-extensions-common";

import { parseMangaDetails, parseChapterList, parsePageList, parseMangaList } from "./ComixToParser";
import { chapterSettings, getShowChapterVolume, getShowChapterTitle, getShowUploader } from "./ComixToSettings";

const COMIXTO_DOMAIN = "https://comix.to";

export const ComixToInfo: SourceInfo = {
    version: "1.0.1",
    name: "Comix.to",
    icon: "icon.png",
    author: "Michiya52",
    authorWebsite: "https://github.com/Michiya52",
    description: "Extension for Comix.to",
    contentRating: ContentRating.MATURE,
    websiteBaseURL: COMIXTO_DOMAIN,
};

export class ComixTo extends Source {
    requestManager = createRequestManager({
        requestsPerSecond: 3,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        "Referer": COMIXTO_DOMAIN,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    },
                };
                return request;
            },
            interceptResponse: async (response: Response): Promise<Response> => {
                return response;
            },
        },
    });

    stateManager = createSourceStateManager();

    async getSourceMenu(): Promise<DUISection> {
        return createDUISection({
            id: "main",
            header: "Source Settings",
            isHidden: false,
            rows: async () => [
                chapterSettings(this.stateManager),
                createDUINavigationButton({
                    id: "settings",
                    label: "Comix.to Settings",
                    form: createDUIForm({
                        sections: async () => [
                            createDUISection({
                                id: "sorting",
                                header: "Sorting",
                                isHidden: false,
                                rows: async () => [
                                    createDUISwitch({
                                        id: "sort_upvotes",
                                        label: "Sort Chapters by Highest Upvoted",
                                        value: createDUIBinding({
                                            get: async () => await this.stateManager.retrieve("sort_upvotes") ?? false,
                                            set: async (newValue: any) => await this.stateManager.store("sort_upvotes", newValue)
                                        })
                                    }),
                                    createDUISelect({
                                        id: "manga_sorting",
                                        label: "Global Manga Sorting",
                                        options: ["", "sort.follow", "sort.view", "sort.rating", "sort.uploaded"],
                                        value: createDUIBinding({
                                            get: async () => await this.stateManager.retrieve("manga_sorting") ?? "",
                                            set: async (newValue: any) => await this.stateManager.store("manga_sorting", newValue)
                                        }),
                                        displayLabel: (option: any) => {
                                            switch (option) {
                                                case "sort.follow": return "Most follows";
                                                case "sort.view": return "Most views";
                                                case "sort.rating": return "High rating";
                                                case "sort.uploaded": return "Last updated";
                                                default: return "None";
                                            }
                                        }
                                    })
                                ]
                            })
                        ]
                    })
                })
            ]
        });
    }

    getMangaShareUrl(mangaId: string): string {
        return `${COMIXTO_DOMAIN}/comic/${mangaId}`;
    }

    async getPopularManga(range: number): Promise<PagedResults> {
        const request = createRequestObject({
            url: `${COMIXTO_DOMAIN}/popular`, // Assumed URL
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return parseMangaList($, COMIXTO_DOMAIN);
    }

    async getLatestUpdates(range: number): Promise<PagedResults> {
        const request = createRequestObject({
            url: `${COMIXTO_DOMAIN}/latest`, // Assumed URL
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return parseMangaList($, COMIXTO_DOMAIN);
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const mangaSorting = await this.stateManager.retrieve("manga_sorting") as string ?? "";
        const sortParam = mangaSorting ? `&sort=${mangaSorting.split('.').pop()}` : "";
        const request = createRequestObject({
            url: `${COMIXTO_DOMAIN}/search`, // Assumed URL
            method: "GET",
            param: `?q=${encodeURIComponent(query.title ?? "")}${sortParam}`,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return parseMangaList($, COMIXTO_DOMAIN);
    }

    async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: `${COMIXTO_DOMAIN}/comic/${mangaId}`,
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = createRequestObject({
            url: `${COMIXTO_DOMAIN}/comic/${mangaId}`,
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);

        // Retrieve setting
        const sortVotes = await this.stateManager.retrieve("sort_upvotes") ?? false;

        const showVolume = await getShowChapterVolume(this.stateManager);
        const showTitle = await getShowChapterTitle(this.stateManager);
        const showUploader = await getShowUploader(this.stateManager);

        return parseChapterList($, mangaId, sortVotes, { showVolume, showTitle, showUploader });
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = createRequestObject({
            url: `${COMIXTO_DOMAIN}/chapter/${chapterId}`, // Assumed URL structure
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return parsePageList($, mangaId, chapterId);
    }
}
