import { API_BASE, CONTENT_TYPES } from "./Common";
import { signUrl } from "./ComixHash";
import { ChapterFilters } from "./Parser";

// --- Trending Options ---
const TRENDING_OPTIONS = [
    { id: "1", label: "1 day" },
    { id: "7", label: "7 days" },
    { id: "30", label: "1 month" },
    { id: "90", label: "3 months" },
    { id: "180", label: "6 months" },
    { id: "365", label: "1 year" },
];

// --- UI Keep-Alive ---
const uiKeepAlive: any[] = [];
const keepAlive = <T>(obj: T): T => {
    uiKeepAlive.push(obj);
    return obj;
};

// --- Group Settings Warm-Up ---
let groupSettingsWarmUp: Promise<void> | null = null;

const warmUpGroupSettings = (stateManager: any): Promise<void> => {
    if (!groupSettingsWarmUp) {
        groupSettingsWarmUp = (async () => {
            await getUploadersFiltering(stateManager);
            await getUploadersWhitelisted(stateManager);
            await getStrictNameMatching(stateManager);
            await getUploaders(stateManager);
            await getSelectedUploaders(stateManager);
            await getUploaderInput(stateManager);
        })();
    }
    return groupSettingsWarmUp;
};

// --- State Getters ---
export const getIsNsfw = async (stateManager: any): Promise<boolean> => {
    const val = await stateManager.retrieve("is_nsfw");
    return val !== null ? val : true;
};

export const getTrendingLimit = async (stateManager: any): Promise<string[]> => {
    const val = await stateManager.retrieve("trending_limit");
    return val ?? ["30"];
};

export const getUploadersFiltering = async (stateManager: any): Promise<boolean> => {
    return (await stateManager.retrieve("uploaders_toggled")) ?? false;
};

export const getUploadersWhitelisted = async (stateManager: any): Promise<boolean> => {
    return (await stateManager.retrieve("uploaders_whitelisted")) ?? false;
};

export const getStrictNameMatching = async (stateManager: any): Promise<boolean> => {
    return (await stateManager.retrieve("strict_name_matching")) ?? false;
};

export const getUploaders = async (stateManager: any): Promise<string[]> => {
    return (await stateManager.retrieve("uploaders")) ?? [];
};

export const getUploaderInput = async (stateManager: any): Promise<string> => {
    return (await stateManager.retrieve("uploader_input")) ?? "";
};

export const getSelectedUploaders = async (stateManager: any): Promise<string[]> => {
    return (await stateManager.retrieve("uploaders_selected")) ?? [];
};

// --- Tag Filter State Getters ---
export const getCachedTags = async (stateManager: any): Promise<any | null> => {
    const cached = await stateManager.retrieve("tag_cache_v1");
    if (!cached) return null;
    try {
        return JSON.parse(cached);
    } catch {
        return null;
    }
};

export const getTagBlacklist = async (stateManager: any): Promise<string[]> => {
    return (await stateManager.retrieve("tag_blacklist")) ?? [];
};

export const getTagFilterEnabled = async (stateManager: any): Promise<boolean> => {
    return (await stateManager.retrieve("tag_filter_enabled")) ?? false;
};

export const getTagWhitelistMode = async (stateManager: any): Promise<boolean> => {
    return (await stateManager.retrieve("tag_whitelist_mode")) ?? false;
};

export const getTagAndMode = async (stateManager: any): Promise<boolean> => {
    return (await stateManager.retrieve("tag_and_mode")) ?? false;
};

export const getTypeFilter = async (stateManager: any): Promise<string[]> => {
    return (await stateManager.retrieve("type_filter")) ?? [];
};

// --- Chapter Display Getters (restored from v1.4.2) ---
export const getShowVolume = async (stateManager: any): Promise<boolean> => {
    return (await stateManager.retrieve("show_volume_number")) ?? false;
};

export const getShowTitle = async (stateManager: any): Promise<boolean> => {
    return (await stateManager.retrieve("show_title")) ?? false;
};

