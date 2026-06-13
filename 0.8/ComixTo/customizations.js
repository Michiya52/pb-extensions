// customizations.js - Custom advanced settings and dynamic priorities sorting for ComixTo extension
// This file is appended to the bottom of the compiled acepilot_source.js by build.js

const API_BASE = "https://comix.to/api/v1";
const DOMAIN = "https://comix.to";

const CONTENT_RATINGS = [
  { id: "safe", label: "Safe" },
  { id: "suggestive", label: "Suggestive" },
  { id: "erotica", label: "Erotica" },
  { id: "pornographic", label: "Pornographic" }
];

const CONTENT_TYPES = [
  { id: "manga", label: "Manga" },
  { id: "manhwa", label: "Manhwa" },
  { id: "manhua", label: "Manhua" },
  { id: "other", label: "Other" }
];

function normalizeString(str) {
  return str.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'").replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
}

function cleanGroupName(str) {
  if (!str || typeof str !== "string") return "";
  return normalizeString(str).toLowerCase().replace(/[^a-z0-9]/g, "");
}

const LCG_MUL_CUST = 1000005;
const LCG_INC_CUST = 1234567891;

function readEncHeadersCust(headers) {
  if (!headers) return null;
  let seedStr;
  let lenStr;
  for (const key of Object.keys(headers)) {
    const rawV = headers[key];
    const v = Array.isArray(rawV) ? rawV[0] : rawV;
    if (typeof v !== "string") continue;
    const lk = key.toLowerCase();
    if (lk === "x-enc-seed") seedStr = v;
    else if (lk === "x-enc-len") lenStr = v;
  }
  if (!seedStr || !lenStr) return null;
  const seed = parseInt(seedStr, 10);
  const len = parseInt(lenStr, 10);
  if (!Number.isFinite(seed) || seed <= 0) return null;
  if (!Number.isFinite(len) || len <= 0) return null;
  return { seed: seed >>> 0, len };
}

function decryptComixImageCust(bytes, seed, len) {
  let x = seed >>> 0;
  const n = Math.min(len, bytes.length);
  for (let i = 0; i < n; i++) {
    x = Math.imul(x, LCG_MUL_CUST) + LCG_INC_CUST >>> 0;
    bytes[i] = (bytes[i] ^ x >>> 24 & 255) & 255;
  }
}

function parseRelativeTime(s) {
  if (!s) return new Date();
  const m = /^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i.exec(s.trim());
  if (!m) return new Date();
  const amt = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const date = new Date();
  if (unit === "second") date.setSeconds(date.getSeconds() - amt);
  else if (unit === "minute") date.setMinutes(date.getMinutes() - amt);
  else if (unit === "hour") date.setHours(date.getHours() - amt);
  else if (unit === "day") date.setDate(date.getDate() - amt);
  else if (unit === "week") date.setDate(date.getDate() - amt * 7);
  else if (unit === "month") date.setMonth(date.getMonth() - amt);
  else if (unit === "year") date.setFullYear(date.getFullYear() - amt);
  return date;
}

// --- SBOX-CBC Hashing (Required for Tag Search signing) ---
const SBOX_CBC_STAGES_CUST = [
  {
    "sboxB64": "en1TCoWqrAS05JxxPwh7o1zDuwXX+TQnRSjp8SHnK9xDl2XwMRWGuX+CzK9pAeUisJJk6kAq2Y6+N/6UoIMMS5qhTCkuGsVfSAu9ymJyJgmyxDiK3YmndJGlY8tg/9NC8yP2d/L7VHZNTtvB9NSxgHkZZ8gA+htznRSt0nAsXZV8/eM9vxDYqxOfYS0fGC/HixbPWJYPM0a6IAbvb5AdjSVZVZ7fayTWh/VuOU86UUo+6Bd1B1IDfklWhFe1aKSB5tp4m1oOZqj8xo+TQTyZwKa4jLYeqbdqmFBER9XubM68iN4yEuJbAg0R7LPC4BzJruHr9+1eOzDR+DZtzTXQog==",
    "keyB64": "R5KlWHZ69mr3SVxA+CAcXJFZYMdBMg==",
    "iv": 107
  },
  {
    "sboxB64": "8mVU5Parlr5mP2TC4YH/VWtsM3t97AlvfN6eo6mc5nfcxm716ku6cvxXDCxw5zT+MV223XqLLXj5XxXuldA1wU/Xk1K52dWHEiNtRBsrAqLfyM8yfh3rsLStNohKQ9RYJZlirIPzBE47vTjbhb8khhaCzISdkTcnItJoF+P6UANpHGcvByamGExBjQUZSCpqWuApIJfARc46+yifFLVCDgaYQNbKLsevpNpWXvhZ8T7JC1Gbc6gKqmAI5RF5xNjwTVMAcSF26BqzMKAfDdPNHpJh9MOUj0a7ssXiyz1HgKGnmluuf++MjtGx9xO8kEl07emluIkP/QG3OWNcihA8dQ==",
    "keyB64": "3jdTR5uwo09IjYYgTRll6ObM8BY=",
    "iv": 63
  },
  {
    "sboxB64": "y589erZ1BW86YLwuwCSbKfQ/gdNfc4BdszQAnP1CumZUB78NzWS1TDtollEmyWmIY0XqsNsU7ozWK8T2vbmNRI7Pd9WRH38P49gGGxinhqWygtdBAixYatTwUv/OWpkWYSAt6Z3mQPmLo3yvTpIxGrjD2d1wMlnR98jHVedblHi3gwoJHqzxwtCQS7Ed2vgXqzne9VxDKgEE3Efh87utDl7K6+08jwOiNzAl6As4xaiF+u++bWKEJ+VKfpNTnpqmxnt9IUmuRqD73yjibqR0MzUZDPxWUD7S5GyXHOAISPLMwXH+ZU2hIpWqEhBP7GuHNhV5dhFyqZgvI2eJtIpXEw==",
    "keyB64": "yzrD7PH5EnPv7/4FwVUcxy0h0wGLKA==",
    "iv": 187
  },
  {
    "sboxB64": "wTbQDcBTIwSbDyx0OyZbJ2HmJK9jTgwK6pfjnMaHyUjrbX6uMzlScAjgNcQdCUlzK6GSFSi5/xhqH9ykXRMl7jAhMrWWsLt1oEEZvFTfqhrUpmIpHlyMSk3a9ISlQPdQaMcU8ksS2TQGfLjszAciyta06FXhHJ9Ht4aV5ayOaQtk+umJeZF/2/vxbPC/moggWD26/j86yIB6w88CG55yN/arZ/XecV5We4WzmY1MeE+iQ83Vdm9RF3ey/G624l9go2uBWgVC5xaTlC0vneRF/Th9887XggGpPpCK0g7LqPg8RtjR3Ysuve9Zg5ixMY+tACoQEWbtp9MDV8K++WVExQ==",
    "keyB64": "AAmYyeZ+gUTrGFiHFWHrjVtbLEQ=",
    "iv": 216
  },
  {
    "sboxB64": "hU5wL6NIbXHwE8OVPzcc/AdEl83KCWp6dBWJUpRipAGESeueyMtjXHWoDRj/iwhMDC2/r5wijOauxrF/1Mk54LMgOOmnNVMq15Db7lqG7PK0AyEfbrkaYHZlrJriaLxz58DB5NGdn/2SQ/hR1TMPETLFBsyw5UfqwhZPBGkxu9Orzvpyiu8AbOEZd7c6WY+y0pObSm/+F4CNHaLE9Kk2NPkCuqUoXimIh9j1Ennz8V3dgWQbJE1XoLV+gyw8uGswezuYJtBUoWEeW6qZ2WYuC8cQttaRpkZFfNq+S/crQhQKXw6W41hn++2t3t9QPUBBfc8j9ugljlYFeD7cglW9Jw==",
    "keyB64": "KEq55J8TutS4Bb1wAWd9hVtZPsvBhNVPItmLBQ==",
    "iv": 184
  }
];

