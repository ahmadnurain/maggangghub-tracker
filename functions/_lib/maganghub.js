/**
 * MagangHub Next.js Server Action Adapter & Resilient Parser
 */

const SERVER_ACTION_ID = "4042e54ac927b18cee0deb2e4ec2ecee4980c12ec1";
const MAGANGHUB_ENDPOINT = "https://maganghub.kemnaker.go.id/magang-nasional/lowongan";
const PANTAULOKER_FALLBACK = "https://www.pantauloker.co/pl/vacancies/active";

export function parseRSCResponse(text) {
  const marker = '1:{"data":';
  const index = text.indexOf(marker);

  if (index === -1) {
    throw new Error("MAGANGHUB_RSC_DATA_NOT_FOUND");
  }

  const line = text.slice(index + 2).split("\n")[0];
  try {
    return JSON.parse(line);
  } catch (err) {
    throw new Error("MAGANGHUB_PARSE_ERROR: " + err.message);
  }
}

const FETCH_CITY_ACTION = "40e1c37678fa7370176b51628e8ed8cdd9eed9a303";
const cityCache = new Map();

export async function resolveCityOption(cityName, timeout = 7000) {
  if (!cityName) return null;
  const stripped = cityName.replace(/^(Kota Adm\.|Kota|Kab\.|Kabupaten)\s+/i, "").trim();
  const searchName = stripped.charAt(0).toUpperCase() + stripped.slice(1);
  const cacheKey = searchName.toLowerCase();
  if (cityCache.has(cacheKey)) return cityCache.get(cacheKey);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch("https://maganghub.kemnaker.go.id/magang-nasional/lowongan", {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        "Accept": "text/x-component",
        "Next-Action": FETCH_CITY_ACTION,
        "Content-Type": "text/plain;charset=UTF-8",
        "Referer": "https://maganghub.kemnaker.go.id/magang-nasional/lowongan",
        "Origin": "https://maganghub.kemnaker.go.id",
      },
      body: JSON.stringify([searchName]),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const text = await res.text();
    const marker = '1:{"data":';
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      const json = JSON.parse(text.slice(idx + 2).split("\n")[0]);
      if (Array.isArray(json.data) && json.data.length > 0) {
        const found = json.data.find((c) => c.name && c.name.toLowerCase().includes(cacheKey)) || json.data[0];
        const resObj = { id: found.id, label: found.name };
        cityCache.set(cacheKey, resObj);
        return resObj;
      }
    }
  } catch (_) {}
  return null;
}

export async function fetchMagangHubVacancies({ keyword = "", page = 1, sort = "least_applicants", cityIds = [], timeout = 20000 }) {
  // Strategy 1: Primary - Next.js Server Action
  try {
    const params = { page: Number(page) || 1, sort };
    if (keyword) params.keyword = keyword;
    if (Array.isArray(cityIds) && cityIds.length > 0) {
      params.city_id = cityIds;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(MAGANGHUB_ENDPOINT, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        "Accept": "text/x-component",
        "Next-Action": SERVER_ACTION_ID,
        "Content-Type": "text/plain;charset=UTF-8",
        "Referer": "https://maganghub.kemnaker.go.id/magang-nasional/lowongan",
        "Origin": "https://maganghub.kemnaker.go.id",
      },
      body: JSON.stringify([params]),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    const text = await response.text();
    const payload = parseRSCResponse(text);

    return {
      success: true,
      source: "maganghub_live",
      meta: {
        total: payload.meta?.total || 0,
        currentPage: payload.meta?.currentPage || page,
        lastPage: payload.meta?.lastPage || 1,
        perPage: payload.meta?.perPage || 18,
      },
      rawItems: payload.data || [],
    };
  } catch (err) {
    // Strategy 2: Fallback to active mirror / pantauloker API
    console.warn("Primary MagangHub fetch failed, using fallback source:", err.message);
    const fallback = await fetchFallbackVacancies({ keyword, page });
    if (!fallback.success) {
      fallback.primaryError = err.message;
    }
    return fallback;
  }
}

async function fetchFallbackVacancies({ keyword = "", page = 1 }) {
  try {
    const q = keyword ? `&q=${encodeURIComponent(keyword)}` : "";
    const url = `${PANTAULOKER_FALLBACK}?page=${page}&limit=18${q}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Fallback HTTP ${res.status}`);
    }

    const json = await res.json();
    return {
      success: true,
      source: "maganghub_mirror",
      meta: {
        total: json.pagination?.total || 0,
        currentPage: json.pagination?.page || page,
        lastPage: json.pagination?.totalPages || 1,
        perPage: json.pagination?.limit || 18,
      },
      rawItems: json.data || [],
    };
  } catch (fallbackErr) {
    return {
      success: false,
      error: "MAGANGHUB_UNAVAILABLE",
      message: "Data MagangHub sementara tidak dapat diakses.",
      rawItems: [],
    };
  }
}

export async function fetchVacancyDetail(id, timeout = 12000) {
  if (!id) return null;
  const url = `https://maganghub.kemnaker.go.id/magang-nasional/lowongan/${id}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        "Accept": "text/x-component, text/html, */*",
        "RSC": "1",
        "Next-Url": `/magang-nasional/lowongan/${id}`,
        "sec-ch-ua": '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const content = await res.text();

    return extractVacancyFromPayload(content);
  } catch (_) {
    return null;
  }
}

export function extractVacancyFromPayload(content) {
  if (!content) return null;

  let marker = '"vacancy":{';
  let idx = content.indexOf(marker);
  let isEscaped = false;

  if (idx === -1) {
    marker = '\\"vacancy\\":{';
    idx = content.indexOf(marker);
    isEscaped = true;
  }

  if (idx === -1) return null;

  const start = idx + marker.length - 1;
  let depth = 0;
  let end = start;
  let inString = false;
  let inEscape = false;

  for (let i = start; i < content.length; i++) {
    const c = content[i];
    if (inEscape) {
      inEscape = false;
      continue;
    }
    if (c === "\\") {
      inEscape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
  }

  let raw = content.slice(start, end);
  if (isEscaped) {
    raw = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}
