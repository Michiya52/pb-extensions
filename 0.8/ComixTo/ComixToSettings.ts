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
                    rows: async () => [
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
                                get: async () => {
                                    const mode = await stateManager.retrieve("source_match_mode");
                                    return (mode === "strict" || mode === "closest") ? mode : "strict";
                                },
                                set: async (newValue: any) => await stateManager.store("source_match_mode", newValue)
                            }),
                            displayLabel: (option: string) => option === "strict" ? "Strict (Fallback to Closest)" : "Closest Match"
                        }),
                        createDUIInputField({
                            id: "prioritized_uploaders",
                            label: "Prioritized Uploaders (Comma separated)",
                            value: createDUIBinding({
                                get: async () => {
                                    const p = await stateManager.retrieve("prioritized_uploaders");
                                    return typeof p === 'string' ? p : "";
                                },
                                set: async (newValue: any) => await stateManager.store("prioritized_uploaders", newValue)
                            })
                        }),
                        createDUIInputField({
                            id: "blacklisted_uploaders",
                            label: "Blacklisted Uploaders (Comma separated)",
                            value: createDUIBinding({
                                get: async () => {
                                    const b = await stateManager.retrieve("blacklisted_uploaders");
                                    return typeof b === 'string' ? b : "";
                                },
                                set: async (newValue: any) => await stateManager.store("blacklisted_uploaders", newValue)
                            })
                        }),
                        createDUIInputField({
                            id: "language_filters",
                            label: "Language/Region Filters (Comma separated, e.g. en, es)",
                            value: createDUIBinding({
                                get: async () => {
                                    const l = await stateManager.retrieve("language_filters");
                                    return typeof l === 'string' ? l : "";
                                },
                                set: async (newValue: any) => await stateManager.store("language_filters", newValue)
                            })
                        })
                    ]
                })
            ]
        })
    });
}
