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

export async function fetchMagangHubVacancies({ keyword = "", page = 1, sort = "least_applicants", timeout = 12000 }) {
  // Strategy 1: Primary - Next.js Server Action
  try {
    const params = { page: Number(page) || 1, sort };
    if (keyword) params.keyword = keyword;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(MAGANGHUB_ENDPOINT, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
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
    return await fetchFallbackVacancies({ keyword, page });
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

export async function fetchVacancyDetail(id, timeout = 10000) {
  if (!id) return null;
  const url = `https://maganghub.kemnaker.go.id/magang-nasional/lowongan/${id}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0",
        "Accept": "text/html",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const html = await res.text();

    // Look for vacancy object in RSC self.__next_f pushes
    const marker = '"vacancy":{';
    const idx = html.indexOf(marker);
    if (idx === -1) return null;

    const start = idx + '"vacancy":'.length;
    let depth = 0;
    let inQuote = false;
    let escape = false;
    let end = start;

    for (let i = start; i < html.length; i++) {
      const c = html[i];
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if (c === '"') { inQuote = !inQuote; continue; }
      if (!inQuote) {
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) { end = i + 1; break; }
        }
      }
    }

    const unescaped = html.slice(start, end).replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\//g, "/");
    return JSON.parse(unescaped);
  } catch (_) {
    return null;
  }
}
