import { fetchMagangHubVacancies, fetchVacancyDetail } from "./functions/_lib/maganghub.js";
import { normalizeVacancy } from "./functions/_lib/normalize.js";
import { getCache, setCache } from "./functions/_lib/cache.js";

import minimumWages from "./data/minimum-wages.json";
import regions from "./data/regions.json";
import studyPrograms from "./data/study-programs.json";
import education from "./data/education.json";

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // API: GET /api/health
    if (pathname === "/api/health") {
      return jsonResponse({
        status: "ok",
        app: "MagangFinder",
        version: "2.0",
        platform: "Cloudflare Worker",
        timestamp: new Date().toISOString(),
      });
    }

    // API: GET /api/filters
    if (pathname === "/api/filters") {
      return jsonResponse(
        {
          success: true,
          data: {
            regions,
            studyPrograms,
            education,
            companyTypes: ["Pemerintah", "Perusahaan"],
            sortOptions: [
              { value: "least_applicants", label: "Pelamar Terendah" },
              { value: "most_applicants", label: "Pelamar Tertinggi" },
              { value: "most_quota", label: "Kuota Tertinggi" },
              { value: "least_quota", label: "Kuota Terendah" },
              { value: "highest_salary", label: "Gaji Tertinggi" },
              { value: "lowest_salary", label: "Gaji Terendah" },
              { value: "latest", label: "Lowongan Terbaru" },
            ],
          },
        },
        200,
        { "Cache-Control": "public, max-age=86400" }
      );
    }

    // API: GET /api/vacancies
    if (pathname === "/api/vacancies") {
      try {
        const keyword = (url.searchParams.get("keyword") || "").trim();
        const page = parseInt(url.searchParams.get("page") || "1", 10) || 1;
        const sort = url.searchParams.get("sort") || "least_applicants";
        const province = (url.searchParams.get("province") || "").trim();
        const city = (url.searchParams.get("city") || "").trim();
        const kecamatan = (url.searchParams.get("kecamatan") || "").trim();
        const prodi = (url.searchParams.get("prodi") || "").trim();
        const educationFilter = (url.searchParams.get("education") || "").trim();
        const companyType = (url.searchParams.get("companyType") || "").trim();

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

        const cacheKey = `vacancies:${resolvedQuery}:${page}:${sort}:${province}:${city}:${prodi}:${educationFilter}:${companyType}`;
        const cached = getCache(cacheKey);
        if (cached) {
          return jsonResponse(cached, 200, { "X-Cache": "HIT" });
        }

        const result = await fetchMagangHubVacancies({ keyword: resolvedQuery, page, sort });
        if (!result.success) {
          return jsonResponse(
            {
              success: false,
              error: result.error,
              message: result.message,
              primaryError: result.primaryError,
              items: [],
            },
            502
          );
        }

        let normalizedItems = (result.rawItems || [])
          .map((item) => normalizeVacancy(item, minimumWages))
          .filter(Boolean);

        if (educationFilter) {
          const edu = educationFilter.toLowerCase();
          normalizedItems = normalizedItems.filter((v) => {
            if (!v.educationLevels || !v.educationLevels.length) return true;
            return v.educationLevels.some((l) => l.toLowerCase().includes(edu) || edu.includes(l.toLowerCase()));
          });
        }

        if (companyType) {
          const ct = companyType.toLowerCase();
          normalizedItems = normalizedItems.filter((v) => {
            if (!v.organizer || !v.organizer.type) return true;
            return v.organizer.type.toLowerCase() === ct;
          });
        }

        const responsePayload = {
          success: true,
          source: result.source,
          meta: result.meta,
          query: {
            keyword: resolvedQuery,
            page,
            sort,
            filters: { province, city, kecamatan, prodi, education: educationFilter, companyType },
          },
          items: normalizedItems,
        };

        setCache(cacheKey, responsePayload, 5 * 60 * 1000);
        return jsonResponse(responsePayload);
      } catch (err) {
        return jsonResponse({ success: false, error: err.message }, 500);
      }
    }

    // API: GET /api/vacancy/:id
    if (pathname.startsWith("/api/vacancy/")) {
      const id = pathname.replace("/api/vacancy/", "").trim();
      if (!id) {
        return jsonResponse({ success: false, error: "INVALID_ID" }, 400);
      }

      const cacheKey = `vacancy:${id}`;
      const cached = getCache(cacheKey);
      if (cached) {
        return jsonResponse(cached, 200, { "X-Cache": "HIT" });
      }

      const raw = await fetchVacancyDetail(id);
      if (!raw) {
        return jsonResponse({ success: false, error: "NOT_FOUND", message: "Lowongan tidak ditemukan" }, 404);
      }

      const normalized = normalizeVacancy(raw, minimumWages);
      const responsePayload = { success: true, data: normalized };
      setCache(cacheKey, responsePayload, 15 * 60 * 1000);
      return jsonResponse(responsePayload);
    }

    // Serve static assets from public/ directory via ASSETS binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};

