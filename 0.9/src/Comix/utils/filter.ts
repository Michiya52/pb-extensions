/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */

import { type OptionItem } from "../models";

export class ComixFilter {
  genres: OptionItem[] = [];
  themes: OptionItem[] = [];
  demographic: OptionItem[] = [];
  formats: OptionItem[] = [];

  contentType = [
    { id: "manga", value: "Manga" },
    { id: "manhwa", value: "Manhwa" },
    { id: "manhua", value: "Manhua" },
    { id: "other", value: "Other" },
  ];

  publication_status = [
    { id: "finished", value: "Finished" },
    { id: "releasing", value: "Releasing" },
    { id: "on_hiatus", value: "On Hiatus" },
    { id: "discontinued", value: "Discontinued" },
    { id: "not_yet_released", value: "Not Yet Released" },
  ];

  sectionLimit = [
    { id: "1", value: "Day" },
    { id: "7", value: "Week" },
    { id: "30", value: "1 Month" },
    { id: "90", value: "3 Month" },
    { id: "180", value: "6 Month" },
    { id: "365", value: "1 Year" },
  ];

  contentRating = [
    { id: "safe", title: "Safe" },
    { id: "suggestive", title: "Suggestive" },
    { id: "erotica", title: "Erotica" },
    { id: "pornographic", title: "Pornographic" },
  ];
  getDefaultContentRatingSettings() {
    return (Application.getState("content_rating") as string[] | undefined) ?? ["suggestive"];
  }

  getHiddenGenresSettings() {
    return (Application.getState("hide_genres") as string[] | undefined) ?? [];
  }

  getHiddenThemesSettings() {
    return (Application.getState("hide_themes") as string[] | undefined) ?? [];
  }

  getHiddenDemogSettings() {
    return (Application.getState("hide_demog") as string[] | undefined) ?? [];
  }

  getShowOnlySettings() {
    return (Application.getState("show_only") as string[] | undefined) ?? [];
  }

  getLimitSettings() {
    return (Application.getState("limit") as string[] | undefined) ?? ["7"];
  }

  getYearSettings() {
    return (
      (Application.getState("year_settings") as number | undefined) ?? new Date().getFullYear() - 1
    );
  }

  getSectionTimesType() {
    return (Application.getState("yearTimes") as boolean | undefined) ?? true;
  }

  /**
   * @return true if horizontal, false if table
   */
  getChapterSectionDiffType() {
    return (Application.getState("chapterSection") as boolean | undefined) ?? false;
  }

  /**
   * @return true if horizontal, false if table
   */
  getTrendingSectionDiffType() {
    return (Application.getState("trendingSection") as boolean | undefined) ?? true;
  }

  /**
   * @return true if horizontal, false if table
   */
  getRecentSectionDiffType() {
    return (Application.getState("recentSection") as boolean | undefined) ?? true;
  }

  setGenreFilter(newValue: OptionItem[]) {
    this.genres = [...newValue].sort((a, b) =>
      a.value.toLowerCase().localeCompare(b.value.toLowerCase()),
    );
    Application.setState(JSON.stringify(newValue), "genre");
  }

  setDemographicFilter(newValue: OptionItem[]) {
    this.demographic = [...newValue].sort((a, b) =>
      a.value.toLowerCase().localeCompare(b.value.toLowerCase()),
    );
    Application.setState(JSON.stringify(newValue), "demographic");
  }

  setFormatsFilter(newValue: OptionItem[]) {
    this.formats = [...newValue].sort((a, b) =>
      a.value.toLowerCase().localeCompare(b.value.toLowerCase()),
    );
    Application.setState(JSON.stringify(newValue), "format");
  }

  // --- Customizations ---
  cleanGroupName(str: string): string {
    if (!str || typeof str !== "string") return "";
    return this.normalizeString(str).toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  normalizeString(str: string): string {
    return str.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'").replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
  }

  getShowTitleSettings(): boolean {
    return (Application.getState("show_title") as boolean | undefined) ?? true;
  }

  getShowUploaderSettings(): boolean {
    return (Application.getState("show_uploader") as boolean | undefined) ?? true;
  }

  getRemoveDuplicatesSettings(): boolean {
    return (Application.getState("remove_duplicates") as boolean | undefined) ?? true;
  }

  getOneVersionOnlySettings(): boolean {
    return (Application.getState("one_version_only") as boolean | undefined) ?? false;
  }

  getFollowLastReadGroupSettings(): boolean {
    return (Application.getState("follow_last_read_group") as boolean | undefined) ?? false;
  }

  getUploadersFilteringSettings(): boolean {
    return (Application.getState("uploaders_toggled") as boolean | undefined) ?? false;
  }

  getUploadersWhitelistedSettings(): boolean {
    return (Application.getState("uploaders_whitelisted") as boolean | undefined) ?? false;
  }

  getStrictNameMatchingSettings(): boolean {
    return (Application.getState("strict_name_matching") as boolean | undefined) ?? false;
  }

  getAutoSeedUploadersSettings(): boolean {
    return (Application.getState("auto_seed_uploaders") as boolean | undefined) ?? true;
  }

  getUploadersSettings(): string[] {
    return (Application.getState("uploaders") as string[] | undefined) ?? [];
  }

  setUploadersSettings(value: string[]): void {
    Application.setState(value, "uploaders");
  }
}

export const discoverySections = [
  { id: "popular", title: "Popular" },
  { id: "follow", title: "Most Follows New Comics" },
  { id: "recent", title: "Recent Comics" },
  { id: "trending_manga", title: "Trending Manga" },
  { id: "trending_wt", title: "Trending WebToons" },
  { id: "updatesHot", title: "Latest Updates HOT" },
  { id: "updatesNew", title: "Latest Updates NEW" },
  { id: "completed", title: "Completed" },
  { id: "genresSection", title: "Best of Genres" },
];
