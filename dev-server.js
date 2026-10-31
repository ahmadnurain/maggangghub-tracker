/**
 * MagangFinder Local Development Server (Zero-Dependency Node.js)
 * Serves public/ statically and routes /api/* to handlers.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchMagangHubVacancies, fetchVacancyDetail, resolveCityOption } from "./functions/_lib/maganghub.js";
import { normalizeVacancy } from "./functions/_lib/normalize.js";
import { getCache, setCache } from "./functions/_lib/cache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");

// Load JSON data safely
const minimumWages = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "minimum-wages.json"), "utf-8"));
const regions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "regions.json"), "utf-8"));
const studyPrograms = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "study-programs.json"), "utf-8"));
const education = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "education.json"), "utf-8"));

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // Helper response
  const jsonResponse = (data, status = 200, extraHeaders = {}) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    });
    res.end(JSON.stringify(data));
  };

  // API Route: GET /api/health
  if (pathname === "/api/health") {
    return jsonResponse({
      status: "ok",
      app: "MagangFinder",
      version: "2.0",
      timestamp: new Date().toISOString(),
    });
  }

  // API Route: GET /api/filters
  if (pathname === "/api/filters") {
    return jsonResponse({
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
    });
  }

  // API Route: GET /api/vacancies
  if (pathname === "/api/vacancies") {
    try {
      const keyword = (parsedUrl.searchParams.get("keyword") || "").trim();
      const page = parseInt(parsedUrl.searchParams.get("page") || "1", 10);
      const sort = parsedUrl.searchParams.get("sort") || "least_applicants";
      const province = (parsedUrl.searchParams.get("province") || "").trim();
      const city = (parsedUrl.searchParams.get("city") || "").trim();
      const cities = (parsedUrl.searchParams.get("cities") || "").trim();
      const kecamatan = (parsedUrl.searchParams.get("kecamatan") || "").trim();
      const prodi = (parsedUrl.searchParams.get("prodi") || "").trim();
      const education = (parsedUrl.searchParams.get("education") || "").trim();
      const companyType = (parsedUrl.searchParams.get("companyType") || "").trim();

      // Resolve city options to Kemnaker city_id format
      const cityList = cities ? cities.split(",").map(c => c.trim()).filter(Boolean) : (city ? [city] : []);
      const cityIds = [];
      for (const c of cityList) {
        const resolved = await resolveCityOption(c);
        if (resolved) cityIds.push(resolved);
      }

      // Resolve best search term for Kemnaker / Pantauloker
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
        return jsonResponse(cached, 200, { "X-Cache": "HIT" });
      }

      const result = await fetchMagangHubVacancies({ keyword: resolvedQuery, page, sort, cityIds });
      if (!result.success) {
        return jsonResponse(
          {
            success: false,
            error: result.error,
            message: result.message,
            items: [],
          },
          502
        );
      }

      let normalizedItems = (result.rawItems || [])
        .map((item) => normalizeVacancy(item, minimumWages))
        .filter(Boolean);

      // Apply secondary filters on returned set
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
      return jsonResponse(responsePayload, 200, { "X-Cache": "MISS" });
    } catch (err) {
      return jsonResponse({ success: false, error: err.message }, 500);
    }
  }

  // API Route: GET /api/vacancy/:id
  if (pathname.startsWith("/api/vacancy/")) {
    const id = pathname.replace("/api/vacancy/", "");
    if (!id) return jsonResponse({ success: false, error: "INVALID_ID" }, 400);

    const cacheKey = `vacancy:${id}`;
    const cached = getCache(cacheKey);
    if (cached) return jsonResponse(cached, 200, { "X-Cache": "HIT" });

    try {
      const raw = await fetchVacancyDetail(id);
      if (!raw) {
        return jsonResponse({ success: false, error: "NOT_FOUND" }, 404);
      }
      const normalized = normalizeVacancy(raw, minimumWages);
      const payload = { success: true, data: normalized };
      setCache(cacheKey, payload, 15 * 60 * 1000);
      return jsonResponse(payload);
    } catch (err) {
      return jsonResponse({ success: false, error: err.message }, 500);
    }
  }

  // Static File Serving from public/
  let filePath = path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname);
  const ext = path.extname(filePath).toLowerCase();

  // Protect against directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for SPA or 404
      const fallbackIndex = path.join(PUBLIC_DIR, "index.html");
      fs.readFile(fallbackIndex, (fbErr, fbContent) => {
        if (fbErr) {
          res.writeHead(404);
          res.end("Not Found");
        } else {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(fbContent);
        }
      });
      return;
    }

    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 MagangFinder Local Dev Server is RUNNING!`);
  console.log(`🌐 URL : http://localhost:${PORT}`);
  console.log(`📡 API : http://localhost:${PORT}/api/vacancies`);
  console.log(`====================================================`);
});
