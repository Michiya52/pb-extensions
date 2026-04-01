import {
    createDUIBinding,
    createDUIForm,
    createDUINavigationButton,
    createDUISection,
    createDUISwitch,
    createDUIInputField,
    createDUIButton,
    createDUISelect,
    createDUILabel,
    createDUIMultilineLabel,
    DUINavigationButton,
    SourceStateManager,
    DUISection,
    DUIButton
} from 'paperback-extensions-common';

// --- Stability Utilities ---
const UI_KEEP_ALIVE_MAX = 50;
const uiKeepAlive: any[] = [];
const keepAlive = <T>(obj: T): T => {
    uiKeepAlive.push(obj);
    if (uiKeepAlive.length > UI_KEEP_ALIVE_MAX) {
        uiKeepAlive.splice(0, uiKeepAlive.length - UI_KEEP_ALIVE_MAX);
    }
    return obj;
};

export const DEFAULT_SETTINGS = {
    show_volume_number: false,
    show_title: false,
    show_uploader: false,
    is_nsfw: true,
    trending_limit: ['30'] as string[],
    remove_duplicates: true,
    one_version_only: false,
    uploaders: [] as string[],
    uploaders_selected: [] as string[],
    uploader_input: '',
    uploaders_enabled: false,
    uploaders_whitelist: false,
    uploaders_strict: false,
    uploaders_remove_selected: [] as string[],
    uploaders_move_selected: [] as string[]
};

export const getSetting = async <K extends keyof typeof DEFAULT_SETTINGS>(
    stateManager: SourceStateManager,
    key: K
): Promise<typeof DEFAULT_SETTINGS[K]> => {
    try {
        const val = await stateManager.retrieve(key);
        if (val === null || val === undefined) return DEFAULT_SETTINGS[key];
        if (Array.isArray(val)) return [...val] as typeof DEFAULT_SETTINGS[K];
        return val as typeof DEFAULT_SETTINGS[K];
    } catch (e) {
        return DEFAULT_SETTINGS[key];
    }
};

export const getFilters = async (stateManager: SourceStateManager) => {
    return {
        showVolume: await getSetting(stateManager, 'show_volume_number'),
        showTitle: await getSetting(stateManager, 'show_title'),
        showUploader: await getSetting(stateManager, 'show_uploader'),
        uploaders: {
            enabled: await getSetting(stateManager, 'uploaders_enabled'),
            whitelist: await getSetting(stateManager, 'uploaders_whitelist'),
            strict: await getSetting(stateManager, 'uploaders_strict'),
            list: await getSetting(stateManager, 'uploaders_selected')
        },
        oneVersionOnly: await getSetting(stateManager, 'one_version_only'),
        removeDuplicates: await getSetting(stateManager, 'remove_duplicates')
    };
};

export const chapterSettings = (stateManager: SourceStateManager): DUINavigationButton => {
    return keepAlive(createDUINavigationButton({
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
                                get: async () => await getSetting(stateManager, 'show_volume_number'),
                                set: async (newValue: boolean) => await stateManager.store('show_volume_number', newValue)
                            })
                        }),
                        createDUISwitch({
                            id: 'show_title',
                            label: 'Show Chapter Title',
                            value: createDUIBinding({
                                get: async () => await getSetting(stateManager, 'show_title'),
                                set: async (newValue: boolean) => await stateManager.store('show_title', newValue)
                            })
                        }),
                        createDUISwitch({
                            id: 'show_uploader',
                            label: 'Show Uploader',
                            value: createDUIBinding({
                                get: async () => await getSetting(stateManager, 'show_uploader'),
                                set: async (newValue: boolean) => await stateManager.store('show_uploader', newValue)
                            })
                        })
                    ]
                }),
                createDUISection({
                    id: 'chapter_filtering',
                    header: 'Chapter Filtering',
                    isHidden: false,
                    rows: async () => [
                        createDUISwitch({
                            id: 'remove_duplicates',
                            label: 'Remove Duplicate Chapters',
                            value: createDUIBinding({
                                get: async () => await getSetting(stateManager, 'remove_duplicates'),
                                set: async (newValue: boolean) => await stateManager.store('remove_duplicates', newValue)
                            })
                        }),
                        createDUISwitch({
                            id: 'one_version_only',
                            label: 'Always Only Show 1 Source',
                            value: createDUIBinding({
                                get: async () => await getSetting(stateManager, 'one_version_only'),
                                set: async (newValue: boolean) => await stateManager.store('one_version_only', newValue)
                            })
                        })
                    ]
                })
            ]
        })
    }));
};