export const getShowUploader = async (stateManager: any): Promise<boolean> => {
    return (await stateManager.retrieve("show_uploader")) ?? false;
};

export const getRemoveDuplicates = async (stateManager: any): Promise<boolean> => {
    return (await stateManager.retrieve("remove_duplicates")) ?? true;
};

export const getOneVersionOnly = async (stateManager: any): Promise<boolean> => {
    return (await stateManager.retrieve("one_version_only")) ?? false;
};

// --- Combined Filter Object (restored from v1.4.2) ---
export const getFilters = async (stateManager: any): Promise<ChapterFilters> => {
    return {
        showVolume: await getShowVolume(stateManager),
        showTitle: await getShowTitle(stateManager),
        showUploader: await getShowUploader(stateManager),
        uploaders: {
            enabled: await getUploadersFiltering(stateManager),
            whitelist: await getUploadersWhitelisted(stateManager),
            strict: await getStrictNameMatching(stateManager),
            list: await getUploaders(stateManager),
        },
        oneVersionOnly: await getOneVersionOnly(stateManager),
        removeDuplicates: await getRemoveDuplicates(stateManager),
    };
};

// --- Tag Cache Warm-Up ---
let tagCacheWarmUp: Promise<any> | null = null;

export const resetTagCacheWarmUp = (): void => {
    tagCacheWarmUp = null;
};

export const warmUpTagCache = (stateManager: any, requestManager: any): Promise<any> => {
    if (!tagCacheWarmUp) {
        tagCacheWarmUp = (async () => {
            const existing = await getCachedTags(stateManager);
            if (existing) return existing;
            try {
                const fetchTerms = async (type: string) => {
                    const req = App.createRequest({
                        // /tags/search caps at limit=50 in v1; >50 returns 422.
                        url: signUrl(`${API_BASE}/tags/search?type=${type}&limit=50`),
                        method: "GET",
                    });
                    const res = await requestManager.schedule(req, 1);
                    const json = JSON.parse(res.data ?? "{}");
                    return Array.isArray(json.result) ? json.result : [];
                };

                const [genre, theme, format, demographic] = await Promise.all([
                    fetchTerms("genre"),
                    fetchTerms("tag"),
                    fetchTerms("format"),
                    fetchTerms("demographic"),
                ]);

                const cache = { genre, theme, format, demographic };
                await stateManager.store("tag_cache_v1", JSON.stringify(cache));
                return cache;
            } catch {
                return null;
            }
        })();
    }
    return tagCacheWarmUp!;
};

// --- Content Settings (Extension Settings) ---
export const contentSettings = (stateManager: any): any => {
    return keepAlive(
        App.createDUINavigationButton({
            id: "content_settings",
            label: "Extension Settings",
            form: App.createDUIForm({
                sections: async () =>
                    keepAlive([
                        // 1. Home Page Settings
                        App.createDUISection({
                            id: "home_settings",
                            header: "Discover Page Settings",
                            footer: "Adjust the time range for trending media on the Discover page.",
                            isHidden: false,
                            rows: async () =>
                                keepAlive([
                                    App.createDUISelect({
                                        id: "trending_limit",
                                        label: "Trending Timeframe",
                                        options: TRENDING_OPTIONS.map((opt) => opt.id),
                                        value: App.createDUIBinding({
                                            get: async () => await getTrendingLimit(stateManager),
                                            set: async (newValue: string[]) =>
                                                await stateManager.store("trending_limit", newValue),
                                        }),
                                        allowsMultiselect: false,
                                        labelResolver: async (value: string) => {
                                            return (
                                                TRENDING_OPTIONS.find((opt) => opt.id === value)
                                                    ?.label ?? value
                                            );
                                        },
                                    }),
                                ]),
                        }),
                        // 2. Content Filtering
                        App.createDUISection({
                            id: "nsfw_settings",
                            header: "Content Filtering",
                            isHidden: false,
                            rows: async () =>
                                keepAlive([
                                    App.createDUISwitch({
                                        id: "is_nsfw",
                                        label: "Show NSFW Content",
                                        value: App.createDUIBinding({
                                            get: async () => await getIsNsfw(stateManager),
                                            set: async (newValue: boolean) =>
                                                await stateManager.store("is_nsfw", newValue),
                                        }),
                                    }),
                                ]),
                        }),
                    ]),
            }),
        })
    );
};

