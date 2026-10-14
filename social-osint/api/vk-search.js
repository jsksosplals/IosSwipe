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
  if (!token) return json({ error: "Не настроен VK_ACCESS_TOKEN. Добавьте токен в Vercel → Project Settings → Environment Variables и повторно разверните приложение." }, 503);
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
