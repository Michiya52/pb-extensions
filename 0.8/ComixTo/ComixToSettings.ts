import {
    createDUIBinding,
    createDUIForm,
    createDUINavigationButton,
    createDUISection,
    createDUISwitch,
    createDUISelect,
    createDUIInputField,
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
                            id: "new_uploader_input",
                            label: "Add Prioritized Uploader (Type & Save)",
                            value: createDUIBinding({
                                get: async () => "",
                                set: async (newValue: any) => {
                                    const p = await stateManager.retrieve("prioritized_uploaders");
                                    const prioritizedRaw = typeof p === 'string' ? p : "";
                                    if (newValue && newValue.trim().length > 0) {
                                        await stateManager.store("prioritized_uploaders", prioritizedRaw ? (prioritizedRaw + "," + newValue.trim()) : newValue.trim());
                                    }
                                }
                            })
                        }),
                        createDUIButton({
                            id: "clear_prioritized",
                            label: "Clear All Prioritized Uploaders",
                            onTap: async () => await stateManager.store("prioritized_uploaders", "")
                        }),
                        createDUIInputField({
                            id: "prioritized_uploaders",
                            label: "Current Prioritized Uploaders",
                            value: createDUIBinding({
                                get: async () => {
                                    const p = await stateManager.retrieve("prioritized_uploaders");
                                    return typeof p === 'string' ? p : "";
                                },
                                set: async (newValue: any) => await stateManager.store("prioritized_uploaders", newValue)
                            })
                        }),
                        createDUIInputField({
                            id: "new_blacklist_input",
                            label: "Add Blacklisted Uploader (Type & Save)",
                            value: createDUIBinding({
                                get: async () => "",
                                set: async (newValue: any) => {
                                    const b = await stateManager.retrieve("blacklisted_uploaders");
                                    const blacklistedRaw = typeof b === 'string' ? b : "";
                                    if (newValue && newValue.trim().length > 0) {
                                        await stateManager.store("blacklisted_uploaders", blacklistedRaw ? (blacklistedRaw + "," + newValue.trim()) : newValue.trim());
                                    }
                                }
                            })
                        }),
                        createDUIButton({
                            id: "clear_blacklisted",
                            label: "Clear All Blacklisted Uploaders",
                            onTap: async () => await stateManager.store("blacklisted_uploaders", "")
                        }),
                        createDUIInputField({
                            id: "blacklisted_uploaders",
                            label: "Current Blacklisted Uploaders",
                            value: createDUIBinding({
                                get: async () => {
                                    const b = await stateManager.retrieve("blacklisted_uploaders");
                                    return typeof b === 'string' ? b : "";
                                },
                                set: async (newValue: any) => await stateManager.store("blacklisted_uploaders", newValue)
                            })
                        }),
                        createDUIInputField({
                            id: "new_language_input",
                            label: "Add Language Filter (e.g. en) (Type & Save)",
                            value: createDUIBinding({
                                get: async () => "",
                                set: async (newValue: any) => {
                                    const l = await stateManager.retrieve("language_filters");
                                    const langRaw = typeof l === 'string' ? l : "";
                                    if (newValue && newValue.trim().length > 0) {
                                        await stateManager.store("language_filters", langRaw ? (langRaw + "," + newValue.trim()) : newValue.trim());
                                    }
                                }
                            })
                        }),
                        createDUIButton({
                            id: "clear_languages",
                            label: "Clear All Language Filters",
                            onTap: async () => await stateManager.store("language_filters", "")
                        }),
                        createDUIInputField({
                            id: "language_filters",
                            label: "Current Language Filters",
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
