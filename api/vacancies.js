import fs from "node:fs";
import path from "node:path";
import { fetchMagangHubVacancies } from "../functions/_lib/maganghub.js";
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
    const kecamatan = (query.kecamatan || "").trim();
    const prodi = (query.prodi || "").trim();
    const education = (query.education || "").trim();
    const companyType = (query.companyType || "").trim();

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
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    const result = await fetchMagangHubVacancies({ keyword: resolvedQuery, page, sort });
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

