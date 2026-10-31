import fs from "node:fs";
import path from "node:path";
import { fetchVacancyDetail } from "../../functions/_lib/maganghub.js";
import { normalizeVacancy } from "../../functions/_lib/normalize.js";
import { getCache, setCache } from "../../functions/_lib/cache.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { id } = req.query || {};
    if (!id) {
      return res.status(400).json({ success: false, error: "INVALID_ID" });
    }

    const cacheKey = `vacancy:${id}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    const dataDir = path.join(process.cwd(), "data");
    const minimumWages = JSON.parse(fs.readFileSync(path.join(dataDir, "minimum-wages.json"), "utf-8"));

    const raw = await fetchVacancyDetail(id);
    if (!raw) {
      return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Lowongan tidak ditemukan" });
    }

    const normalized = normalizeVacancy(raw, minimumWages);
    const responsePayload = {
      success: true,
      data: normalized,
    };

    setCache(cacheKey, responsePayload, 15 * 60 * 1000);
    return res.status(200).json(responsePayload);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

