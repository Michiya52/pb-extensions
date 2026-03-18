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
    }
): Chapter[] => {
    const chapters: any[] = [];

    // Generic selector for chapter lists
    $('ul.row-content-chapter li, .chapter-list .row, .listing-chapters_wrap li').each((_: any, element: any) => {
        const id = $('a', element).attr('href')?.split('/').pop() ?? '';
        const name = $('a', element).text().trim();
        const time = $('.chapter-release-date, .date', element).text().trim();
        const chapNum = Number(name.match(/Chapter\s*(\d+(\.\d+)?)/i)?.[1] ?? 0);

        let finalName = name;
        let volumeNumber: number | undefined = undefined;
        let groupName: string | undefined = undefined;

        if (chapSettings?.showVolume) {
            const volMatch = name.match(/Vol\.?\s*(\d+(\.\d+)?)/i);
            if (volMatch) {
                volumeNumber = Number(volMatch[1]);
            }
        }

        if (chapSettings && !chapSettings.showTitle) {
            finalName = `Chapter ${chapNum}`;
        }

        const uploader = $('.scanlator, .chapter-uploader, .group, .group-name', element).text().trim();
        if (uploader) {
            groupName = uploader;
        }

        // --- Filtering Logic ---
        if (filters) {
            const checkFilter = (val: string | undefined, filter: { enabled: boolean, whitelist: boolean, strict: boolean, list: string[] }) => {
                if (!filter.enabled || filter.list.length === 0) return true;
                if (!val) return !filter.whitelist; // If no value, fail whitelist, pass blacklist

                const target = val.toLowerCase();
                const match = filter.list.some(item => {
                    const listItem = item.toLowerCase();
                    return filter.strict ? target === listItem : target.includes(listItem);
                });

                return filter.whitelist ? match : !match;
            };

            // Assuming the site provides language/region info in elements
            // For now, we only have groupName reliably from the uploader element
            if (!checkFilter(groupName, filters.uploaders)) return;

            // Language/Region info might be in specific icons or text
            const langInfo = $('.lang-icon, .language', element).attr('title') || $('.language', element).text().trim();
            if (!checkFilter(langInfo, filters.languages)) return;

            const regionInfo = $('.region-icon, .region', element).attr('title') || $('.region', element).text().trim();
            if (!checkFilter(regionInfo, filters.regions)) return;
        }

        // Attempt to find metadata for sorting
        const voteText = $('.votes, .like-count', element).text().trim();
        const votes = parseInt(voteText.replace(/,/g, '')) || 0;

        if (!id) return;

        chapters.push({
            id: id,
            mangaId: mangaId,
            name: (chapSettings && !chapSettings.showTitle) ? `Chapter ${chapNum}` : (chapSettings?.showUploader && groupName ? `${finalName} [${groupName}]` : finalName),
            langCode: 'en', 
            chapNum: chapNum,
            volume: volumeNumber,
            time: new Date(time),
            votes: votes,
            group: groupName
        });
    });

    if (sortVotes) {
        chapters.sort((a, b) => b.votes - a.votes);
    }

    return chapters.map(chap => createChapter({
        id: chap.id,
        mangaId: chap.mangaId,
        name: chap.name,
        langCode: chap.langCode,
        chapNum: chap.chapNum,
        time: chap.time,
        volume: chap.volume,
        group: chap.group
    }));
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
