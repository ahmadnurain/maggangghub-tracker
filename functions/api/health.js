/**
 * Endpoint: GET /api/health
 */
export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      status: "ok",
      app: "MagangFinder",
      version: "2.0",
      timestamp: new Date().toISOString()
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
