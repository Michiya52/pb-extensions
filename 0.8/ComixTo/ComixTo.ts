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
    SourceIntents,
    createDUILink,
} from "paperback-extensions-common";

import { parseMangaDetails, parseChapterList, parsePageList, parseMangaList } from "./ComixToParser";
import { chapterSettings, filterSettings, resetSettings } from "./ComixToSettings";

const COMIXTO_DOMAIN = "https://comix.to";

export const ComixToInfo: SourceInfo = {
    version: "1.4.1",
    name: "Comix.to",
    icon: "icon.png",
    author: "Michiya52",
    authorWebsite: "https://github.com/Michiya52",
    description: "Extension for Comix.to with advanced filters. (Inspired by Ace)",
    contentRating: ContentRating.MATURE,
    websiteBaseURL: COMIXTO_DOMAIN,
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.SETTINGS_UI | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
};

export class ComixTo extends Source {
    requestManager = createRequestManager({
        requestsPerSecond: 3,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    "Referer": `${COMIXTO_DOMAIN}/`,
                    "User-Agent": await this.requestManager.getDefaultUserAgent(),
                };
                return request;
            },
        },
    });
    stateManager = createSourceStateManager();

    checkResponseError(response: Response): void {
        if (response.status === 403 || response.status === 503) {
            throw new Error("Cloudflare Bypass Required");
        }
    }

    async getSourceMenu(): Promise<DUISection> {
        return createDUISection({
            id: "main",
            header: "Source Settings",
            isHidden: false,
            rows: async () => [
                createDUILink({
                    id: "solve_cloudflare",
                    label: "Solve Cloudflare",
                    value: "Solve Cloudflare",
                    onTap: async () => {
                        await (this as any).openWebView(COMIXTO_DOMAIN);
                    }
                }),
                chapterSettings(this.stateManager),
                filterSettings(this.stateManager),
                resetSettings(this.stateManager)
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
        this.checkResponseError(response);
        const $ = (this as any).cheerio.load(response.data);
        return parseMangaList($, COMIXTO_DOMAIN);
    }

    async getLatestUpdates(range: number): Promise<PagedResults> {
        const request = createRequestObject({
            url: `${COMIXTO_DOMAIN}/latest`, // Assumed URL
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        this.checkResponseError(response);
        const $ = (this as any).cheerio.load(response.data);
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
        this.checkResponseError(response);
        const $ = (this as any).cheerio.load(response.data);
        return parseMangaList($, COMIXTO_DOMAIN);
    }

    async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: `${COMIXTO_DOMAIN}/comic/${mangaId}`,
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        this.checkResponseError(response);
        const $ = (this as any).cheerio.load(response.data);
        return parseMangaDetails($, mangaId);
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = createRequestObject({
            url: `${COMIXTO_DOMAIN}/comic/${mangaId}`,
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        this.checkResponseError(response);
        const $ = (this as any).cheerio.load(response.data);

        // Retrieve settings
        const sortVotes = await this.stateManager.retrieve("sort_upvotes") as boolean ?? false;
        
        const showVolume = await this.stateManager.retrieve("show_volume_number") as boolean ?? false;
        const showTitle = await this.stateManager.retrieve("show_title") as boolean ?? false;
        const showUploader = await this.stateManager.retrieve("show_uploader") as boolean ?? false;

        const filters = {
            uploaders: {
                enabled: await this.stateManager.retrieve("uploaders_enabled") as boolean ?? false,
                whitelist: await this.stateManager.retrieve("uploaders_whitelist") as boolean ?? false,
                strict: await this.stateManager.retrieve("uploaders_strict") as boolean ?? false,
                list: await this.stateManager.retrieve("uploaders_selected") as string[] ?? []
            },
            oneVersionOnly: await this.stateManager.retrieve('one_version_only') as boolean ?? false
        };

        return parseChapterList($, mangaId, sortVotes, { showVolume, showTitle, showUploader }, filters);
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = createRequestObject({
            url: `${COMIXTO_DOMAIN}/chapter/${chapterId}`, // Assumed URL structure
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        this.checkResponseError(response);
        const $ = (this as any).cheerio.load(response.data);
        return parsePageList($, mangaId, chapterId);
    }

    getCloudflareBypassRequest(): Request {
        return createRequestObject({
            url: COMIXTO_DOMAIN,
            method: 'GET',
        });
    }
}