// --- Chapter Settings (restored from v1.4.2) ---
export const chapterSettings = (stateManager: any): any => {
    return keepAlive(
        App.createDUINavigationButton({
            id: "chapter_settings",
            label: "Chapter Settings",
            form: App.createDUIForm({
                sections: async () =>
                    keepAlive([
                        App.createDUISection({
                            id: "contentchapter",
                            header: "Chapter Display",
                            isHidden: false,
                            rows: async () =>
                                keepAlive([
                                    App.createDUISwitch({
                                        id: "show_volume_number",
                                        label: "Show Chapter Volume",
                                        value: App.createDUIBinding({
                                            get: async () => await getShowVolume(stateManager),
                                            set: async (newValue: boolean) =>
                                                await stateManager.store("show_volume_number", newValue),
                                        }),
                                    }),
                                    App.createDUISwitch({
                                        id: "show_title",
                                        label: "Show Chapter Title",
                                        value: App.createDUIBinding({
                                            get: async () => await getShowTitle(stateManager),
                                            set: async (newValue: boolean) =>
                                                await stateManager.store("show_title", newValue),
                                        }),
                                    }),
                                    App.createDUISwitch({
                                        id: "show_uploader",
                                        label: "Show Uploader",
                                        value: App.createDUIBinding({
                                            get: async () => await getShowUploader(stateManager),
                                            set: async (newValue: boolean) =>
                                                await stateManager.store("show_uploader", newValue),
                                        }),
                                    }),
                                ]),
                        }),
                        App.createDUISection({
                            id: "chapter_filtering",
                            header: "Chapter Filtering",
                            isHidden: false,
                            rows: async () =>
                                keepAlive([
                                    App.createDUISwitch({
                                        id: "remove_duplicates",
                                        label: "Remove Duplicate Chapters",
                                        value: App.createDUIBinding({
                                            get: async () => await getRemoveDuplicates(stateManager),
                                            set: async (newValue: boolean) =>
                                                await stateManager.store("remove_duplicates", newValue),
                                        }),
                                    }),
                                    App.createDUISwitch({
                                        id: "one_version_only",
                                        label: "Always Only Show 1 Source",
                                        value: App.createDUIBinding({
                                            get: async () => await getOneVersionOnly(stateManager),
                                            set: async (newValue: boolean) =>
                                                await stateManager.store("one_version_only", newValue),
                                        }),
                                    }),
                                ]),
                        }),
                    ]),
            }),
        })
    );
};

