const json = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export default async function handler(request) {
  const base = "https://" + (request.headers.host || "social-osint-xgame.vercel.app");
  const url = new URL(request.url, base);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return json({error:"Query is required",results:[]},400);
  if (q.length > 180) return json({error:"Query too long",results:[]},400);
  const results=[], errors=[], providers=[];
  const tasks = [
    ["Bluesky", async () => {
      const r=await fetch("https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q="+encodeURIComponent(q)+"&limit=25",{headers:{"accept":"application/json"}});
      if(!r.ok) throw Error("HTTP "+r.status);
      const d=await r.json();
      return (d.posts||[]).map(p=>({provider:"Bluesky",title:p.author?.displayName||p.author?.handle||"Публичный пост",author:p.author?.handle||"",date:p.record?.createdAt||"",text:p.record?.text||"",url:"https://bsky.app/profile/"+encodeURIComponent(p.author?.handle||"")+"/post/"+encodeURIComponent(p.uri?.split("/").pop()||"")}));
    }],
    ["Reddit", async () => {
      const r=await fetch("https://www.reddit.com/search.json?q="+encodeURIComponent(q)+"&limit=25&sort=relevance",{headers:{"accept":"application/json","user-agent":"SocialOSINTPublicSearch/1.0"}});
      if(!r.ok) throw Error("HTTP "+r.status);
      const d=await r.json();
      return (d.data?.children||[]).map(row=>{const p=row.data||{};return {provider:"Reddit",title:p.title||"Публичный пост",author:p.author||"",date:p.created_utc?new Date(p.created_utc*1000).toISOString():"",text:(p.selftext||"").slice(0,2500),url:p.permalink?"https://www.reddit.com"+p.permalink:"https://www.reddit.com"}}).filter(x=>x.url);
    }],
    ["Mastodon", async () => {
      const host=(url.searchParams.get("instance")||"mastodon.social").trim().replace(/^https?:\/\//,"").replace(/\/$/,"");
      if(!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(host)) throw Error("invalid instance");
      const r=await fetch("https://"+host+"/api/v2/search?q="+encodeURIComponent(q)+"&type=statuses&limit=20",{headers:{"accept":"application/json"}});
      if(!r.ok) throw Error("HTTP "+r.status);
      const d=await r.json();
      return (d.statuses||[]).map(p=>({provider:"Mastodon",title:p.account?.display_name||p.account?.acct||"Публичный пост",author:p.account?.acct||"",date:p.created_at||"",text:(p.content||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,2500),url:p.url||p.uri||""})).filter(x=>x.url);
    }]
  ];
  await Promise.all(tasks.map(async ([name,fn])=>{try{const items=await fn();results.push(...items);providers.push(name)}catch(e){errors.push(name+": "+String(e.message||e))}}));
  results.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  return json({query:q,results:results.slice(0,60),providers,errors,notice:"Выдача ограничена публичными API; отсутствие результата не означает отсутствие публикаций."});
}