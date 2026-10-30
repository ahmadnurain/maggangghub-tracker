/**
 * Endpoint: GET /api/vacancies
 */
import { fetchMagangHubVacancies } from "../_lib/maganghub.js";
import { normalizeVacancy } from "../_lib/normalize.js";
import { getCache, setCache } from "../_lib/cache.js";
import minimumWages from "../../data/minimum-wages.json" assert { type: "json" };

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const keyword = (url.searchParams.get("keyword") || "").trim();
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const sort = url.searchParams.get("sort") || "least_applicants";
  const province = (url.searchParams.get("province") || "").trim();
  const city = (url.searchParams.get("city") || "").trim();
  const kecamatan = (url.searchParams.get("kecamatan") || "").trim();
  const prodi = (url.searchParams.get("prodi") || "").trim();
  const education = (url.searchParams.get("education") || "").trim();
  const companyType = (url.searchParams.get("companyType") || "").trim();

  // Resolve best search term for Kemnaker
  let resolvedQuery = keyword;
  if (!resolvedQuery) {
    if (kecamatan) {
      resolvedQuery = kecamatan.replace(/^kecamatan\s+/i, "").trim();
    } else if (city) {
      resolvedQuery = city.replace(/^(Kota Adm\.|Kota|Kab\.|Kabupaten)\s+/i, "").trim();
    } else if (prodi && prodi.toLowerCase() !== "semua") {
      resolvedQuery = prodi;
    } else if (province) {
      resolvedQuery = province;
    }
  }

  const cacheKey = `vacancies:${resolvedQuery}:${page}:${sort}:${province}:${city}:${prodi}:${education}:${companyType}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
    });
  }

  const result = await fetchMagangHubVacancies({ keyword: resolvedQuery, page, sort });

  if (!result.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: result.error,
        message: result.message,
        items: [],
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  let normalizedItems = (result.rawItems || [])
    .map((item) => normalizeVacancy(item, minimumWages))
    .filter(Boolean);

  // Apply secondary filters
  if (education) {
    const edu = education.toLowerCase();
    normalizedItems = normalizedItems.filter((v) => {
      if (!v.educationLevels || !v.educationLevels.length) return true;
      return v.educationLevels.some((l) => {
        const low = l.toLowerCase();
        if (edu === "bachelor") return low.includes("bachelor") || low.includes("sarjana") || low.includes("s1");
        if (edu === "diploma") return low.includes("diploma") || low.includes("d3") || low.includes("d4");
        if (edu === "vocational") return low.includes("vocational") || low.includes("smk") || low.includes("sma");
        return low.includes(edu);
      });
    });
  }

  if (companyType) {
    normalizedItems = normalizedItems.filter((v) => v.companyType === companyType);
  }

  if (prodi && prodi.toLowerCase() !== "semua") {
    const pLower = prodi.toLowerCase().trim();
    normalizedItems = normalizedItems.filter((v) => {
      if (!v.studyPrograms || !v.studyPrograms.length) return true;
      return v.studyPrograms.some((sp) => {
        const sLower = sp.toLowerCase().trim();
        return sLower.includes(pLower) || pLower.includes(sLower) || sLower.includes("semua");
      });
    });
  }

  const responsePayload = {
    success: true,
    meta: {
      ...result.meta,
      returnedCount: normalizedItems.length,
    },
    resolvedQuery,
    source: result.source,
    fetchedAt: new Date().toISOString(),
    items: normalizedItems,
  };

  setCache(cacheKey, responsePayload, 5 * 60 * 1000);

  return new Response(JSON.stringify(responsePayload), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
      "X-Cache": "MISS",
    },
  });
}