const createDynamicListSection = (
    stateManager: SourceStateManager,
    id: string,
    header: string,
    listKey: keyof typeof DEFAULT_SETTINGS,
    selectedKey: keyof typeof DEFAULT_SETTINGS,
    inputKey: keyof typeof DEFAULT_SETTINGS,
    filterToggleKey: keyof typeof DEFAULT_SETTINGS,
    whitelistToggleKey: keyof typeof DEFAULT_SETTINGS,
    strictToggleKey: keyof typeof DEFAULT_SETTINGS
): DUISection => {
    return createDUISection({
        id: id,
        header: header,
        isHidden: false,
        rows: async () => {
            const masterList = await getSetting(stateManager, listKey) as string[];
            const safeList = Array.isArray(masterList) ? [...masterList] : [];
            const rows = [
                // --- Filter Mode Toggles ---
                createDUISwitch({
                    id: `${id}_filter_toggle`,
                    label: `Enable ${header} Filtering`,
                    value: createDUIBinding({
                        get: async () => await getSetting(stateManager, filterToggleKey) as boolean,
                        set: async (newValue: boolean) => await stateManager.store(filterToggleKey, newValue)
                    })
                }),
                createDUISwitch({
                    id: `${id}_whitelist_toggle`,
                    label: 'Enable Whitelist Mode',
                    value: createDUIBinding({
                        get: async () => await getSetting(stateManager, whitelistToggleKey) as boolean,
                        set: async (newValue: boolean) => await stateManager.store(whitelistToggleKey, newValue)
                    })
                }),
                createDUISwitch({
                    id: `${id}_strict_toggle`,
                    label: 'Strict Matching',
                    value: createDUIBinding({
                        get: async () => await getSetting(stateManager, strictToggleKey) as boolean,
                        set: async (newValue: boolean) => await stateManager.store(strictToggleKey, newValue)
                    })
                }),
                // --- Active Uploaders ---
                createDUISelect({
                    id: `${id}_select`,
                    label: `Active ${header}`,
                    options: safeList,
                    value: createDUIBinding({
                        get: async () => await getSetting(stateManager, selectedKey) as string[],
                        set: async (newValue: string[]) => await stateManager.store(selectedKey, newValue)
                    }),
                    allowsMultiselect: true,
                    labelResolver: async (val: string) => val
                }),
                // --- Priority Order Display ---
                createDUILabel({
                    id: `${id}_priority_label`,
                    label: 'Priority Order (1 = highest)',
                    value: createDUIBinding({
                        get: async () => '',
                        set: async () => { }
                    })
                }),
                createDUIMultilineLabel({
                    id: `${id}_priority_display`,
                    label: 'Current Priority',
                    value: createDUIBinding({
                        get: async () => {
                            const list = await getSetting(stateManager, listKey) as string[];
                            const safe = Array.isArray(list) ? list : [];
                            return safe.length > 0
                                ? safe.map((name: string, i: number) => `${i + 1}. ${name}`).join('\n')
                                : 'No uploaders added yet';
                        },
                        set: async () => { }
                    })
                }),
                // --- Add Uploaders ---
                createDUIInputField({
                    id: `${id}_input`,
                    label: 'Add Uploaders (Comma-separated)',
                    value: createDUIBinding({
                        get: async () => await getSetting(stateManager, inputKey) as string,
                        set: async (newValue: string) => await stateManager.store(inputKey, newValue)
                    })
                }),
                createDUIButton({
                    id: `${id}_add`,
                    label: 'Add to List',
                    onTap: async () => {
                        try {
                            const val = await getSetting(stateManager, inputKey) as string;
                            if (!val || String(val).trim() === '') return;
                            const newItems = String(val).split(',').map(s => s.trim()).filter(s => s !== '');
                            if (newItems.length === 0) return;
                            const currentList = await getSetting(stateManager, listKey) as string[];
                            const currentSelected = await getSetting(stateManager, selectedKey) as string[];
                            const list = Array.isArray(currentList) ? [...currentList] : [];
                            const selected = Array.isArray(currentSelected) ? [...currentSelected] : [];
                            let changed = false;
                            for (const item of newItems) {
                                if (!list.includes(item)) {
                                    list.push(item);
                                    changed = true;
                                }
                                if (!selected.includes(item)) {
                                    selected.push(item);
                                    changed = true;
                                }
                            }
                            if (changed) {
                                await stateManager.store(listKey, list);
                                await stateManager.store(selectedKey, selected);
                            }
                            await stateManager.store(inputKey, '');
                        } catch (e) {
                            // Silently handle errors to prevent crash
                        }
                    }
                }),
                // --- Remove Uploaders (Pick to Remove) ---
                createDUISelect({
                    id: `${id}_remove_select`,
                    label: 'Select Uploaders to Remove',
                    options: safeList,
                    value: createDUIBinding({
                        get: async () => await getSetting(stateManager, 'uploaders_remove_selected') as string[],
                        set: async (newValue: string[]) => await stateManager.store('uploaders_remove_selected', newValue)
                    }),
                    allowsMultiselect: true,
                    labelResolver: async (val: string) => val
                }),
                createDUIButton({
                    id: `${id}_remove`,
                    label: 'Remove Selected',
                    onTap: async () => {
                        try {
                            const removeItems = await getSetting(stateManager, 'uploaders_remove_selected') as string[];
                            if (!Array.isArray(removeItems) || removeItems.length === 0) return;
                            const currentList = await getSetting(stateManager, listKey) as string[];
                            const currentSelected = await getSetting(stateManager, selectedKey) as string[];
                            const list = (Array.isArray(currentList) ? [...currentList] : []).filter(item => !removeItems.includes(item));
                            const selected = (Array.isArray(currentSelected) ? [...currentSelected] : []).filter(item => !removeItems.includes(item));
                            await stateManager.store(listKey, list);
                            await stateManager.store(selectedKey, selected);
                            await stateManager.store('uploaders_remove_selected', []);
                        } catch (e) {
                            // Silently handle errors to prevent crash
                        }
                    }
                }),
                // --- Reorder Priority ---
                createDUISelect({
                    id: `${id}_move_select`,
                    label: 'Select Uploader to Reorder',
                    options: safeList,
                    value: createDUIBinding({
                        get: async () => await getSetting(stateManager, 'uploaders_move_selected') as string[],
                        set: async (newValue: string[]) => await stateManager.store('uploaders_move_selected', newValue)
                    }),
                    allowsMultiselect: false,
                    labelResolver: async (val: string) => {
                        const list = await getSetting(stateManager, listKey) as string[];
                        const safe = Array.isArray(list) ? list : [];
                        const idx = safe.indexOf(val);
                        return idx >= 0 ? `#${idx + 1} - ${val}` : val;
                    }
                }),
                createDUIButton({
                    id: `${id}_move_up`,
                    label: '▲ Move Up (Higher Priority)',
                    onTap: async () => {
                        try {
                            const moveSelection = await getSetting(stateManager, 'uploaders_move_selected') as string[];
                            const itemToMove = Array.isArray(moveSelection) ? moveSelection[0] : moveSelection;
                            if (!itemToMove) return;
                            const currentList = await getSetting(stateManager, listKey) as string[];
                            const list = Array.isArray(currentList) ? [...currentList] : [];
                            const idx = list.indexOf(itemToMove as string);
                            if (idx <= 0) return;
                            const temp = list[idx - 1]!;
                            list[idx - 1] = list[idx]!;
                            list[idx] = temp;
                            await stateManager.store(listKey, list);
                        } catch (e) {
                            // Silently handle errors to prevent crash
                        }
                    }
                }),
                createDUIButton({
                    id: `${id}_move_down`,
                    label: '▼ Move Down (Lower Priority)',
                    onTap: async () => {
                        try {
                            const moveSelection = await getSetting(stateManager, 'uploaders_move_selected') as string[];
                            const itemToMove = Array.isArray(moveSelection) ? moveSelection[0] : moveSelection;
                            if (!itemToMove) return;
                            const currentList = await getSetting(stateManager, listKey) as string[];
                            const list = Array.isArray(currentList) ? [...currentList] : [];
                            const idx = list.indexOf(itemToMove as string);
                            if (idx < 0 || idx >= list.length - 1) return;
                            const temp = list[idx + 1]!;
                            list[idx + 1] = list[idx]!;
                            list[idx] = temp;
                            await stateManager.store(listKey, list);
                        } catch (e) {
                            // Silently handle errors to prevent crash
                        }
                    }
                })
            ];
            return rows;
        }
    });
};

