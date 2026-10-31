export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    status: "ok",
    app: "MagangFinder",
    version: "2.0",
    platform: "Vercel Serverless",
    timestamp: new Date().toISOString()
  });
}