function generateHashCust(rawPath) {
  const b64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  
  function decodeB64(s) {
    const lookup = new Array(128).fill(-1);
    for (let i = 0; i < 64; i++) lookup[b64chars.charCodeAt(i)] = i;
    const out = [];
    let buf = 0, bits = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c === 61) break;
      const v = lookup[c] ?? -1;
      if (v === -1) continue;
      buf = buf << 6 | v;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out.push(buf >> bits & 255);
      }
    }
    return out;
  }

  function encodeB64Url(bytes) {
    let out = "", i = 0;
    for (; i + 2 < bytes.length; i += 3) {
      const n = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
      out += b64chars[n >> 18 & 63] + b64chars[n >> 12 & 63] + b64chars[n >> 6 & 63] + b64chars[n & 63];
    }
    if (i + 1 === bytes.length) {
      const n = bytes[i] << 16;
      out += b64chars[n >> 18 & 63] + b64chars[n >> 12 & 63];
    } else if (i + 2 === bytes.length) {
      const n = bytes[i] << 16 | bytes[i + 1] << 8;
      out += b64chars[n >> 18 & 63] + b64chars[n >> 12 & 63] + b64chars[n >> 6 & 63];
    }
    return out.replace(/\+/g, "-").replace(/\//g, "_");
  }

  function applyStage(data, stage) {
    const table = decodeB64(stage.sboxB64);
    const key = decodeB64(stage.keyB64);
    const out = new Array(data.length);
    let prev = stage.iv & 255;
    for (let i = 0; i < data.length; i++) {
      const idx = (data[i] & 255 ^ key[i % key.length] ^ prev) & 255;
      const next = table[idx] & 255;
      out[i] = next;
      prev = next;
    }
    return out;
  }

  function utf8Encode(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      let cp = s.charCodeAt(i);
      if (cp >= 55296 && cp <= 56319 && i + 1 < s.length) {
        const lo = s.charCodeAt(i + 1);
        if (lo >= 56320 && lo <= 57343) {
          cp = 65536 + (cp - 55296 << 10) + (lo - 56320);
          i++;
        }
      }
      if (cp < 128) {
        out.push(cp);
      } else if (cp < 2048) {
        out.push(192 | cp >> 6, 128 | cp & 63);
      } else if (cp < 65536) {
        out.push(224 | cp >> 12, 128 | cp >> 6 & 63, 128 | cp & 63);
      } else {
        out.push(240 | cp >> 18, 128 | cp >> 12 & 63, 128 | cp >> 6 & 63, 128 | cp & 63);
      }
    }
    return out;
  }

  function decodeComponent(s) {
    try {
      return decodeURIComponent(s.replace(/\+/g, " "));
    } catch (e) {
      return s;
    }
  }

  function canonicalizeQuery(rawQuery) {
    if (!rawQuery) return "";
    const groups = {};
    const arrayCounts = {};
    const parts = rawQuery.split("&");
    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];
      if (!part) continue;
      const eq = part.indexOf("=");
      const key = decodeComponent(eq >= 0 ? part.slice(0, eq) : part);
      const value = decodeComponent(eq >= 0 ? part.slice(eq + 1) : "");
      let base;
      let rendered;
      if (key.slice(-2) === "[]") {
        base = key.slice(0, -2);
        const i = arrayCounts[base] ?? 0;
        arrayCounts[base] = i + 1;
        rendered = base + "[" + i + "]=" + value;
      } else {
        const bracket = key.indexOf("[");
        base = bracket >= 0 ? key.slice(0, bracket) : key;
        rendered = key + "=" + value;
      }
      if (groups[base]) {
        groups[base].push(rendered);
      } else {
        groups[base] = [rendered];
      }
    }
    return Object.keys(groups).sort().map((b) => groups[b].join("&")).join("&");
  }

  const stripped = rawPath.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/api\/v1/, "");
  const qIdx = stripped.indexOf("?");
  let stringToSign = stripped;
  if (qIdx >= 0) {
    const path = stripped.slice(0, qIdx);
    const canonical = canonicalizeQuery(stripped.slice(qIdx + 1));
    stringToSign = canonical ? path + "?" + canonical : path;
  }

  let data = utf8Encode(stringToSign);
  for (let r = SBOX_CBC_STAGES_CUST.length - 1; r >= 0; r--) {
    data = applyStage(data, SBOX_CBC_STAGES_CUST[r]);
  }
  return encodeB64Url(data);
}

