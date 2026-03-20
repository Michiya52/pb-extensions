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
        oneVersionOnly: boolean
    }
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
            // A. Hard Filter: Uploader Blacklist
            if (filters.uploaders.enabled && !filters.uploaders.whitelist) {
                filtered = variants.filter((v: any) => checkFilterFunc(v.group, filters.uploaders).pass);
            }

            // B. Soft Filter: Uploader Whitelist (Fallback to all if zero matches)
            if (filters.uploaders.enabled && filters.uploaders.whitelist) {
                const whitelisted = filtered.filter((v: any) => checkFilterFunc(v.group, filters.uploaders).isMatched);
                if (whitelisted.length > 0) {
                    filtered = whitelisted;
                }
            }

            // C. Priority Ranking (v1.3.4) - Sort by uploader preference
            const uploaderList = filters.uploaders.list.map(u => u.toLowerCase());
            filtered.sort((a: any, b: any) => {
                const aName = a.group?.toLowerCase() ?? "";
                const bName = b.group?.toLowerCase() ?? "";
                let aIdx = uploaderList.findIndex(u => filters.uploaders.strict ? aName === u : aName.includes(u));
                let bIdx = uploaderList.findIndex(u => filters.uploaders.strict ? bName === u : bName.includes(u));
                if (aIdx === -1) aIdx = 9999;
                if (bIdx === -1) bIdx = 9999;
                return aIdx - bIdx;
            });

            // D. One Version per Chapter logic
            if (filters.oneVersionOnly && filtered.length > 1) {
                filtered = [filtered[0]];
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
