/**
 * Endpoint: GET /api/vacancy/:id
 */
import { fetchVacancyDetail } from "../../_lib/maganghub.js";
import { normalizeVacancy } from "../../_lib/normalize.js";
import { getCache, setCache } from "../../_lib/cache.js";
import minimumWages from "../../../data/minimum-wages.json" assert { type: "json" };

export async function onRequestGet(context) {
  const id = context.params.id;
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: "INVALID_ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cacheKey = `vacancy:${id}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
    });
  }

  const raw = await fetchVacancyDetail(id);
  if (!raw) {
    return new Response(
      JSON.stringify({ success: false, error: "NOT_FOUND", message: "Lowongan tidak ditemukan" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const normalized = normalizeVacancy(raw, minimumWages);
  const responsePayload = {
    success: true,
    data: normalized,
  };

  setCache(cacheKey, responsePayload, 15 * 60 * 1000);

  return new Response(JSON.stringify(responsePayload), {
    headers: { "Content-Type": "application/json" },
  });
}
