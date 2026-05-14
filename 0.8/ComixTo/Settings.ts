import { CONTENT_RATINGS, ORDER_OPTIONS, CONTENT_TYPES, PUBLICATION_STATUS } from "./Common";
import { signUrl, API_BASE } from "./ComixHash";
import { ChapterFilters } from "./Parser";

export class Settings {
    private stateManager: any;
    private requestManager: any;
    private tagCacheWarmUp: TagCacheWarmUp | null = null;
    private groupSettingsWarmUp: GroupSettingsWarmUp | null = null;

    constructor(stateManager: any, requestManager: any) {
        this.stateManager = stateManager;
        this.requestManager = requestManager;
    }

    // State Getters

    getContentRatingMax(): string {
        return this.stateManager.retrieve("contentRatingMax") as string || "pornographic";
    }

    setContentRatingMax(v: string): Promise<void> {
        return this.stateManager.store("contentRatingMax", v);
    }

    getTrendingLimit(): number {
        return (this.stateManager.retrieve("trendingLimit") as number) || 50;
    }

    setTrendingLimit(v: number): Promise<void> {
        return this.stateManager.store("trendingLimit", v);
    }

    getTrendingTimePeriod(): string {
        return (this.stateManager.retrieve("trendingTimePeriod") as string) || "7d";
    }

    setTrendingTimePeriod(v: string): Promise<void> {
        return this.stateManager.store("trendingTimePeriod", v);
    }

    getUploadersFiltering(): ChapterFilters["uploaders"] {
        const stored = this.stateManager.retrieve("uploadersFiltering") as any;
        return (
            stored || {
                enabled: false,
                whitelist: false,
                strict: false,
                list: [],
            }
        );
    }

    setUploadersFiltering(v: ChapterFilters["uploaders"]): Promise<void> {
        return this.stateManager.store("uploadersFiltering", v);
    }

    getShowVolume(): boolean {
        return (this.stateManager.retrieve("showVolume") as boolean) ?? true;
    }

    setShowVolume(v: boolean): Promise<void> {
        return this.stateManager.store("showVolume", v);
    }

    getShowTitle(): boolean {
        return (this.stateManager.retrieve("showTitle") as boolean) ?? true;
    }

    setShowTitle(v: boolean): Promise<void> {
        return this.stateManager.store("showTitle", v);
    }

    getShowUploader(): boolean {
        return (this.stateManager.retrieve("showUploader") as boolean) ?? true;
    }

    setShowUploader(v: boolean): Promise<void> {
        return this.stateManager.store("showUploader", v);
    }

    getRemoveDuplicates(): boolean {
        return (this.stateManager.retrieve("removeDuplicates") as boolean) ?? true;
    }

    setRemoveDuplicates(v: boolean): Promise<void> {
        return this.stateManager.store("removeDuplicates", v);
    }

    getOneVersionOnly(): boolean {
        return (this.stateManager.retrieve("oneVersionOnly") as boolean) ?? false;
    }

    setOneVersionOnly(v: boolean): Promise<void> {
        return this.stateManager.store("oneVersionOnly", v);
    }

    getTagFilterEnabled(): boolean {
        return (this.stateManager.retrieve("tagFilterEnabled") as boolean) ?? false;
    }

    setTagFilterEnabled(v: boolean): Promise<void> {
        return this.stateManager.store("tagFilterEnabled", v);
    }

    getTagFilterWhitelist(): boolean {
        return (this.stateManager.retrieve("tagFilterWhitelist") as boolean) ?? false;
    }

    setTagFilterWhitelist(v: boolean): Promise<void> {
        return this.stateManager.store("tagFilterWhitelist", v);
    }

    getTagFilterAndMode(): boolean {
        return (this.stateManager.retrieve("tagFilterAndMode") as boolean) ?? false;
    }

    setTagFilterAndMode(v: boolean): Promise<void> {
        return this.stateManager.store("tagFilterAndMode", v);
    }

    getSelectedTagIds(): number[] {
        return (this.stateManager.retrieve("selectedTagIds") as number[]) || [];
    }

    setSelectedTagIds(v: number[]): Promise<void> {
        return this.stateManager.store("selectedTagIds", v);
    }

    getSelectedContentType(): string {
        return (this.stateManager.retrieve("selectedContentType") as string) || "";
    }

