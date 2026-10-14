export default async (request) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const after = (url.searchParams.get("after") || "").trim();
  if (!q) return Response.json({ error: "Query is required" }, { status: 400 });
  if (q.length > 180) return Response.json({ error: "Query is too long" }, { status: 400 });
  if (after && !/^\d{4}-\d{2}-\d{2}$/.test(after)) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }
  const key = Netlify.env.get("YOUTUBE_API_KEY");
  if (!key) return Response.json({ error: "YOUTUBE_API_KEY is not configured in Netlify environment variables" }, { status: 503 });
  const params = new URLSearchParams({
    part: "snippet", type: "video", maxResults: "10", q, key, order: "relevance"
  });
  if (after) params.set("publishedAfter", new Date(after + "T00:00:00Z").toISOString());
  const response = await fetch("https://www.googleapis.com/youtube/v3/search?" + params.toString());
  const body = await response.json();
  if (!response.ok) {
    return Response.json({ error: body?.error?.message || "YouTube API request failed" }, { status: response.status });
  }
  const items = (body.items || []).map((item) => ({
    title: item.snippet?.title || "",
    date: item.snippet?.publishedAt || "",
    text: item.snippet?.description || "",
    author: item.snippet?.channelTitle || "",
    url: "https://www.youtube.com/watch?v=" + encodeURIComponent(item.id?.videoId || "")
  })).filter((item) => item.url.endsWith(encodeURIComponent(item.url.split("v=")[1] || "")));
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
};