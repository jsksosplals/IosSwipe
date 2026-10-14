export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const q = String(req.query?.q || "").trim();
  const after = String(req.query?.after || "").trim();
  if (!q) return res.status(400).json({ error: "Query is required" });
  if (q.length > 180) return res.status(400).json({ error: "Query is too long" });
  if (after && !/^\d{4}-\d{2}-\d{2}$/.test(after)) {
    return res.status(400).json({ error: "Invalid date" });
  }
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(503).json({ error: "YOUTUBE_API_KEY is not configured in Vercel environment variables" });
  const params = new URLSearchParams({
    part: "snippet", type: "video", maxResults: "10", q, key, order: "relevance"
  });
  if (after) params.set("publishedAfter", new Date(after + "T00:00:00Z").toISOString());
  try {
    const response = await fetch("https://www.googleapis.com/youtube/v3/search?" + params.toString());
    const body = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: body?.error?.message || "YouTube API request failed" });
    const items = (body.items || []).map((item) => ({
      title: item.snippet?.title || "",
      date: item.snippet?.publishedAt || "",
      text: item.snippet?.description || "",
      author: item.snippet?.channelTitle || "",
      url: "https://www.youtube.com/watch?v=" + encodeURIComponent(item.id?.videoId || "")
    })).filter((item) => item.url !== "https://www.youtube.com/watch?v=");
    return res.status(200).json({ items });
  } catch {
    return res.status(502).json({ error: "Could not reach YouTube Data API" });
  }
}