    setSelectedContentType(v: string): Promise<void> {
        return this.stateManager.store("selectedContentType", v);
    }

    // DUI Methods

    contentSettings(): any {
        return App.createForm({
            sections: async () => {
                return [
                    App.createSection({
                        id: "content-trending",
                        label: "Trending Settings",
                        rows: async () => [
                            App.createSelect({
                                id: "trendingTimePeriod",
                                label: "Time Period",
                                options: ["7d", "30d", "90d"],
                                displayLabel: async (opt: any) => opt,
                                value: await this.stateManager.retrieve("trendingTimePeriod") || "7d",
                                onSubmit: async (v: any) => {
                                    await this.setTrendingTimePeriod(v);
                                },
                            }),
                            App.createStepper({
                                id: "trendingLimit",
                                label: "Limit",
                                value: (await this.stateManager.retrieve("trendingLimit")) || 50,
                                min: 10,
                                max: 500,
                                step: 10,
                                onSubmit: async (v: any) => {
                                    await this.setTrendingLimit(v);
                                },
                            }),
                        ],
                    }),
                    App.createSection({
                        id: "content-rating",
                        label: "Content Rating",
                        rows: async () => [
                            App.createSelect({
                                id: "contentRatingMax",
                                label: "Maximum Rating",
                                options: CONTENT_RATINGS.map((r) => r.id),
                                displayLabel: async (opt: any) =>
                                    CONTENT_RATINGS.find((r) => r.id === opt)?.label || opt,
                                value:
                                    (await this.stateManager.retrieve("contentRatingMax")) ||
                                    "pornographic",
                                onSubmit: async (v: any) => {
                                    await this.setContentRatingMax(v);
                                },
                            }),
                        ],
                    }),
                ];
            },
        });
    }

    chapterSettings(): any {
        return App.createForm({
            sections: async () => {
                const uploadersFilter = await this.getUploadersFiltering();
                return [
                    App.createSection({
                        id: "chapter-display",
                        label: "Chapter Display",
                        rows: async () => [
                            App.createSwitch({
                                id: "showVolume",
                                label: "Show Volume",
                                value: await this.getShowVolume(),
                                onSubmit: async (v: any) => {
                                    await this.setShowVolume(v);
                                },
                            }),
                            App.createSwitch({
                                id: "showTitle",
                                label: "Show Title",
                                value: await this.getShowTitle(),
                                onSubmit: async (v: any) => {
                                    await this.setShowTitle(v);
                                },
                            }),
                            App.createSwitch({
                                id: "showUploader",
                                label: "Show Uploader",
                                value: await this.getShowUploader(),
                                onSubmit: async (v: any) => {
                                    await this.setShowUploader(v);
                                },
                            }),
                        ],
                    }),
                    App.createSection({
                        id: "chapter-filtering",
                        label: "Chapter Filtering",
                        rows: async () => [
                            App.createSwitch({
                                id: "removeDuplicates",
                                label: "Remove Duplicate Chapters",
                                value: await this.getRemoveDuplicates(),
                                onSubmit: async (v: any) => {
                                    await this.setRemoveDuplicates(v);
                                },
                            }),
                            App.createSwitch({
                                id: "oneVersionOnly",
                                label: "One Version Only",
                                value: await this.getOneVersionOnly(),
                                onSubmit: async (v: any) => {
                                    await this.setOneVersionOnly(v);
                                },
                            }),
                        ],
                    }),
                    App.createSection({
                        id: "group-filter-settings",
                        label: "Group Filtering",
                        rows: async () => [
                            App.createSwitch({
                                id: "uploadersFilteringEnabled",
                                label: "Enable Group Filtering",
                                value: uploadersFilter.enabled ?? false,
                                onSubmit: async (v: any) => {
                                    uploadersFilter.enabled = v;
                                    await this.setUploadersFiltering(uploadersFilter);
                                },
                            }),
                            App.createSwitch({
                                id: "uploadersFilteringWhitelist",
                                label: "Whitelist Mode (off = Blacklist)",
                                value: uploadersFilter.whitelist ?? false,
                                onSubmit: async (v: any) => {
                                    uploadersFilter.whitelist = v;
                                    await this.setUploadersFiltering(uploadersFilter);
                                },
                            }),
                            App.createSwitch({
                                id: "uploadersFilteringStrict",
                                label: "Strict Matching",
                                value: uploadersFilter.strict ?? false,
                                onSubmit: async (v: any) => {
                                    uploadersFilter.strict = v;
                                    await this.setUploadersFiltering(uploadersFilter);
                                },
                            }),
                        ],
                    }),
                    App.createSection({
                        id: "manage-groups",
                        label: "Manage Scanlators",
                        rows: async () => [
                            App.createButton({
                                id: "rearrangeScanlators",
                                label: "Rearrange Preferred Scanlators",
                                onTap: async () => {
                                    await this.showScanlatorRearrangementUI();
                                },
                            }),
                        ],
                    }),
                ];
            },
        });
    }

