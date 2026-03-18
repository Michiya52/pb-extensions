import {
    createDUIBinding,
    createDUIForm,
    createDUINavigationButton,
    createDUISection,
    createDUISwitch,
    createDUIInputField,
    createDUISelect,
    createDUIButton,
    DUINavigationButton,
    SourceStateManager
} from 'paperback-extensions-common';

export const getShowChapterVolume = async (stateManager: SourceStateManager): Promise<boolean> => {
    return (await stateManager.retrieve('show_volume_number') as boolean) ?? false;
}

export const getShowChapterTitle = async (stateManager: SourceStateManager): Promise<boolean> => {
    return (await stateManager.retrieve('show_title') as boolean) ?? false;
}

export const getShowUploader = async (stateManager: SourceStateManager): Promise<boolean> => {
    return (await stateManager.retrieve('show_uploader') as boolean) ?? false;
}

export const chapterSettings = (stateManager: SourceStateManager): DUINavigationButton => {
    return createDUINavigationButton({
        id: 'chapter_settings',
        label: 'Chapter Settings',
        form: createDUIForm({
            sections: async () => [
                createDUISection({
                    id: 'contentchapter',
                    header: 'Chapter Display',
                    isHidden: false,
                    rows: async () => {
                        const prioritizedRaw = await stateManager.retrieve("prioritized_uploaders") ?? "";
                        const arrP = prioritizedRaw.split(',').map((s: string) => s.trim()).filter((s: string) => s);
                        
                        const blacklistedRaw = await stateManager.retrieve("blacklisted_uploaders") ?? "";
                        const arrB = blacklistedRaw.split(',').map((s: string) => s.trim()).filter((s: string) => s);
                        
                        const langRaw = await stateManager.retrieve("language_filters") ?? "";
                        const arrL = langRaw.split(',').map((s: string) => s.trim()).filter((s: string) => s);

                        return [
                            createDUISwitch({
                                id: 'show_volume_number',
                                label: 'Show Chapter Volume',
                                value: createDUIBinding({
                                    get: async () => await getShowChapterVolume(stateManager),
                                    set: async (newValue: any) => await stateManager.store('show_volume_number', newValue)
                                })
                            }),
                            createDUISwitch({
                                id: 'show_title',
                                label: 'Show Chapter Title',
                                value: createDUIBinding({
                                    get: async () => await getShowChapterTitle(stateManager),
                                    set: async (newValue: any) => await stateManager.store('show_title', newValue)
                                })
                            }),
                            createDUISwitch({
                                id: 'show_uploader',
                                label: 'Show Uploader',
                                value: createDUIBinding({
                                    get: async () => await getShowUploader(stateManager),
                                    set: async (newValue: any) => await stateManager.store('show_uploader', newValue)
                                })
                            }),
                            createDUISwitch({
                                id: "remove_duplicates",
                                label: "Remove Duplicate Chapters",
                                value: createDUIBinding({
                                    get: async () => await stateManager.retrieve("remove_duplicates") ?? true,
                                    set: async (newValue: any) => await stateManager.store("remove_duplicates", newValue)
                                })
                            }),
                            createDUISelect({
                                id: "source_match_mode",
                                label: "Source Match Mode",
                                options: ["strict", "closest"],
                                value: createDUIBinding({
                                    get: async () => await stateManager.retrieve("source_match_mode") ?? "strict",
                                    set: async (newValue: any) => await stateManager.store("source_match_mode", newValue)
                                }),
                                displayLabel: (option: string) => option === "strict" ? "Strict (Fallback to Closest)" : "Closest Match"
                            }),
                            createDUIInputField({
                                id: "prioritized_uploaders_label",
                                label: "Prioritized: " + (arrP.length > 0 ? arrP.join(', ') : "None"),
                                value: createDUIBinding({
                                    get: async () => "",
                                    set: async (newValue: any) => {
                                        if (newValue && newValue.trim().length > 0) {
                                            await stateManager.store("prioritized_uploaders", prioritizedRaw ? (prioritizedRaw + "," + newValue.trim()) : newValue.trim());
                                        }
                                    }
                                })
                            }),
                            createDUIButton({
                                id: "clear_prioritized",
                                label: "Clear Prioritized",
                                onTap: async () => await stateManager.store("prioritized_uploaders", "")
                            }),
                            createDUIInputField({
                                id: "blacklisted_uploaders_label",
                                label: "Blacklisted: " + (arrB.length > 0 ? arrB.join(', ') : "None"),
                                value: createDUIBinding({
                                    get: async () => "",
                                    set: async (newValue: any) => {
                                        if (newValue && newValue.trim().length > 0) {
                                            await stateManager.store("blacklisted_uploaders", blacklistedRaw ? (blacklistedRaw + "," + newValue.trim()) : newValue.trim());
                                        }
                                    }
                                })
                            }),
                            createDUIButton({
                                id: "clear_blacklisted",
                                label: "Clear Blacklisted",
                                onTap: async () => await stateManager.store("blacklisted_uploaders", "")
                            }),
                            createDUIInputField({
                                id: "language_filters_label",
                                label: "Language/Region (e.g. en): " + (arrL.length > 0 ? arrL.join(', ') : "None"),
                                value: createDUIBinding({
                                    get: async () => "",
                                    set: async (newValue: any) => {
                                        if (newValue && newValue.trim().length > 0) {
                                            await stateManager.store("language_filters", langRaw ? (langRaw + "," + newValue.trim()) : newValue.trim());
                                        }
                                    }
                                })
                            }),
                            createDUIButton({
                                id: "clear_languages",
                                label: "Clear Language/Region Filters",
                                onTap: async () => await stateManager.store("language_filters", "")
                            })
                        ];
                    }
                })
            ]
        })
    });
}