function signUrlCust(url) {
  const token = generateHashCust(url);
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_=${token}`;
}

// --- Dynamic Settings UI Helpers ---
const TRENDING_OPTIONS = [
  { id: "3", label: "3 days" },
  { id: "7", label: "7 days" },
  { id: "30", label: "1 month" },
  { id: "90", label: "3 months" },
  { id: "180", label: "6 months" },
  { id: "365", label: "1 year" }
];

const uiKeepAlive = [];
const keepAlive = (obj) => {
  uiKeepAlive.push(obj);
  return obj;
};

const getCachedTags = async (stateManager) => {
  const raw = await stateManager.retrieve("tag_cache_v1");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getContentRatingMax = async (stateManager) => {
  const val = await stateManager.retrieve("content_rating_max");
  return val?.[0] ?? "suggestive";
};

const getTrendingLimit = async (stateManager) => {
  const val = await stateManager.retrieve("trending_limit");
  return val ?? ["30"];
};

const getUploadersFiltering = async (stateManager) => {
  const current = await stateManager.retrieve("uploaders_toggled");
  if (typeof current === "boolean") return current;
  const legacy = await stateManager.retrieve("uploadersFiltering");
  return legacy?.enabled ?? false;
};

const getUploadersWhitelisted = async (stateManager) => {
  const current = await stateManager.retrieve("uploaders_whitelisted");
  if (typeof current === "boolean") return current;
  const legacy = await stateManager.retrieve("uploadersFiltering");
  return legacy?.whitelist ?? false;
};

const getStrictNameMatching = async (stateManager) => {
  const current = await stateManager.retrieve("strict_name_matching");
  if (typeof current === "boolean") return current;
  const legacy = await stateManager.retrieve("uploadersFiltering");
  return legacy?.strict ?? false;
};

const getUploaders = async (stateManager) => {
  const current = await stateManager.retrieve("uploaders");
  if (Array.isArray(current) && current.length > 0) return current;
  const legacy = await stateManager.retrieve("uploadersFiltering");
  const legacyList = Array.isArray(legacy?.list) ? legacy.list : [];
  if (legacyList.length > 0 && (!Array.isArray(current) || current.length === 0)) {
    await stateManager.store("uploaders", legacyList);
  }
  return Array.isArray(current) ? current : legacyList;
};

const getSelectedUploaders = async (stateManager) => {
  const selected = await stateManager.retrieve("uploaders_selected");
  if (Array.isArray(selected)) return selected;
  return [];
};

const getPriorityOrderedUploaders = async (stateManager) => {
  const current = await stateManager.retrieve("uploaders");
  if (Array.isArray(current) && current.length > 0) return current;
  const legacy = await stateManager.retrieve("uploadersFiltering");
  if (legacy && Array.isArray(legacy.list) && legacy.list.length > 0) {
    return legacy.list;
  }
  return Array.isArray(current) ? current : [];
};

const getShowTitle = async (stateManager) => {
  const current = await stateManager.retrieve("show_title");
  if (typeof current === "boolean") return current;
  const legacy = await stateManager.retrieve("showTitle");
  return legacy ?? true;
};

const getFollowLastReadGroup = async (stateManager) => {
  const current = await stateManager.retrieve("follow_last_read_group");
  if (typeof current === "boolean") return current;
  return true;
};

const getShowUploader = async (stateManager) => {
  const current = await stateManager.retrieve("show_uploader");
  if (typeof current === "boolean") return current;
  const legacy = await stateManager.retrieve("showUploader");
  return legacy ?? true;
};

const getOneVersionOnly = async (stateManager) => {
  const current = await stateManager.retrieve("one_version_only");
  if (typeof current === "boolean") return current;
  const legacy = await stateManager.retrieve("oneVersionOnly");
  return legacy ?? false;
};

const getRemoveDuplicates = async (stateManager) => {
  const current = await stateManager.retrieve("remove_duplicates");
  if (typeof current === "boolean") return current;
  const legacy = await stateManager.retrieve("removeDuplicates");
  return legacy ?? true;
};

const getDebugMode = async (stateManager) => {
  return await stateManager.retrieve("debug_mode") ?? false;
};

const getAutoSeedUploaders = async (stateManager) => {
  const val = await stateManager.retrieve("auto_seed_uploaders");
  if (typeof val === "boolean") return val;
  return true;
};

const autoSeedUploadersFromChapters = async (stateManager, chapters) => {
  const existing = await getUploaders(stateManager);
  const existingSet = new Set(existing.map((g) => cleanGroupName(String(g))));
  const seeded = [...existing];
  for (const chap of chapters) {
    const group = chap?.group?.name;
    if (!group || typeof group !== "string") continue;
    const clean = cleanGroupName(group);
    if (!clean || existingSet.has(clean)) continue;
    existingSet.add(clean);
    seeded.push(group);
  }
  if (seeded.length !== existing.length) {
    await stateManager.store("uploaders", seeded);
    const selected = await getSelectedUploaders(stateManager);
    if (!Array.isArray(selected) || selected.length === 0) {
      await stateManager.store("uploaders_selected", seeded);
    }
  }
};

const contentSettings = (stateManager) => {
  return keepAlive(App.createDUINavigationButton({
    id: "content_settings",
    label: "Extension Settings",
    form: App.createDUIForm({
      sections: async () => keepAlive([
        App.createDUISection({
          id: "home_settings",
          header: "Discover Page Settings",
          footer: "Adjust the time range for trending media on the Discover page.",
          isHidden: false,
          rows: async () => keepAlive([
            App.createDUISelect({
              id: "trending_limit",
              label: "Trending Timeframe",
              options: TRENDING_OPTIONS.map((opt) => opt.id),
              value: App.createDUIBinding({
                get: async () => await getTrendingLimit(stateManager),
                set: async (newValue) => await stateManager.store("trending_limit", newValue)
              }),
              allowsMultiselect: false,
              labelResolver: async (value) => {
                return TRENDING_OPTIONS.find((opt) => opt.id === value)?.label ?? value;
              }
            })
          ])
        }),
        App.createDUISection({
          id: "chapter_display_settings",
          header: "Chapter Display",
          footer: "Customize how chapters are rendered in the app.",
          isHidden: false,
          rows: async () => keepAlive([
            App.createDUISwitch({
              id: "show_title",
              label: "Show Title",
              value: App.createDUIBinding({
                get: async () => await getShowTitle(stateManager),
                set: async (newValue) => await stateManager.store("show_title", newValue)
              })
            }),
            App.createDUISwitch({
              id: "show_uploader",
              label: "Show Uploader",
              value: App.createDUIBinding({
                get: async () => await getShowUploader(stateManager),
                set: async (newValue) => await stateManager.store("show_uploader", newValue)
              })
            })
          ])
        }),
        App.createDUISection({
          id: "chapter_filtering_settings",
          header: "Chapter Filtering",
          footer: "Configure rules to hide duplicate versions or duplicates of chapters.",
          isHidden: false,
          rows: async () => keepAlive([
            App.createDUISwitch({
              id: "remove_duplicates",
              label: "Remove Duplicate Chapters",
              value: App.createDUIBinding({
                get: async () => await getRemoveDuplicates(stateManager),
                set: async (newValue) => await stateManager.store("remove_duplicates", newValue)
              })
            }),
            App.createDUISwitch({
              id: "one_version_only",
              label: "One Version Only",
              value: App.createDUIBinding({
                get: async () => await getOneVersionOnly(stateManager),
                set: async (newValue) => await stateManager.store("one_version_only", newValue)
              })
            }),
            App.createDUISwitch({
              id: "follow_last_read_group",
              label: "Follow Last Read Scanlator",
              value: App.createDUIBinding({
                get: async () => await getFollowLastReadGroup(stateManager),
                set: async (newValue) => await stateManager.store("follow_last_read_group", newValue)
              })
            })
          ])
        }),
        App.createDUISection({
          id: "rating_settings",
          header: "Content Filtering",
          footer: "Items with the selected rating or tamer are shown. Anything more explicit is hidden.",
          isHidden: false,
          rows: async () => keepAlive([
            App.createDUISelect({
              id: "content_rating_max",
              label: "Maximum Content Rating",
              options: CONTENT_RATINGS.map((r) => r.id),
              value: App.createDUIBinding({
                get: async () => [await getContentRatingMax(stateManager)],
                set: async (newValue) => await stateManager.store("content_rating_max", newValue)
              }),
              allowsMultiselect: false,
              labelResolver: async (value) => {
                return CONTENT_RATINGS.find((r) => r.id === value)?.label ?? value;
              }
            })
          ])
        })
      ])
    })
  }));
};

const groupSettings = (stateManager, requestManager) => {
  return keepAlive(App.createDUINavigationButton({
    id: "group_settings",
    label: "Scanlation Group Settings",
    form: App.createDUIForm({
      sections: async () => {
        // warm up state keys
        await getUploadersFiltering(stateManager);
        await getUploadersWhitelisted(stateManager);
        await getStrictNameMatching(stateManager);
        await getUploaders(stateManager);
        await getSelectedUploaders(stateManager);
        
        return keepAlive([
          App.createDUISection({
            id: "filtering_settings",
            header: "Filtering Settings",
            footer: "By default, listed groups are excluded from chapter lists (blacklist mode). Turn off Strict Matching to catch partial names.",
            isHidden: false,
            rows: async () => keepAlive([
              App.createDUISwitch({
                id: "toggle_uploaders_filtering",
                label: "Enable Group Filtering",
                value: App.createDUIBinding({
                  get: async () => await getUploadersFiltering(stateManager),
                  set: async (newValue) => await stateManager.store("uploaders_toggled", newValue)
                })
              }),
              App.createDUISwitch({
                id: "uploaders_switch",
                label: "Enable Whitelist Mode",
                value: App.createDUIBinding({
                  get: async () => await getUploadersWhitelisted(stateManager),
                  set: async (newValue) => await stateManager.store("uploaders_whitelisted", newValue)
                })
              }),
              App.createDUISwitch({
                id: "strict_name_matching",
                label: "Strict Group Name Matching",
                value: App.createDUIBinding({
                  get: async () => await getStrictNameMatching(stateManager),
                  set: async (newValue) => await stateManager.store("strict_name_matching", newValue)
                })
              }),
              App.createDUISwitch({
                id: "auto_seed_uploaders",
                label: "Auto-Collect Scanlators",
                value: App.createDUIBinding({
                  get: async () => await getAutoSeedUploaders(stateManager),
                  set: async (newValue) => await stateManager.store("auto_seed_uploaders", newValue)
                })
              })
            ])
          }),
          App.createDUISection({
            id: "manage_groups",
            header: "Manage Groups",
            isHidden: false,
            rows: async () => {
              const uploaders = await getUploaders(stateManager);
              return keepAlive([
                App.createDUINavigationButton({
                  id: "rearrange_groups_btn",
                  label: "Sort Scanlators Order",
                  form: App.createDUIForm({
                    sections: async () => {
                      const list = await getUploaders(stateManager);
                      return keepAlive([
                        App.createDUISection({
                          id: "rearrange_select_section",
                          header: "Select Group to Move",
                          isHidden: false,
                          rows: async () => {
                            const opts = list.map((s, idx) => `${idx + 1}. ${s}`);
                            return keepAlive([
                              App.createDUISelect({
                                id: "rearrange_selected",
                                label: "Scanlator List",
                                options: opts,
                                value: App.createDUIBinding({
                                  get: async () => await stateManager.retrieve("rearrange_selected") ?? [],
                                  set: async (newValue) => await stateManager.store("rearrange_selected", newValue)
                                }),
                                labelResolver: async (value) => value,
                                allowsMultiselect: false
                              })
                            ]);
                          }
                        }),
                        App.createDUISection({
                          id: "rearrange_actions",
                          header: "Actions",
                          isHidden: false,
                          rows: async () => keepAlive([
                            App.createDUIButton({
                              id: "rearrange_move_up",
                              label: "I\"AA Move Up",
                              onTap: async () => {
                                const selected = await stateManager.retrieve("rearrange_selected");
                                if (!Array.isArray(selected) || selected.length === 0) throw new Error("Select a group first!");
                                const label = selected[0];
                                const uploadersList = await getUploaders(stateManager);
                                const idx = uploadersList.findIndex((name, i) => `${i + 1}. ${name}` === label);
                                if (idx <= 0) throw new Error("Already at top or not found!");
                                const tmp = uploadersList[idx - 1];
                                uploadersList[idx - 1] = uploadersList[idx];
                                uploadersList[idx] = tmp;
                                await stateManager.store("uploaders", uploadersList);
                                const uploadersFilter = await stateManager.retrieve("uploadersFiltering") || { list: [] };
                                uploadersFilter.list = uploadersList;
                                await stateManager.store("uploadersFiltering", uploadersFilter);
                                await stateManager.store("rearrange_selected", [`${idx}. ${uploadersList[idx - 1]}`]);
                              }
                            }),
                            App.createDUIButton({
                              id: "rearrange_move_down",
                              label: "I\"AA' Move Down",
                              onTap: async () => {
                                const selected = await stateManager.retrieve("rearrange_selected");
                                if (!Array.isArray(selected) || selected.length === 0) throw new Error("Select a group first!");
                                const label = selected[0];
                                const uploadersList = await getUploaders(stateManager);
                                const idx = uploadersList.findIndex((name, i) => `${i + 1}. ${name}` === label);
                                if (idx < 0 || idx >= uploadersList.length - 1) throw new Error("Already at bottom or not found!");
                                const tmp = uploadersList[idx + 1];
                                uploadersList[idx + 1] = uploadersList[idx];
                                uploadersList[idx] = tmp;
                                await stateManager.store("uploaders", uploadersList);
                                const uploadersFilter = await stateManager.retrieve("uploadersFiltering") || { list: [] };
                                uploadersFilter.list = uploadersList;
                                await stateManager.store("uploadersFiltering", uploadersFilter);
                                await stateManager.store("rearrange_selected", [`${idx + 2}. ${uploadersList[idx + 1]}`]);
                              }
                            }),
                            App.createDUIButton({
                              id: "rearrange_delete",
                              label: "Delete Selected",
                              onTap: async () => {
                                const selected = await stateManager.retrieve("rearrange_selected");
                                if (!Array.isArray(selected) || selected.length === 0) throw new Error("Select a group first!");
                                const label = selected[0];
                                const uploadersList = await getUploaders(stateManager);
                                const idx = uploadersList.findIndex((name, i) => `${i + 1}. ${name}` === label);
                                if (idx < 0) throw new Error("Group not found!");
                                const removed = uploadersList[idx];
                                uploadersList.splice(idx, 1);
                                await stateManager.store("uploaders", uploadersList);
                                const uploadersFilter = await stateManager.retrieve("uploadersFiltering") || { list: [] };
                                uploadersFilter.list = uploadersList;
                                await stateManager.store("uploadersFiltering", uploadersFilter);
                                const selectedList = await getSelectedUploaders(stateManager);
                                const newSelected = selectedList.filter((s) => s !== removed);
                                await stateManager.store("uploaders_selected", newSelected);
                                await stateManager.store("rearrange_selected", []);
                              }
                            })
                          ])
                        }),
                        App.createDUISection({
                          id: "rearrange_add_section",
                          header: "Add New Group",
                          isHidden: false,
                          rows: async () => keepAlive([
                            App.createDUIInputField({
                              id: "rearrange_add_input",
                              label: "Group Name",
                              value: App.createDUIBinding({
                                get: async () => await stateManager.retrieve("rearrange_add_name") ?? "",
                                  set: async (newValue) => await stateManager.store("rearrange_add_name", newValue)
                              })
                            }),
                            App.createDUIButton({
                              id: "rearrange_add_btn",
                              label: "+ Add Group",
                              onTap: async () => {
                                const name = await stateManager.retrieve("rearrange_add_name");
                                if (!name || name.trim() === "") throw new Error("Group name cannot be empty!");
                                const uploadersList = await getUploaders(stateManager);
                                if (uploadersList.includes(name.trim())) throw new Error(`"${name.trim()}" is already in the list!`);
                                uploadersList.push(name.trim());
                                await stateManager.store("uploaders", uploadersList);
                                const uploadersFilter = await stateManager.retrieve("uploadersFiltering") || { list: [] };
                                uploadersFilter.list = uploadersList;
                                await stateManager.store("uploadersFiltering", uploadersFilter);
                                await stateManager.store("rearrange_add_name", "");
                              }
                            })
                          ])
                        })
                      ]);
                    }
                  })
                })
              ]);
            }
          })
        ]);
      }
    })
  }));
};

const getTagBlacklist = async (stateManager) => {
  return await stateManager.retrieve("tag_blacklist") ?? [];
};
const getTagFilterEnabled = async (stateManager) => {
  return await stateManager.retrieve("tag_filter_enabled") ?? false;
};
const getTagWhitelistMode = async (stateManager) => {
  return await stateManager.retrieve("tag_whitelist_mode") ?? false;
};
const getTagAndMode = async (stateManager) => {
  return await stateManager.retrieve("tag_and_mode") ?? false;
};
const getTypeFilter = async (stateManager) => {
  return await stateManager.retrieve("type_filter") ?? [];
};

let tagCacheWarmUp = null;
const resetTagCacheWarmUp = () => {
  tagCacheWarmUp = null;
};

const warmUpTagCache = (stateManager, requestManager) => {
  if (!tagCacheWarmUp) {
    tagCacheWarmUp = (async () => {
      const existing = await getCachedTags(stateManager);
      if (existing) return existing;
      try {
        const fetchTerms = async (type) => {
          const req = App.createRequest({
            url: signUrlCust(`${API_BASE}/tags/search?type=${type}&limit=50`),
            method: "GET"
          });
          const res = await requestManager.schedule(req, 1);
          const json = JSON.parse(res.data ?? "{}");
          return Array.isArray(json.result) ? json.result : [];
        };
        const [genre, theme, format, demographic] = await Promise.all([
          fetchTerms("genre"),
          fetchTerms("tag"),
          fetchTerms("format"),
          fetchTerms("demographic")
        ]);
        const cache = { genre, theme, format, demographic, ts: Date.now() };
        await stateManager.store("tag_cache_v1", JSON.stringify(cache));
        return cache;
      } catch {
        return null;
      }
    })();
  }
  return tagCacheWarmUp;
};

const tagFilterSettings = (stateManager, requestManager) => {
  return keepAlive(App.createDUINavigationButton({
    id: "tag_filter_settings",
    label: "Tag Filter",
    form: App.createDUIForm({
      sections: async () => {
        const cache = await warmUpTagCache(stateManager, requestManager);
        if (!cache) {
          return keepAlive([
            App.createDUISection({
              id: "tag_filter_error",
              header: "Tag Filter",
              footer: "Failed to load tags. Please close and re-open this menu to retry.",
              isHidden: false,
              rows: async () => keepAlive([])
            })
          ]);
        }
        const makeSelect = (categoryId, label, items) => {
          const options = items.map((x) => String(x.id));
          const labelMap = new Map(items.map((x) => [String(x.id), x.label]));
          return keepAlive(App.createDUISelect({
            id: `tag_filter_select_${categoryId}`,
            label,
            options,
            value: App.createDUIBinding({
              get: async () => {
                const all = await getTagBlacklist(stateManager);
                return all.filter((id) => options.includes(id));
              },
              set: async (newValue) => {
                const all = await getTagBlacklist(stateManager);
                const others = all.filter((id) => !options.includes(id));
                await stateManager.store("tag_blacklist", [...others, ...newValue]);
              }
            }),
            labelResolver: async (value) => labelMap.get(value) ?? value,
            allowsMultiselect: true
          }));
        };
        return keepAlive([
          App.createDUISection({
            id: "tag_filter_mode",
            header: "Tag Filter Settings",
            footer: "Blacklist (default): hide titles that match any checked item. Whitelist: show only titles that match. AND Mode: require all checked tags to match instead of any.",
            isHidden: false,
            rows: async () => keepAlive([
              App.createDUISwitch({
                id: "tag_filter_enabled",
                label: "Enable Tag Filter",
                value: App.createDUIBinding({
                  get: async () => await getTagFilterEnabled(stateManager),
                  set: async (newValue) => await stateManager.store("tag_filter_enabled", newValue)
                })
              }),
              App.createDUISwitch({
                id: "tag_whitelist_mode",
                label: "Enable Whitelist Mode",
                value: App.createDUIBinding({
                  get: async () => await getTagWhitelistMode(stateManager),
                  set: async (newValue) => await stateManager.store("tag_whitelist_mode", newValue)
                })
              }),
              App.createDUISwitch({
                id: "tag_and_mode",
                label: "AND Mode",
                value: App.createDUIBinding({
                  get: async () => await getTagAndMode(stateManager),
                  set: async (newValue) => await stateManager.store("tag_and_mode", newValue)
                })
              }),
              App.createDUILabel({
                id: "tag_load_status",
                label: "Tag Status",
                value: "Loaded"
              })
            ])
          }),
          App.createDUISection({
            id: "tag_categories",
            header: "Tag Categories",
            footer: "Checked items will be filtered from Discovery and Search results per the mode above.",
            isHidden: false,
            rows: async () => keepAlive([
              keepAlive(App.createDUISelect({
                id: "type_filter_select",
                label: "Content Type",
                options: CONTENT_TYPES.map((x) => x.id),
                value: App.createDUIBinding({
                  get: async () => await getTypeFilter(stateManager),
                  set: async (newValue) => await stateManager.store("type_filter", newValue)
                }),
                labelResolver: async (value) => CONTENT_TYPES.find((x) => x.id === value)?.label ?? value,
                allowsMultiselect: true
              })),
              makeSelect("genre", "Genres", cache.genre),
              makeSelect("theme", "Themes", cache.theme),
              makeSelect("format", "Formats", cache.format),
              makeSelect("demographic", "Demographics", cache.demographic)
            ])
          })
        ]);
      }
    })
  }));
};

const resetSettings = (stateManager) => {
  return keepAlive(App.createDUIButton({
    id: "reset",
    label: "Reset All Settings to Default",
    onTap: async () => {
      await stateManager.store("trending_limit", null);
      await stateManager.store("is_nsfw", null);
      await stateManager.store("content_rating_max", null);
      await stateManager.store("uploaders", null);
      await stateManager.store("uploaders_selected", null);
      await stateManager.store("uploaders_whitelisted", null);
      await stateManager.store("uploaders_toggled", null);
      await stateManager.store("uploader_input", null);
      await stateManager.store("strict_name_matching", null);
      await stateManager.store("auto_seed_uploaders", null);
      await stateManager.store("uploadersFiltering", null);
      await stateManager.store("tag_cache_v1", null);
      await stateManager.store("tag_blacklist", null);
      await stateManager.store("tag_filter_enabled", null);
      await stateManager.store("tag_whitelist_mode", null);
      await stateManager.store("tag_and_mode", null);
      await stateManager.store("type_filter", null);
      await stateManager.store("follow_last_read_group", null);
      await stateManager.store("comix.remoteConstants.v2", null);
      resetTagCacheWarmUp();
    }
  }));
};

// --- Custom Priority Chapters Sorting & Deduplication ---
function myCustomParseChapters(data, isFiltering, isWhitelist, isStrict, savedGroups, showTitle = true, oneVersionOnly = false, showUploader = true, removeDuplicates = true, priorityGroups = savedGroups, debugShowPriority = false, followLastRead = false, lastReadGroup = null) {
  const rawChapters = [];
  for (const chap of data) {
    rawChapters.push({
      id: chap.id.toString(),
      chapNum: chap.number,
      name: chap.name,
      langCode: chap.language || "en",
      volume: chap.volume,
      group: chap.group?.name || "",
      time: parseRelativeTime(chap.createdAtFormatted),
      sortingIndex: chap.number
    });
  }
  
  const grouped = rawChapters.reduce((acc, chap) => {
    if (!acc[chap.chapNum]) acc[chap.chapNum] = [];
    acc[chap.chapNum].push(chap);
    return acc;
  }, {});
  
  const finalChapters = [];
  const uploaderList = (priorityGroups ?? []).map((u) => normalizeString(u).toLowerCase());
  const uploaderListClean = (priorityGroups ?? []).map((u) => cleanGroupName(u));
  
  const lastReadGroupNorm = lastReadGroup ? normalizeString(lastReadGroup).toLowerCase() : null;
  const lastReadGroupClean = lastReadGroup ? cleanGroupName(lastReadGroup) : null;
  const getPriorityIndex = (groupName) => {
    if (!groupName || typeof groupName !== "string") return 9999;
    const cleanNorm = cleanGroupName(groupName);
    const normalized = normalizeString(groupName).toLowerCase();
    
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
  
  if (oneVersionOnly) {
    const chapNums = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));
    let activeGroup = null;
    for (const chapNum of chapNums) {
      const variants = grouped[chapNum];
      let filtered = [...variants];
      
      if (isFiltering && savedGroups && savedGroups.length > 0) {
        if (!isWhitelist) {
          filtered = filtered.filter((v) => {
            const cleanGroup = cleanGroupName(v.group || "");
            const normalizedGroup = normalizeString(v.group || "").toLowerCase();
            const isMatched = savedGroups.some((item) => {
              const cleanItem = cleanGroupName(item);
              const normalizedItem = normalizeString(item).toLowerCase();
              if (isStrict) {
                return cleanGroup === cleanItem;
              } else {
                return cleanGroup === cleanItem || cleanGroup.includes(cleanItem) || cleanItem.includes(cleanGroup) || normalizedGroup.includes(normalizedItem);
              }
            });
            return !isMatched;
          });
        }
        if (isWhitelist && filtered.length > 0) {
          const whitelisted = filtered.filter((v) => {
            const cleanGroup = cleanGroupName(v.group || "");
            const normalizedGroup = normalizeString(v.group || "").toLowerCase();
            return savedGroups.some((item) => {
              const cleanItem = cleanGroupName(item);
              const normalizedItem = normalizeString(item).toLowerCase();
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
      
      filtered.sort((a, b) => {
        const aIdx = getPriorityIndex(a.group || "");
        const bIdx = getPriorityIndex(b.group || "");
        return aIdx - bIdx;
      });
      
      let chosen = null;
      if (activeGroup) {
        const cleanActive = cleanGroupName(activeGroup);
        const normActive = normalizeString(activeGroup).toLowerCase();
        chosen = filtered.find((v) => {
          const cleanNorm = cleanGroupName(v.group || "");
          const norm = normalizeString(v.group || "").toLowerCase();
          if (isStrict) return cleanNorm === cleanActive;
          return cleanNorm === cleanActive || cleanNorm.includes(cleanActive) || cleanActive.includes(cleanNorm) || norm.includes(normActive) || normActive.includes(norm);
        });
      }
      if (!chosen) {
        chosen = filtered[0];
        activeGroup = chosen.group || "";
      }
      
      const chap = chosen;
      const groupTag = showUploader && chap.group ? ` [${chap.group}]` : "";
      let displayName = showTitle && chap.name ? `${chap.name}${groupTag}` : `Chapter ${chap.chapNum}${groupTag}`;
      const pIdx = getPriorityIndex(chap.group || "");
      if (debugShowPriority && pIdx !== 9999) {
        displayName = `${displayName} (P:${pIdx})`;
      }
      
      finalChapters.push(
        App.createChapter({
          id: chap.id,
          chapNum: chap.chapNum,
          name: displayName,
          langCode: chap.langCode,
          volume: chap.volume,
          group: chap.group,
          time: chap.time,
          sortingIndex: chap.sortingIndex
        })
      );
    }
  } else {
    for (const chapNum in grouped) {
      const variants = grouped[chapNum];
      let filtered = [...variants];
      
      if (isFiltering && savedGroups && savedGroups.length > 0) {
        if (!isWhitelist) {
          filtered = filtered.filter((v) => {
            const cleanGroup = cleanGroupName(v.group || "");
            const normalizedGroup = normalizeString(v.group || "").toLowerCase();
            const isMatched = savedGroups.some((item) => {
              const cleanItem = cleanGroupName(item);
              const normalizedItem = normalizeString(item).toLowerCase();
              if (isStrict) {
                return cleanGroup === cleanItem;
              } else {
                return cleanGroup === cleanItem || cleanGroup.includes(cleanItem) || cleanItem.includes(cleanGroup) || normalizedGroup.includes(normalizedItem);
              }
            });
            return !isMatched;
          });
        }
        if (isWhitelist && filtered.length > 0) {
          const whitelisted = filtered.filter((v) => {
            const cleanGroup = cleanGroupName(v.group || "");
            const normalizedGroup = normalizeString(v.group || "").toLowerCase();
            return savedGroups.some((item) => {
              const cleanItem = cleanGroupName(item);
              const normalizedItem = normalizeString(item).toLowerCase();
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
      
      filtered.sort((a, b) => {
        const aIdx = getPriorityIndex(a.group || "");
        const bIdx = getPriorityIndex(b.group || "");
        return aIdx - bIdx;
      });
      
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
      
      for (const chap of filtered) {
        const groupTag = showUploader && chap.group ? ` [${chap.group}]` : "";
        let displayName = showTitle && chap.name ? `${chap.name}${groupTag}` : `Chapter ${chap.chapNum}${groupTag}`;
        const pIdx = getPriorityIndex(chap.group || "");
        if (debugShowPriority && pIdx !== 9999) {
          displayName = `${displayName} (P:${pIdx})`;
        }
        
        finalChapters.push(
          App.createChapter({
            id: chap.id,
            chapNum: chap.chapNum,
            name: displayName,
            langCode: chap.langCode,
            volume: chap.volume,
            group: chap.group,
            time: chap.time,
            sortingIndex: chap.sortingIndex
          })
        );
      }
    }
  }
  
  finalChapters.sort((a, b) => {
    if (b.sortingIndex !== a.sortingIndex) return Number(b.sortingIndex) - Number(a.sortingIndex);
    const aIdx = getPriorityIndex(a.group || "");
    const bIdx = getPriorityIndex(b.group || "");
    return aIdx - bIdx;
  });
  return finalChapters;
}

// --- 4. Subclassing & Monkey-Patching (Appended Execution) ---
const OriginalComixTo = _Sources.ComixTo;
const OriginalComixToInfo = _Sources.ComixToInfo;

const NewComixToInfo = {
  ...OriginalComixToInfo,
  version: "1.8.12",
  author: "Michiya52",
  authorWebsite: "https://github.com/Michiya52",
  description: "Read manga from ComixTo with advanced filters"
};

const NewComixTo = class extends OriginalComixTo {
  constructor() {
    super(...arguments);
    
    // Overwrite requestManager interceptResponse to guarantee that decrypted bytes are written back
    if (this.requestManager?.interceptor) {
      this.requestManager.interceptor.interceptResponse = async (response) => {
        if (!response || !response.rawData) return response;
        const enc = readEncHeadersCust(response.headers);
        if (!enc) return response;
        try {
          const bytes = App.createByteArray(response.rawData);
          decryptComixImageCust(bytes, enc.seed, enc.len);
          response.rawData = bytes; // FORCE ASSIGN BACK!
        } catch (error) {
          console.log(`[ComixTo] image decrypt override error: ${error?.message ?? String(error)}`);
        }
        return response;
      };
    }
    
    // Monkey-patch parseChapters on the parser instance
    this.parser.parseChapters = async (chapters) => {
      // Cache mapping of chapterId -> groupName persistently (for ALL variants, before filtering)
      if (this.activeMangaId) {
        try {
          const map = {};
          for (const chap of chapters) {
            const chapId = chap.id?.toString();
            const groupName = chap.group?.name || "";
            if (chapId && groupName) {
              map[chapId] = groupName;
            }
          }
          await this.stateManager.store(`chapter_groups_${this.activeMangaId}`, JSON.stringify(map));
        } catch (e) {
          console.log(`[ComixTo] Error caching chapter groups: ${e.message}`);
        }
      }

      if (await getAutoSeedUploaders(this.stateManager)) {
        await autoSeedUploadersFromChapters(this.stateManager, chapters);
      }
      
      const [isFiltering, isWhitelist, isStrict, savedGroups, selectedGroups, showTitle, oneVersionOnly, showUploader, removeDuplicates, debugMode, priorityOrder, followLastRead, lastReadGroup] = await Promise.all([
        getUploadersFiltering(this.stateManager),
        getUploadersWhitelisted(this.stateManager),
        getStrictNameMatching(this.stateManager),
        getUploaders(this.stateManager),
        getSelectedUploaders(this.stateManager),
        getShowTitle(this.stateManager),
        getOneVersionOnly(this.stateManager),
        getShowUploader(this.stateManager),
        getRemoveDuplicates(this.stateManager),
        getDebugMode(this.stateManager),
        getPriorityOrderedUploaders(this.stateManager),
        getFollowLastReadGroup(this.stateManager),
        this.activeMangaId ? this.stateManager.retrieve("last_read_group_" + this.activeMangaId) : Promise.resolve(null)
      ]);
      
      const preferredGroups = Array.isArray(priorityOrder) && priorityOrder.length > 0 ? priorityOrder : savedGroups;
      return myCustomParseChapters(chapters, isFiltering, isWhitelist, isStrict, savedGroups, showTitle, oneVersionOnly, showUploader, removeDuplicates, preferredGroups, debugMode, followLastRead, lastReadGroup);
    };
  }

  async getChapters(mangaId) {
    this.activeMangaId = mangaId;
    return await super.getChapters(mangaId);
  }

  async getChapterDetails(mangaId, chapterId) {
    const details = await super.getChapterDetails(mangaId, chapterId);
    
    try {
      const rawMap = await this.stateManager.retrieve(`chapter_groups_${mangaId}`);
      if (rawMap) {
        const map = JSON.parse(rawMap);
        const groupName = map[chapterId];
        if (groupName) {
          await this.stateManager.store(`last_read_group_${mangaId}`, groupName);
        }
      }
    } catch (e) {
      console.log(`[ComixTo] Error setting last read group: ${e.message}`);
    }
    
    return details;
  }

  // Override settings menu dynamically
  async getSourceMenu() {
    return keepAlive(App.createDUISection({
      id: "main",
      header: "Source Settings",
      isHidden: false,
      rows: async () => keepAlive([
        contentSettings(this.stateManager),
        groupSettings(this.stateManager, this.requestManager),
        tagFilterSettings(this.stateManager, this.requestManager),
        resetSettings(this.stateManager)
      ])
    }));
  }
};

const CustomSources = {
  ..._Sources,
  ComixTo: NewComixTo,
  ComixToInfo: NewComixToInfo
};

// Re-assign the Sources object globally and to exports
this.Sources = CustomSources;
this.signUrlCust = signUrlCust;
if (typeof exports === 'object' && typeof module !== 'undefined') {
  module.exports.Sources = this.Sources;
}
