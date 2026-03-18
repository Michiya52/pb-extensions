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
                    rows: async () => {
                        const rowsUI = [];
                        
                        rowsUI.push(createDUISwitch({
                            id: 'show_volume_number',
                            label: 'Show Chapter Volume',
                            value: createDUIBinding({
                                get: async () => await getShowChapterVolume(stateManager),
                                set: async (newValue: any) => await stateManager.store('show_volume_number', newValue)
                            })
                        }));
                        
                        rowsUI.push(createDUISwitch({
                            id: 'show_title',
                            label: 'Show Chapter Title',
                            value: createDUIBinding({
                                get: async () => await getShowChapterTitle(stateManager),
                                set: async (newValue: any) => await stateManager.store('show_title', newValue)
                            })
                        }));
                        
                        rowsUI.push(createDUISwitch({
                            id: 'show_uploader',
                            label: 'Show Uploader',
                            value: createDUIBinding({
                                get: async () => await getShowUploader(stateManager),
                                set: async (newValue: any) => await stateManager.store('show_uploader', newValue)
                            })
                        }));
                        
                        rowsUI.push(createDUISwitch({
                            id: "remove_duplicates",
                            label: "Remove Duplicate Chapters",
                            value: createDUIBinding({
                                get: async () => await stateManager.retrieve("remove_duplicates") ?? true,
                                set: async (newValue: any) => await stateManager.store("remove_duplicates", newValue)
                            })
                        }));
                        
                        rowsUI.push(createDUISelect({
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
                        }));

                        for (let i = 0; i < 10; i++) {
                            rowsUI.push(createDUIInputField({
                                id: `prioritized_uploader_${i}`,
                                label: `Prioritized Uploader List ${i + 1}`,
                                value: createDUIBinding({
                                    get: async () => {
                                        const p = await stateManager.retrieve("prioritized_uploaders");
                                        const arr = (typeof p === 'string' ? p : "").split(",").map(x=>x.trim()).filter(x=>x);
                                        return arr[i] || "";
                                    },
                                    set: async (newValue: any) => {
                                        const p = await stateManager.retrieve("prioritized_uploaders");
                                        const arr = (typeof p === 'string' ? p : "").split(",").map(x=>x.trim()).filter(x=>x);
                                        arr[i] = newValue ? newValue.trim() : "";
                                        await stateManager.store("prioritized_uploaders", arr.filter(x=>x).join(","));
                                    }
                                })
                            }));
                        }

                        for (let i = 0; i < 10; i++) {
                            rowsUI.push(createDUIInputField({
                                id: `blacklisted_uploader_${i}`,
                                label: `Blacklist Uploader List ${i + 1}`,
                                value: createDUIBinding({
                                    get: async () => {
                                        const p = await stateManager.retrieve("blacklisted_uploaders");
                                        const arr = (typeof p === 'string' ? p : "").split(",").map(x=>x.trim()).filter(x=>x);
                                        return arr[i] || "";
                                    },
                                    set: async (newValue: any) => {
                                        const p = await stateManager.retrieve("blacklisted_uploaders");
                                        const arr = (typeof p === 'string' ? p : "").split(",").map(x=>x.trim()).filter(x=>x);
                                        arr[i] = newValue ? newValue.trim() : "";
                                        await stateManager.store("blacklisted_uploaders", arr.filter(x=>x).join(","));
                                    }
                                })
                            }));
                        }

                        for (let i = 0; i < 5; i++) {
                            rowsUI.push(createDUIInputField({
                                id: `language_filter_${i}`,
                                label: `Language/Region List ${i + 1} (e.g. en)`,
                                value: createDUIBinding({
                                    get: async () => {
                                        const p = await stateManager.retrieve("language_filters");
                                        const arr = (typeof p === 'string' ? p : "").split(",").map(x=>x.trim()).filter(x=>x);
                                        return arr[i] || "";
                                    },
                                    set: async (newValue: any) => {
                                        const p = await stateManager.retrieve("language_filters");
                                        const arr = (typeof p === 'string' ? p : "").split(",").map(x=>x.trim()).filter(x=>x);
                                        arr[i] = newValue ? newValue.trim() : "";
                                        await stateManager.store("language_filters", arr.filter(x=>x).join(","));
                                    }
                                })
                            }));
                        }

                        return rowsUI;
                    }
                })
            ]
        })
    });
}
