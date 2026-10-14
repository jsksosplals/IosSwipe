const API = "https://api.vk.com/method/";
const VERSION = "5.199";
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
async function vk(method, params, token) {
  const u = new URL(API + method);
  for (const [k, v] of Object.entries({ ...params, access_token: token, v: VERSION })) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  }
  const r = await fetch(u, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error("VK API HTTP " + r.status);
  const d = await r.json();
  if (d.error) throw new Error("VK API: " + (d.error.error_msg || "request failed") + " (" + d.error.error_code + ")");
  return d.response;
}
function profile(p) {
  const screen = p.screen_name || ("id" + p.id);
  return { id: p.id, name: [p.first_name, p.last_name].filter(Boolean).join(" "), screen_name: screen,
    city: p.city?.title || "", country: p.country?.title || "", url: "https://vk.com/" + encodeURIComponent(screen) };
}
export async function GET(request) {
  const u = new URL(request.url);
  const q = (u.searchParams.get("q") || "").trim().replace(/^https?:\/\/(m\.)?vk\.com\//i, "").replace(/\/$/, "");
  if (!q) return json({ error: "Введите имя или ID профиля." }, 400);
  if (q.length > 120) return json({ error: "Запрос слишком длинный." }, 400);
  const token = process.env.VK_ACCESS_TOKEN;
  // Без токена не делаем прямые вызовы VK API; используем публичную веб-индексацию как резерв.
  if (!token) {
    try {
      const query = /^(?:id)?\\d+$/i.test(q)
        ? 'site:vk.com ' + q
        : 'site:vk.com ' + q;
      const response = await fetch("https://www.bing.com/search?format=rss&q=" + encodeURIComponent(query), {
        headers: { accept: "application/rss+xml,application/xml,text/xml", "user-agent": "Mozilla/5.0 (compatible; PublicSourceSearch/1.0)" },
        signal: AbortSignal.timeout(9000)
      });
      if (!response.ok) throw new Error("Веб-поиск недоступен (HTTP " + response.status + ")");
      const xml = await response.text();
      const items = [];
      for (const m of xml.matchAll(/<item>([\\s\\S]*?)<\\/item>/gi)) {
        const block = m[1];
        const value = tag => {
          const hit = block.match(new RegExp("<" + tag + ">([\\\\s\\\\S]*?)<\\/" + tag + ">", "i"));
          return hit ? hit[1].replace(/^<!\\[CDATA\\[|\\]\\]>$/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").trim() : "";
        };
        const title = value("title"), link = value("link"), description = value("description"), pubDate = value("pubDate");
        if (!title || !/^https?:\\/\\/(?:www\\.)?vk\\.com\\//i.test(link)) continue;
        const profileMatch = link.match(/^https?:\\/\\/(?:www\\.)?vk\\.com\\/([^/?#]+)/i);
        const wallMatch = link.match(/wall(-?\\d+_\\d+)/i);
        if (wallMatch) {
          items.push({ owner_name: title, date: pubDate ? new Date(pubDate).toISOString() : "", text: description, url: link });
        } else if (profileMatch) {
          const screen = profileMatch[1];
          items.push({ id: /^id\\d+$/.test(screen) ? Number(screen.slice(2)) : screen, name: title, screen_name: screen, city: "", country: "", url: link });
        }
      }
      const profiles = [...new Map(items.filter(x => x.screen_name).map(x => [x.url, x])).values()].slice(0, 10);
      const posts = [...new Map(items.filter(x => x.owner_name).map(x => [x.url, x])).values()].slice(0, 20);
      return json({
        query: q, mode: /^(?:id)?\\d+$/i.test(q) ? "id" : "name", profiles, posts,
        notice: "Резервный режим веб-поиска: показаны только проиндексированные публичные страницы VK. Для прямого поиска через VK API и более полных результатов настройте VK_ACCESS_TOKEN."
      });
    } catch (e) {
      return json({ error: "VK API-токен не настроен, а резервный веб-поиск не сработал: " + String(e.message || e), hint: "Добавьте VK_ACCESS_TOKEN в Vercel для прямого поиска." }, 503);
    }
  }
  const numeric = /^(?:id)?(\d+)$/i.exec(q);
  const short = /^([a-z][a-z0-9_.]{1,48})$/i.exec(q);
  let profiles = [], mode = "name";
  try {
    if (numeric || short) {
      mode = "id";
      const value = numeric ? numeric[1] : q;
      const got = await vk("users.get", { user_ids: value, fields: "screen_name,city,country" }, token);
      profiles = (got || []).map(profile);
    } else {
      const got = await vk("users.search", { q, count: 8, fields: "screen_name,city,country", sort: 0 }, token);
      profiles = (got?.items || []).map(profile);
    }
    const posts = [];
    for (const p of profiles.slice(0, 4)) {
      try {
        const wall = await vk("wall.get", { owner_id: p.id, count: 5, filter: "owner" }, token);
        for (const item of (wall?.items || []).filter(x => x.id && !x.is_pinned)) {
          posts.push({ owner_name: p.name, date: item.date ? new Date(item.date * 1000).toISOString() : "",
            text: String(item.text || "").slice(0, 3000), url: "https://vk.com/wall" + p.id + "_" + item.id });
        }
      } catch (e) {
        // Profile search remains useful when its public wall is unavailable.
      }
    }
    return json({ query: q, mode, profiles, posts: posts.slice(0, 20),
      notice: "Показываются только результаты, доступные токену и разрешённые настройками приватности VK." });
  } catch (e) {
    return json({ error: String(e.message || "VK API недоступен") }, 502);
  }
}
