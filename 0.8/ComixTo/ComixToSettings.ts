import {
    createDUIBinding,
    createDUIForm,
    createDUINavigationButton,
    createDUISection,
    createDUISwitch,
    createDUIInputField,
    createDUIButton,
    createDUISelect,
    DUINavigationButton,
    SourceStateManager,
    DUISection,
    DUIButton
} from 'paperback-extensions-common';

// --- Stability Utilities ---
const uiKeepAlive: any[] = [];
const keepAlive = <T>(obj: T): T => {
    uiKeepAlive.push(obj);
    return obj;
};

let settingsWarmUp: Promise<void> | null = null;
const warmUpSettings = (stateManager: SourceStateManager) => {
    if (!settingsWarmUp) {
        settingsWarmUp = (async () => {
            await stateManager.retrieve('uploaders');
            await stateManager.retrieve('uploader_input');
        })();
    }
    return settingsWarmUp;
};

// --- Getters ---
export const getShowChapterVolume = async (stateManager: SourceStateManager): Promise<boolean> => {
    return (await stateManager.retrieve('show_volume_number') as boolean) ?? false;
}

export const getShowChapterTitle = async (stateManager: SourceStateManager): Promise<boolean> => {
    return (await stateManager.retrieve('show_title') as boolean) ?? false;
}

export const getShowUploader = async (stateManager: SourceStateManager): Promise<boolean> => {
    return (await stateManager.retrieve('show_uploader') as boolean) ?? false;
}

const getList = async (stateManager: SourceStateManager, key: string): Promise<string[]> => {
    return (await stateManager.retrieve(key) as string[]) ?? [];
}

const getSelected = async (stateManager: SourceStateManager, key: string): Promise<string[]> => {
    return (await stateManager.retrieve(key) as string[]) ?? [];
}

const getInput = async (stateManager: SourceStateManager, key: string): Promise<string> => {
    return (await stateManager.retrieve(key) as string) ?? '';
}

// --- Sections ---

export const chapterSettings = (stateManager: SourceStateManager): DUINavigationButton => {
    return keepAlive(createDUINavigationButton({
        id: 'chapter_settings',
        label: 'Chapter Display Settings',
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
                        })
                    ]
                })
            ]
        })
    }));
}

const createDynamicListSection = (
    stateManager: SourceStateManager,
    id: string,
    header: string,
    listKey: string,
    selectedKey: string,
    inputKey: string,
    filterToggleKey: string,
    whitelistToggleKey: string,
    strictToggleKey: string
): DUISection => {
    return createDUISection({
        id: id,
        header: header,
        isHidden: false,
        rows: async () => {
            const masterList = await getList(stateManager, listKey);
            return [
                createDUISwitch({
                    id: `${id}_filter_toggle`,
                    label: `Enable ${header} Filtering`,
                    value: createDUIBinding({
                        get: async () => await stateManager.retrieve(filterToggleKey) ?? false,
                        set: async (newValue: boolean) => await stateManager.store(filterToggleKey, newValue)
                    })
                }),
                createDUISwitch({
                    id: `${id}_whitelist_toggle`,
                    label: 'Enable Whitelist Mode',
                    value: createDUIBinding({
                        get: async () => await stateManager.retrieve(whitelistToggleKey) ?? false,
                        set: async (newValue: boolean) => await stateManager.store(whitelistToggleKey, newValue)
                    })
                }),
                createDUISwitch({
                    id: `${id}_strict_toggle`,
                    label: 'Strict Matching',
                    value: createDUIBinding({
                        get: async () => await stateManager.retrieve(strictToggleKey) ?? false,
                        set: async (newValue: boolean) => await stateManager.store(strictToggleKey, newValue)
                    })
                }),
                createDUISelect({
                    id: `${id}_select`,
                    label: `Currently Saved ${header}`,
                    options: masterList,
                    value: createDUIBinding({
                        get: async () => await getSelected(stateManager, selectedKey),
                        set: async (newValue: string[]) => await stateManager.store(selectedKey, newValue)
                    }),
                    allowsMultiselect: true,
                    labelResolver: async (val: string) => val
                }),
                createDUIInputField({
                    id: `${id}_input`,
                    label: 'Name',
                    value: createDUIBinding({
                        get: async () => await getInput(stateManager, inputKey),
                        set: async (newValue: string) => await stateManager.store(inputKey, newValue)
                    })
                }),
                createDUIButton({
                    id: `${id}_add`,
                    label: 'Add to List',
                    onTap: async () => {
                        const val = await getInput(stateManager, inputKey);
                        if (!val || val.trim() === '') return;
                        const list = await getList(stateManager, listKey);
                        if (!list.includes(val)) {
                            list.push(val);
                            await stateManager.store(listKey, list);
                            await stateManager.store(inputKey, '');
                        }
                    }
                }),
                createDUIButton({
                    id: `${id}_remove`,
                    label: 'Remove from List',
                    onTap: async () => {
                        const val = await getInput(stateManager, inputKey);
                        if (!val) return;
                        let list = await getList(stateManager, listKey);
                        list = list.filter(item => item !== val);
                        await stateManager.store(listKey, list);
                        let selected = await getSelected(stateManager, selectedKey);
                        selected = selected.filter(item => item !== val);
                        await stateManager.store(selectedKey, selected);
                        await stateManager.store(inputKey, '');
                    }
                })
            ];
        }
    });
};

export const filterSettings = (stateManager: SourceStateManager): DUINavigationButton => {
    return keepAlive(createDUINavigationButton({
        id: 'filter_settings',
        label: 'Advanced Filter & Sorting Settings',
        form: createDUIForm({
            sections: async () => {
                await warmUpSettings(stateManager);
                return [
                    createDUISection({
                        id: 'general_settings',
                        header: 'General Filtering Settings',
                        rows: async () => [
                            createDUISwitch({
                                id: 'one_version_only',
                                label: 'Always Only Show 1 Source',
                                value: createDUIBinding({
                                    get: async () => await stateManager.retrieve('one_version_only') ?? false,
                                    set: async (newValue: boolean) => await stateManager.store('one_version_only', newValue)
                                })
                            })
                        ]
                    }),
                    createDynamicListSection(stateManager, 'uploaders', 'Uploaders', 'uploaders', 'uploaders_selected', 'uploader_input', 'uploaders_enabled', 'uploaders_whitelist', 'uploaders_strict')
                ];
            }
        })
    }));
}

export const resetSettings = (stateManager: SourceStateManager): DUIButton => {
    return createDUIButton({
        id: 'reset',
        label: 'Reset All Settings',
        onTap: async () => {
            await stateManager.store('show_volume_number', null);
            await stateManager.store('show_title', null);
            await stateManager.store('show_uploader', null);
            await stateManager.store('one_version_only', null);
            await stateManager.store('uploaders', null);
            await stateManager.store('uploaders_selected', null);
            await stateManager.store('uploader_input', null);
            await stateManager.store('uploaders_enabled', null);
            await stateManager.store('uploaders_whitelist', null);
            await stateManager.store('uploaders_strict', null);
        }
    });
}
