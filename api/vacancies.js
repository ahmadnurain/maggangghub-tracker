import fs from "node:fs";
import path from "node:path";
import { fetchMagangHubVacancies, resolveCityOption } from "../functions/_lib/maganghub.js";
import { normalizeVacancy } from "../functions/_lib/normalize.js";
import { getCache, setCache } from "../functions/_lib/cache.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const dataDir = path.join(process.cwd(), "data");
    const minimumWages = JSON.parse(fs.readFileSync(path.join(dataDir, "minimum-wages.json"), "utf-8"));

    const query = req.query || {};
    const keyword = (query.keyword || "").trim();
    const page = parseInt(query.page || "1", 10) || 1;
    const sort = query.sort || "least_applicants";
    const province = (query.province || "").trim();
    const city = (query.city || "").trim();
    const cities = (query.cities || "").trim();
    const kecamatan = (query.kecamatan || "").trim();
    const prodi = (query.prodi || "").trim();
    const education = (query.education || "").trim();
    const companyType = (query.companyType || "").trim();

    // Resolve city options to Kemnaker city_id format
    const cityList = cities ? cities.split(",").map(c => c.trim()).filter(Boolean) : (city ? [city] : []);
    const cityIds = [];
    for (const c of cityList) {
      const resolved = await resolveCityOption(c);
      if (resolved) cityIds.push(resolved);
    }

    let resolvedQuery = keyword;
    if (!resolvedQuery && cityIds.length === 0) {
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

    const cityIdsKey = cityIds.map(c => c.id).join(",");
    const cacheKey = `vacancies:${resolvedQuery}:${page}:${sort}:${cityIdsKey}:${province}:${city}:${prodi}:${education}:${companyType}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    const result = await fetchMagangHubVacancies({ keyword: resolvedQuery, page, sort, cityIds });
    if (!result.success) {
      return res.status(502).json({
        success: false,
        error: result.error,
        message: result.message,
        primaryError: result.primaryError,
        items: []
      });
    }

    let normalizedItems = (result.rawItems || [])
      .map((item) => normalizeVacancy(item, minimumWages))
      .filter(Boolean);

    if (education) {
      const edu = education.toLowerCase();
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

    if (prodi && prodi.toLowerCase() !== "semua") {
      const pLower = prodi.toLowerCase().trim();
      normalizedItems = normalizedItems.filter((v) => {
        if (!v.studyPrograms || !v.studyPrograms.length) return true;
        const matchesProdi = v.studyPrograms.some((sp) => {
          const sLower = (sp || "").toLowerCase().trim();
          return sLower.includes(pLower) || pLower.includes(sLower) || sLower.includes("semua");
        });
        const titleMatch = (v.title || "").toLowerCase().includes(pLower);
        return matchesProdi || titleMatch;
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
        filters: { province, city, kecamatan, prodi, education, companyType }
      },
      items: normalizedItems
    };

    setCache(cacheKey, responsePayload, 5 * 60 * 1000);
    return res.status(200).json(responsePayload);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