    tagFilterSettings(): any {
        return App.createForm({
            sections: async () => {
                const tagFilterEnabled = await this.getTagFilterEnabled();
                const tagFilterWhitelist = await this.getTagFilterWhitelist();
                const tagFilterAndMode = await this.getTagFilterAndMode();
                const selectedTagIds = await this.getSelectedTagIds();
                const selectedContentType = await this.getSelectedContentType();

                if (!this.tagCacheWarmUp) {
                    this.tagCacheWarmUp = new TagCacheWarmUp(this.requestManager);
                }
                const tags = await this.tagCacheWarmUp.getTags();

                return [
                    App.createSection({
                        id: "tag-filter-settings",
                        label: "Filter Settings",
                        rows: async () => [
                            App.createSwitch({
                                id: "tagFilterEnabled",
                                label: "Enable Tag Filter",
                                value: tagFilterEnabled ?? false,
                                onSubmit: async (v: any) => {
                                    await this.setTagFilterEnabled(v);
                                },
                            }),
                            App.createSwitch({
                                id: "tagFilterWhitelist",
                                label: "Whitelist Mode (off = Blacklist)",
                                value: tagFilterWhitelist ?? false,
                                onSubmit: async (v: any) => {
                                    await this.setTagFilterWhitelist(v);
                                },
                            }),
                            App.createSwitch({
                                id: "tagFilterAndMode",
                                label: "AND Mode (off = OR)",
                                value: tagFilterAndMode ?? false,
                                onSubmit: async (v: any) => {
                                    await this.setTagFilterAndMode(v);
                                },
                            }),
                        ],
                    }),
                    App.createSection({
                        id: "content-type",
                        label: "Content Type",
                        rows: async () => [
                            App.createSelect({
                                id: "selectedContentType",
                                label: "Type",
                                options: ["", ...CONTENT_TYPES.map((t) => t.id)],
                                displayLabel: async (opt: any) =>
                                    opt === ""
                                        ? "Any"
                                        : CONTENT_TYPES.find((t) => t.id === opt)?.label || opt,
                                value: selectedContentType ?? "",
                                onSubmit: async (v: any) => {
                                    await this.setSelectedContentType(v);
                                },
                            }),
                        ],
                    }),
                    App.createSection({
                        id: "genres",
                        label: "Genres",
                        rows: async () => [
                            App.createMultiSelect({
                                id: "genreSelect",
                                label: "Select Genres",
                                options: tags.genres,
                                displayLabel: async (opt: any) => opt.label,
                                values:
                                    tags.genres
                                        .filter((g: any) => selectedTagIds.includes(g.id))
                                        .map((g: any) => g) || [],
                                onSubmit: async (v: any) => {
                                    await this.setSelectedTagIds(
                                        v.map((x: any) => x.id)
                                    );
                                },
                            }),
                        ],
                    }),
                    App.createSection({
                        id: "themes",
                        label: "Themes",
                        rows: async () => [
                            App.createMultiSelect({
                                id: "themeSelect",
                                label: "Select Themes",
                                options: tags.themes,
                                displayLabel: async (opt: any) => opt.label,
                                values:
                                    tags.themes
                                        .filter((t: any) => selectedTagIds.includes(t.id))
                                        .map((t: any) => t) || [],
                                onSubmit: async (v: any) => {
                                    await this.setSelectedTagIds(
                                        v.map((x: any) => x.id)
                                    );
                                },
                            }),
                        ],
                    }),
                    App.createSection({
                        id: "formats",
                        label: "Formats",
                        rows: async () => [
                            App.createMultiSelect({
                                id: "formatSelect",
                                label: "Select Formats",
                                options: tags.formats,
                                displayLabel: async (opt: any) => opt.label,
                                values:
                                    tags.formats
                                        .filter((f: any) => selectedTagIds.includes(f.id))
                                        .map((f: any) => f) || [],
                                onSubmit: async (v: any) => {
                                    await this.setSelectedTagIds(
                                        v.map((x: any) => x.id)
                                    );
                                },
                            }),
                        ],
                    }),
                    App.createSection({
                        id: "demographics",
                        label: "Demographics",
                        rows: async () => [
                            App.createMultiSelect({
                                id: "demographicSelect",
                                label: "Select Demographics",
                                options: tags.demographics,
                                displayLabel: async (opt: any) => opt.label,
                                values:
                                    tags.demographics
                                        .filter((d: any) => selectedTagIds.includes(d.id))
                                        .map((d: any) => d) || [],
                                onSubmit: async (v: any) => {
                                    await this.setSelectedTagIds(
                                        v.map((x: any) => x.id)
                                    );
                                },
                            }),
                        ],
                    }),
                ];
            },
        });
    }

