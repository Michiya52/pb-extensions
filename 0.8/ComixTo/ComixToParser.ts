import {
    Manga,
    Chapter,
    ChapterDetails,
    Tag,
    TagSection,
    PagedResults,
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
        status: status.toLowerCase().includes("ongoing") ? 1 : 0,
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
    chapSettings?: { showVolume: boolean, showTitle: boolean, showUploader: boolean, removeDuplicates: boolean },
    filters?: {
        uploaders: { enabled: boolean, whitelist: boolean, strict: boolean, list: string[] },
        oneVersionOnly: boolean
    }
): Chapter[] => {
    const rawChapters: any[] = [];

    // Use script data if available (more reliable for some versions)
    const script = $('script:contains("window.__DATA__")').html();
    if (script) {
        try {
            const data = JSON.parse(script.match(/window\.__DATA__\s*=\s*({.*?});/s)![1]);
            const chaptersData = data.chapters ?? [];
            for (const chap of chaptersData) {
                rawChapters.push({
                    id: chap.chapter_id.toString(),
                    mangaId: mangaId,
                    name: chap.name || `Chapter ${chap.number}`,
                    chapNum: chap.number,
                    volume: chap.volume,
                    time: new Date(chap.updated_at * 1000),
                    group: chap.scanlation_group?.name || "",
                    votes: Number(chap.upvotes_count || chap.likes_count || chap.views || 0)
                });
            }
        } catch (e) {
            // Fallback to DOM parsing
        }
    }

    if (rawChapters.length === 0) {
        $('ul.row-content-chapter li, .chapter-list .row, .listing-chapters_wrap li').each((_: any, element: any) => {
            const id = $('a', element).attr('href')?.split('/').pop() ?? '';
            const name = $('a', element).text().trim();
            const time = $('.chapter-release-date, .date', element).text().trim();
            const chapMatch = name.match(/Chapter\s*(\d+(\.\d+)?)/i);
            const chapNum = Number(chapMatch?.[1] ?? 0);

            let volumeNumber: number | undefined = undefined;
            const volMatch = name.match(/Vol\.?\s*(\d+(\.\d+)?)/i);
            if (volMatch) volumeNumber = Number(volMatch[1]);

            const uploader = $('.scanlator, .chapter-uploader, .group, .group-name', element).text().trim();
            const voteText = $('.votes, .like-count', element).text().trim();
            const votes = parseInt(voteText.replace(/,/g, '')) || 0;

            if (!id) return;

            rawChapters.push({
                id: id,
                mangaId: mangaId,
                name: name,
                chapNum: chapNum,
                volume: volumeNumber,
                time: new Date(time),
                votes: votes,
                group: uploader
            });
        });
    }

    let processedChapters = rawChapters;

    // Deduplication & Filtering
    if (chapSettings?.removeDuplicates) {
        const chapterGroups = new Map<number, any[]>();
        for (const chap of processedChapters) {
            if (!chapterGroups.has(chap.chapNum)) chapterGroups.set(chap.chapNum, []);
            chapterGroups.get(chap.chapNum)!.push(chap);
        }

        const deduplicated = [];
        const uploaderList = (filters?.uploaders.list || []).map(u => u.toLowerCase());

        for (const [_, group] of chapterGroups.entries()) {
            group.sort((a, b) => {
                const groupA = (a.group || "").toLowerCase();
                const groupB = (b.group || "").toLowerCase();

                const priorityA = uploaderList.indexOf(groupA);
                const priorityB = uploaderList.indexOf(groupB);

                if (priorityA !== -1 && priorityB !== -1) return priorityA - priorityB;
                if (priorityA !== -1) return -1;
                if (priorityB !== -1) return 1;

                return b.votes - a.votes;
            });
            deduplicated.push(group[0]);
        }
        processedChapters = deduplicated;
    }

    // "Always Only Show 1 Source" (One Version per Chapter)
    if (filters?.oneVersionOnly && !chapSettings?.removeDuplicates) {
         const chapterGroups = new Map<number, any[]>();
         for (const chap of processedChapters) {
             if (!chapterGroups.has(chap.chapNum)) chapterGroups.set(chap.chapNum, []);
             chapterGroups.get(chap.chapNum)!.push(chap);
         }
         processedChapters = Array.from(chapterGroups.values()).map(g => g[0]);
    }

    const finalChapters: Chapter[] = [];
    for (const chap of processedChapters) {
        let displayName = chap.name;
        if (chapSettings && !chapSettings.showTitle) {
            displayName = `Chapter ${chap.chapNum}`;
        }

        finalChapters.push(createChapter({
            id: chap.id,
            mangaId: mangaId,
            name: displayName,
            langCode: 'en',
            chapNum: chap.chapNum,
            time: chap.time,
            volume: chapSettings?.showVolume ? chap.volume : undefined,
            group: chapSettings?.showUploader ? chap.group : undefined
        }));
    }

    finalChapters.sort((a, b) => b.chapNum - a.chapNum);
    return finalChapters;
}

export const parsePageList = ($: any, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = [];
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