// --- Group Settings (Scanlation Group Settings) ---
export const groupSettings = (stateManager: any): any => {
    return keepAlive(
        App.createDUINavigationButton({
            id: "group_settings",
            label: "Scanlation Group Settings",
            form: App.createDUIForm({
                sections: async () => {
                    await warmUpGroupSettings(stateManager);
                    return keepAlive([
                        App.createDUISection({
                            id: "filtering_settings",
                            header: "Filtering Settings",
                            footer: "By default, listed groups are excluded from chapter lists (blacklist mode). Turn off Strict Matching to catch partial names.",
                            isHidden: false,
                            rows: async () =>
                                keepAlive([
                                    App.createDUISwitch({
                                        id: "toggle_uploaders_filtering",
                                        label: "Enable Group Filtering",
                                        value: App.createDUIBinding({
                                            get: async () =>
                                                await getUploadersFiltering(stateManager),
                                            set: async (newValue: boolean) =>
                                                await stateManager.store(
                                                    "uploaders_toggled",
                                                    newValue
                                                ),
                                        }),
                                    }),
                                    App.createDUISwitch({
                                        id: "uploaders_switch",
                                        label: "Enable Whitelist Mode",
                                        value: App.createDUIBinding({
                                            get: async () =>
                                                await getUploadersWhitelisted(stateManager),
                                            set: async (newValue: boolean) =>
                                                await stateManager.store(
                                                    "uploaders_whitelisted",
                                                    newValue
                                                ),
                                        }),
                                    }),
                                    App.createDUISwitch({
                                        id: "strict_name_matching",
                                        label: "Strict Group Name Matching",
                                        value: App.createDUIBinding({
                                            get: async () =>
                                                await getStrictNameMatching(stateManager),
                                            set: async (newValue: boolean) =>
                                                await stateManager.store(
                                                    "strict_name_matching",
                                                    newValue
                                                ),
                                        }),
                                    }),
                                ]),
                        }),
                        App.createDUISection({
                            id: "manage_groups",
                            header: "Manage Groups",
                            isHidden: false,
                            rows: async () => {
                                const uploaders = await getUploaders(stateManager);
                                return keepAlive([
                                    App.createDUISelect({
                                        id: "uploaders_list",
                                        label: "Currently Saved Groups",
                                        options: uploaders,
                                        value: App.createDUIBinding({
                                            get: async () =>
                                                await getSelectedUploaders(stateManager),
                                            set: async (newValue: string[]) =>
                                                await stateManager.store(
                                                    "uploaders_selected",
                                                    newValue
                                                ),
                                        }),
                                        labelResolver: async (value: string) => value,
                                        allowsMultiselect: true,
                                    }),
                                    App.createDUIInputField({
                                        id: "uploader_input",
                                        label: "Group Name",
                                        value: App.createDUIBinding({
                                            get: async () =>
                                                await getUploaderInput(stateManager),
                                            set: async (newValue: string) =>
                                                await stateManager.store(
                                                    "uploader_input",
                                                    newValue
                                                ),
                                        }),
                                    }),
                                    App.createDUIButton({
                                        id: "add_uploader",
                                        label: "Add Group",
                                        onTap: async () => {
                                            const targetUploader =
                                                await getUploaderInput(stateManager);
                                            if (
                                                !targetUploader ||
                                                targetUploader.trim() === ""
                                            ) {
                                                throw new Error(
                                                    "Group name cannot be empty!"
                                                );
                                            }
                                            const uploadersList =
                                                await getUploaders(stateManager);
                                            if (uploadersList.includes(targetUploader)) {
                                                throw new Error(
                                                    `Group "${targetUploader}" is already in the list!`
                                                );
                                            }
                                            uploadersList.push(targetUploader);
                                            await stateManager.store(
                                                "uploaders",
                                                uploadersList
                                            );
                                            await stateManager.store("uploader_input", "");
                                        },
                                    }),
                                    App.createDUIButton({
                                        id: "remove_uploader",
                                        label: "Remove Group",
                                        onTap: async () => {
                                            const targetUploader =
                                                await getUploaderInput(stateManager);
                                            if (
                                                !targetUploader ||
                                                targetUploader.trim() === ""
                                            ) {
                                                throw new Error(
                                                    "Group name cannot be empty!"
                                                );
                                            }
                                            const uploadersList =
                                                await getUploaders(stateManager);
                                            const index =
                                                uploadersList.indexOf(targetUploader);
                                            if (index !== -1) {
                                                uploadersList.splice(index, 1);
                                                await stateManager.store(
                                                    "uploaders",
                                                    uploadersList
                                                );
                                                const selectedList =
                                                    await getSelectedUploaders(stateManager);
                                                const newSelected = selectedList.filter(
                                                    (s: string) => s !== targetUploader
                                                );
                                                await stateManager.store(
                                                    "uploaders_selected",
                                                    newSelected
                                                );
                                            } else {
                                                throw new Error(
                                                    `Group "${targetUploader}" is not in the list!`
                                                );
                                            }
                                            await stateManager.store("uploader_input", "");
                                        },
                                    }),
                                    // --- Priority Reorder (restored from v1.4.2) ---
                                    App.createDUISelect({
                                        id: "uploaders_move_select",
                                        label: "Select Group to Reorder",
                                        options: uploaders,
                                        value: App.createDUIBinding({
                                            get: async () =>
                                                (await stateManager.retrieve("uploaders_move_selected")) ?? [],
                                            set: async (newValue: string[]) =>
                                                await stateManager.store("uploaders_move_selected", newValue),
                                        }),
                                        allowsMultiselect: false,
                                        labelResolver: async (val: string) => {
                                            const list = await getUploaders(stateManager);
                                            const idx = list.indexOf(val);
                                            return idx >= 0 ? `#${idx + 1} - ${val}` : val;
                                        },
                                    }),
                                    App.createDUIButton({
                                        id: "move_up",
                                        label: "▲ Move Up (Higher Priority)",
                                        onTap: async () => {
                                            const sel = (await stateManager.retrieve("uploaders_move_selected")) ?? [];
                                            const item = Array.isArray(sel) ? sel[0] : sel;
                                            if (!item) return;
                                            const list = await getUploaders(stateManager);
                                            const idx = list.indexOf(item);
                                            if (idx <= 0) return;
                                            const tmp = list[idx - 1];
                                            list[idx - 1] = list[idx];
                                            list[idx] = tmp;
                                            await stateManager.store("uploaders", list);
                                        },
                                    }),
                                    App.createDUIButton({
                                        id: "move_down",
                                        label: "▼ Move Down (Lower Priority)",
                                        onTap: async () => {
                                            const sel = (await stateManager.retrieve("uploaders_move_selected")) ?? [];
                                            const item = Array.isArray(sel) ? sel[0] : sel;
                                            if (!item) return;
                                            const list = await getUploaders(stateManager);
                                            const idx = list.indexOf(item);
                                            if (idx < 0 || idx >= list.length - 1) return;
                                            const tmp = list[idx + 1];
                                            list[idx + 1] = list[idx];
                                            list[idx] = tmp;
                                            await stateManager.store("uploaders", list);
                                        },
                                    }),
                                ]);
                            },
                        }),
                    ]);
                },
            }),
        })
    );
};