    private async showScanlatorRearrangementUI(): Promise<void> {
        let uploadersFilter = await this.getUploadersFiltering();
        let scanlators = uploadersFilter.list || [];

        if (scanlators.length === 0) {
            // Auto-seed scanlators from API
            scanlators = await this.autoSeedScanlators();
            if (scanlators.length > 0) {
                uploadersFilter.list = scanlators;
                await this.setUploadersFiltering(uploadersFilter);
            } else {
                return;
            }
        }

        let rearranged = [...scanlators];
        let done = false;

        while (!done) {
            const options = [
                ...rearranged.map((s, idx) => ({
                    id: s,
                    label: `${idx + 1}. ${s}`,
                })),
                { id: "___ADD___", label: "+ Add Scanlator" },
                { id: "___DONE___", label: "✓ Done Rearranging" },
            ];

            try {
                const selected = await this.requestManager.awaitUserSelection(
                    App.createSelection({
                        options: options.map((o) =>
                            App.createSelectionOptionData({
                                id: o.id,
                                label: o.label,
                            })
                        ),
                    })
                );

                if (selected.ids?.includes("___DONE___")) {
                    done = true;
                    uploadersFilter.list = rearranged;
                    await this.setUploadersFiltering(uploadersFilter);
                } else if (selected.ids?.includes("___ADD___")) {
                    const newScanlator = await this.requestManager.awaitUserInput(
                        App.createUserInput({
                            placeholder: "Enter scanlator/uploader name",
                        })
                    );
                    if (newScanlator?.text && !rearranged.includes(newScanlator.text)) {
                        rearranged.push(newScanlator.text);
                    }
                } else if (selected.ids?.[0] && !selected.ids[0].startsWith("___")) {
                    const selectedScanlator = selected.ids[0];
                    const currentIndex = rearranged.indexOf(selectedScanlator);

                    if (currentIndex >= 0) {
                        const moveOptions = [
                            currentIndex > 0
                                ? { id: "move_up", label: "↑ Move Up" }
                                : null,
                            currentIndex < rearranged.length - 1
                                ? { id: "move_down", label: "↓ Move Down" }
                                : null,
                            { id: "remove", label: "✕ Remove" },
                            { id: "cancel", label: "Cancel" },
                        ].filter((x) => x !== null);

                        const action = await this.requestManager.awaitUserSelection(
                            App.createSelection({
                                options: moveOptions.map((o) =>
                                    App.createSelectionOptionData({
                                        id: o.id,
                                        label: o.label,
                                    })
                                ),
                            })
                        );

                        if (action.ids?.includes("move_up")) {
                            [rearranged[currentIndex], rearranged[currentIndex - 1]] = [
                                rearranged[currentIndex - 1],
                                rearranged[currentIndex],
                            ];
                        } else if (action.ids?.includes("move_down")) {
                            [rearranged[currentIndex], rearranged[currentIndex + 1]] = [
                                rearranged[currentIndex + 1],
                                rearranged[currentIndex],
                            ];
                        } else if (action.ids?.includes("remove")) {
                            rearranged.splice(currentIndex, 1);
                        }
                    }
                }
            } catch (error) {
                console.error("Error during scanlator rearrangement:", error);
                break;
            }
        }
    }

