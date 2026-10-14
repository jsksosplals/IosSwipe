const json = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean = s => String(s || "").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/\s+/g," ").trim();
const decode = s => clean(s).replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n));
async function fetchText(url, headers={}) {
  const r=await fetch(url,{headers:{accept:"text/html,application/atom+xml,application/rss+xml,application/json;q=0.9,*/*;q=0.8","user-agent":"Mozilla/5.0 (compatible; PublicSourceSearch/1.0)",...headers},signal:AbortSignal.timeout(8500)});
  if(!r.ok) throw Error("HTTP "+r.status);
  return await r.text();
}
function bingItems(xml){
  const out=[]; for(const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)){const b=m[1];const val=t=>{const x=b.match(new RegExp("<"+t+">([\\s\\S]*?)<\/"+t+">","i"));return x?decode(x[1].replace(/^<!\[CDATA\[|\]\]>$/g,"")):""};const title=val("title"),link=val("link"),desc=val("description"),date=val("pubDate");if(title&&/^https?:\/\//i.test(link))out.push({provider:"Веб-поиск (Bing RSS)",title,author:"",date:date?new Date(date).toISOString():"",text:desc,url:link})}return out;
}
function ddgItems(html){
 const out=[]; for(const m of html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)){let link=m[1].replace(/&amp;/g,"&");if(link.startsWith("//"))link="https:"+link;const title=clean(m[2]);if(/^https?:\/\//i.test(link)&&title)out.push({provider:"Веб-поиск (DuckDuckGo)",title,author:"",date:"",text:"Откройте оригинальную страницу для проверки содержания и даты.",url:link})}return out;
}
export async function GET(request) {
 const url=new URL(request.url),q=(url.searchParams.get("q")||"").trim();
 if(!q)return json({error:"Query is required",results:[]},400);
 if(q.length>180)return json({error:"Query too long",results:[]},400);
 const results=[],errors=[],providers=[];
 const tasks=[
  ["Bluesky",async()=>{let last;for(const base of ["https://api.bsky.app/xrpc/app.bsky.feed.searchPosts","https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts"]){try{const r=await fetch(base+"?q="+encodeURIComponent(q)+"&limit=25&sort=latest",{headers:{accept:"application/json","user-agent":"Mozilla/5.0 SocialOSINT/1.0"},signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error("HTTP "+r.status);const d=await r.json();return(d.posts||[]).map(p=>({provider:"Bluesky",title:p.author?.displayName||p.author?.handle||"Публичный пост",author:p.author?.handle||"",date:p.record?.createdAt||p.indexedAt||"",text:p.record?.text||"",url:"https://bsky.app/profile/"+encodeURIComponent(p.author?.handle||p.author?.did||"")+"/post/"+encodeURIComponent(p.uri?.split("/").pop()||"")}));}catch(e){last=e}}throw last||Error("unavailable")}],
  ["Mastodon",async()=>{const host=(url.searchParams.get("instance")||"mastodon.social").trim().replace(/^https?:\/\//,"").replace(/\/$/,"");if(!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(host))throw Error("invalid instance");const r=await fetch("https://"+host+"/api/v2/search?q="+encodeURIComponent(q)+"&type=statuses&limit=20",{headers:{accept:"application/json"},signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error("HTTP "+r.status);const d=await r.json();return(d.statuses||[]).map(p=>({provider:"Mastodon",title:p.account?.display_name||p.account?.acct||"Публичный пост",author:p.account?.acct||"",date:p.created_at||"",text:clean(p.content).slice(0,2500),url:p.url||p.uri||""})).filter(x=>x.url)}],
  ["Bing RSS",async()=>bingItems(await fetchText("https://www.bing.com/search?format=rss&q="+encodeURIComponent(q),{"accept":"application/rss+xml,application/xml,text/xml"}))],
  ["DuckDuckGo",async()=>ddgItems(await fetchText("https://html.duckduckgo.com/html/?q="+encodeURIComponent(q),{"accept":"text/html"}))]
 ];
 await Promise.all(tasks.map(async([name,fn])=>{try{const items=await fn();results.push(...items);providers.push(name)}catch(e){errors.push(name+": "+String(e.message||e))}}));
 const unique=new Map();for(const x of results){if(x.url&&!unique.has(x.url))unique.set(x.url,x)}
 const final=[...unique.values()].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,60);
 return json({query:q,results:final,providers,errors,notice:final.length?"Результаты собраны из доступных публичных источников. Откройте первоисточник и проверьте контекст.":"Источники не вернули результаты; попробуйте другой запрос или повторите позже. Пустая выдача не означает отсутствие публикаций."});
}