// --- Tag Filter Settings ---
export const tagFilterSettings = (stateManager: any, requestManager: any): any => {
    return keepAlive(
        App.createDUINavigationButton({
            id: "tag_filter_settings",
            label: "Tag Filter",
            form: App.createDUIForm({
                sections: async () => {
                    const cache = await warmUpTagCache(stateManager, requestManager);
                    if (!cache) {
                        return keepAlive([
                            App.createDUISection({
                                id: "tag_filter_error",
                                header: "Tag Filter",
                                footer: "Failed to load tags. Please close and re-open this menu to retry.",
                                isHidden: false,
                                rows: async () => keepAlive([]),
                            }),
                        ]);
                    }

                    const makeSelect = (categoryId: string, label: string, items: any[]) => {
                        const options = items.map((x: any) => String(x.id));
                        const labelMap = new Map(
                            items.map((x: any) => [String(x.id), x.label])
                        );
                        return keepAlive(
                            App.createDUISelect({
                                id: `tag_filter_select_${categoryId}`,
                                label,
                                options,
                                value: App.createDUIBinding({
                                    get: async () => {
                                        const all = await getTagBlacklist(stateManager);
                                        return all.filter((id: string) =>
                                            options.includes(id)
                                        );
                                    },
                                    set: async (newValue: string[]) => {
                                        const all = await getTagBlacklist(stateManager);
                                        const others = all.filter(
                                            (id: string) => !options.includes(id)
                                        );
                                        await stateManager.store("tag_blacklist", [
                                            ...others,
                                            ...newValue,
                                        ]);
                                    },
                                }),
                                labelResolver: async (value: string) =>
                                    labelMap.get(value) ?? value,
                                allowsMultiselect: true,
                            })
                        );
                    };

                    return keepAlive([
                        App.createDUISection({
                            id: "tag_filter_mode",
                            header: "Tag Filter Settings",
                            footer: "Blacklist (default): hide titles that match any checked item. Whitelist: show only titles that match. AND Mode: require all checked tags to match instead of any.",
                            isHidden: false,
                            rows: async () =>
                                keepAlive([
                                    App.createDUISwitch({
                                        id: "tag_filter_enabled",
                                        label: "Enable Tag Filter",
                                        value: App.createDUIBinding({
                                            get: async () =>
                                                await getTagFilterEnabled(stateManager),
                                            set: async (newValue: boolean) =>
                                                await stateManager.store(
                                                    "tag_filter_enabled",
                                                    newValue
                                                ),
                                        }),
                                    }),
                                    App.createDUISwitch({
                                        id: "tag_whitelist_mode",
                                        label: "Enable Whitelist Mode",
                                        value: App.createDUIBinding({
                                            get: async () =>
                                                await getTagWhitelistMode(stateManager),
                                            set: async (newValue: boolean) =>
                                                await stateManager.store(
                                                    "tag_whitelist_mode",
                                                    newValue
                                                ),
                                        }),
                                    }),
                                    App.createDUISwitch({
                                        id: "tag_and_mode",
                                        label: "AND Mode",
                                        value: App.createDUIBinding({
                                            get: async () =>
                                                await getTagAndMode(stateManager),
                                            set: async (newValue: boolean) =>
                                                await stateManager.store(
                                                    "tag_and_mode",
                                                    newValue
                                                ),
                                        }),
                                    }),
                                    App.createDUILabel({
                                        id: "tag_load_status",
                                        label: "Tag Status",
                                        value: "Loaded",
                                    }),
                                ]),
                        }),
                        App.createDUISection({
                            id: "tag_categories",
                            header: "Tag Categories",
                            footer: "Checked items will be filtered from Discovery and Search results per the mode above.",
                            isHidden: false,
                            rows: async () =>
                                keepAlive([
                                    keepAlive(
                                        App.createDUISelect({
                                            id: "type_filter_select",
                                            label: "Content Type",
                                            options: CONTENT_TYPES.map((x) => x.id),
                                            value: App.createDUIBinding({
                                                get: async () =>
                                                    await getTypeFilter(stateManager),
                                                set: async (newValue: string[]) =>
                                                    await stateManager.store(
                                                        "type_filter",
                                                        newValue
                                                    ),
                                            }),
                                            labelResolver: async (value: string) =>
                                                CONTENT_TYPES.find((x) => x.id === value)
                                                    ?.label ?? value,
                                            allowsMultiselect: true,
                                        })
                                    ),
                                    makeSelect("genre", "Genres", cache.genre),
                                    makeSelect("theme", "Themes", cache.theme),
                                    makeSelect("format", "Formats", cache.format),
                                    makeSelect(
                                        "demographic",
                                        "Demographics",
                                        cache.demographic
                                    ),
                                ]),
                        }),
                    ]);
                },
            }),
        })
    );
};