    private async autoSeedScanlators(): Promise<string[]> {
        try {
            // Try to fetch groups/scanlators from the API
            const url = signUrl(`${API_BASE}/v1/titles?limit=100`);
            const response = await this.requestManager.schedule(
                App.createRequest({ url, method: "GET" }),
                1
            );

            const data =
                typeof response.data === "string"
                    ? JSON.parse(response.data)
                    : response.data;

            // Extract unique group/scanlator names from titles
            const scanlators = new Set<string>();
            
            if (data.data?.titles) {
                for (const title of data.data.titles) {
                    if (title.chapters && Array.isArray(title.chapters)) {
                        for (const chapter of title.chapters) {
                            const groupName = chapter.group?.name || chapter.scanlator;
                            if (groupName && typeof groupName === "string") {
                                scanlators.add(groupName.trim());
                            }
                        }
                    }
                    // Limit to avoid timeout
                    if (scanlators.size >= 20) break;
                }
            }

            return Array.from(scanlators).sort();
        } catch (error) {
            console.error("Failed to auto-seed scanlators:", error);
            return [];
        }
    }

    async resetSettings(): Promise<void> {
        await this.stateManager.store("contentRatingMax", "pornographic");
        await this.stateManager.store("trendingLimit", 50);
        await this.stateManager.store("trendingTimePeriod", "7d");
        await this.stateManager.store("uploadersFiltering", {
            enabled: false,
            whitelist: false,
            strict: false,
            list: [],
        });
        await this.stateManager.store("showVolume", true);
        await this.stateManager.store("showTitle", true);
        await this.stateManager.store("showUploader", true);
        await this.stateManager.store("removeDuplicates", true);
        await this.stateManager.store("oneVersionOnly", false);
        await this.stateManager.store("tagFilterEnabled", false);
        await this.stateManager.store("tagFilterWhitelist", false);
        await this.stateManager.store("tagFilterAndMode", false);
        await this.stateManager.store("selectedTagIds", []);
        await this.stateManager.store("selectedContentType", "");
    }

    keepAlive(): void {
        // Manage UI element lifecycle to prevent garbage collection
        if (this.tagCacheWarmUp) {
            this.tagCacheWarmUp.keepAlive();
        }
        if (this.groupSettingsWarmUp) {
            this.groupSettingsWarmUp.keepAlive();
        }
    }
}

export class TagCacheWarmUp {
    private requestManager: any;
    private cachedTags: any = null;
    private cachePromise: Promise<any> | null = null;

    constructor(requestManager: any) {
        this.requestManager = requestManager;
    }

    async getTags(): Promise<any> {
        if (this.cachedTags) return this.cachedTags;
        if (this.cachePromise) return this.cachePromise;

        this.cachePromise = this.loadTags().then((tags) => {
            this.cachedTags = tags;
            return tags;
        });

        return this.cachePromise;
    }

    private async loadTags(): Promise<any> {
        try {
            const url = signUrl(`${API_BASE}/v1/genres`);
            const response = await this.requestManager.schedule(
                App.createRequest({ url, method: "GET" }),
                1
            );
            const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;

            const allGenres = data.genres || [];
            const allThemes = data.themes || [];
            const allFormats = data.formats || [];
            const allDemographics = data.demographics || [];

            return {
                genres: allGenres.map((g: any) => ({ id: g.id, label: g.title })),
                themes: allThemes.map((t: any) => ({ id: t.id, label: t.title })),
                formats: allFormats.map((f: any) => ({ id: f.id, label: f.title })),
                demographics: allDemographics.map((d: any) => ({ id: d.id, label: d.title })),
            };
        } catch (error) {
            console.error("Failed to load tags:", error);
            return { genres: [], themes: [], formats: [], demographics: [] };
        }
    }

    keepAlive(): void {
        // Prevent garbage collection of tag data
    }
}

export class GroupSettingsWarmUp {
    private stateManager: any;

    constructor(stateManager: any) {
        this.stateManager = stateManager;
    }

    async warmUp(): Promise<void> {
        await this.stateManager.retrieve("uploadersFiltering");
    }

    keepAlive(): void {
        // Prevent garbage collection
    }
}
