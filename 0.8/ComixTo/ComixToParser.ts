import {
    Manga,
    Chapter,
    ChapterDetails,
    Tag,
    TagSection,
    PagedResults,
    SourceManga,
    PartialSourceManga,
    createManga,
    createChapter,
    createChapterDetails,
    createTag,
    createTagSection,
    createPartialSourceManga,
    createPagedResults
} from "paperback-extensions-common";

export const parseMangaList = ($: any, baseUrl: string): PagedResults => {
    const manga: PartialSourceManga[] = [];
    // Generic selectors for checking: .manga-item, .item-summary, .entry
    // Assuming a list layout
    $('div.manga-item, div.item, div.entry').each((_: any, element: any) => {
        const id = $('a', element).attr('href')?.split('/').pop() ?? '';
        const title = $('h3, .title', element).text().trim();
        const image = $('img', element).attr('src') ?? '';
        const subtitle = $('span.chapter, .latest-chapter', element).text().trim();

        if (!id || !title) return;

        manga.push(createPartialSourceManga({
            mangaId: id,
            image: image,
            title: title,
            subtitle: subtitle ? subtitle : undefined
        }));
    });

    return createPagedResults({
        results: manga
    });
}

export const parseMangaDetails = ($: any, mangaId: string): Manga => {
    // Generic selectors
    const title = $('h1, .manga-title').first().text().trim();
    const image = $('img.manga-cover, .summary_image img').attr('src') ?? '';
    const author = $('.author-content, .author').text().trim();
    const artist = $('.artist-content, .artist').text().trim();
    const description = $('.description-summary, .summary_content').text().trim();
    const status = $('.post-status, .status').text().trim();

    const arrayTags: Tag[] = [];
    $('.genres-content a, .genre a').each((_: any, element: any) => {
        const id = $(element).attr('href')?.split('/').pop() ?? '';
        const label = $(element).text().trim();
        arrayTags.push(createTag({ id: id, label: label }));
    });
    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags })];

    return createManga({
        id: mangaId,
        titles: [title],
        image: image,
        status: status.toLowerCase().includes("ongoing") ? 1 : 0, // 1: Ongoing, 0: Completed
        rating: 0,
        author: author,
        artist: artist,
        tags: tagSections,
        desc: description,
        hentai: false
    });
}