export const contentSettings = (stateManager: SourceStateManager): DUINavigationButton => {
    return keepAlive(createDUINavigationButton({
        id: 'content_settings',
        label: 'Extension Settings',
        form: createDUIForm({
            sections: async () => {
                return [
                    createDynamicListSection(stateManager, 'uploaders', 'Uploaders', 'uploaders', 'uploaders_selected', 'uploader_input', 'uploaders_enabled', 'uploaders_whitelist', 'uploaders_strict'),
                    createDUISection({
                        id: 'nsfw_settings',
                        header: 'Content Filtering',
                        rows: async () => [
                            createDUISwitch({
                                id: 'is_nsfw',
                                label: 'Show NSFW Content',
                                value: createDUIBinding({
                                    get: async () => await getSetting(stateManager, 'is_nsfw'),
                                    set: async (newValue: boolean) => await stateManager.store('is_nsfw', newValue)
                                })
                            })
                        ]
                    }),
                    createDUISection({
                        id: 'home_settings',
                        header: 'Discover Page Settings',
                        rows: async () => [
                            createDUISelect({
                                id: 'trending_limit',
                                label: 'Trending Timeframe',
                                options: ['1', '7', '30', '90', '180', '365'],
                                value: createDUIBinding({
                                    get: async () => await getSetting(stateManager, 'trending_limit'),
                                    set: async (newValue: string[]) => await stateManager.store('trending_limit', newValue)
                                }),
                                allowsMultiselect: false,
                                labelResolver: async (value: string) => {
                                    const labels: any = { '1': '1 day', '7': '7 days', '30': '1 month', '90': '3 months', '180': '6 months', '365': '1 year' };
                                    return labels[value] || value;
                                }
                            })
                        ]
                    })
                ];
            }
        })
    }));
};

export const resetSettings = (stateManager: SourceStateManager): DUIButton => {
    return createDUIButton({
        id: 'reset',
        label: 'Reset All Settings',
        onTap: async () => {
            try {
                for (const key of Object.keys(DEFAULT_SETTINGS)) {
                    await stateManager.store(key, (DEFAULT_SETTINGS as any)[key]);
                }
            } catch (e) {
                // Silently handle reset errors
            }
        }
    });
};
