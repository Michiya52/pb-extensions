/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */

import {
  type Chapter,
  type ChapterDetails,
  type DiscoverSectionItem,
  type PagedResults,
  type SearchResultItem,
  type SourceManga,
  type Tag,
  type TagSection,
  ContentRating,
} from "@paperback/types";
import * as cheerio from "cheerio";

import {
  type ApiResponse,
  type ChapterItem,
  type ChapterPages,
  type Filter,
  type MangaItem,
  type Metadata,
  type OptionItem,
  type ResultManga,
  type SearchMetadata,
  DOMAIN,
} from "./models";
import { ComixFilter } from "./utils/filter";
import { getPoster, getRanking, parseRelativeDate } from "./utils/helpers";

// Comix server-renders page state into
// `<script type="application/json" id="initial-data">` as a React-Query cache:
// `{ page, queries: { '["manga","detail","{hid}"]': <payload>, ... } }`. Detail
// pages embed the manga here because the JSON API itself is now 403.
function parseInitialDataQueries(html: string): Record<string, unknown> | undefined {
  const $ = cheerio.load(html);
  // Script content is raw text (htmlparser2 does not entity-decode rawtext nodes),
  // so `.text()` returns the JSON verbatim.
  const raw = $("script#initial-data").text();
  if (!raw) return undefined;
  try {
    return (JSON.parse(raw) as { queries?: Record<string, unknown> }).queries;
  } catch {
    return undefined;
  }
}

// The `["manga","detail","{hid}"]` query value is the Manga object directly
// (unwrapped); guard for a future `{ result }` wrapper too, keying off `hid`.
function extractDetailManga(html: string): MangaItem | undefined {
  const queries = parseInitialDataQueries(html);
  if (!queries) return undefined;
  const key = Object.keys(queries).find((k) => k.includes('"detail"'));
  if (key === undefined) return undefined;
  const value = queries[key] as MangaItem & { result?: MangaItem };
  const manga = value?.result ?? value;
  return manga?.hid !== undefined ? manga : undefined;
}

export class ComixParser {
  parseSection(section: string, json: ApiResponse<ResultManga>) {
    const latest: DiscoverSectionItem[] = [];
    if (json.status === "ok") {
      for (const item of json.result.items) {
        latest.push({
          type:
            section === "follow"
              ? "prominentCarouselItem"
              : section === "popular"
                ? "featuredCarouselItem"
                : "simpleCarouselItem",
          contentRating: getRanking(item.contentRating),
          imageUrl: getPoster(item),
          mangaId: item.hid,
          title: item.title,
          subtitle: item.authors?.map((author) => author.title).join(" ") ?? "",
        });
      }
    }
    return {
      items: latest,
      metadata: undefined,
    };
  }

  parseGenreSection(
    ComixMetadata: Metadata | undefined,
    genres: OptionItem[],
    hiddenGenres: string[],
    buildMetadata: (genreId: string) => SearchMetadata,
  ): { items: DiscoverSectionItem[]; metadata: Metadata } {
    const allGenres: DiscoverSectionItem[] = [];
    const page = ComixMetadata?.page ?? 1;
    genres
      .filter((filterName) => !hiddenGenres.includes(filterName.id))
      .forEach((filterItem) => {
        allGenres.push({
          type: "genresCarouselItem",
          searchQuery: {
            title: "",
            metadata: buildMetadata(filterItem.id),
          },
          name: filterItem.value,
          contentRating:
            filterItem.value === "Adult" ? ContentRating.ADULT : ContentRating.EVERYONE,
        });
      });
    return {
      items: allGenres,
      metadata: { page: page + 1 },
    };
  }

  parseSectionSimple(page: number, json: ApiResponse<ResultManga>) {
    const latest: DiscoverSectionItem[] = [];
    if (json.status === "ok") {
      for (const item of json.result.items) {
        latest.push({
          contentRating: getRanking(item.contentRating),
          imageUrl: getPoster(item),
          mangaId: item?.hid ?? "NULL",
          subtitle: `Chapter ${item.finalChapter || item.latestChapter}`,
          title: item.title,
          type: "simpleCarouselItem",
        });
      }
      const hasNext = json.result.meta?.hasNext ?? json.result.items.length > 0;
      return {
        items: latest,
        metadata: hasNext ? { page: page + 1 } : undefined,
      };
    }
    return { items: latest, metadata: undefined };
  }