export const parseChapterList = (
    $: any,
    mangaId: string,
    sortVotes: boolean = false,
    chapSettings?: { showVolume: boolean, showTitle: boolean, showUploader: boolean },
    filters?: {
        uploaders: { enabled: boolean, whitelist: boolean, strict: boolean, list: string[] },
        languages: { enabled: boolean, whitelist: boolean, strict: boolean, list: string[] },
        regions: { enabled: boolean, whitelist: boolean, strict: boolean, list: string[] }
    },
    onlyOne: boolean = false
): Chapter[] => {
    const rawChapters: any[] = [];

    // 1. Extract all chapters from the page
    $('ul.row-content-chapter li, .chapter-list .row, .listing-chapters_wrap li').each((_: any, element: any) => {
        const id = $('a', element).attr('href')?.split('/').pop() ?? '';
        const name = $('a', element).text().trim();
        const time = $('.chapter-release-date, .date', element).text().trim();
        const chapMatch = name.match(/Chapter\s*(\d+(\.\d+)?)/i);
        const chapNum = Number(chapMatch?.[1] ?? 0);

        let finalName = name;
        let volumeNumber: number | undefined = undefined;
        let groupName: string | undefined = undefined;

        if (chapSettings?.showVolume) {
            const volMatch = name.match(/Vol\.?\s*(\d+(\.\d+)?)/i);
            if (volMatch) {
                volumeNumber = Number(volMatch[1]);
            }
        }

        const uploader = $('.scanlator, .chapter-uploader, .group, .group-name', element).text().trim();
        if (uploader) {
            groupName = uploader;
        }

        const voteText = $('.votes, .like-count', element).text().trim();
        const votes = parseInt(voteText.replace(/,/g, '')) || 0;

        const langInfo = $('.lang-icon, .language', element).attr('title') || $('.language', element).text().trim() || 'en';
        const regionInfo = $('.region-icon, .region', element).attr('title') || $('.region', element).text().trim() || '';

        if (!id) return;

        rawChapters.push({
            id: id,
            mangaId: mangaId,
            name: finalName,
            chapNum: chapNum,
            volume: volumeNumber,
            time: new Date(time),
            votes: votes,
            group: groupName,
            lang: langInfo,
            region: regionInfo
        });
    });

    // 2. Group by Chapter Number for "Soft Whitelist" logic
    const grouped = rawChapters.reduce((acc: any, chap: any) => {
        if (!acc[chap.chapNum]) acc[chap.chapNum] = [];
        acc[chap.chapNum].push(chap);
        return acc;
    }, {});

    const finalChapters: Chapter[] = [];

    const checkFilterFunc = (val: string | undefined, filter: { enabled: boolean, whitelist: boolean, strict: boolean, list: string[] }) => {
        if (!filter.enabled || filter.list.length === 0) return { pass: true, isMatched: false };
        if (!val) return { pass: !filter.whitelist, isMatched: false };

        const target = val.toLowerCase();
        const isMatched = filter.list.some(item => {
            const listItem = item.toLowerCase();
            return filter.strict ? target === listItem : target.includes(listItem);
        });

        return { pass: filter.whitelist ? isMatched : !isMatched, isMatched };
    };

    for (const chapNum in grouped) {
        const variants = grouped[chapNum];
        let filtered = variants;

        if (filters) {
            // A. Hard Filter: Blacklist (Always hide if matched in blacklist mode)
            filtered = variants.filter((v: any) => {
                const u = checkFilterFunc(v.group, filters.uploaders);
                const l = checkFilterFunc(v.lang, filters.languages);
                const r = checkFilterFunc(v.region, filters.regions);
                
                // If any is a "Blacklist Match", reject it immediately
                if (filters.uploaders.enabled && !filters.uploaders.whitelist && !u.pass) return false;
                if (filters.languages.enabled && !filters.languages.whitelist && !l.pass) return false;
                if (filters.regions.enabled && !filters.regions.whitelist && !r.pass) return false;
                
                return true;
            });

            // B. Soft Filter: Whitelist (Prefer whitelisted, fallback to "filtered" if none match)
            if (filtered.length > 0) {
                const whitelisted = filtered.filter((v: any) => {
                    const u = checkFilterFunc(v.group, filters.uploaders);
                    const l = checkFilterFunc(v.lang, filters.languages);
                    const r = checkFilterFunc(v.region, filters.regions);
                    
                    let matchAnyWhitelist = false;
                    if (filters.uploaders.enabled && filters.uploaders.whitelist && u.isMatched) matchAnyWhitelist = true;
                    if (filters.languages.enabled && filters.languages.whitelist && l.isMatched) matchAnyWhitelist = true;
                    if (filters.regions.enabled && filters.regions.whitelist && r.isMatched) matchAnyWhitelist = true;
                    
                    return matchAnyWhitelist;
                });

                // If we have whitelisted matches, only show those. Otherwise, show all (that passed blacklist).
                if (whitelisted.length > 0) {
                    filtered = whitelisted;
                }
            }
        }

        for (const chap of filtered) {
            const groupTag = (chapSettings?.showUploader && chap.group) ? ` [${chap.group}]` : "";
            const displayName = (chapSettings && !chapSettings.showTitle) ? `Chapter ${chap.chapNum}${groupTag}` : `${chap.name}${groupTag}`;

            finalChapters.push(createChapter({
                id: chap.id,
                mangaId: chap.mangaId,
                name: displayName,
                langCode: 'en',
                chapNum: chap.chapNum,
                time: chap.time,
                volume: chap.volume,
                group: chap.group
            }));

            if (onlyOne) break;
        }
    }

    if (sortVotes) {
        finalChapters.sort((a, b) => (b as any).votes - (a as any).votes);
    }

    return finalChapters;
}

export const parsePageList = ($: any, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = [];

    // Generic reader selectors
    $('.reading-content img, .page-break img, #reader-area img').each((_: any, element: any) => {
        const url = $(element).attr('src')?.trim();
        if (url) pages.push(url);
    });

    return createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: pages,
        longStrip: false
    });
}
