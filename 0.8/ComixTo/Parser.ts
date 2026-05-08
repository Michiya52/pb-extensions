import { normalizeString, parseRelativeTime } from "./Common";

const NO_POSTER = "https://comix.to/images/no-poster.png";

const isNsfw = (rating: string | null | undefined): boolean =>
    rating != null && rating !== "safe";

export interface ChapterFilters {
    showVolume: boolean;
    showTitle: boolean;
    showUploader: boolean;
    uploaders: {
        enabled: boolean;
        whitelist: boolean;
        strict: boolean;
        list: string[];
    };
    oneVersionOnly: boolean;
    removeDuplicates: boolean;
}

export class Parser {
    parseMangaDetails(data: any, mangaId: string): any {
        const buildSection = (id: string, label: string, items: any[]) =>
            items && items.length
                ? App.createTagSection({
                      id,
                      label,
                      tags: items.map((t: any) =>
                          App.createTag({ id: `${id}-${t.id}`, label: t.title })
                      ),
                  })
                : null;

        const sections = [
            buildSection("genre", "Genres", data.genres),
            buildSection("tag", "Tags", data.tags),
            buildSection("demographic", "Demographics", data.demographics),
            buildSection("format", "Formats", data.formats),
        ].filter((s) => s !== null);

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles: [data.title, ...(data.altTitles ?? [])],
                image: data.poster?.large || data.poster?.medium || NO_POSTER,
                status: data.status,
                desc: data.synopsis,
                author: data.authors?.map((a: any) => a.title).join(", ") ?? "",
                artist: data.artists?.map((a: any) => a.title).join(", ") ?? "",
                rating: data.ratedAvg ? data.ratedAvg / 2 : 0,
                hentai: isNsfw(data.contentRating),
                tags: sections,
            }),
        });
    }

    parseChapters(
        data: any[],
        filters?: ChapterFilters
    ): any[] {
        // 1. Extract all raw chapters from API data
        const rawChapters: any[] = [];
        for (const chap of data) {
            const groupName = chap.group?.name || "";
            const chapNum = chap.number;

            let volumeNumber: number | undefined = undefined;
            if (filters?.showVolume && chap.volume != null) {
                volumeNumber = chap.volume;
            }

            rawChapters.push({
                id: chap.id.toString(),
                chapNum: chapNum,
                name: chap.name ? `${chap.name}` : `Chapter ${chapNum}`,
                langCode: chap.language || "en",
                volume: volumeNumber ?? chap.volume,
                group: groupName,
                time: parseRelativeTime(chap.createdAtFormatted),
                sortingIndex: chapNum,
            });
        }

        // 2. Group by chapter number for filtering pipeline
        const grouped = rawChapters.reduce((acc: any, chap: any) => {
            if (!acc[chap.chapNum]) acc[chap.chapNum] = [];
            acc[chap.chapNum].push(chap);
            return acc;
        }, {});

        const finalChapters: any[] = [];

        for (const chapNum in grouped) {
            const variants = grouped[chapNum];
            let filtered = [...variants];

            if (filters) {
                try {
                    const uploaderFilter = filters.uploaders || null;
                    const hasUploaderFilter =
                        uploaderFilter &&
                        uploaderFilter.enabled &&
                        Array.isArray(uploaderFilter.list) &&
                        uploaderFilter.list.length > 0;

                    // A. Hard Filter: Group Blacklist (with normalizeString)
                    if (hasUploaderFilter && !uploaderFilter.whitelist) {
                        filtered = filtered.filter((v: any) => {
                            const normalizedGroup = normalizeString(v.group || "").toLowerCase();
                            const isMatched = uploaderFilter.list.some((item: string) => {
                                const normalizedItem = normalizeString(item).toLowerCase();
                                return uploaderFilter.strict
                                    ? normalizedGroup === normalizedItem
                                    : normalizedGroup.includes(normalizedItem);
                            });
                            return !isMatched; // blacklist: exclude matches
                        });
                    }

                    // B. Soft Filter: Group Whitelist (fallback to all if zero matches)
                    if (hasUploaderFilter && uploaderFilter.whitelist && filtered.length > 0) {
                        const whitelisted = filtered.filter((v: any) => {
                            const normalizedGroup = normalizeString(v.group || "").toLowerCase();
                            return uploaderFilter.list.some((item: string) => {
                                const normalizedItem = normalizeString(item).toLowerCase();
                                return uploaderFilter.strict
                                    ? normalizedGroup === normalizedItem
                                    : normalizedGroup.includes(normalizedItem);
                            });
                        });
                        if (whitelisted.length > 0) filtered = whitelisted;
                    }

                    // C. Priority Ranking - Sort by uploader preference order
                    if (hasUploaderFilter) {
                        const uploaderList = uploaderFilter.list.map((u: string) =>
                            normalizeString(u).toLowerCase()
                        );
                        const isStrict = !!uploaderFilter.strict;
                        filtered.sort((a: any, b: any) => {
                            const aName = normalizeString(a.group || "").toLowerCase();
                            const bName = normalizeString(b.group || "").toLowerCase();
                            let aIdx = uploaderList.findIndex((u: string) =>
                                isStrict ? aName === u : aName.includes(u)
                            );
                            let bIdx = uploaderList.findIndex((u: string) =>
                                isStrict ? bName === u : bName.includes(u)
                            );
                            if (aIdx === -1) aIdx = 9999;
                            if (bIdx === -1) bIdx = 9999;
                            return aIdx - bIdx;
                        });
                    }

                    // D. Deduplication - Remove duplicate chapters by chapNum-lang
                    if (!!filters.removeDuplicates && filtered.length > 1) {
                        const unique: any[] = [];
                        const seen = new Set();
                        for (const chap of filtered) {
                            const key = `${chap.chapNum}-${chap.langCode}`;
                            if (!seen.has(key)) {
                                seen.add(key);
                                unique.push(chap);
                            }
                        }
                        filtered = unique;
                    }

                    // E. One Version per Chapter
                    if (!!filters.oneVersionOnly && filtered.length > 1) {
                        filtered = [filtered[0]];
                    }
                } catch (filterError) {
                    // If filtering fails, fall back to unfiltered variants
                    filtered = [...variants];
                }
            }

            // Build final chapter objects with display customization
            for (const chap of filtered) {
                const showUploader = !!(filters && filters.showUploader);
                const groupTag = showUploader && chap.group ? ` [${chap.group}]` : "";
                const showTitle = !!(filters && filters.showTitle);
                const displayName = showTitle
                    ? `${chap.name}${groupTag}`
                    : `Chapter ${chap.chapNum}${groupTag}`;

                finalChapters.push(
                    App.createChapter({
                        id: chap.id,
                        chapNum: chap.chapNum,
                        name: displayName,
                        langCode: chap.langCode,
                        volume: chap.volume,
                        group: chap.group,
                        time: chap.time,
                        sortingIndex: chap.sortingIndex,
                    })
                );
            }
        }

        return finalChapters;
    }

    parseChapterDetails(data: any, mangaId: string, chapterId: string): any {
        const pages = data.pages.map((p: any) => p.url);
        return App.createChapterDetails({
            id: chapterId,
            mangaId,
            pages,
        });
    }

    parseMangaList(
        items: any[],
        showNsfw: boolean,
        filteredTermIds: Set<number> = new Set(),
        tagWhitelistMode: boolean = false,
        typeFilter: Set<string> = new Set(),
        tagAndMode: boolean = false
    ): any[] {
        const mangaList: any[] = [];

        for (const item of items) {
            if (!showNsfw && isNsfw(item.contentRating)) {
                continue;
            }

            if (filteredTermIds.size > 0 || typeFilter.size > 0) {
                const itemTagIds = new Set<number>([
                    ...(item.genres ?? []).map((t: any) => t.id),
                    ...(item.demographics ?? []).map((t: any) => t.id),
                    ...(item.formats ?? []).map((t: any) => t.id),
                    ...(item.tags ?? []).map((t: any) => t.id),
                ]);

                const filteredIdsArr = Array.from(filteredTermIds);
                let hasMatch: boolean;

                if (tagAndMode) {
                    const tagsAllMatch =
                        filteredIdsArr.length === 0 ||
                        filteredIdsArr.every((id) => itemTagIds.has(id));
                    const typeMatches =
                        typeFilter.size === 0 ||
                        (item.type != null && typeFilter.has(item.type));
                    hasMatch = tagsAllMatch && typeMatches;
                } else {
                    const hasTagMatch =
                        filteredIdsArr.length > 0 &&
                        filteredIdsArr.some((id) => itemTagIds.has(id));
                    const hasTypeMatch =
                        typeFilter.size > 0 &&
                        item.type != null &&
                        typeFilter.has(item.type);
                    hasMatch = hasTagMatch || hasTypeMatch;
                }

                if (tagWhitelistMode ? !hasMatch : hasMatch) {
                    continue;
                }
            }

            mangaList.push(
                App.createPartialSourceManga({
                    mangaId: item.hid,
                    image: item.poster?.large || item.poster?.medium || NO_POSTER,
                    title: item.title,
                    subtitle: item.latestChapter
                        ? `Ch. ${item.latestChapter}`
                        : undefined,
                })
            );
        }

        return mangaList;
    }

    parseTagSections(
        genres: any[],
        themes: any[],
        formats: any[],
        demographics: any[]
    ): any[] {
        const createSection = (id: string, label: string, items: any[]) =>
            App.createTagSection({
                id,
                label,
                tags: items.map((x: any) =>
                    App.createTag({ id: `${id}-${x.id}`, label: x.label })
                ),
            });

        return [
            createSection("genre", "Genres", genres),
            createSection("tag", "Tags", themes),
            createSection("format", "Formats", formats),
            createSection("demographic", "Demographics", demographics),
        ];
    }
}
