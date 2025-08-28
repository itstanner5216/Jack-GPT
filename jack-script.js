// @ts-nocheck
// Jack All-in-One — UI + /aggregate API + PWA assets

const BASE_PATH = "/";

// ----------------------------- Router (entry) -----------------------------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Root UI
    if (path === BASE_PATH || (BASE_PATH !== "/" && path === BASE_PATH.replace(/\/$/, ""))) {
      return htmlResponse(PORTAL_HTML, 200);
    }

    // Manifest (both paths)
    if (path === joinPath(BASE_PATH, "site.webmanifest") || path === "/manifest.json") {
      return new Response(MANIFEST_JSON, {
        status: 200,
        headers: {
          "content-type": "application/manifest+json; charset=utf-8",
          "cache-control": "public, max-age=3600"
        }
      });
    }

    // Service worker endpoint
if (path === joinPath(BASE_PATH, "sw.js")) {
  return new Response(SW_JS, {
    status: 200,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
      // If BASE_PATH isn’t “/”, let the SW control your whole app scope:
      "Service-Worker-Allowed": BASE_PATH // or "/" if you want root scope
    }
  });
}

    // API on same origin
    if (path === "/aggregate") {
      return handleAggregate(request, env, ctx);
    }

    // Icons (use your GitHub RAW permalinks)
    if (path === "/icon-192.png") {
      return fetch(
        "https://raw.githubusercontent.com/itstanner5216/Jack-GPT/103e0fd11ed55e09d8218fc32162c09e22c6dfbd/icon_jackportal_fixed_192.png",
        { headers: { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" } }
      );
    }
    if (path === "/icon-512.png") {
      return fetch(
        "https://raw.githubusercontent.com/itstanner5216/Jack-GPT/103e0fd11ed55e09d8218fc32162c09e22c6dfbd/icon_jackportal_fixed_512.png",
        { headers: { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" } }
      );
    }

    // Catch-all passthrough
    return fetch(request);
  }
};

// ----------------------------- API (/aggregate) -----------------------------
async function handleAggregate(request, env, ctx) {
  const CORS_HEADERS = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "*"
  };

  const jerr = (msg, code = 400) =>
    new Response(JSON.stringify({ error: msg }, null, 2), {
      status: code,
      headers: { ...CORS_HEADERS, "content-type": "application/json; charset=utf-8" }
    });
  const jok = (data, code = 200) =>
    new Response(JSON.stringify(data, null, 2), {
      status: code,
      headers: { ...CORS_HEADERS, "content-type": "application/json; charset=utf-8" }
    });

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== "GET") return jerr("method not allowed", 405);

  const url = new URL(request.url);

  // Edge cache (bypass via ?nocache=1)
  const edgeCache = caches.default;
  const bypassCache = url.searchParams.get("nocache") === "1";
  if (!bypassCache) {
    const cached = await edgeCache.match(request);
    if (cached) return cached;
}

  // ---------- Config (orientation locked lenient)
  const relaxHosts   = (url.searchParams.get("hostMode") || String(env?.HOST_MODE || "")).toLowerCase() === "relaxed";
  const durationMode = (url.searchParams.get("durationMode") || String(env?.DURATION_MODE || "normal")).toLowerCase(); // "normal" | "lenient"
  const orientationMode = "lenient"; // locked, no toggle

  // Secondary hosts via env (comma-separated)
  const SECONDARY_HOSTS = String(env?.SECONDARY_HOSTS || "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

  // Hosts
  const FREE_HOSTS = [
    "xvideos.com","xnxx.com","xhamster.com","spankbang.com","eporner.com","porntrex.com",
    "thisvid.com","motherless.com","pornhub.com","youporn.com","redtube.com",
    "gayporntube.com","gaymaletube.com","boyfriendtv.com",
    // additions
    "ggroot.com","gotgayporn.com","gotporn.com","nuvid.com","winporn.com",
    "youporngay.com","rockettube.com","gaymenring.com","gayfuckporn.com",
    "manpornxxx.com","hotxxx.com","gayrookievideos.com","guystricked.com",
    "101boyvideos.com","gaytwinksporn.net","tumbex.com"
  ];
  const SOFT_ALLOW_HOSTS = [
    "redgifs.com","twitter.com","x.com","yuvutu.com","tnaflix.com","tube8.com",
    "empflix.com","hqporner.com","txxx.com","porndoe.com"
  ];

  const PREF_BASE = [...FREE_HOSTS, ...(relaxHosts ? SECONDARY_HOSTS : [])];
  const SOFT_BASE = [...SOFT_ALLOW_HOSTS, ...(relaxHosts ? SECONDARY_HOSTS : [])];

  const PREFERRED_HOSTS = new Set(PREF_BASE.flatMap(h => [h, `www.${h}`]));
  const SOFT_ALLOW     = new Set(SOFT_BASE.flatMap(h => [h, `www.${h}`]));
  const KNOWN_PAYWALL  = new Set([
    "onlyfans.com","justfor.fans","camsoda.com","chaturbate.com",
    "men.com","seancody.com","helixstudios.net","corbinfisher.com","belamistudios.com",
    "timtales.com","sayuncle.com","peterfever.com","chaosmen.com","justusboys.com","gayforit.eu","xtube.com"
  ].flatMap(h => [h, `www.${h}`]));

  const ALLOWED_FALLBACK = new Set([
    ...Array.from(PREFERRED_HOSTS),
    ...Array.from(SOFT_ALLOW),
    "reddit.com","www.reddit.com",
    "archive.org","www.archive.org","archive.ph","www.archive.ph"
  ]);
  if (relaxHosts) {
    for (const h of SECONDARY_HOSTS) { ALLOWED_FALLBACK.add(h); ALLOWED_FALLBACK.add(`www.${h}`); }
  }

  const BAD_PATH_HINTS = ["/verify","/signup","/login","/premium","/trial","/join","/checkout","/subscribe","/account","/members"];

  // Player signals
  const HTML_PLAYER_RX  = /(og:video|<video|\bsource\s+src=|jwplayer|video-js|plyr|hls|m3u8|\.mp4\b|data-hls|player-container|html5player)/i;

  // Orientation rules (lenient)
  const GAY_POSITIVE = /\b(gay|gayporn|gaytube|m\/m|\bmm\b|boyfriend|twink|otter|cub|bearsex|gaysex|straight friend|bottom|anal)\b/i;
  const HETERO_RED_FLAGS = /\b(boy\/girl|man\/woman|m\/f|\bmf\b|f\/m|\bff\b|pussy|boobs|lesbian|stepmom|stepsis|milf|sister)\b/i;
  function gayOnlyPass(title, textSample, host) {
    const titleT = (title || "").toLowerCase();
    const textT  = (textSample || "").toLowerCase();
    const hasGay = GAY_POSITIVE.test(titleT) || GAY_POSITIVE.test(textT);
    const hasHet = HETERO_RED_FLAGS.test(titleT) || HETERO_RED_FLAGS.test(textT);
    const likelyGaySite = /(gayporntube|gaymaletube|boyfriendtv|rockettube|youporngay|gaytwinksporn|gaymenring)/i.test(host || "");
    if (hasHet && !hasGay) return false;
    if (hasGay || likelyGaySite) return true;
    if (relaxHosts && (PREFERRED_HOSTS.has(host||"") || SOFT_ALLOW.has(host||""))) return true;
    return false;
  }

  // Params
  const qRaw = (url.searchParams.get("q") || "").trim();
  if (!qRaw) return jerr("missing query", 400);
  const q = qRaw.length > 500 ? qRaw.slice(0, 500) : qRaw;

  let limit = clampInt(url.searchParams.get("limit"), 10, 3, 20);
  const durationQuery = (url.searchParams.get("duration") || "").trim() || null;

  const FRESH_OK = new Set(["d7","m1","m3","y1","all"]); // allow all-time
  let freshness = (url.searchParams.get("fresh") || "y1").trim().toLowerCase();
  if (!FRESH_OK.has(freshness)) freshness = "y1";

  const rawSite = (url.searchParams.get("site") || "").trim();
  let siteQuery = sanitizeSiteParam(rawSite) || null;

  let searchMode = (url.searchParams.get("mode") || "").trim().toLowerCase() || null;
  if (!searchMode) searchMode = "niche";
  if (siteQuery && /[\s"]/g.test(siteQuery)) siteQuery = null;

  const DEBUG = url.searchParams.get("debug") === "1" || String(env?.DEBUG || "").toLowerCase() === "true";

  // Secrets
  const GOOGLE_KEY = env?.GOOGLE_KEY || "AIzaSyAZhWamw25pgVB_3NAhvQOuSbkeh-mEWu0";
  const GOOGLE_CX  = env?.GOOGLE_CX  || "73e4998767b3c4800";
  const FORUM_KEY  = env?.FORUM_KEY  || "39c5bdf0ac8645b5c9cc3f9a88c7ad4683395e78ec517ac35466bf5df2cf305e";
  const UA_MOBILE  = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

  // Diagnostics
  let fetched_cse = 0, fetched_forum = 0;
  let dropped_paywall = 0, dropped_dead = 0, dropped_forbidden = 0, dropped_removed = 0;
  let dropped_not_video = 0, dropped_fallback_not_video = 0, dropped_orientation = 0;
  const errorLog = [];

  // Helpers
  function clampInt(v, def, min, max){
    const n = parseInt(v ?? "", 10);
    return Number.isNaN(n) ? def : Math.max(min, Math.min(max, n));
  }
  function sanitizeSiteParam(s){
    if (!s) return null;
    try {
      const u = new URL(s.includes("://") ? s : `https://${s}`);
      return u.hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return s.replace(/^[a-z]+:\/\//i,"").split("/")[0].replace(/^www\./,"").trim().toLowerCase();
    }
  }
  function safeHost(u){ try { return new URL(u).hostname.toLowerCase(); } catch { return ""; } }
  function normUrl(raw){
    try {
      const x = new URL(raw);
      x.hash = "";
      const KEEP = new Set(["v","viewkey","id"]); // keep identifiers
      for (const [k] of x.searchParams) { if (!KEEP.has(k)) x.searchParams.delete(k); }
      let s = x.toString();
      if (s.endsWith("/")) s = s.slice(0, -1);
      return s;
    } catch { return raw; }
  }
  function pushErr(arr, msg){ if (arr.length < 20) arr.push(String(msg).slice(0,220)); }

  // Duration parsing
  function durToSeconds(d){
    if (!d) return null;
    if (/^\d+$/.test(d)) return parseInt(d,10);
    const iso = d.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
    if (iso) return (+iso[1]||0)*3600 + (+iso[2]||0)*60 + (+iso[3]||0);
    const mm = d.match(/\b(\d{1,2}):(\d{2})\b/);
    if (mm) return +mm[1]*60 + +mm[2];
    return null;
  }
  function parseDurationQuery(s){
    if (!s) return null;
    const x = s.trim().toLowerCase();
    if (/^\d{1,5}-\d{1,5}$/.test(x)) { const [a,b]=x.split("-").map(n=>+n); return {min:Math.min(a,b),max:Math.max(a,b)}; }
    if (/^pt/.test(x)) { const sec=durToSeconds(x); if(sec!=null) return {min:sec,max:sec}; }
    const lt = x.match(/^<?=?\s*(\d{1,3})\s*m$/); if (lt) return {min:0,max:+lt[1]*60};
    const gt = x.match(/^(\d{1,3})\s*\+\s*m$/); if (gt) return {min:+gt[1]*60,max:86400};
    const rng = x.match(/^(\d{1,3})\s*-\s*(\d{1,3})\s*m$/); if (rng) { const a=+rng[1]*60,b=+rng[2]*60; return {min:Math.min(a,b),max:Math.max(a,b)}; }
    const sec = durToSeconds(x); if (sec!=null) return {min:sec,max:sec};
    return null;
  }
  const wantRange = parseDurationQuery(durationQuery);
  function fitsDuration(sec, range, host){
    if (!range || sec==null) return true;
    let tol = durationMode === "lenient" ? 60 : 15;
    if (PREFERRED_HOSTS.has(host) || SOFT_ALLOW.has(host)) tol += 45;
    return sec >= (range.min - tol) && sec <= (range.max + tol);
  }
  function fmtMMSS(sec){ const s=Math.max(0,Math.round(sec||0)); const m=Math.floor(s/60), r=s%60; return `${m}:${String(r).padStart(2,"0")}`; }

  // fetch with timeout
  async function fetchWithTimeout(resource, options, timeout=9000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(resource, { ...options, signal: controller.signal, cf: { cacheTtl: 0, cacheEverything: false } });
      clearTimeout(id);
      return res;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }
  async function fetchJSON(u, i, t=10000){
    try {
      const r = await fetchWithTimeout(u, i, t);
      if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
      return await r.json();
    } catch (e) {
      pushErr(errorLog, e.message || String(e));
      return null;
    }
  }

  // --- URL heuristics
  function looksLikeVideoUrl(u) {
    try {
      const p = new URL(u).pathname.toLowerCase();
      return /\/(video|watch|view|embed|player)(\/|$)/.test(p) || /\/\d{3,}\/?$/i.test(p);
    } catch { return false; }
  }
  function looksLikeSearchUrl(u) {
    try {
      const X = new URL(u); const p = X.pathname.toLowerCase(); const qs = X.search.toLowerCase();
      if (/\b(k|search|query|keyword|s)\b=/.test(qs)) return true;
      const isContent = /\/(video|watch|view|embed)\b/.test(p) || /\/\d{2,}(\/|$)/.test(p);
      if (isContent) return false;
      const looksSlug = /\/[a-z0-9-]+$/i.test(p) && !p.endsWith("/");
      if (looksSlug && p.split("/").length <= 4) return false;
      return /\/(search|tags?|categories|videos|porn)(\/|$)/.test(p);
    } catch {
      return /(\?k=|\/search(\/|$)|\/tags?(\/|$)|\/videos(\/|$)|\/porn(\/|$)|\/categories?(\/|$))/i.test(String(u).toLowerCase());
    }
  }

  // Listing-page harvester → extract direct video links
  function harvestVideoLinksFromListing(html, baseUrl) {
    const out = [];
    const hrefs = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["']/ig))
      .map(m => m[1]).filter(Boolean);
    const abs = hrefs.map(h => { try { return new URL(h, baseUrl).toString(); } catch { return null; } }).filter(Boolean);
    const isVideoish = (u) => {
      try {
        const H = new URL(u).hostname.toLowerCase();
        const p = new URL(u).pathname.toLowerCase();
        return /\/(video|watch|view|embed)\b/.test(p)
          || (/xvideos|xnxx/.test(H) && /\/video-/.test(p))
          || (/spankbang/.test(H) && /\/video\//.test(p))
          || (/thisvid/.test(H) && /\/videos\//.test(p))
          || (/xhamster/.test(H) && /\/videos\//.test(p));
      } catch { return false; }
    };
    for (const u of abs) if (isVideoish(u)) out.push(normUrl(u));
    return Array.from(new Set(out)).slice(0, 12);
  }

  // Title normalization
  function neutralizeTitle(s){
    return (s || "").normalize("NFKC").replace(/[\u{1F300}-\u{1FAFF}]/gu, "").replace(/\s{2,}/g, " ").trim() || "clip";
  }

  // CSE builders (supports firstPass + video dorks; no keyword stuffing)
  const CSE_PAGES_PRIMARY = [1,11,21,31];
  const CSE_PAGES_BACKOFF = [1,11];

  function hostDork() {
    const base = [...FREE_HOSTS, ...(relaxHosts ? SECONDARY_HOSTS : [])];
    return '(' + base.map(s => `site:${s}`).join(' OR ') + ')';
  }
  function videoDork() {
    return '('
      + 'site:xvideos.com inurl:/video/ OR '
      + 'site:xnxx.com inurl:/video- OR '
      + 'site:spankbang.com inurl:/video/ OR '
      + 'site:thisvid.com inurl:/videos/ OR '
      + 'site:xhamster.com inurl:/videos/'
      + ')';
  }

  async function googleCSEAll({ firstPass=false, useVideoDorks=false, pages=CSE_PAGES_PRIMARY } = {}) {
    let finalQ = q.trim();
    if (firstPass) finalQ += ' "gay porn"'; // ONLY pass 1
    finalQ += ` ${hostDork()}`;
    if (useVideoDorks) finalQ += ` ${videoDork()}`;
    if (siteQuery) finalQ += ` site:${siteQuery}`;
    finalQ = finalQ.replace(/\s+/g, " ").trim();
    if (finalQ.length > 1700) finalQ = finalQ.slice(0, 1700);

    const out = [];
    for (const start of pages) {
      const u = new URL("https://www.googleapis.com/customsearch/v1");
      u.searchParams.set("key", GOOGLE_KEY);
      u.searchParams.set("cx", GOOGLE_CX);
      u.searchParams.set("q", finalQ);
      u.searchParams.set("num", "9");
      u.searchParams.set("start", String(start));
      u.searchParams.set("gl", "us");
      u.searchParams.set("hl", "en");
      if (freshness !== "all") u.searchParams.set("dateRestrict", freshness);
      const data = await fetchJSON(u.toString(), { headers: { "User-Agent": UA_MOBILE }}, 10000);
      const items = Array.isArray(data?.items) ? data.items : [];
      fetched_cse += items.length;
      for (const it of items) {
        const link = normUrl(it.link || "");
        const host = (new URL(link).hostname || "").toLowerCase();
        if (KNOWN_PAYWALL.has(host)) { dropped_paywall++; continue; }

        // duration sniff
        let dur = null;
        const pm = it.pagemap || {};
        if (Array.isArray(pm.videoobject) && pm.videoobject[0]?.duration) dur = durToSeconds(String(pm.videoobject[0].duration));
        if (!dur && pm.metatags?.[0]?.["og:video:duration"]) dur = parseInt(pm.metatags[0]["og:video:duration"], 10);
        if (!dur && it.title) {
          const m = it.title.match(/\b(\d{1,2}):(\d{2})\b/);
          if (m) dur = +m[1]*60 + +m[2];
        }

        // thumbnail
        let thumb = null;
        if (pm?.cse_thumbnail?.[0]?.src) thumb = pm.cse_thumbnail[0].src;
        else if (pm?.metatags?.[0]?.["og:image"]) thumb = pm.metatags[0]["og:image"];

        out.push({
          source: "google",
          title: neutralizeTitle(it.title || ""),
          site: host,
          url: link,
          runtimeSec: dur,
          thumbnail: thumb || null,
          tags: [],
          notes: `search result`
        });
      }
    }
    return out;
  }

  async function forumScoutAll() {
    if (searchMode !== "deep_niche") return [];
    const pages = [1, 2];
    const out = [];
    for (const page of pages) {
      const u = `https://forumscout.app/api/reddit_posts_search?keyword=${encodeURIComponent(q)}&sort_by=relevance&page=${page}`;
      const data = await fetchJSON(u, { headers: { "X-API-Key": FORUM_KEY, "User-Agent": UA_MOBILE }}, 9000);
      const posts = Array.isArray(data?.data) ? data.data : [];
      fetched_forum += posts.length;
      for (const p of posts) {
        const link = p.url ? normUrl(p.url) : (p.permalink ? `https://reddit.com${p.permalink}` : "");
        out.push({
          source: "forum",
          title: neutralizeTitle(p.title || "discussion thread"),
          site: "reddit.com",
          url: link,
          runtimeSec: null,
          thumbnail: null,
          tags: ["thread"],
          notes: "discussion thread (links inside)"
        });
      }
    }
    return out;
  }

  // Pull data — PASS 1 (with "gay porn")
  let gItems = await googleCSEAll({ firstPass:true, useVideoDorks:false, pages:CSE_PAGES_PRIMARY });
  let fItems = await forumScoutAll();

  // Progressive freshness widen: d7→m1→m3→y1→all
  async function progressiveFreshen() {
    const order = ["d7","m1","m3","y1","all"];
    let idx = Math.max(0, order.indexOf(freshness));
    while ((gItems.length + fItems.length) < 6 && idx < order.length - 1) {
      idx++;
      freshness = order[idx];
      const more = await googleCSEAll({ firstPass:true, useVideoDorks:false, pages:CSE_PAGES_BACKOFF });
      const seen = new Set(gItems.map(it => normUrl(it.url)));
      for (const it of more) { const k = normUrl(it.url); if (!seen.has(k)) { seen.add(k); gItems.push(it); } }
    }
  }
  await progressiveFreshen();

  // If still thin → PASS 2 (video dorks ON, NO "gay porn")
  if ((gItems.length + fItems.length) < 6) {
    const more = await googleCSEAll({ firstPass:false, useVideoDorks:true, pages:CSE_PAGES_BACKOFF });
    const seen = new Set(gItems.map(it => normUrl(it.url)));
    for (const it of more) { const k = normUrl(it.url); if (!seen.has(k)) { seen.add(k); gItems.push(it); } }
  }

  // Dedup
  const seenAll = new Set();
  function uniq(arr){
    const out=[]; for(const it of arr){ const k=normUrl(it.url); if(!k||seenAll.has(k)) continue; seenAll.add(k); out.push(it); } return out;
  }
  gItems = uniq(gItems);
  fItems = uniq(fItems);

  // Pre-candidates
  const candidates = [...gItems, ...fItems]
    .filter(it => !KNOWN_PAYWALL.has((it.site||"").toLowerCase()))
    .slice(0, 120);

  // Page sniff (playability + orientation + duration + thumbnail + listing harvest)
  async function getPlayableMeta(uStr){
    const headers = { "User-Agent": UA_MOBILE, "Accept-Language": "en-US,en;q=0.9" };
    let finalUrl=uStr, ct="", textSample="", thumb=null, rawHtml = "";

    try {
      const res = await fetchWithTimeout(uStr, { method: "GET", redirect: "follow", headers }, 9000);
      finalUrl = res.url || finalUrl;
      ct = res.headers.get("content-type") || "";
      if ((ct||"").includes("text/html")) {
        const body = await res.text();
        rawHtml = body;
        textSample = body.slice(0, 40000).toLowerCase();

        // thumbnails
        const og = body.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) 
                 || body.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        const tw = body.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
        thumb = (og && og[1]) || (tw && tw[1]) || null;
        if (!thumb) {
          const cdn = body.match(/https?:\/\/[^"']+\/(?:thumb|preview|poster)[^"']+\.(?:jpg|jpeg|png|webp)/i);
          if (cdn) thumb = cdn[0];
        }
      }
    } catch (e) {
      pushErr(errorLog, `net:${e.message||String(e)}`);
      return { ok:false, url:finalUrl, ct, playable:false };
    }

    const urlHost = safeHost(finalUrl);

    // Orientation
    const passLenientBaseline = gayOnlyPass("", textSample, urlHost);
    if (!passLenientBaseline) {
      return { ok:true, url:finalUrl, ct, playable:false, orientationFail:true, thumbnail: thumb, duration: null };
    }

    // Listing harvest
    let harvested = undefined;
    if (looksLikeSearchUrl(finalUrl) && (PREFERRED_HOSTS.has(urlHost) || SOFT_ALLOW.has(urlHost)) && rawHtml) {
      const found = harvestVideoLinksFromListing(rawHtml, finalUrl);
      if (found.length) harvested = found;
    }

    // duration sniff
    let durationSec = null;
    if (textSample){
      const ld = textSample.match(/"duration"\s*:\s*"(pt[^"]+)"/i); if(ld) durationSec=durToSeconds(ld[1]);
      if (!durationSec){ const og = textSample.match(/property=["']og:video:duration["'][^>]*content=["'](\d{1,6})["']/i); if(og) durationSec=parseInt(og[1],10); }
      if (!durationSec){ const m = textSample.match(/\b(\d{1,2}):(\d{2})\b/); if(m) durationSec=+m[1]*60 + +m[2]; }
    }

    const playable = PREFERRED_HOSTS.has(urlHost)
      || SOFT_ALLOW.has(urlHost)
      || /video|mp4|m3u8|application\/octet-stream/i.test(ct)
      || HTML_PLAYER_RX.test(textSample || "")
      || /player|embed|hls|m3u8|\.mp4\b/i.test(finalUrl);

    return { ok:true, url:finalUrl, ct, playable, duration: durationSec, thumbnail: thumb, harvested };
  }

  // Concurrency pool
  async function poolMap(items, worker, n=6){
    const out = new Array(items.length);
    let i=0;
    const runners = Array(Math.min(n, items.length)).fill(0).map(async function run(){
      while (i < items.length) {
        const idx = i++;
        try { out[idx] = await worker(items[idx], idx); }
        catch (e) { out[idx] = null; pushErr(errorLog, e.message||String(e)); }
      }
    });
    await Promise.all(runners);
    return out;
  }

  const nonForumIdx = candidates.map((it, idx) => ({ it, idx })).filter(x => x.it.source !== "forum");
  const analyses = await poolMap(nonForumIdx, async ({it}) => getPlayableMeta(it.url), 6);
  const analysisByUrl = new Map();
  nonForumIdx.forEach((x, k) => { analysisByUrl.set(normUrl(x.it.url), analyses[k]); });

  // Scoring
  function rankScore(host, recent=false){
    if (KNOWN_PAYWALL.has(host)) return 5;
    if (PREFERRED_HOSTS.has(host)) return 100 + (recent ? 10 : 0);
    if (SOFT_ALLOW.has(host))     return 75  + (recent ? 6  : 0);
    if (relaxHosts && SECONDARY_HOSTS.includes(String(host).replace(/^www\./,""))) return 65 + (recent ? 5 : 0);
    return 40 + (recent ? 3 : 0);
  }

  const STOP = new Set(["the","a","an","and","or","of","to","for","in","on","at","with","by","from","this","that","these","those","public","amateur","video","clip"]);
  function titleRelevanceBonus(query, title){
    const qTok = (query || "").toLowerCase().match(/[a-z0-9]+/g) || [];
    const tTok = (String(title) || "").toLowerCase().match(/[a-z0-9]+/g) || [];
    const tSet = new Set(tTok.filter(w => !STOP.has(w)));
    let matches = 0;
    for (const w of qTok) if (!STOP.has(w) && tSet.has(w)) matches++;
    return Math.min(6, matches * 2);
  }

  // Selection
  const kept = [];
  for (let idx = 0; idx < candidates.length; idx++) {
    if (kept.length >= limit) break;
    const it = candidates[idx];
    if (!it?.url) { dropped_dead++; continue; }

    // Forums (title-only gay cue)
    if (it.source === "forum") {
      if (!gayOnlyPass(it.title, "", it.site)) { dropped_orientation++; continue; }
      kept.push({ ...it, score: rankScore("reddit.com", /\/(2024|2025)\b/.test(it.url)) });
      continue;
    }

    // Page analysis
    const lc = analysisByUrl.get(normUrl(it.url));

    // Listing harvest injection
    if (lc?.harvested?.length) {
      for (const u of lc.harvested) {
        candidates.unshift({
          source: it.source,
          title: it.title,
          site: safeHost(u),
          url: u,
          runtimeSec: null,
          thumbnail: it.thumbnail || null,
          tags: it.tags || [],
          notes: (it.notes ? it.notes + "; " : "") + "harvested"
        });
      }
      continue;
    }

    // Drop obvious paywalls/forbidden
    const host = (it.site || "").toLowerCase();
    if (KNOWN_PAYWALL.has(host)) { dropped_paywall++; continue; }
    if (BAD_PATH_HINTS.some(h => it.url.toLowerCase().includes(h))) { dropped_paywall++; continue; }

    // Avoid listing/search pages unless already harvested above
    if (looksLikeSearchUrl(it.url)) { dropped_dead++; continue; }

    // Orientation fallback: if page text failed, try title-only
    if (lc?.orientationFail && !gayOnlyPass(it.title, "", host)) { dropped_orientation++; continue; }

    // Must be playable OR look like a direct video URL
    if (!lc || !(lc.playable || looksLikeVideoUrl(it.url))) {
      if ((PREFERRED_HOSTS.has(host) || SOFT_ALLOW.has(host)) && gayOnlyPass(it.title, "", host)) {
        const rs = it.runtimeSec ?? lc?.duration ?? null;
        kept.push({
          ...it,
          title: neutralizeTitle(it.title),
          site: host,
          url: lc?.url ? normUrl(lc.url) : it.url,
          runtimeSec: rs,
          thumbnail: lc?.thumbnail || it?.thumbnail || null,
          notes: (it.notes ? it.notes + "; " : "") + "salvage-low",
          score: rankScore(host) - 10
        });
        continue;
      }
      dropped_not_video++; continue;
    }

    const runtimeSec = it.runtimeSec ?? lc.duration ?? null;
    if (!fitsDuration(runtimeSec, wantRange, host)) continue;

    const recentBoost = /\/(2024|2025)\b/.test(lc?.url || it.url || "");
    let score = rankScore(host, recentBoost);
    if (runtimeSec != null) score += 5;
    score += titleRelevanceBonus(q, it.title);
    if (looksLikeVideoUrl(it.url)) score += 50;
    if (looksLikeSearchUrl(it.url)) score -= 50;

    kept.push({
      ...it,
      title: neutralizeTitle(it.title),
      url: lc?.url ? normUrl(lc.url) : it.url,
      site: host,
      runtimeSec,
      thumbnail: lc?.thumbnail || it?.thumbnail || null,
      score
    });
  }

  // Secondary pass if nothing yet
  if (kept.length === 0) {
    for (const it of candidates) {
      if (kept.length >= limit) break;
      if (!it?.url) { dropped_dead++; continue; }

      if (it.source === "forum") {
        if (!gayOnlyPass(it.title, "", it.site)) { dropped_orientation++; continue; }
        kept.push({
          ...it,
          title: neutralizeTitle(it.title),
          url: it.url,
          site: it.site || "reddit.com",
          runtimeSec: null,
          thumbnail: null,
          notes: (it.notes ? it.notes + "; " : "") + "second-pass",
          score: rankScore("reddit.com", /\/(2024|2025)\b/.test(it.url))
        });
        continue;
      }

      if (looksLikeSearchUrl(it.url)) { dropped_dead++; continue; }
      const host = (it.site || "").toLowerCase();
      if (KNOWN_PAYWALL.has(host)) { dropped_paywall++; continue; }

      const lc = analysisByUrl.get(normUrl(it.url));
      if (!lc || !(lc.playable || looksLikeVideoUrl(it.url))) { dropped_fallback_not_video++; continue; }

      let score = rankScore(host, /\/(2024|2025)\b/.test(lc?.url || ""));
      const rs = it.runtimeSec ?? lc.duration;
      if (rs != null) score += 5;
      score += titleRelevanceBonus(q, it.title);
      if (looksLikeVideoUrl(it.url)) score += 50;
      if (looksLikeSearchUrl(it.url)) score -= 50;

      kept.push({
        ...it,
        title: neutralizeTitle(it.title),
        url: lc?.url ? normUrl(lc.url) : it.url,
        site: host,
        runtimeSec: rs ?? null,
        thumbnail: lc?.thumbnail || it?.thumbnail || null,
        notes: (it.notes ? it.notes + "; " : "") + "second-pass",
        score
      });
    }
  }

  // Adaptive limit lift if underfilled
  if (kept.length < Math.min(6, limit) && limit < 20) {
    limit = 20;
  }

  // Build results
  const results = kept
    .sort((a,b) => (b.score||0)-(a.score||0))
    .slice(0, limit)
    .map(it => ({
      title: it.title,
      site: it.site,
      url: it.url,
      runtime: it.runtimeSec != null ? fmtMMSS(it.runtimeSec) : "—",
      thumbnail: it.thumbnail || null,
      tags: it.tags && it.tags.length ? it.tags : [],
      notes: it.notes || (it.source === "forum" ? "discussion thread (links inside)" : "search result")
    }));

  // HARD FALLBACK (allowed hosts + reddit/archive)
  let finalResults = results;
  let fallback_used = false;
  if (finalResults.length === 0) {
    const raw = candidates
      .filter(it => it.url && ALLOWED_FALLBACK.has((it.site||"").toLowerCase()))
      .map(it => {
        const score = rankScore((it.site||"").toLowerCase(), /\/(2024|2025)\b/.test(it.url||""))
          + titleRelevanceBonus(q, it.title);
        return { ...it, title: neutralizeTitle(it.title), score };
      })
      .sort((a,b)=> (b.score||0)-(a.score||0))
      .slice(0, limit);

    finalResults = raw.map(it => ({
      title: it.title,
      site: it.site,
      url: it.url,
      runtime: it.runtimeSec != null ? fmtMMSS(it.runtimeSec) : "—",
      thumbnail: it.thumbnail || null,
      tags: it.tags && it.tags.length ? it.tags : [],
      notes: (it.notes ? it.notes + "; " : "") + "raw-fallback"
    }));
    fallback_used = true;
  }

  const diag = {
    fetched_cse, fetched_forum,
    kept: finalResults.length,
    dropped_paywall, dropped_dead, dropped_forbidden, dropped_removed,
    dropped_not_video, dropped_fallback_not_video,
    dropped_orientation,
    fallback_used,
    relaxHosts, durationMode, freshness,
    errors: errorLog
  };

  const payload = {
    query: q,
    site: siteQuery,
    mode: searchMode,
    durationQuery,
    freshness,
    results: finalResults,
    diag: DEBUG ? diag : undefined
  };

  const res = jok(payload, 200);
  if (!bypassCache) ctx.waitUntil(edgeCache.put(request, res.clone()));
  return res;
}

// -------------------------- UI (root) --------------------------

function joinPath(base, leaf){
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  return b + "/" + leaf;
}
function htmlResponse(html, code=200){
  return new Response(html, {
    status: code,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

const PORTAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>Jack Portal</title>
<link rel="manifest" href="/manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#000000">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png">
<style>
  :root {
    --bg:#0b0b0c; --panel:#141416; --panel-2:#1a1b1e; --muted:#9aa0a6; --txt:#e9eaee;
    --accent:#3b82f6; --accent-2:#2563eb; --ok:#22c55e; --bad:#ef4444; --radius:14px;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--bg);color:var(--txt);font:16px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
  header{position:sticky;top:0;z-index:5;background:#0f1012cc;backdrop-filter:saturate(120%) blur(6px);padding:14px 16px;border-bottom:1px solid #1f2024}
  h1{margin:0;font-size:20px;font-weight:650}
  main{padding:16px;max-width:1100px;margin:0 auto}
  .panel{background:var(--panel);border:1px solid #1f2024;border-radius:var(--radius);padding:16px}
  .title{font-weight:700;font-size:22px;margin:0 0 10px}
  .row{display:grid;gap:16px;grid-template-columns:1fr 1fr}
  @media (max-width:720px){.row{grid-template-columns:1fr}}
  .row-2{display:grid;gap:12px;grid-template-columns:1fr 1fr}
  @media (max-width:720px){.row-2{grid-template-columns:1fr}}
  label{display:block;margin:8px 0 6px;color:var(--muted);font-size:13px}
  input[type="text"], input[type="number"], select{
    width:100%;padding:12px 12px;border-radius:10px;border:1px solid #23252b;background:var(--panel-2);color:var(--txt);outline:none
  }
  input::placeholder{color:#6b7280}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
  .chip{padding:8px 12px;border-radius:999px;background:#1f2126;border:1px solid #262a31;color:#cfd3da;cursor:pointer;font-size:13px}
  .chip.active{background:#1f3b8a;border-color:#2147a8;color:#fff}
  .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
  button{appearance:none;border:0;border-radius:10px;background:var(--accent);color:#fff;padding:10px 14px;font-weight:600;cursor:pointer}
  button.secondary{background:#20242b;color:#d9dce3;border:1px solid #2a2e36}
  button.ghost{background:transparent;border:1px dashed #2f3540;color:#9aa0a6}
  .muted{color:var(--muted);font-size:13px}
  .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin-top:16px}
  .card{background:var(--panel-2);border:1px solid #22252b;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px}
  .thumb{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;background:#0d0e11}
  .meta{color:var(--muted);font-size:13px}
  a.link{color:#9cc4ff;text-decoration:none}
  a.link:hover{text-decoration:underline}
  .status{position:sticky;bottom:0;margin-top:18px;text-align:right;color:var(--muted);font-size:12px}
  .debug{white-space:pre-wrap;background:#0f1115;border:1px solid #23262d;padding:10px;border-radius:10px;font-family:ui-monospace,Consolas,Menlo,monospace;font-size:12px;display:none}
  .debug.show{display:block}
</style>
</head>
<body>
<header><h1>Jack Portal</h1></header>
<main>
  <div class="panel">
    <h2 class="title">Search</h2>
    <div class="row">
      <div>
        <label>Query</label>
        <input id="q" type="text" placeholder="Type a query" />
        <div class="muted" style="margin-top:6px">Duration accepts 5–12m, &lt;3m, &gt;10m, 7:30, PT1H5M</div>
      </div>
      <div>
        <label>Mode</label>
        <select id="modeSel">
          <option value="niche">niche</option>
          <option value="keywords">keywords</option>
          <option value="deep_niche">deep_niche</option>
          <option value="forums">forums</option>
          <option value="tumblrish">tumblrish</option>
        </select>
        <div class="chips" id="modeChips">
          <div class="chip active" data-mode="niche">niche</div>
          <div class="chip" data-mode="keywords">keywords</div>
          <div class="chip" data-mode="deep_niche">deep_niche</div>
          <div class="chip" data-mode="forums">forums</div>
          <div class="chip" data-mode="tumblrish">tumblrish</div>
        </div>
      </div>
    </div>
    <div class="row-2" style="margin-top:12px">
      <div>
        <label>Freshness</label>
        <select id="freshSel">
          <option value="d7">7 days</option>
          <option value="m1">1 month</option>
          <option value="m3">3 months</option>
          <option value="y1">1 year</option>
          <option value="all" selected>All time</option>
        </select>
      </div>
      <div>
        <label>Limit</label>
        <input id="limit" type="number" value="20" min="3" max="20" />
      </div>
    </div>
    <div class="row-2" style="margin-top:12px">
      <div>
        <label>Duration</label>
        <input id="duration" type="text" placeholder="e.g. 3–8m or PT5M" />
      </div>
      <div>
        <label>Site (optional)</label>
        <input id="site" type="text" placeholder="example.com" />
      </div>
    </div>
    <div class="row-2" style="margin-top:12px">
      <div>
        <label>Host Mode</label>
        <select id="hostModeSel">
          <option value="normal">normal</option>
          <option value="relaxed">relaxed</option>
        </select>
      </div>
      <div>
        <label>Duration Mode</label>
        <select id="durationModeSel">
          <option value="normal">normal</option>
          <option value="lenient">lenient</option>
        </select>
      </div>
    </div>
    <div class="actions">
      <button id="goBtn">Search</button>
      <button class="secondary" id="copyBtn" type="button">Copy results</button>
      <button class="ghost" id="dbgBtn" type="button">Toggle debug</button>
      <button class="secondary" id="saveBtn" type="button">Save defaults</button>
      <button class="ghost" id="resetBtn" type="button">Reset</button>
    </div>
    <label style="display:flex;align-items:center;gap:8px;margin-top:10px">
      <input type="checkbox" id="showThumbs" checked /> <span class="muted">Show thumbnails (uses item.thumbnail if provided)</span>
    </label>
    <div class="muted" style="margin-top:12px">
      Modes map directly to the API; Freshness supports d7/m1/m3/y1/all (all = no time limit).
    </div>
  </div>
  <div id="results" class="grid" aria-live="polite" style="margin-top:16px"></div>
  <div id="debug" class="debug" style="margin-top:16px"></div>
  <div class="status" id="status">idle</div>
</main>
<script>
// Register service worker (A2HS)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(()=>{});
}
const API_BASE = '/aggregate';
// UI refs …
const qEl = document.getElementById("q");
const modeSel = document.getElementById("modeSel");
const freshSel = document.getElementById("freshSel");
const limitEl = document.getElementById("limit");
const durationEl = document.getElementById("duration");
const siteEl = document.getElementById("site");
const hostModeSel = document.getElementById("hostModeSel");
const durationModeSel = document.getElementById("durationModeSel");
const showThumbsEl = document.getElementById("showThumbs");
const resultsEl = document.getElementById("results");
const statusEl  = document.getElementById("status");
const debugEl   = document.getElementById("debug");
const goBtn = document.getElementById("goBtn");
const copyBtn = document.getElementById("copyBtn");
const dbgBtn = document.getElementById("dbgBtn");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const modeChips = document.getElementById("modeChips");

function setStatus(s){ statusEl.textContent = s; }
function chipSync(mode){
  [...modeChips.querySelectorAll(".chip")].forEach(c=>{
    c.classList.toggle("active", c.dataset.mode===mode);
  });
  modeSel.value = mode;
}
function buildUrl(){
  const p = new URLSearchParams();
  p.set("q", qEl.value.trim());
  p.set("mode", modeSel.value || "niche");
  p.set("fresh", freshSel.value || "all");
  p.set("limit", Math.max(3, Math.min(20, parseInt(limitEl.value||"20",10))));
  const dur = durationEl.value.trim(); if (dur) p.set("duration", dur);
  const site = siteEl.value.trim(); if (site) p.set("site", site);
  p.set("hostMode", hostModeSel.value || "normal");
  p.set("durationMode", durationModeSel.value || "normal");
  p.set("nocache", "1"); // always bypass cache for live tests
  return API_BASE + "?" + p.toString();
}
function cardHtml(item, showThumb){
  const t = item.title || "clip";
  const site = item.site || "";
  const rt = item.runtime || "—";
  const url = item.url || "#";
  const thumb = item.thumbnail || item.thumb || "";
  let html = '<div class="card">';
  if (showThumb && thumb) {
    html += '<img class="thumb" src="' + thumb + '" alt="" loading="lazy">';
  }
  html += '<div style="font-weight:700">' + t + '</div>';
  html += '<div class="meta"><strong>Site:</strong> ' + site + ' &nbsp; • &nbsp; <strong>Runtime:</strong> ' + rt + '</div>';
  html += '<div><a class="link" href="' + url + '" target="_blank" rel="noopener noreferrer">Link</a></div>';
  html += '</div>';
  return html;
}
function render(items){
  resultsEl.innerHTML = (items||[]).map(it => cardHtml(it, showThumbsEl.checked)).join("");
}
function saveDefaults(){
  const obj = {
    fresh:freshSel.value,
    limit:limitEl.value,
    showThumbs:showThumbsEl.checked,
    mode:modeSel.value,
    hostMode:hostModeSel.value,
    durationMode:durationModeSel.value
  };
  try{ localStorage.setItem("jack.defaults", JSON.stringify(obj)); }catch{}
}
function loadDefaults(){
  try{
    const s = localStorage.getItem("jack.defaults"); if(!s) return;
    const d = JSON.parse(s);
    if(d.fresh) freshSel.value = d.fresh;
    if(d.limit) limitEl.value = d.limit;
    if(typeof d.showThumbs==="boolean") showThumbsEl.checked = d.showThumbs;
    if(d.mode){ modeSel.value = d.mode; chipSync(d.mode); }
    if(d.hostMode) hostModeSel.value = d.hostMode;
    if(d.durationMode) durationModeSel.value = d.durationMode;
  }catch{}
}
modeChips.addEventListener("click",(e)=>{
  const chip = e.target.closest(".chip"); if(!chip) return; chipSync(chip.dataset.mode);
});
dbgBtn.addEventListener("click",()=>debugEl.classList.toggle("show"));
saveBtn.addEventListener("click",()=>{ saveDefaults(); setStatus("defaults saved"); setTimeout(()=>setStatus("idle"),800); });
resetBtn.addEventListener("click",()=>{
  qEl.value=""; durationEl.value=""; siteEl.value="";
  freshSel.value="all"; limitEl.value="20"; showThumbsEl.checked=true; chipSync("niche");
  hostModeSel.value="normal"; durationModeSel.value="normal";
  setStatus("reset"); setTimeout(()=>setStatus("idle"),800);
});
copyBtn.addEventListener("click", async ()=>{
  const data = [...resultsEl.querySelectorAll(".card")].map(c=>{
    const title = c.querySelector("div[style*='font-weight']").textContent.trim();
    const site = c.querySelector(".meta").textContent.replace(/\s+/g," ").trim();
    const url = c.querySelector("a.link")?.href || "";
    return title + " — " + site + " — " + url;
  }).join("\n");
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(data);
    }else{
      const ta = document.createElement("textarea");
      ta.value = data;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setStatus("copied"); setTimeout(()=>setStatus("idle"),800);
  }catch{
    setStatus("copy failed"); setTimeout(()=>setStatus("idle"),1200);
  }
});
goBtn.addEventListener("click", async () => {
  const u = buildUrl();
  if (!qEl.value.trim()) {
    setStatus("enter a query");
    return;
  }
  setStatus("loading…");
  resultsEl.innerHTML = "";
  debugEl.textContent = "";
  try {
    const r = await fetch(u, { cache: "no-store" });
    if (!r.ok) {
      const t = await r.text();
      debugEl.textContent = 'HTTP ' + r.status + ' — ' + t;
      setStatus('error');
      return;
    }
    const data = await r.json();
    render(data.results || []);
    debugEl.textContent = JSON.stringify(data.diag || data, null, 2);
    setStatus('done (' + ((data.results || []).length) + ')');
  } catch (e) {
    setStatus("error");
    debugEl.textContent = String(e);
// ...
  }
});
loadDefaults();
</script>
</body>
</html>`; // <<< ADD THE SEMICOLON HERE

// ---------------------- Manifest ----------------------
const MANIFEST_JSON = JSON.stringify({
// ...
  name: "Jack Portal",
  short_name: "Jack",
  start_url: "/",
  display: "standalone",
  background_color: "#000000",
  theme_color: "#000000",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
  ]
});

Worker payload (served at /sw.js) ----------------
const SW_JS = "const CACHE_NAME = 'jack-portal-v1';\n" +
  "const ASSETS_TO_CACHE = [\n" +
  "  '/',\n" +
  "  '/icon-192.png',\n" +
  "  '/icon-512.png',\n" +
  "  '/site.webmanifest',\n" +
  "  '/manifest.json'\n" +
  "];\n\n" +

// ------------------- Icons -------------------
const ICON_192 = "/icon-192.png";
const ICON_512 = "/icon-512.png";

// Thumbnail passthrough – no decoding, just return usable URLs.
function asThumb(src) {
  if (!src || typeof src !== "string") return undefined;
  const s = src.trim();
  if (s.startsWith("data:image/")) return s;   // inline base64 image
  if (/^https?:\/\//i.test(s)) return s;       // standard http(s)
  return undefined;                            // anything else ignored
}