  parseSectionChapter(page: number, json: ApiResponse<ResultManga>) {
    const latest: DiscoverSectionItem[] = [];
    if (json.status === "ok") {
      for (const item of json.result.items) {
        latest.push({
          contentRating: getRanking(item.contentRating),
          imageUrl: getPoster(item),
          chapterId: item.hid,
          mangaId: item.hid,
          subtitle: `Chapter ${item.finalChapter || item.latestChapter}`,
          title: item.title,
          type: "chapterUpdatesCarouselItem",
          publishDate: parseRelativeDate(item.chapterUpdatedAtFormatted),
        });
      }
      const hasNext = json.result.meta?.hasNext ?? json.result.items.length > 0;
      return {
        items: latest,
        metadata: hasNext ? { page: page + 1 } : undefined,
      };
    }
    return { items: latest, metadata: undefined };
  }

  parseChapters(manga: SourceManga, items: ChapterItem[]): Chapter[] {
    const filter = new ComixFilter();

    // 1. Cache the group name map for follow-last-read scanlator logic
    const groupMap: Record<string, string> = {};
    for (const chap of items) {
      const chapId = chap.id.toString();
      const groupName = chap.isOfficial ? "⭐Official" : (chap.group?.name ?? "Unknown");
      if (chapId && groupName) {
        groupMap[chapId] = groupName;
      }
    }
    Application.setState(JSON.stringify(groupMap), `chapter_groups_${manga.mangaId}`);

    // 2. Auto-seed scanlator groups to the prioritized list if enabled
    const autoSeed = filter.getAutoSeedUploadersSettings();
    if (autoSeed) {
      const existing = filter.getUploadersSettings();
      const existingSet = new Set(existing.map((g) => filter.cleanGroupName(g)));
      const seeded = [...existing];
      let hasNew = false;
      for (const chap of items) {
        const group = chap.isOfficial ? "⭐Official" : (chap.group?.name ?? "Unknown");
        const clean = filter.cleanGroupName(group);
        if (clean && !existingSet.has(clean)) {
          existingSet.add(clean);
          seeded.push(group);
          hasNew = true;
        }
      }
      if (hasNew) {
        filter.setUploadersSettings(seeded);
      }
    }

    // 3. Process raw chapters mapping
    const showTitle = filter.getShowTitleSettings();
    const showUploader = filter.getShowUploaderSettings();

    const rawChapters = items.map((chap) => {
      const rawGroup = chap.isOfficial ? "⭐Official" : (chap.group?.name ?? "Unknown");
      const groupTag = showUploader && rawGroup ? ` [${rawGroup}]` : "";
      const displayName = showTitle && chap.name ? `${chap.name}${groupTag}` : `Chapter ${chap.number}${groupTag}`;

      return {
        chapterId: (chap.id ?? "").toString(),
        sourceManga: manga,
        langCode: chap.language || "en",
        chapNum: Number(chap.number) || 0,
        title: displayName,
        volume: chap.volume,
        version: rawGroup,
        sortingIndex: Number(chap.number) || 0,
        publishDate: parseRelativeDate(chap.createdAtFormatted),
        votes: chap.votes ?? 0,
        additionalInfo: { vote: (chap.votes ?? 0).toString(), url: chap.url },
      };
    });

    // 4. Group chapters by chapter number to handle filtering/deduplication/priority sorting
    const grouped = rawChapters.reduce((acc, chap) => {
      if (!acc[chap.chapNum]) acc[chap.chapNum] = [];
      acc[chap.chapNum]!.push(chap);
      return acc;
    }, {} as Record<number, typeof rawChapters>);

    // Get filter states
    const isFiltering = filter.getUploadersFilteringSettings();
    const isWhitelist = filter.getUploadersWhitelistedSettings();
    const isStrict = filter.getStrictNameMatchingSettings();
    const savedGroups = filter.getUploadersSettings();
    const followLastRead = filter.getFollowLastReadGroupSettings();
    const lastReadGroup = Application.getState(`last_read_group_${manga.mangaId}`) as string | undefined;

    const uploaderList = savedGroups.map((u) => filter.normalizeString(u).toLowerCase());
    const uploaderListClean = savedGroups.map((u) => filter.cleanGroupName(u));
    const lastReadGroupNorm = lastReadGroup ? filter.normalizeString(lastReadGroup).toLowerCase() : null;
    const lastReadGroupClean = lastReadGroup ? filter.cleanGroupName(lastReadGroup) : null;

    // Priority index resolver helper
    const getPriorityIndex = (groupName: string) => {
      if (!groupName) return 9999;
      const cleanNorm = filter.cleanGroupName(groupName);
      const normalized = filter.normalizeString(groupName).toLowerCase();

      if (followLastRead && lastReadGroupClean) {
        if (isStrict) {
          if (cleanNorm === lastReadGroupClean) return -1;
        } else {
          if (cleanNorm === lastReadGroupClean || cleanNorm.includes(lastReadGroupClean) || lastReadGroupClean.includes(cleanNorm) || (lastReadGroupNorm && (normalized.includes(lastReadGroupNorm) || lastReadGroupNorm.includes(normalized)))) {
            return -1;
          }
        }
      }
      for (let i = 0; i < uploaderListClean.length; i++) {
        const u = uploaderListClean[i];
        if (!u) continue;
        if (isStrict) {
          if (cleanNorm === u) return i;
        } else {
          const rawU = uploaderList[i];
          if (cleanNorm === u || cleanNorm.includes(u) || u.includes(cleanNorm) || (rawU && (normalized.includes(rawU) || rawU.includes(normalized)))) {
            return i;
          }
        }
      }
      return 9999;
    };

    const comparePriorityStable = (a: any, b: any) => {
      const pA = getPriorityIndex(a.version);
      const pB = getPriorityIndex(b.version);
      if (pA !== pB) return pA - pB;
      const isOfficialA = a.version === "⭐Official" ? 0 : 1;
      const isOfficialB = b.version === "⭐Official" ? 0 : 1;
      if (isOfficialA !== isOfficialB) return isOfficialA - isOfficialB;
      const votesA = a.votes ?? 0;
      const votesB = b.votes ?? 0;
      if (votesB !== votesA) return votesB - votesA;
      return a.version.localeCompare(b.version);
    };

    const removeDuplicates = filter.getRemoveDuplicatesSettings();
    const oneVersionOnly = filter.getOneVersionOnlySettings();
    const finalChapters: typeof rawChapters = [];

    if (oneVersionOnly) {
      const chapNums = Object.keys(grouped).map(Number).sort((a, b) => a - b);
      let activeGroup: string | null = null;
      for (const chapNum of chapNums) {
        const variants = grouped[chapNum] || [];
        let filtered = [...variants];

        // Whitelist/blacklist filter
        if (isFiltering && savedGroups.length > 0) {
          if (!isWhitelist) {
            filtered = filtered.filter((v) => {
              const cleanGroup = filter.cleanGroupName(v.version || "");
              const normalizedGroup = filter.normalizeString(v.version || "").toLowerCase();
              const isMatched = savedGroups.some((item) => {
                const cleanItem = filter.cleanGroupName(item);
                const normalizedItem = filter.normalizeString(item).toLowerCase();
                if (isStrict) {
                  return cleanGroup === cleanItem;
                } else {
                  return cleanGroup === cleanItem || cleanGroup.includes(cleanItem) || cleanItem.includes(cleanGroup) || normalizedGroup.includes(normalizedItem);
                }
              });
              return !isMatched;
            });
          } else {
            const whitelisted = filtered.filter((v) => {
              const cleanGroup = filter.cleanGroupName(v.version || "");
              const normalizedGroup = filter.normalizeString(v.version || "").toLowerCase();
              return savedGroups.some((item) => {
                const cleanItem = filter.cleanGroupName(item);
                const normalizedItem = filter.normalizeString(item).toLowerCase();
                if (isStrict) {
                  return cleanGroup === cleanItem;
                } else {
                  return cleanGroup === cleanItem || cleanGroup.includes(cleanItem) || cleanItem.includes(cleanGroup) || normalizedGroup.includes(normalizedItem);
                }
              });
            });
            if (whitelisted.length > 0) filtered = whitelisted;
          }
        }

        if (filtered.length === 0) continue;

        // Sort by priority stably
        filtered.sort(comparePriorityStable);

        let chosen = null;
        if (activeGroup) {
          const cleanActive = filter.cleanGroupName(activeGroup);
          const normActive = filter.normalizeString(activeGroup).toLowerCase();
          chosen = filtered.find((v) => {
            const cleanNorm = filter.cleanGroupName(v.version || "");
            const norm = filter.normalizeString(v.version || "").toLowerCase();
            if (isStrict) return cleanNorm === cleanActive;
            return cleanNorm === cleanActive || cleanNorm.includes(cleanActive) || cleanActive.includes(cleanNorm) || norm.includes(normActive) || normActive.includes(norm);
          });
        }
        if (!chosen) {
          chosen = filtered[0]!;
          activeGroup = chosen.version || "";
        }
        finalChapters.push(chosen);
      }
    } else {
      for (const chapNum in grouped) {
        const variants = grouped[chapNum] || [];
        let filtered = [...variants];

        // Whitelist/blacklist filter
        if (isFiltering && savedGroups.length > 0) {
          if (!isWhitelist) {
            filtered = filtered.filter((v) => {
              const cleanGroup = filter.cleanGroupName(v.version || "");
              const normalizedGroup = filter.normalizeString(v.version || "").toLowerCase();
              const isMatched = savedGroups.some((item) => {
                const cleanItem = filter.cleanGroupName(item);
                const normalizedItem = filter.normalizeString(item).toLowerCase();
                if (isStrict) {
                  return cleanGroup === cleanItem;
                } else {
                  return cleanGroup === cleanItem || cleanGroup.includes(cleanItem) || cleanItem.includes(cleanGroup) || normalizedGroup.includes(normalizedItem);
                }
              });
              return !isMatched;
            });
          } else {
            const whitelisted = filtered.filter((v) => {
              const cleanGroup = filter.cleanGroupName(v.version || "");
              const normalizedGroup = filter.normalizeString(v.version || "").toLowerCase();
              return savedGroups.some((item) => {
                const cleanItem = filter.cleanGroupName(item);
                const normalizedItem = filter.normalizeString(item).toLowerCase();
                if (isStrict) {
                  return cleanGroup === cleanItem;
                } else {
                  return cleanGroup === cleanItem || cleanGroup.includes(cleanItem) || cleanItem.includes(cleanGroup) || normalizedGroup.includes(normalizedItem);
                }
              });
            });
            if (whitelisted.length > 0) filtered = whitelisted;
          }
        }

        // Sort by priority stably
        filtered.sort(comparePriorityStable);

        // Remove duplicates if enabled
        if (removeDuplicates && filtered.length > 1) {
          const unique = [];
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

        finalChapters.push(...filtered);
      }
    }

    // Finally sort all resulting chapters by sortingIndex descending, and then by priority within the same index
    finalChapters.sort((a, b) => {
      if (b.sortingIndex !== a.sortingIndex) return b.sortingIndex - a.sortingIndex;
      return comparePriorityStable(a, b);
    });

    return finalChapters;
  }

  parseChapterDetails(chapterId: string, pages: ApiResponse<ChapterPages>): ChapterDetails {
    const { baseUrl, items } = pages.result.pages;
    const base = baseUrl.replace(/\/$/, "").replace(/\/sii?\//, "/i/");
    return {
      id: chapterId,
      mangaId: pages.result.mangaId.toString(),
      pages: items.map((img) => {
        const url = img.url.startsWith("http") ? img.url : `${base}/${img.url.replace(/^\//, "")}`;
        return url.replace(/\/sii?\//, "/i/");
      }),
    };
  }

  parseMangaDetails(mangaId: string, html: string): SourceManga {
    const manga = extractDetailManga(html);
    if (!manga) {
      throw new Error(`Comix: could not find detail data for ${mangaId}`);
    }
    const toTag = (item: { id: number; title: string }): Tag => ({
      id: item.id.toString(),
      title: item.title,
    });
    const demographicArray: Tag[] = manga.demographics.map(toTag);
    const genreArray: Tag[] = manga.genres.map(toTag);

    const tags: TagSection[] = [
      {
        title: "demographic",
        tags: demographicArray,
        id: "demographic",
      },
      {
        title: "genres",
        tags: genreArray,
        id: "genres",
      },
    ];
    const mangaInfo = {
      thumbnailUrl: getPoster(manga),
      synopsis: manga.synopsis,
      primaryTitle: manga.title,
      secondaryTitles: manga.altTitles,
      contentRating: manga.contentRating !== "safe" ? ContentRating.ADULT : ContentRating.EVERYONE,
      status: manga.status,
      bannerUrl: getPoster(manga),
      artist: manga.artists?.map((artist) => artist.title).join(" ") ?? "",
      author: manga.authors?.map((author) => author.title).join(" ") ?? "",
      rating: manga.ratedAvg / 10,
      tagGroups: tags,
      shareUrl: `${DOMAIN}${manga.url}`,
    };
    return { mangaId: mangaId, mangaInfo: mangaInfo };
  }

  parseSearchResults(
    page: number,
    search: ApiResponse<ResultManga>,
  ): PagedResults<SearchResultItem> {
    const items: SearchResultItem[] = [];
    if (search.status.toString() === "ok") {
      search.result.items.forEach((item) => {
        items.push({
          mangaId: item.hid,
          title: item.title,
          imageUrl: getPoster(item),
          contentRating: getRanking(item.contentRating),
          subtitle: `Chapter ${item.finalChapter || item.latestChapter}`,
        });
      });
      const hasNext = search.result.meta?.hasNext ?? search.result.items.length > 0;
      return {
        items: items,
        metadata: hasNext ? { page: page + 1 } : undefined,
      };
    }
    return {
      items: items,
      metadata: undefined,
    };
  }

  parseFilterUpdate(response: ApiResponse<Filter[]>): { id: string; value: string }[] {
    const filters: { id: string; value: string }[] = [];
    response.result.forEach((filter) => {
      filters.push({
        id: filter.id.toString(),
        value: filter.label,
      });
    });
    return filters;
  }
}