// --- Reset Settings ---
export const resetSettings = (stateManager: any): any => {
    return keepAlive(
        App.createDUIButton({
            id: "reset",
            label: "Reset All Settings to Default",
            onTap: async () => {
                // New v1.5.1 keys
                await stateManager.store("trending_limit", null);
                await stateManager.store("is_nsfw", null);
                await stateManager.store("uploaders", null);
                await stateManager.store("uploaders_selected", null);
                await stateManager.store("uploaders_whitelisted", null);
                await stateManager.store("uploaders_toggled", null);
                await stateManager.store("uploader_input", null);
                await stateManager.store("strict_name_matching", null);
                await stateManager.store("tag_cache_v1", null);
                await stateManager.store("tag_blacklist", null);
                await stateManager.store("tag_filter_enabled", null);
                await stateManager.store("tag_whitelist_mode", null);
                await stateManager.store("tag_and_mode", null);
                await stateManager.store("type_filter", null);
                // Restored v1.4.2 keys
                await stateManager.store("show_volume_number", null);
                await stateManager.store("show_title", null);
                await stateManager.store("show_uploader", null);
                await stateManager.store("remove_duplicates", null);
                await stateManager.store("one_version_only", null);
                await stateManager.store("uploaders_move_selected", null);
                resetTagCacheWarmUp();
            },
        })
    );
};
