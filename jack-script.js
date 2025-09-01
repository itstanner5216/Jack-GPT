// @ts-nocheck
// Jack-GPT Enterprise - All-in-One Self-Contained Implementation
// Complete with UI, API, and service worker

// -------------------- Configuration and Constants --------------------
const APP_VERSION = '2.0.0';
const BUILD_DATE = '2025-08-29';

// API Keys with fallbacks
const SERPER_API_KEY = 'a1feeb90cb8f651bafa0b8c1a0d1a2d3f35e9d12'; // Fallback key
const GOOGLE_KEY = 'AIzaSyAZhWamw25pgVB_3NAhvQOuSbkeh-mEWu0'; // Fallback key
const GOOGLE_CX = '73e4998767b3c4800'; // Fallback CSE ID
const FORUM_KEY = '39c5bdf0ac8645b5c9cc3f9a88c7ad4683395e78ec517ac35466bf5df2cf305e'; // Fallback key// Enhanced API integrations
const ADL_API_BASE = 'https://porn-api-adultdatalink.p.rapidapi.com';

// Known gay-oriented hosts for auto-pass orientation filtering
const KNOWN_GAY_HOSTS = new Set([
  "gayporntube.com", "gaymaletube.com", "boyfriendtv.com", "rockettube.com", 
  "youporngay.com", "gaytwinksporn.net", "gaymenring.com", "gayfuckporn.com",
  "manpornxxx.com", "gayrookievideos.com", "guystricked.com", "101boyvideos.com",
  "gotgayporn.com", "ggroot.com", "winporn.com"
]);

// Query expansion terms for niche queries
const NICHE_EXPANSION_TERMS = [
  "forced", "while sleeping", "public cruising", "public cdmx", "gloryhole"
];

// KV Storage Keys
const KV_KEYS = {
  ADAPTERS_CONFIG: 'adapters:config',
  FRONTIER_TAGS: 'frontier:tags',
  CACHE_PREFIX: 'cache:',
  ARCHIVE_PREFIX: 'archive:',
  ADL_PREFIX: 'adl:',
  FRONTIER_PREFIX: 'frontier:'
};

// Concurrency limits per host
const HOST_CONCURRENCY_LIMITS = new Map([
  ['archive.org', 2],
  ['web.archive.org', 2],
  ['reddit.com', 3],
  ['www.reddit.com', 3],
  ['yandex.com', 4],
  ['porn-api-adultdatalink.p.rapidapi.com', 5]
]);



// Host configuration
const FREE_HOSTS = [
  "xvideos.com", "xnxx.com", "xhamster.com", "spankbang.com", "eporner.com", "porntrex.com",
  "thisvid.com", "motherless.com", "pornhub.com", "youporn.com", "redtube.com",
  "gayporntube.com", "gaymaletube.com", "boyfriendtv.com",
  // additions
  "ggroot.com", "gotgayporn.com", "gotporn.com", "nuvid.com", "winporn.com",
  "youporngay.com", "rockettube.com", "gaymenring.com", "gayfuckporn.com",
  "manpornxxx.com", "hotxxx.com", "gayrookievideos.com", "guystricked.com",
  "101boyvideos.com", "gaytwinksporn.net", "tumbex.com"
];

const SOFT_ALLOW_HOSTS = [
  "redgifs.com", "twitter.com", "x.com", "yuvutu.com", "tnaflix.com", "tube8.com",
  "empflix.com", "hqporner.com", "txxx.com", "porndoe.com"
];

const KNOWN_PAYWALL = new Set([
  "onlyfans.com", "justfor.fans", "camsoda.com", "chaturbate.com",
  "men.com", "seancody.com", "helixstudios.net", "corbinfisher.com", "belamistudios.com",
  "timtales.com", "sayuncle.com", "peterfever.com", "chaosmen.com", "justusboys.com", "gayforit.eu", "xtube.com",
  // Prefixed with www.
  "www.onlyfans.com", "www.justfor.fans", "www.camsoda.com", "www.chaturbate.com",
  "www.men.com", "www.seancody.com", "www.helixstudios.net", "www.corbinfisher.com", "www.belamistudios.com",
  "www.timtales.com", "www.sayuncle.com", "www.peterfever.com", "www.chaosmen.com", "www.justusboys.com", "www.gayforit.eu", "www.xtube.com"
]);

const BAD_PATH_HINTS = [
  "/verify", "/signup", "/login", "/premium", "/trial", "/join", "/checkout", "/subscribe", "/account", "/members"
];

// Pattern matching
const HTML_PLAYER_RX = /(og:video|<video|\bsource\s+src=|jwplayer|video-js|plyr|hls|m3u8|\.mp4\b|data-hls|player-container|html5player)/i;
const GAY_POSITIVE = /\b(gay|gayporn|gaytube|m\/m|\bmm\b|boyfriend|twink|otter|cub|bearsex|gaysex|straight friend|bottom|anal)\b/i;
const HETERO_RED_FLAGS = /\b(boy\/girl|man\/woman|m\/f|\bmf\b|f\/m|\bff\b|pussy|boobs|lesbian|stepmom|stepsis|milf|sister)\b/i;

// Freshness options
const FRESH_OK = new Set(["d7", "m1", "m3", "y1", "all"]);

// User agents
const UA_DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

// -------------------- Utility Functions --------------------
// --- JWT utilities for admin auth ---
const JWT_TTL = 60 * 60 * 8; // 8 hours

async function base64UrlEncode(buffer) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  switch (str.length % 4) {
    case 0: break;
    case 2: str += '=='; break;
    case 3: str += '='; break;
    default: throw new Error('Invalid base64url string');
  }
  const binaryStr = atob(str);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return bytes.buffer;
}

async function createHmacSignature(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return await base64UrlEncode(sig);
}

async function generateJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = new TextEncoder();
  const encHeader = btoa(JSON.stringify(header)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const encPayload = btoa(JSON.stringify(payload)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const data = encHeader + "." + encPayload;
  const sig = await createHmacSignature(data, secret);
  return data + "." + sig;
}

async function verifyJWT(token, secret) {
  if (!token) return { valid: false, reason: 'missing_token' };
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'malformed_token' };
  const [encHeader, encPayload, sig] = parts;
  const expected = await createHmacSignature(encHeader + "." + encPayload, secret);
  if (sig !== expected) return { valid: false, reason: 'invalid_signature' };
  try {
    const decoder = new TextDecoder();
    const payloadBuf = base64UrlDecode(encPayload);
    const payload = JSON.parse(decoder.decode(payloadBuf));
    const now = Math.floor(Date.now()/1000);
    const CLOCK_SKEW_SECONDS = 30;
    if (payload.exp && payload.exp < now - CLOCK_SKEW_SECONDS) {
      return { valid: false, reason: 'token_expired' };
    }
    if (!payload.sub || !payload.iat || !payload.exp || !payload.jti) {
      return { valid: false, reason: 'missing_required_claims' };
    }
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: 'validation_error' };
  }
}

async function revokeToken(env, jti, exp) {
  try {
    if (!env?.JACK_STORAGE) return false;
    await env.JACK_STORAGE.put(`jwt:revoked:${jti}`, '1', { expiration: exp });
    return true;
  } catch {
    return false;
  }
}

async function isRevoked(env, jti) {
  if (!env?.JACK_STORAGE) return false;
  const v = await env.JACK_STORAGE.get(`jwt:revoked:${jti}`);
  return !!v;
}

async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, reason: 'missing_auth_header' };
  }
  const token = authHeader.substring(7);
  const secret = env?.JWT_SECRET;
  if (!secret) {
    return { authenticated: false, reason: 'server_misconfigured' };
  }
  const res = await verifyJWT(token, secret);
  if (!res.valid) return { authenticated: false, reason: res.reason };
  if (await isRevoked(env, res.payload.jti)) {
    return { authenticated: false, reason: 'revoked' };
  }
  return { authenticated: true, user: res.payload };
}

async function withAuth(handler, request, env) {
  if (request.method === 'OPTIONS') {
    const headers = {
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    const origin = request.headers.get('Origin');
    if (origin && isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin;
    return new Response(null, { status: 204, headers });
  }
  const auth = await authenticate(request, env);
  if (!auth.authenticated) {
    const status = (auth.reason === 'token_expired' || auth.reason === 'missing_auth_header') ? 401 : 403;
    const headers = {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer',
      'Vary': 'Origin'
    };
    const origin = request.headers.get('Origin');
    if (origin && isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin;
    return new Response(JSON.stringify({ error: 'Authentication required', status }), { status, headers });
  }
  return handler(request, env, auth.user);
}
// --- End JWT utilities ---
// CORS handling
function addCorsHeaders(response, request) {
  const headers = new Headers(response.headers || {}

  headers.set('Vary', 'Origin');
  const origin = request.headers.get('Origin');
  if (origin && isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
  
  // If it's raw data to be converted to a Response
  return new Response(response, {
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json; charset=utf-8"
    }
  });
}

// Path joining
function joinPath(base, leaf) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  return b + "/" + leaf;
}

// HTML response helper
function htmlResponse(html, code = 200) {
  return new Response(html, {
    status: code,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

// JSON response helpers
function jerr(msg, code = 400) {
  return new Response(JSON.stringify({ error: msg, status: code }), {
    status: code,
    headers: {
      "content-type": "application/json; charset=utf-8",
      
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "*"
    }
  });
}

function jok(data, code = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status: code,
    headers: {
      "content-type": "application/json; charset=utf-8",
      
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "*"
    }
  });
}

// URL and string handling utilities
function clampInt(v, def, min, max) {
  const n = parseInt(v ?? "", 10);
  return Number.isNaN(n) ? def : Math.max(min, Math.min(max, n));
}

function sanitizeSiteParam(s) {
  if (!s) return null;
  try {
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return s.replace(/^[a-z]+:\/\//i, "").split("/")[0].replace(/^www\./, "").trim().toLowerCase();
  }
}

function safeHost(u) {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function normUrl(raw) {
  try {
    const x = new URL(raw);
    x.hash = "";
    const KEEP = new Set(["v", "viewkey", "id"]); // keep identifiers
    for (const [k] of x.searchParams) {
      if (!KEEP.has(k)) x.searchParams.delete(k);
    }
    let s = x.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return raw;
  }
}

function neutralizeTitle(s) {
  return (s || "").normalize("NFKC")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim() || "clip";
}

// URL heuristics
function looksLikeVideoUrl(u) {
  try {
    const p = new URL(u).pathname.toLowerCase();
    return /\/(video|watch|view|embed|player)(\/|$)/.test(p) || /\/\d{3,}\/?$/i.test(p);
  } catch {
    return false;
  }
}

function looksLikeSearchUrl(u) {
  try {
    const X = new URL(u);
    const p = X.pathname.toLowerCase();
    const qs = X.search.toLowerCase();
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

// Content filtering utilities
function gayOnlyPass(title, textSample, host) {
  const titleT = (title || "").toLowerCase();
  const textT = (textSample || "").toLowerCase();
  const hasGay = GAY_POSITIVE.test(titleT) || GAY_POSITIVE.test(textT);
  const hasHet = HETERO_RED_FLAGS.test(titleT) || HETERO_RED_FLAGS.test(textT);
  const likelyGaySite = /(gayporntube|gaymaletube|boyfriendtv|rockettube|youporngay|gaytwinksporn|gaymenring)/i.test(host || "");
  
  if (hasHet && !hasGay) return false;
  if (hasGay || likelyGaySite) return true;
  return false;
}

// Duration handling
function durToSeconds(d) {
  if (!d) return null;
  if (/^\d+$/.test(d)) return parseInt(d, 10);
  const iso = d.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (iso) return (+iso[1] || 0) * 3600 + (+iso[2] || 0) * 60 + (+iso[3] || 0);
  const mm = d.match(/\b(\d{1,2}):(\d{2})\b/);
  if (mm) return +mm[1] * 60 + +mm[2];
  return null;
}

function parseDurationQuery(s) {
  if (!s) return null;
  const x = s.trim().toLowerCase();
  if (/^\d{1,5}-\d{1,5}$/.test(x)) {
    const [a, b] = x.split("-").map(n => +n);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  if (/^pt/.test(x)) {
    const sec = durToSeconds(x);
    if (sec != null) return { min: sec, max: sec };
  }
  const lt = x.match(/^<?=?\s*(\d{1,3})\s*m$/);
  if (lt) return { min: 0, max: +lt[1] * 60 };
  const gt = x.match(/^(\d{1,3})\s*\+\s*m$/);
  if (gt) return { min: +gt[1] * 60, max: 86400 };
  const rng = x.match(/^(\d{1,3})\s*-\s*(\d{1,3})\s*m$/);
  if (rng) {
    const a = +rng[1] * 60, b = +rng[2] * 60;
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const sec = durToSeconds(x);
  if (sec != null) return { min: sec, max: sec };
  return null;
}

function fitsDuration(sec, range, host, durationMode) {
  if (!range || sec == null) return true;
  let tol = durationMode === "lenient" ? 60 : 15;
  if (FREE_HOSTS.includes(host) || SOFT_ALLOW_HOSTS.includes(host)) tol += 45;
  return sec >= (range.min - tol) && sec <= (range.max + tol);
}

function fmtMMSS(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

// Network utilities
// --- Fixed fetchWithTimeout and fetchLimited (with concurrency guard) ---
const activeFetches = new Map();

async function fetchWithTimeout(resource, options = {}, timeout = 9000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(resource, { ...(options || {}), signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// Concurrency control for host-based rate limiting
async function fetchLimited(resource, options = {}, timeout = 9000) {
  let url;
  try {
    if (typeof resource === 'string') {
      url = new URL(resource);
    } else if (resource instanceof URL) {
      url = resource;
    } else if (resource instanceof Request) {
      url = new URL(resource.url);
    } else {
      return fetchWithTimeout(resource, options, timeout);
    }
  } catch (e) {
    console.warn("fetchLimited: Failed to parse URL, bypassing limits", e);
    return fetchWithTimeout(resource, options, timeout);
  }
  const hostname = url.hostname.toLowerCase();
  const concurrencyLimit = HOST_CONCURRENCY_LIMITS.get(hostname) || 4;
  if (!activeFetches.has(hostname)) activeFetches.set(hostname, 0);
  while (activeFetches.get(hostname) >= concurrencyLimit) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  activeFetches.set(hostname, activeFetches.get(hostname) + 1);
  try {
    return await fetchWithTimeout(resource, options, timeout);
  } finally {
    activeFetches.set(hostname, activeFetches.get(hostname) - 1);
    if (activeFetches.get(hostname) <= 0) activeFetches.delete(hostname);
  }
}
// --- End fixed fetch helpers ---
async function fetchJSON(u, i, t = 10000) {
  try {
    const r = await fetchWithTimeout(u, i, t);
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    return await r.json();
  } catch (e) {
    console.error(`fetchJSON error: ${e.message}`);
    return null;
  }
}

// Error handling
function pushErr(arr, msg) {
  if (arr.length < 20) arr.push(String(msg).slice(0, 220));
}

// Concurrency utilities
async function poolMap(items, worker, n = 6) {
  const out = new Array(items.length);
  let i = 0;
  const runners = Array(Math.min(n, items.length)).fill(0).map(async function run() {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await worker(items[idx], idx);
      } catch (e) {
        out[idx] = null;
        console.error(`poolMap worker error: ${e.message}`);
      }
    }
  });
  await Promise.all(runners);
  return out;
}

// Listing-page harvester Ã¢ÂÂ extract direct video links
function harvestVideoLinksFromListing(html, baseUrl) {
  const out = [];
  const hrefs = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["']/ig))
    .map(m => m[1]).filter(Boolean);
  const abs = hrefs.map(h => {
    try {
      return new URL(h, baseUrl).toString();
    } catch {
      return null;
    }
  }).filter(Boolean);
  const isVideoish = (u) => {
    try {
      const H = new URL(u).hostname.toLowerCase();
      const p = new URL(u).pathname.toLowerCase();
      return /\/(video|watch|view|embed)\b/.test(p)
        || (/xvideos|xnxx/.test(H) && /\/video-/.test(p))
        || (/spankbang/.test(H) && /\/video\//.test(p))
        || (/thisvid/.test(H) && /\/videos\//.test(p))
        || (/xhamster/.test(H) && /\/videos\//.test(p));
    } catch {
      return false;
    }
  };
  for (const u of abs) if (isVideoish(u)) out.push(normUrl(u));
  return Array.from(new Set(out)).slice(0, 12);
}

// Relevance scoring
function titleRelevanceBonus(query, title) {
  const STOP = new Set(["the", "a", "an", "and", "or", "of", "to", "for", "in", "on", "at", "with", "by", "from", "this", "that", "these", "those", "public", "amateur", "video", "clip"]);
  const qTok = (query || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  const tTok = (String(title) || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  const tSet = new Set(tTok.filter(w => !STOP.has(w)));
  let matches = 0;
  for (const w of qTok) if (!STOP.has(w) && tSet.has(w)) matches++;
  return Math.min(6, matches * 2);
}
// --- Consolidated scoring helpers ---
function tagRelevanceBonus(query, tags = [], alreadyMatchedTokens = null) {
  if (!tags || tags.length === 0) return 0;
  const qTokens = new Set((query || "").toLowerCase().match(/[a-z0-9]+/g) || []);
  if (alreadyMatchedTokens && Array.isArray(alreadyMatchedTokens)) {
    for (const t of alreadyMatchedTokens) qTokens.delete(t);
  }
  let matches = 0;
  for (const tag of tags) {
    const parts = String(tag).toLowerCase().match(/[a-z0-9]+/g) || [];
    for (const p of parts) {
      if (qTokens.has(p)) { matches++; break; }
    }
  }
  return Math.min(15, matches * 5);
}

function contentRelevanceScore(query, item) {
  const titleBonus = Number(titleRelevanceBonus(query, item.title || "")) || 0;
  const tagsBonus = tagRelevanceBonus(query, item.tags || []);
  return titleBonus + tagsBonus;
}

function calculateNegativeScore(item) {
  const text = ((item.title || "") + " " + (Array.isArray(item.tags) ? item.tags.join(" ") : "") + " " + (item.site || "")).toLowerCase();
  const penalties = [
    { re: /\blesbian\b|\bstraight\b|\bm\/f\b|\bmf\b/, score: 20 },
    { re: /\bgirlfriend\b|\bboyfriend\b/, score: 10 },
  ];
  let total = 0;
  for (const p of penalties) if (p.re.test(text)) total += p.score;
  return Math.min(50, total);
}

function calculateItemScore(item, q, params = {}) {
  const {
    PREFERRED_HOSTS,
    SOFT_ALLOW,
    FREE_HOSTS,
    SOFT_ALLOW_HOSTS,
    KNOWN_GAY_HOSTS
  } = params;
  const host = (item.site || "").toLowerCase().replace(/^www\./, "");

  let score = 40;
  function isInContainer(value, container) {
    if (!container) return false;
    if (typeof container.has === 'function') return container.has(value);
    if (Array.isArray(container)) return container.includes(value);
    return false;
  }
  if (isInContainer(host, PREFERRED_HOSTS) || isInContainer('www.' + host, PREFERRED_HOSTS)) {
    score = 100;
  } else if (isInContainer(host, SOFT_ALLOW) || isInContainer('www.' + host, SOFT_ALLOW)) {
    score = 75;
  } else if (isInContainer(host, FREE_HOSTS)) {
    score = 60;
  } else if (isInContainer(host, SOFT_ALLOW_HOSTS)) {
    score = 50;
  }
  if (isInContainer(host, KNOWN_GAY_HOSTS)) score += 10;
  if (item.source === "frontier" || (item.notes && item.notes.includes("frontier"))) score += 5;
  if (item.source === "adl") score += 8;
  if (item.source === "forum-mining" || (item.notes && item.notes.includes("forum-out"))) score += 15;
  const isNotInFree = !isInContainer(host, FREE_HOSTS);
  const isNotInSoft = !isInContainer(host, SOFT_ALLOW_HOSTS);
  if (isNotInFree && isNotInSoft) score += 3;
  const recentBoost = (item.url || "").includes("2024") || (item.url || "").includes("2025");
  if (recentBoost) score += 10;
  if (item.runtimeSec != null && item.runtimeSec > 300) score += 5;
  score += contentRelevanceScore(q, item);
  if (looksLikeVideoUrl(item.url)) score += 50;
  if (looksLikeSearchUrl(item.url)) score -= 50;
  score -= calculateNegativeScore(item);
  return Math.max(0, Math.min(200, score));
}
// --- End consolidated scoring helpers ---


// Image optimization
function optimizeThumbnail(url, width = 280) {
  if (!url) return null;
  
  // YouTube thumbnail optimization
  if (url.match(/\/vi\/([^\/]+)\/\w+\.jpg$/)) {
    return url.replace(/\/\w+\.jpg$/, '/mqdefault.jpg');
  }
  
  // Google CDN optimization
  if (url.match(/^https?:\/\/[^\/]+\.(googleusercontent|ggpht|ytimg)\.com\//)) {
    return `${url}=w${width}`;
  }
  
  return url;
}

// -------------------- Multi-Provider Search Service --------------------
class SearchService {
  constructor(env) {
    this.env = env;
    this.providers = [
      {
        name: 'serper',
        isEnabled: true,
        dailyQuota: 100,
        isQuotaExceeded: false,
        resetTime: null,
        handler: this.searchWithSerper.bind(this)
      },
      {
        name: 'google',
        isEnabled: true,
        dailyQuota: 100,
        isQuotaExceeded: false,
        resetTime: null,
        handler: this.searchWithGoogle.bind(this)
      }
    ];
    
    // Add Brave search if API key is available
    if (env?.BRAVE_API_KEY) {
      this.providers.push({
        name: 'brave',
        isEnabled: true,
        dailyQuota: 30,
        isQuotaExceeded: false,
        resetTime: null,
        handler: this.searchWithBrave.bind(this)
      });
    }
  }
  
  async search(query, options) {
    const searchOptions = { ...options };
    let lastError = null;
    let results = null;
    
    // Try each provider in order until one succeeds
    for (const provider of this.providers) {
      if (!provider.isEnabled || provider.isQuotaExceeded) {
        console.log(`Skipping provider ${provider.name}: ${provider.isQuotaExceeded ? 'quota exceeded' : 'disabled'}`);
        continue;
      }
      
      try {
        console.log(`Attempting search with provider: ${provider.name}`);
        results = await provider.handler(query, searchOptions);
        
        if (results && results.length > 0) {
          // Successfully got results
          return {
            success: true,
            provider: provider.name,
            results,
            metadata: {
              provider: provider.name,
              query,
              timestamp: new Date().toISOString()
            }
          };
        }
      } catch (error) {
        lastError = error;
        
        // Check if the error indicates quota exceeded
        if (this.isQuotaExceededError(error, provider.name)) {
          console.log(`Quota exceeded for provider: ${provider.name}`);
          provider.isQuotaExceeded = true;
          
          // Set reset time based on provider's reset policy
          provider.resetTime = this.getQuotaResetTime(provider.name);
        } else {
          console.error(`Error with provider ${provider.name}:`, error);
        }
      }
    }
    
    // If we get here, all providers failed
    return {
      success: false,
      error: lastError?.message || 'All search providers failed',
      metadata: {
        allProvidersExhausted: true,
        lastError: lastError?.message,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  isQuotaExceededError(error, providerName) {
    const status = error.status || error.statusCode;
    const message = error.message || '';
    
    if (status === 429) return true;
    
    if (providerName === 'serper' && 
        (message.includes('quota') || message.includes('limit') || message.includes('exceeded'))) {
      return true;
    }
    
    if (providerName === 'google' && 
        (message.includes('quota') || message.includes('limit') || message.includes('Daily Limit'))) {
      return true;
    }
    
    if (providerName === 'brave' && 
        (message.includes('quota') || message.includes('rate limit'))) {
      return true;
    }
    
    return false;
  }
  
  getQuotaResetTime(providerName) {
    const now = new Date();
    
    // Different providers have different reset policies
    if (providerName === 'serper') {
      // Serper resets daily
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    } else if (providerName === 'google') {
      // Google PSE also resets daily
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    } else if (providerName === 'brave') {
      // Brave resets after 24 hours typically
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(now.getHours(), now.getMinutes(), 0, 0);
      return tomorrow.toISOString();
    }
    
    // Default: reset after 24 hours
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString();
  }
  
  async searchWithSerper(query, options) {
    const searchEndpoint = 'https://api.serper.dev/search';
    
    const searchOptions = {
      q: query,
      gl: options.country || 'us',
      hl: options.language || 'en',
      num: options.limit || 10
    };
    
    // Add time-based filters
    if (options.fresh) {
      searchOptions.tbs = this.convertFreshnessToSerper(options.fresh);
    }
    
    // Add site restrictions if specified
    if (options.site) {
      searchOptions.q += ` site:${options.site}`;
    }
    
    const response = await fetch(searchEndpoint, {
      method: 'POST',
      headers: {
        'X-API-KEY': this.env?.SERPER_API_KEY || SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchOptions)
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Serper API error (${response.status}): ${text}`);
    }
    
    const data = await response.json();
    return this.normalizeSerperResults(data);
  }
  
  normalizeSerperResults(data) {
    const organicResults = data.organic || [];
    
    return organicResults.map(result => {
      // Extract domain from URL
      let domain = '';
      try {
        const url = new URL(result.link);
        domain = url.hostname.replace(/^www\./, '');
      } catch (e) {
        const match = result.link.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
        domain = match ? match[1] : '';
      }
      
      // Extract video duration if available
      let runtime = null;
      const durationMatches = [
        result.title.match(/(\d+:\d+(?::\d+)?)/),
        result.snippet?.match(/(\d+:\d+(?::\d+)?)/),
        result.title.match(/(\d+)\s*min/i),
        result.snippet?.match(/(\d+)\s*min/i)
      ].find(m => m);
      
      if (durationMatches) {
        runtime = durationMatches[1];
      }
      
      // Extract tags
      const tags = [];
      const keywordMatches = (result.title + ' ' + (result.snippet || '')).match(/\b(gay|male|homo|amateur|twink|bear)\b/gi);
      if (keywordMatches) {
        const uniqueKeywords = [...new Set(keywordMatches.map(k => k.toLowerCase()))];
        tags.push(...uniqueKeywords.slice(0, 5));
      }
      
      return {
        title: result.title,
        site: domain,
        url: result.link,
        runtimeSec: runtime ? durToSeconds(runtime) : null,
        thumbnail: result.imageUrl || null,
        tags: tags,
        notes: "search result",
        provider: 'serper'
      };
    });
  }
  
  convertFreshnessToSerper(fresh) {
    switch(fresh) {
      case 'd7': return 'qdr:w'; // last week
      case 'm1': return 'qdr:m'; // last month
      case 'm3': return 'qdr:m3'; // last 3 months
      case 'y1': return 'qdr:y'; // last year
      default: return ''; // all time
    }
  }
  
  async searchWithGoogle(query, options) {
    const googleKey = getRequiredEnv(this.env || env, "GOOGLE_KEY", "Google Search API key missing");
    const googleCx = getRequiredEnv(this.env || env, "GOOGLE_CX", "Google CSE ID missing");
    
    const CSE_PAGES = [1];
    const results = [];
    
    for (const start of CSE_PAGES) {
      const u = new URL("https://www.googleapis.com/customsearch/v1");
      u.searchParams.set("key", googleKey);
      u.searchParams.set("cx", googleCx);
      u.searchParams.set("q", query);
      u.searchParams.set("num", String(options.limit || 10));
      u.searchParams.set("start", String(start));
      u.searchParams.set("gl", "us");
      u.searchParams.set("hl", "en");
      
      if (options.fresh && options.fresh !== "all") {
        u.searchParams.set("dateRestrict", options.fresh);
      }
      
      const data = await fetchJSON(u.toString(), { headers: { "User-Agent": UA_MOBILE }}, 10000);
      if (!data || !Array.isArray(data?.items)) continue;
      
      for (const it of data.items) {
        const link = normUrl(it.link || "");
        const host = (new URL(link).hostname || "").toLowerCase();
        
        // Skip known paywalls
        if (KNOWN_PAYWALL.has(host)) continue;
        
        // Extract duration
        let dur = null;
        const pm = it.pagemap || {};
        if (Array.isArray(pm.videoobject) && pm.videoobject[0]?.duration) {
          dur = durToSeconds(String(pm.videoobject[0].duration));
        }
        if (!dur && pm.metatags?.[0]?.["og:video:duration"]) {
          dur = parseInt(pm.metatags[0]["og:video:duration"], 10);
        }
        if (!dur && it.title) {
          const m = it.title.match(/\b(\d{1,2}):(\d{2})\b/);
          if (m) dur = +m[1]*60 + +m[2];
        }
        
        // Extract thumbnail
        let thumb = null;
        if (pm?.cse_thumbnail?.[0]?.src) thumb = pm.cse_thumbnail[0].src;
        else if (pm?.metatags?.[0]?.["og:image"]) thumb = pm.metatags[0]["og:image"];
        
        // Extract tags
        const tags = [];
        const keywordMatches = (it.title + ' ' + (it.snippet || '')).match(/\b(gay|male|homo|amateur|twink|bear)\b/gi);
        if (keywordMatches) {
          const uniqueKeywords = [...new Set(keywordMatches.map(k => k.toLowerCase()))];
          tags.push(...uniqueKeywords.slice(0, 5));
        }
        
        results.push({
          title: neutralizeTitle(it.title || ""),
          site: host,
          url: link,
          runtimeSec: dur,
          thumbnail: thumb ? optimizeThumbnail(thumb) : null,
          tags: tags,
          notes: "search result",
          provider: 'google'
        });
      }
    }
    
    return results;
  }
  
  async searchWithBrave(query, options) {
    const apiKey = this.env?.BRAVE_API_KEY;
    if (!apiKey) {
      throw new Error('Brave API key not configured');
    }
    
    const searchEndpoint = 'https://api.search.brave.com/res/v1/web/search';
    
    const params = new URLSearchParams({
      q: query,
      count: options.limit || 10,
      offset: 0,
      spellcheck: true,
      safesearch: 'off'
    });
    
    // Apply freshness filter if specified
    if (options.fresh) {
      params.append('freshness', this.convertFreshnessToBrave(options.fresh));
    }
    
    // Add site filter if specified
    if (options.site) {
      params.append('site', options.site);
    }
    
    const response = await fetch(`${searchEndpoint}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
        'User-Agent': UA_MOBILE
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Brave API error (${response.status}): ${text}`);
    }
    
    const data = await response.json();
    return this.normalizeBraveResults(data);
  }
  
  normalizeBraveResults(data) {
    const results = data.web?.results || [];
    
    return results.map(result => {
      // Extract domain
      let domain = '';
      try {
        domain = new URL(result.url).hostname.replace(/^www\./, '');
      } catch {
        domain = '';
      }
      
      // Extract duration if available
      let runtime = null;
      const durationMatches = [
        result.title.match(/(\d+:\d+(?::\d+)?)/),
        result.description?.match(/(\d+:\d+(?::\d+)?)/),
        result.title.match(/(\d+)\s*min/i),
        result.description?.match(/(\d+)\s*min/i)
      ].find(m => m);
      
      if (durationMatches) {
        runtime = durToSeconds(durationMatches[1]);
      }
      
      // Extract tags
      const tags = [];
      const keywordMatches = (result.title + ' ' + (result.description || '')).match(/\b(gay|male|homo|amateur|twink|bear)\b/gi);
      if (keywordMatches) {
        const uniqueKeywords = [...new Set(keywordMatches.map(k => k.toLowerCase()))];
        tags.push(...uniqueKeywords.slice(0, 5));
      }
      
      return {
        title: result.title,
        site: domain,
        url: result.url,
        runtimeSec: runtime,
        thumbnail: result.thumbnail ? optimizeThumbnail(result.thumbnail) : null,
        tags: tags,
        notes: "search result",
        provider: 'brave'
      };
    });
  }
  
  convertFreshnessToBrave(fresh) {
    switch(fresh) {
      case 'd7': return 'pd'; // past day
      case 'm1': return 'pm'; // past month
      case 'm3': return 'pm'; // past month (closest option)
      case 'y1': return 'py'; // past year
      default: return 'a'; // all time
    }
  }
}

// -------------------- Page Analysis Function --------------------
async function getPlayableMeta(uStr) {
  const headers = { 
    "User-Agent": UA_MOBILE,
    "Accept-Language": "en-US,en;q=0.9" 
  };
  let finalUrl = uStr, ct = "", textSample = "", thumb = null, rawHtml = "";
  try {
    const res = await fetchLimited(uStr, { method: "GET", redirect: "follow", headers }, 9000);
    finalUrl = res.url || finalUrl;
    ct = res.headers.get("content-type") || "";
    if ((ct || "").includes("text/html")) {
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
    console.error(`Network error: ${e.message}`);
    return { ok: false, url: finalUrl, ct, playable: false };
  }
  
  const urlHost = safeHost(finalUrl);
  
  // Orientation
  const passLenientBaseline = gayOnlyPass("", textSample, urlHost);
  if (!passLenientBaseline) {
    return { ok: true, url: finalUrl, ct, playable: false, orientationFail: true, thumbnail: thumb, duration: null };
  }
  
  // Listing harvest
  let harvested = undefined;
  if (looksLikeSearchUrl(finalUrl) && 
      (FREE_HOSTS.includes(urlHost) || SOFT_ALLOW_HOSTS.includes(urlHost)) && 
      rawHtml) {
    const found = harvestVideoLinksFromListing(rawHtml, finalUrl);
    if (found.length) harvested = found;
  }
  
  // duration sniff
  let durationSec = null;
  if (textSample) {
    const ld = textSample.match(/"duration"\s*:\s*"(pt[^"]+)"/i);
    if (ld) durationSec = durToSeconds(ld[1]);
    
    if (!durationSec) {
      const og = textSample.match(/property=["']og:video:duration["'][^>]*content=["'](\d{1,6})["']/i);
      if (og) durationSec = parseInt(og[1], 10);
    }
    
    if (!durationSec) {
      const m = textSample.match(/\b(\d{1,2}):(\d{2})\b/);
      if (m) durationSec = +m[1] * 60 + +m[2];
    }
  }
  
  const playable = FREE_HOSTS.includes(urlHost)
    || SOFT_ALLOW_HOSTS.includes(urlHost)
    || /video|mp4|m3u8|application\/octet-stream/i.test(ct)
    || HTML_PLAYER_RX.test(textSample || "")
    || /player|embed|hls|m3u8|\.mp4\b/i.test(finalUrl);
    
  return { 
    ok: true, 
    url: finalUrl, 
    ct, 
    playable, 
    duration: durationSec, 
    thumbnail: thumb ? optimizeThumbnail(thumb) : null, 
    harvested 
  };
}

// -------------------- Main API Handler --------------------
async function handleAggregate(request, env, ctx) {
  // Handle preflight
  if (request.method === 'OPTIONS') {
  const headers = corsHeadersFor(request);
  return new Response(null, { status: 204, headers });
}
    });
  }
  
  if (request.method !== "GET") {
    return jerr("method not allowed", 405);
  }
  
  const url = new URL(request.url);
  
  // Edge cache (bypass via ?nocache=1)
  const edgeCache = caches.default;
  const bypassCache = url.searchParams.get("nocache") === "1";
  if (!bypassCache) {
    const cached = await edgeCache.match(request);
    if (cached) return cached;
  }
  
  // ---------- Config (orientation locked lenient)
  const relaxHosts = (url.searchParams.get("hostMode") || String(env?.HOST_MODE || "")).toLowerCase() === "relaxed";
  const durationMode = (url.searchParams.get("durationMode") || String(env?.DURATION_MODE || "normal")).toLowerCase(); // "normal" | "lenient"
  
  // Secondary hosts via env (comma-separated)
  const SECONDARY_HOSTS = String(env?.SECONDARY_HOSTS || "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  
  // Create host sets
  const PREF_BASE = [...FREE_HOSTS, ...(relaxHosts ? SECONDARY_HOSTS : [])];
  const SOFT_BASE = [...SOFT_ALLOW_HOSTS, ...(relaxHosts ? SECONDARY_HOSTS : [])];
  const PREFERRED_HOSTS = new Set(PREF_BASE.flatMap(h => [h, `www.${h}`]));
  const SOFT_ALLOW = new Set(SOFT_BASE.flatMap(h => [h, `www.${h}`]));
  
  const ALLOWED_FALLBACK = new Set([
    ...Array.from(PREFERRED_HOSTS),
    ...Array.from(SOFT_ALLOW),
    "reddit.com", "www.reddit.com",
    "archive.org", "www.archive.org", "archive.ph", "www.archive.ph"
  ]);
  
  if (relaxHosts) {
    for (const h of SECONDARY_HOSTS) {
      ALLOWED_FALLBACK.add(h);
      ALLOWED_FALLBACK.add(`www.${h}`);
    }
  }
  
  // Params
  const qRaw = (url.searchParams.get("q") || "").trim();
  if (!qRaw) return jerr("missing query", 400);
  const q = qRaw.length > 500 ? qRaw.slice(0, 500) : qRaw;
  let limit = clampInt(url.searchParams.get("limit"), 10, 3, 20);
  const durationQuery = (url.searchParams.get("duration") || "").trim() || null;
  let freshness = (url.searchParams.get("fresh") || "y1").trim().toLowerCase();
  if (!FRESH_OK.has(freshness)) freshness = "y1";
  const rawSite = (url.searchParams.get("site") || "").trim();
  let siteQuery = sanitizeSiteParam(rawSite) || null;
  let searchMode = (url.searchParams.get("mode") || "normal").trim().toLowerCase();
if (siteQuery && /[\s"]/g.test(siteQuery)) siteQuery = null;
const DEBUG = url.searchParams.get("debug") === "1" || String(env?.DEBUG || "").toLowerCase() === "true";

  // Analytics tracking
  const requestId = url.searchParams.get("reqId") || crypto.randomUUID();

    // Initialize the enhanced search service
    const searchService = new EnhancedSearchService(env);
    // Build search options
    const searchOptions = {
      limit: limit * 2,
      fresh: freshness,
      site: siteQuery,
      country: 'us',
      language: 'en',
      mode: searchMode
    };

    let searchResult;
    switch (searchMode) {
      case 'deep_niche':
        searchResult = await searchService.searchDeepNicheMode(q, searchOptions);
        break;
      case 'light':
        searchResult = await searchService.searchLightMode(q, searchOptions);
        break;
      case 'normal':
      default:
        searchResult = await searchService.searchNormalMode(q, searchOptions);
        break;
    }
    
    if (!searchResult.success) {
      return jerr(searchResult.error || "search failed", 500);
    }
    
    // Process results
    fetched_total = searchResult.results.length;
    let candidates = searchResult.results.map(result => ({
      source: result.provider,
      title: neutralizeTitle(result.title || ""),
      site: result.site || "",
      url: result.url || "",
      runtimeSec: result.runtimeSec,
      thumbnail: result.thumbnail,
      tags: result.tags || [],
      notes: result.notes || "search result"
    })).filter(it => !!it.url);
    
    // Analyze candidates
    const nonForumIdx = candidates.map((it, idx) => ({ it, idx })).filter(x => x.it.source !== "forum");
    const analyses = await poolMap(nonForumIdx, async ({ it }) => getPlayableMeta(it.url), 6);
    const analysisByUrl = new Map();
    nonForumIdx.forEach((x, k) => {
      analysisByUrl.set(normUrl(x.it.url), analyses[k]);
    });
    
    // Selection
    const kept = [];
    for (let idx = 0; idx < candidates.length; idx++) {
      if (kept.length >= limit) break;
      const it = candidates[idx];
      if (!it?.url) {
        dropped_dead++;
        continue;
      }
      
      // Forums (title-only gay cue)
      if (it.source === "forum") {
        if (!gayOnlyPass(it.title, "", it.site)) {
          dropped_orientation++;
          continue;
        }
        kept.push({
          ...it,
          score: 85 + (it.url.includes("2024") || it.url.includes("2025") ? 10 : 0)
        });
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
      if (KNOWN_PAYWALL.has(host)) {
        dropped_paywall++;
        continue;
      }
      if (BAD_PATH_HINTS.some(h => it.url.toLowerCase().includes(h))) {
        dropped_paywall++;
        continue;
      }
      
      // Avoid listing/search pages unless already harvested above
      if (looksLikeSearchUrl(it.url)) {
        dropped_dead++;
        continue;
      }
      
      // Orientation fallback: if page text failed, try title-only
      if (lc?.orientationFail && !gayOnlyPass(it.title, "", host)) {
        dropped_orientation++;
        continue;
      }
      
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
            score: (PREFERRED_HOSTS.has(host) ? 80 : 60) - 10
          });
          continue;
        }
        dropped_not_video++;
        continue;
      }
      
      const runtimeSec = it.runtimeSec ?? lc.duration ?? null;
      if (!fitsDuration(runtimeSec, wantRange, host, durationMode)) continue;
      it.runtimeSec = runtimeSec;
      const score = calculateItemScore(it, q, {
        PREFERRED_HOSTS,
        SOFT_ALLOW,
        FREE_HOSTS,
        SOFT_ALLOW_HOSTS,
        KNOWN_GAY_HOSTS
      });
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
        if (!it?.url) {
          dropped_dead++;
          continue;
        }
        if (it.source === "forum") {
          if (!gayOnlyPass(it.title, "", it.site)) {
            dropped_orientation++;
            continue;
          }
          kept.push({
            ...it,
            title: neutralizeTitle(it.title),
            url: it.url,
            site: it.site || "reddit.com",
            runtimeSec: null,
            thumbnail: null,
            notes: (it.notes ? it.notes + "; " : "") + "second-pass",
            score: 85 + (it.url.includes("2024") || it.url.includes("2025") ? 10 : 0)
          });
          continue;
        }
        if (looksLikeSearchUrl(it.url)) {
          dropped_dead++;
          continue;
        }
        const host = (it.site || "").toLowerCase();
        if (KNOWN_PAYWALL.has(host)) {
          dropped_paywall++;
          continue;
        }
        const lc = analysisByUrl.get(normUrl(it.url));
        if (!lc || !(lc.playable || looksLikeVideoUrl(it.url))) {
          dropped_fallback_not_video++;
          continue;
        }
        
        const runtimeSec = it.runtimeSec ?? lc.duration ?? null;
        it.runtimeSec = runtimeSec;
        const score = calculateItemScore(it, q, {
          PREFERRED_HOSTS,
          SOFT_ALLOW,
          FREE_HOSTS,
          SOFT_ALLOW_HOSTS,
          KNOWN_GAY_HOSTS
        });

      }
    }
    
    // Adaptive limit lift if underfilled
    if (kept.length < Math.min(6, limit) && limit < 20) {
      limit = 20;
    }
    
    // Build results
    const results = kept
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit)
      .map(it => ({
        title: it.title,
        site: it.site,
        url: it.url,
        runtime: it.runtimeSec != null ? fmtMMSS(it.runtimeSec) : "Ã¢ÂÂ",
        thumbnail: it.thumbnail || null,
        tags: it.tags && it.tags.length ? it.tags : [],
        notes: it.notes || (it.source === "forum" ? "discussion thread (links inside)" : "search result")
      }));
    
    // HARD FALLBACK (allowed hosts + reddit/archive)
    let finalResults = results;
    let fallback_used = false;
    if (finalResults.length === 0) {
      const raw = candidates
        .filter(it => it.url && ALLOWED_FALLBACK.has((it.site || "").toLowerCase()))
        .map(it => {
          const recentBoost = it.url.includes("2024") || it.url.includes("2025");
          const score = (PREFERRED_HOSTS.has(it.site) ? 100 : (SOFT_ALLOW.has(it.site) ? 75 : 40))
            + (recentBoost ? 10 : 0)
            + titleRelevanceBonus(q, it.title);
          return { ...it, title: neutralizeTitle(it.title), score };
        })
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, limit);
        
      finalResults = raw.map(it => ({
        title: it.title,
        site: it.site,
        url: it.url,
        runtime: it.runtimeSec != null ? fmtMMSS(it.runtimeSec) : "Ã¢ÂÂ",
        thumbnail: it.thumbnail || null,
        tags: it.tags && it.tags.length ? it.tags : [],
        notes: (it.notes ? it.notes + "; " : "") + "raw-fallback"
      }));
      fallback_used = true;
    }
    
    const diag = {
      fetched_total,
      provider: searchResult.metadata.provider,
      kept: finalResults.length,
      dropped_paywall, dropped_dead, dropped_forbidden, dropped_removed,
      dropped_not_video, dropped_fallback_not_video,
      dropped_orientation,
      fallback_used,
      relaxHosts, durationMode, freshness,
      requestId,
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
    
    const res = jok(payload);
    if (!bypassCache) ctx.waitUntil(edgeCache.put(request, res.clone()));
    return res;
  } catch (error) {
    console.error(`[handleAggregate] Error: ${error.message}`, error.stack);
    return jerr("an unexpected error occurred", 500);
  }
}

// -------------------- UI Components --------------------
// Portal HTML with enhanced UI, iOS 18 optimizations, and offline support
const PORTAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Jack Portal</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0b0b0c">
  <meta name="description" content="Advanced content search interface">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png">
  <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png">
  <style>
    :root {
      --bg:#0b0b0c; --panel:#141416; --panel-2:#1a1b1e; --muted:#9aa0a6; --txt:#e9eaee;
      --accent:#3b82f6; --accent-2:#2563eb; --ok:#22c55e; --bad:#ef4444; --radius:14px;
      --safe-area-inset-top: env(safe-area-inset-top, 0px);
      --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
      --safe-area-inset-left: env(safe-area-inset-left, 0px);
      --safe-area-inset-right: env(safe-area-inset-right, 0px);
    }
    
    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0;background:var(--bg);color:var(--txt);
      font:16px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;
      padding-top: var(--safe-area-inset-top);
      padding-bottom: var(--safe-area-inset-bottom);
      padding-left: var(--safe-area-inset-left);
      padding-right: var(--safe-area-inset-right);
    }
    
    /* Accessibility - Skip Link */
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--accent);
      color: white;
      padding: 8px;
      z-index: 100;
      transition: top 0.2s;
    }
    .skip-link:focus {
      top: 0;
    }
    
    header{
      position:sticky;top:0;z-index:5;
      background:#0f1012cc;backdrop-filter:saturate(120%) blur(6px);
      padding:calc(14px + var(--safe-area-inset-top)) 16px 14px;
      border-bottom:1px solid #1f2024;
    }
    
    h1{margin:0;font-size:20px;font-weight:650}
    
    main{
      padding:16px;max-width:1100px;margin:0 auto;
      padding-left: max(16px, var(--safe-area-inset-left));
      padding-right: max(16px, var(--safe-area-inset-right));
    }
    
    .panel{background:var(--panel);border:1px solid #1f2024;border-radius:var(--radius);padding:16px}
    .title{font-weight:700;font-size:22px;margin:0 0 10px}
    
    .row{display:grid;gap:16px;grid-template-columns:1fr 1fr}
    @media (max-width:720px){.row{grid-template-columns:1fr}}
    
    .row-2{display:grid;gap:12px;grid-template-columns:1fr 1fr}
    @media (max-width:720px){.row-2{grid-template-columns:1fr}}
    
    label{display:block;margin:8px 0 6px;color:var(--muted);font-size:13px}
    
    input[type="text"], input[type="number"], select{
      width:100%;padding:12px 12px;border-radius:10px;
      border:1px solid #23252b;background:var(--panel-2);
      color:var(--txt);outline:none;font-size: 16px;
      min-height: 44px;
    }
    
    input::placeholder{color:#6b7280}
    
    .search-form {
      position: relative;
    }
    
    .search-clear {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 16px;
      padding: 8px;
      cursor: pointer;
      display: none;

    .voice-search {
      position: absolute;
      right: 46px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 18px;
      padding: 8px;
      cursor: pointer;
      z-index: 2;
    }
    
    .voice-search.listening {
      color: #ef4444;
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }
    
    .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
    
    .chip{
      padding:8px 12px;border-radius:999px;background:#1f2126;
      border:1px solid #262a31;color:#cfd3da;cursor:pointer;font-size:13px;
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      user-select: none;
    }
    
    .chip.active{background:#1f3b8a;border-color:#2147a8;color:#fff}
    
    .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
    
    button{
      appearance:none;border:0;border-radius:10px;background:var(--accent);
      color:#fff;padding:12px 16px;font-weight:600;cursor:pointer;
      min-height: 44px;
    }
    
    button.secondary{background:#20242b;color:#d9dce3;border:1px solid #2a2e36}
    button.ghost{background:transparent;border:1px dashed #2f3540;color:#9aa0a6}
    
    .muted{color:var(--muted);font-size:13px}
    
    .grid{
      display:grid;gap:14px;
      grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
      margin-top:16px;
    }
    
    .card{
      background:var(--panel-2);border:1px solid #22252b;
      border-radius:12px;padding:12px;display:flex;
      flex-direction:column;gap:8px;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .card.visible {
      opacity: 1;
      transform: translateY(0);
    }
    
    .card:active {
      transform: scale(0.98);
    }
    
    .thumb{
      width:100%;aspect-ratio:16/9;object-fit:cover;
      border-radius:8px;background:#0d0e11;
    }
    
    .meta{color:var(--muted);font-size:13px}
    
    a.link{color:#9cc4ff;text-decoration:none}
    a.link:hover{text-decoration:underline}
    
    .status{
      position:sticky;bottom:0;margin-top:18px;
      text-align:right;color:var(--muted);font-size:12px;
      padding-bottom: var(--safe-area-inset-bottom);
    }
    
    .debug{
      white-space:pre-wrap;background:#0f1115;
      border:1px solid #23262d;padding:10px;border-radius:10px;
      font-family:ui-monospace,Consolas,Menlo,monospace;font-size:12px;
      display:none;
    }
    
    .debug.show{display:block}
    
    /* iOS optimizations */
    @media (hover: hover) {
      .card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transform: translateY(-2px);
      }
      
      button:hover {
        opacity: 0.9;
      }
    }

    /* Enhanced components */
    .search-indicators {
      margin-top: 15px;
      padding: 12px;
      background: var(--panel-2);
      border-radius: var(--radius);
      border: 1px solid #1f2024;
      display: none;
    }
    
    .search-indicators.active {
      display: block;
    }
    
    .progress {
      height: 4px;
      width: 100%;
      background: var(--panel-2);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 8px;
    }
    
    .progress-bar {
      height: 100%;
      width: 0%;
      background: var(--accent);
      transition: width 0.3s ease;
    }
    
    .error-message {
      color: var(--bad);
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 10px 14px;
      border-radius: 8px;
      margin: 10px 0;
      font-size: 14px;
      display: none;
    }
    
    .error-message.show {
      display: block;
      animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
    
    @keyframes shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-2px, 0, 0); }
      40%, 60% { transform: translate3d(2px, 0, 0); }
    }
    
    .recent-searches {
      margin-top: 15px;
      display: none;
    }
    
    .recent-searches.show {
      display: block;
    }
    
    /* Loading skeletons */
    .skeleton {
      position: relative;
      overflow: hidden;
    }
    
    .skeleton::after {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      transform: translateX(-100%);
      background-image: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0,
        rgba(255, 255, 255, 0.05) 20%,
        rgba(255, 255, 255, 0.1) 60%,
        rgba(255, 255, 255, 0)
      );
      animation: shimmer 2s infinite;
    }
    
    @keyframes shimmer {
      100% {
        transform: translateX(100%);
      }
    }
    
    .skeleton-thumb {
      width: 100%;
      aspect-ratio: 16/9;
      background: #1a1b1d;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    
    .skeleton-title {
      height: 20px;
      background: #1a1b1d;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    
    .skeleton-meta {
      height: 14px;
      background: #1a1b1d;
      border-radius: 4px;
      margin-bottom: 8px;
      width: 70%;
    }
    
    .skeleton-link {
      height: 14px;
      background: #1a1b1d;
      border-radius: 4px;
      width: 40%;
    }

    /* Offline indicators */
    .offline-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(239, 68, 68, 0.1);
      color: var(--bad);
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 15px;
      font-size: 14px;
    }
    
    .offline-search-item {
      background: var(--panel);
      border-radius: var(--radius);
      padding: 15px;
      margin-bottom: 15px;
    }
    
    .offline-results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 10px;
      margin: 10px 0;
    }
    
    .offline-timestamp {
      font-size: 12px;
      color: var(--muted);
      text-align: right;
    }
    
    .toast {
      position: fixed;
      bottom: calc(20px + var(--safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 9999;
      opacity: 0;
      transition: transform 0.3s, opacity 0.3s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    
    .online-toast {
      background: rgba(34, 197, 94, 0.9);
    }
    
    .offline-toast {
      background: rgba(239, 68, 68, 0.9);
    }
    
    /* iOS-specific dark mode */
    @media (prefers-color-scheme: dark) {
      :root {
        color-scheme: dark;
        --bg: #000000;
        --panel: #1a1a1c;
        --panel-2: #2a2a2c;
        --muted: #8a8a91;
        --txt: #ffffff;
      }
      
      header {
        background: rgba(0, 0, 0, 0.8);
      }
      
      .card {
        background: var(--panel);
        border-color: #2a2a2e;
      }
    }
    
    /* iOS reduced transparency */
    @media (prefers-reduced-transparency: reduce) {
      header {
        background: var(--bg);
        backdrop-filter: none;
      }
    }
    
    /* Better mobile action buttons */
    @media (max-width: 480px) {
      .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      button {
        width: 100%;
      }
    }
    
    /* Version info */
    .app-footer {
      padding: 15px;
      margin-top: 30px;
      text-align: center;
      border-top: 1px solid #1f2024;
      color: var(--muted);
      font-size: 12px;
    }
    
    .version-info {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
    }
    
    .update-check {
      background: transparent;
      border: none;
      color: var(--accent);
      font-size: 12px;
      padding: 4px 8px;
      cursor: pointer;
      min-height: auto;
    }
    
    /* Update notification */
    .update-notification {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .update-card {
      background: var(--panel);
      border-radius: var(--radius);
      padding: 20px;
      max-width: 400px;
      width: 100%;
    }
    
    .update-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    
    .update-button {
      flex: 1;
    }
    
    .update-later {
      flex: 1;
      background: transparent;
      border: 1px solid #2a2e36;
      color: var(--muted);
    }
    
    /* Dynamic Island spacing for iOS */
    .dynamic-island-spacer {
      height: 32px;
      width: 100%;
    }
    
    body.ios18 .has-dynamic-island {
      --dynamic-island-spacing: 32px;
    }
  </style>
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
  <header role="banner">
    <h1>Jack Portal</h1>
  </header>
  <main id="main" role="main">
    <div class="panel">
      <div class="title">Search</div>
      <form id="searchForm" role="search">
        <div class="search-form">
          <label for="q">Search Query</label>
          <input type="text" id="q" name="q" placeholder="Enter search terms..." aria-label="Search query">
        </div>
        <div class="row">
          <div>
            <label for="modeSel">Search Mode</label>
            <select id="modeSel" aria-label="Search mode">
              <option value="niche">Niche</option>
              <option value="keywords">Keywords</option>
              <option value="deep_niche">Deep Niche</option>
              <option value="forums">Forums</option>
              <option value="tumblrish">Tumblr-like</option>
            </select>
            <div id="modeChips" class="chips" role="radiogroup" aria-label="Search mode selection">
              <div class="chip active" data-mode="niche" role="radio" tabindex="0" aria-checked="true">Niche</div>
              <div class="chip" data-mode="keywords" role="radio" tabindex="0" aria-checked="false">Keywords</div>
              <div class="chip" data-mode="deep_niche" role="radio" tabindex="0" aria-checked="false">Deep Niche</div>
              <div class="chip" data-mode="forums" role="radio" tabindex="0" aria-checked="false">Forums</div>
              <div class="chip" data-mode="tumblrish" role="radio" tabindex="0" aria-checked="false">Tumblr-like</div>
            </div>
          </div>
          <div>
            <div class="row-2">
              <div>
                <label for="freshSel">Freshness</label>
                <select id="freshSel" aria-label="Content freshness">
                  <option value="d7">7 days</option>
                  <option value="m1">1 month</option>
                  <option value="m3">3 months</option>
                  <option value="y1">1 year</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <div>
                <label for="limit">Results</label>
                <input type="number" id="limit" value="10" min="3" max="20" aria-label="Number of results">
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div>
            <label for="duration">Duration (optional)</label>
            <input type="text" id="duration" placeholder="e.g. 5-10m, <5m, 7:30..." aria-label="Content duration">
          </div>
          <div>
            <label for="site">Site (optional)</label>
            <input type="text" id="site" placeholder="e.g. example.com" aria-label="Limit to specific site">
          </div>
        </div>
        <div class="row">
          <div>
            <label for="hostModeSel">Host Mode</label>
            <select id="hostModeSel" aria-label="Host mode">
              <option value="normal">Normal</option>
              <option value="relaxed">Relaxed</option>
            </select>
          </div>
          <div>
            <label for="durationModeSel">Duration Mode</label>
            <select id="durationModeSel" aria-label="Duration mode">
              <option value="normal">Normal</option>
              <option value="lenient">Lenient</option>
            </select>
          </div>
        </div>
        <div>
          <label for="showThumbs">
            <input type="checkbox" id="showThumbs" checked> Show thumbnails
          </label>
        </div>
        <div id="error-container" class="error-message" aria-live="assertive"></div>
        <div id="search-progress" class="search-indicators">
          <div class="progress">
            <div id="progress-bar" class="progress-bar"></div>
          </div>
        </div>
        <div id="recent-searches" class="recent-searches">
          <label>Recent Searches</label>
          <div id="recent-searches-chips" class="chips"></div>
        </div>
        <div class="actions">
          <button type="submit" id="goBtn">Search</button>
          <button type="button" id="copyBtn" class="secondary">Copy Results</button>
          <button type="button" id="saveBtn" class="secondary">Save Defaults</button>
          <button type="button" id="resetBtn" class="secondary">Reset</button>
          <button type="button" id="dbgBtn" class="ghost">Debug</button>
        </div>
      </form>
    </div>
    <div id="results" class="grid" aria-live="polite"></div>
    <div id="status" class="status">idle</div>
    <div id="debug" class="debug"></div>
  </main>
  <footer class="app-footer">
    <div class="version-info">
      <span>Jack Portal v${APP_VERSION} (${BUILD_DATE})</span>
      <button id="checkUpdates" class="update-check">Check for updates</button>
    </div>
  </footer>

<script>
// -------------------- Client-Side JavaScript --------------------
// iOS-specific optimizations
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const isIOS18 = isIOS && (/OS 18/.test(navigator.userAgent) || /Version\/18/.test(navigator.userAgent));
const hasDynamicIsland = isIOS && /iPhone/.test(navigator.userAgent) && window.devicePixelRatio >= 3;

// Apply iOS-specific optimizations
if (isIOS) {
  document.body.classList.add('ios');
  
  // Additional iOS 18 optimizations
  if (isIOS18) {
    document.body.classList.add('ios18');
    
    // Dynamic Island awareness
    if (hasDynamicIsland && window.matchMedia('(display-mode: standalone)').matches) {
      document.body.classList.add('has-dynamic-island');
      const spacer = document.createElement('div');
      spacer.className = 'dynamic-island-spacer';
      document.body.insertBefore(spacer, document.body.firstChild);
    }
    
    // Better backdrop filters
    const header = document.querySelector('header');
    if (header) {
      header.style.backdropFilter = 'saturate(120%) blur(10px)';
      header.style.webkitBackdropFilter = 'saturate(120%) blur(10px)';
    }
  }
  
  // Add viewport-fit=cover for notched devices
  const metaViewport = document.querySelector('meta[name="viewport"]');
  if (metaViewport && !metaViewport.content.includes('viewport-fit=cover')) {
    metaViewport.content += ', viewport-fit=cover';
  }
  
  // Fix 100vh issue on iOS
  const fixHeight = () => {
    document.documentElement.style.setProperty('--real-height', \`\${window.innerHeight}px\`);
  };
  window.addEventListener('resize', fixHeight);
  window.addEventListener('orientationchange', fixHeight);
  fixHeight();
}

// UI element references
const API_BASE = '/aggregate';
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
const statusEl = document.getElementById("status");
const debugEl = document.getElementById("debug");
const goBtn = document.getElementById("goBtn");
const copyBtn = document.getElementById("copyBtn");
const dbgBtn = document.getElementById("dbgBtn");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const modeChips = document.getElementById("modeChips");
const errorContainer = document.getElementById("error-container");
const searchProgress = document.getElementById("search-progress");
const progressBar = document.getElementById("progress-bar");
const recentSearchesEl = document.getElementById("recent-searches");
const recentSearchesChips = document.getElementById("recent-searches-chips");

// Helper functions
function setStatus(s) { 
  statusEl.textContent = s;
}

function chipSync(mode) {
  [...modeChips.querySelectorAll(".chip")].forEach(c => {
    const isActive = c.dataset.mode === mode;
    c.classList.toggle("active", isActive);
    c.setAttribute('aria-checked', isActive.toString());
  });
  modeSel.value = mode;
}

function buildUrl() {
  const p = new URLSearchParams();
  p.set("q", qEl.value.trim());
  p.set("mode", modeSel.value || "niche");
  p.set("fresh", freshSel.value || "all");
  p.set("limit", Math.max(3, Math.min(20, parseInt(limitEl.value || "20", 10))));
  const dur = durationEl.value.trim(); if (dur) p.set("duration", dur);
  const site = siteEl.value.trim(); if (site) p.set("site", site);
  p.set("hostMode", hostModeSel.value || "normal");
  p.set("durationMode", durationModeSel.value || "normal");
  p.set("nocache", "1"); // always bypass cache for live tests
  p.set("reqId", crypto.randomUUID()); // Unique request ID
  return API_BASE + "?" + p.toString();
}

// Enhanced card rendering with lazy loading support
function cardHtml(item, showThumb) {
  const t = item.title || "clip";
  const site = item.site || "";
  const rt = item.runtime || "Ã¢ÂÂ";
  const url = item.url || "#";
  const thumb = item.thumbnail || item.thumb || "";
  
  let html = '<div class="card">';
  if (showThumb && thumb) {
    html += \`<img class="thumb" data-src="\${thumb}" alt="" loading="lazy">\`;
  

// === Injected from script2 ===
const ADMIN_PANEL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Jack-GPT Admin</title>
  <style>
    :root {
      --bg: #0b0b0c;
      --panel: #12131a;
      --panel-2: #17181e;
      --panel-3: #1c1d26;
      --accent: #7f5af0;
      --accent-2: #6a48d0;
      --text: #e2e2e3;
      --muted: #9c9cb0;
      --good: #2cb67d;
      --bad: #ef4444;
      --warning: #ff9800;
      --radius: 8px;
      --transition: all 0.2s ease;
    }
    
    html, body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .panel {
      background: var(--panel);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    h1, h2, h3 {
      margin-top: 0;
    }
    
    h2 {
      border-bottom: 1px solid var(--panel-3);
      padding-bottom: 12px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
    }
    
    h2 svg {
      margin-right: 12px;
    }
    
    input, select, textarea, button {
      background: var(--panel-2);
      border: 1px solid var(--panel-3);
      border-radius: var(--radius);
      color: var(--text);
      padding: 10px 16px;
      font-size: 16px;
      margin-bottom: 16px;
      width: 100%;
      box-sizing: border-box;
      transition: var(--transition);
    }
    
    input:focus, select:focus, textarea:focus {
      border-color: var(--accent);
      outline: none;
      box-shadow: 0 0 0 2px rgba(127, 90, 240, 0.2);
    }
    
    button {
      background: var(--accent);
      cursor: pointer;
      font-weight: 600;
      border: none;
      transition: var(--transition);
    }
    
    button:hover {
      background: var(--accent-2);
    }
    
    button.secondary {
      background: var(--panel-3);
    }
    
    button.secondary:hover {
      background: var(--panel-2);
    }
    
    button.danger {
      background: var(--bad);
    }
    
    button.danger:hover {
      background: #d63c3c;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .login-container {
      max-width: 400px;
      margin: 100px auto;
    }
    
    .item-list {
      margin-bottom: 24px;
    }
    
    .list-item {
      background: var(--panel-2);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 16px;
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: var(--transition);
    }
    
    .list-item:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    .item-disabled {
      opacity: 0.6;
    }
    
    .item-primary {
      font-weight: 600;
      font-size: 16px;
    }
    
    .item-secondary {
      color: var(--muted);
      font-size: 14px;
      margin-top: 4px;
    }
    
    .item-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      background: var(--panel-3);
      margin-left: 8px;
    }
    
    .item-badge.content {
      background: rgba(127, 90, 240, 0.2);
      color: var(--accent);
    }
    
    .item-badge.source {
      background: rgba(44, 182, 125, 0.2);
      color: var(--good);
    }
    
    .item-badge.meta {
      background: rgba(255, 152, 0, 0.2);
      color: var(--warning);
    }
    
    .item-actions {
      display: flex;
      gap: 8px;
    }
    
    .item-actions button {
      width: auto;
      padding: 6px 10px;
      font-size: 14px;
      margin-bottom: 0;
    }
    
    .add-form {
      margin-top: 24px;
      background: var(--panel-2);
      padding: 20px;
      border-radius: var(--radius);
    }
    
    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
    }
    
    .form-col {
      flex: 1;
    }
    
    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    }
    
    .actions button {
      width: auto;
      margin-bottom: 0;
    }
    
    .notification {
      padding: 12px 16px;
      border-radius: var(--radius);
      margin-bottom: 16px;
      display: none;
    }
    
    .notification.success {
      background: rgba(44, 182, 125, 0.2);
      border: 1px solid rgba(44, 182, 125, 0.4);
      color: var(--good);
      display: block;
    }
    
    .notification.error {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: var(--bad);
      display: block;
    }
    
    .logo {
      text-align: center;
      margin-bottom: 24px;
      font-size: 24px;
      font-weight: bold;
      color: var(--accent);
    }
    
    .hidden {
      display: none;
    }
    
    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    textarea {
      min-height: 120px;
      font-family: monospace;
    }
    
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .setting-card {
      background: var(--panel-2);
      border-radius: var(--radius);
      padding: 16px;
    }
    
    .setting-card h4 {
      margin-top: 0;
      margin-bottom: 12px;
      font-size: 16px;
    }
    
    .setting-card p {
      color: var(--muted);
      font-size: 14px;
      margin-bottom: 16px;
    }
    
    .setting-card select,
    .setting-card input {
      margin-bottom: 0;
    }
    
    .tabs {
      display: flex;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--panel-3);
      overflow-x: auto;
      scrollbar-width: thin;
    }
    
    .tab-button {
      padding: 12px 20px;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      color: var(--muted);
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 0;
      width: auto;
    }
    
    .tab-button.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .search-box {
      position: relative;
      margin-bottom: 20px;
    }
    
    .search-box input {
      padding-left: 40px;
    }
    
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
    }
    
    .tooltip {
      position: relative;
      display: inline-block;
      margin-left: 8px;
      cursor: help;
    }
    
    .tooltip-icon {
      color: var(--muted);
      font-size: 16px;
      width: 16px;
      height: 16px;
      text-align: center;
      line-height: 16px;
      border-radius: 50%;
      background: var(--panel-3);
    }
    
    .tooltip-text {
      visibility: hidden;
      width: 240px;
      background: var(--panel);
      color: var(--text);
      text-align: left;
      border-radius: var(--radius);
      padding: 10px 14px;
      position: absolute;
      z-index: 1;
      bottom: 125%;
      left: 50%;
      transform: translateX(-50%);
      opacity: 0;
      transition: opacity 0.3s;
      font-weight: normal;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      pointer-events: none;
    }
    
    .tooltip:hover .tooltip-text {
      visibility: visible;
      opacity: 1;
    }
    
    .checkbox-container {
      display: flex;
      align-items: center;
    }
    
    .checkbox-container input {
      width: auto;
      margin-right: 8px;
      margin-bottom: 0;
    }
    
    .info-box {
      background: rgba(127, 90, 240, 0.1);
      border-left: 4px solid var(--accent);
      padding: 12px 16px;
      margin-bottom: 20px;
      border-radius: 0 var(--radius) var(--radius) 0;
    }
    
    .info-box p {
      margin: 0;
      color: var(--text);
    }
    
    .empty-state {
      text-align: center;
      padding: 40px 0;
      color: var(--muted);
    }
    
    .empty-state svg {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      color: var(--panel-3);
    }
    
    .empty-state h4 {
      margin: 0 0 8px 0;
      color: var(--text);
    }
    
    .empty-state p {
      margin: 0 0 20px 0;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      margin-top: 20px;
      gap: 8px;
    }
    
    .pagination button {
      width: auto;
      margin-bottom: 0;
    }
    
    .counter {
      background: var(--panel-3);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 14px;
      margin-left: 8px;
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 20px;
      }
      
      .form-row {
        flex-direction: column;
        gap: 0;
      }
      
      .actions {
        flex-direction: column;
      }
      
      .list-item {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .item-actions {
        margin-top: 12px;
        width: 100%;
        justify-content: flex-end;
      }
      
      .settings-grid {
        grid-template-columns: 1fr;
      }
      
      .tab-button {
        padding: 10px 16px;
        font-size: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="login-panel" class="login-container panel">
      <div class="logo">Jack-GPT Admin</div>
      <div id="login-notification" class="notification"></div>
      <form id="login-form">
        <div>
          <label for="username">Username</label>
          <input type="text" id="username" name="username" required>
        </div>
        <div>
          <label for="accessKey">Access Key</label>
          <input type="password" id="accessKey" name="accessKey" required>
        </div>
        <button type="submit">Log In</button>
      </form>
    </div>
    
    <div id="admin-panel" class="hidden">
      <div class="header-actions">
        <h1>Jack-GPT Admin Panel</h1>
        <button id="logout-btn" class="secondary">Log Out</button>
      </div>
      
      <div id="admin-notification" class="notification"></div>
      
      <div class="tabs">
        <button class="tab-button active" data-tab="sources">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; vertical-align: -3px;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          Sources
        </button>
        <button class="tab-button" data-tab="filters">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; vertical-align: -3px;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          Content Filters
        </button>
        <button class="tab-button" data-tab="settings">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; vertical-align: -3px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          Settings
        </button>
        <button class="tab-button" data-tab="bulk">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; vertical-align: -3px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Bulk Operations
        </button>
      </div>
      
      <div id="sources-tab" class="tab-content active">
        <div class="panel">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            Custom Search Sources
            <span class="counter" id="sources-counter">0</span>
          </h2>
          
          <div class="info-box">
            <p>Add custom domains to include in searches. These domains will be prioritized in search results based on your settings.</p>
          </div>
          
          <div class="search-box">
            <div class="search-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input type="text" id="search-sources" placeholder="Search sources...">
          </div>
          
          <div id="sources-list" class="item-list">
            <!-- Sources will be populated here -->
            <div class="loading">Loading sources...</div>
          </div>
          
          <div class="add-form">
            <h3>Add New Source</h3>
            <form id="source-form">
              <div class="form-row">
                <div class="form-col">
                  <label for="source-name">Name</label>
                  <input type="text" id="source-name" placeholder="My Custom Source" required>
                </div>
                <div class="form-col">
                  <label for="source-domain">
                    Domain
                    <span class="tooltip">
                      <span class="tooltip-icon">?</span>
                      <span class="tooltip-text">Enter domain without 'http://' or 'www.' (e.g., example.com)</span>
                    </span>
                  </label>
                  <input type="text" id="source-domain" placeholder="example.com" required>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-col">
                  <label for="source-mode">Search Mode</label>
                  <select id="source-mode">
                    <option value="all">All Modes</option>
                    <option value="niche">Niche</option>
                    <option value="keywords">Keywords</option>
                    <option value="deep_niche">Deep Niche</option>
                    <option value="forums">Forums</option>
                    <option value="tumblrish">Tumblrish</option>
                  </select>
                </div>
                <div class="form-col">
                  <label for="source-priority">Priority</label>
                  <select id="source-priority">
                    <option value="high">High</option>
                    <option value="normal" selected>Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              
              <div class="actions">
                <button type="submit">Add Source</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <div id="filters-tab" class="tab-content">
        <div class="panel">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Content Filtering
          </h2>
          
          <div class="info-box">
            <p>Manage terms used to filter search results. Negative terms exclude unwanted content, while positive terms boost relevant content.</p>
          </div>
          
          <div class="tabs">
            <button class="tab-button active" data-subtab="negative">Negative Terms <span class="counter" id="negative-counter">0</span></button>
            <button class="tab-button" data-subtab="positive">Positive Terms <span class="counter" id="positive-counter">0</span></button>
          </div>
          
          <div id="negative-subtab" class="tab-content active">
            <div class="search-box">
              <div class="search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <input type="text" id="search-negative" placeholder="Search negative terms...">
            </div>
            
            <div id="negative-terms-list" class="item-list">
              <!-- Negative terms will be populated here -->
            </div>
            
            <div class="add-form">
              <h3>Add Negative Term</h3>
              <form id="negative-term-form">
                <div class="form-row">
                  <div class="form-col">
                    <label for="negative-term">Term to Filter Out</label>
                    <input type="text" id="negative-term" placeholder="Enter term to exclude" required>
                  </div>
                  <div class="form-col">
                    <label for="negative-category">Category</label>
                    <select id="negative-category">
                      <option value="content">Content</option>
                      <option value="site">Site Specific</option>
                      <option value="meta">Metadata</option>
                    </select>
                                    </div>
                </div>
                
                <div class="actions">
                  <button type="submit">Add Term</button>
                </div>
              </form>
            </div>
          </div>
          
          <div id="positive-subtab" class="tab-content">
            <div class="search-box">
              <div class="search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <input type="text" id="search-positive" placeholder="Search positive terms...">
            </div>
            
            <div id="positive-terms-list" class="item-list">
              <!-- Positive terms will be populated here -->
            </div>
            
            <div class="add-form">
              <h3>Add Positive Term</h3>
              <form id="positive-term-form">
                <div class="form-row">
                  <div class="form-col">
                    <label for="positive-term">Term to Prioritize</label>
                    <input type="text" id="positive-term" placeholder="Enter term to prioritize" required>
                  </div>
                  <div class="form-col">
                    <label for="positive-category">Category</label>
                    <select id="positive-category">
                      <option value="content">Content</option>
                      <option value="site">Site Specific</option>
                      <option value="meta">Metadata</option>
                    </select>
                  </div>
                </div>
                
                <div class="actions">
                  <button type="submit">Add Term</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      <div id="settings-tab" class="tab-content">
        <div class="panel">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Filter Settings
          </h2>
          
          <div class="info-box">
            <p>Configure how the content filtering system works. These settings affect the strictness and behavior of the filter.</p>
          </div>
          
          <div class="settings-grid">
            <div class="setting-card">
              <h4>Filter Strength</h4>
              <p>Controls how aggressively unwanted content is filtered out.</p>
              <select id="filter-strength">
                <option value="light">Light (Less Filtering)</option>
                <option value="moderate" selected>Moderate (Balanced)</option>
                <option value="strict">Strict (More Filtering)</option>
              </select>
            </div>
            
            <div class="setting-card">
              <h4>Confidence Threshold</h4>
              <p>Minimum confidence score for a result to be included.</p>
              <select id="confidence-threshold">
                <option value="0.5">Low (50%)</option>
                <option value="0.7" selected>Medium (70%)</option>
                <option value="0.9">High (90%)</option>
              </select>
            </div>
            
            <div class="setting-card">
              <h4>Content Requirements</h4>
              <p>Determines if results must match positive terms.</p>
              <div class="checkbox-container">
                <input type="checkbox" id="require-positive-match">
                <label for="require-positive-match">Require at least one positive term match</label>
              </div>
            </div>
            
            <div class="setting-card">
              <h4>Source Priority</h4>
              <p>Controls how custom sources are ranked in results.</p>
              <div class="checkbox-container">
                <input type="checkbox" id="prioritize-custom-sources" checked>
                <label for="prioritize-custom-sources">Prioritize custom sources in results</label>
              </div>
            </div>
          </div>
          
          <div class="actions">
            <button id="save-settings">Save Settings</button>
            <button id="reset-settings" class="secondary">Reset to Defaults</button>
          </div>
        </div>
      </div>
      
      <div id="bulk-tab" class="tab-content">
        <div class="panel">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Bulk Operations
          </h2>
          
          <div class="info-box">
            <p>Import and export your configuration for backup or to transfer settings between environments.</p>
          </div>
          
          <div class="tabs">
            <button class="tab-button active" data-subtab="export">Export</button>
            <button class="tab-button" data-subtab="import">Import</button>
          </div>
          
          <div id="export-subtab" class="tab-content active">
            <h3>Export Configuration</h3>
            <p class="muted">Select what you want to export:</p>
            
            <div class="form-row" style="margin-bottom: 20px;">
              <div class="form-col">
                <div class="checkbox-container">
                  <input type="checkbox" id="export-sources" checked>
                  <label for="export-sources">Custom Sources</label>
                </div>
              </div>
              <div class="form-col">
                <div class="checkbox-container">
                  <input type="checkbox" id="export-filters" checked>
                  <label for="export-filters">Content Filters</label>
                </div>
              </div>
              <div class="form-col">
                <div class="checkbox-container">
                  <input type="checkbox" id="export-settings" checked>
                  <label for="export-settings">Filter Settings</label>
                </div>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-col">
                <label for="export-json">Configuration JSON</label>
                <textarea id="export-json" readonly placeholder="Your configuration will appear here..."></textarea>
              </div>
            </div>
            
            <div class="actions">
              <button id="export-btn">Generate Export</button>
              <button id="copy-export-btn" class="secondary">Copy to Clipboard</button>
            </div>
          </div>
          
          <div id="import-subtab" class="tab-content">
            <h3>Import Configuration</h3>
            <p class="muted">Paste your configuration JSON below:</p>
            
            <div class="form-row">
              <div class="form-col">
                <label for="import-json">Configuration JSON</label>
                <textarea id="import-json" placeholder="Paste configuration JSON here..."></textarea>
              </div>
            </div>
            
            <div class="form-row" style="margin-bottom: 20px;">
              <div class="form-col">
                <div class="checkbox-container">
                  <input type="checkbox" id="import-sources" checked>
                  <label for="import-sources">Import Custom Sources</label>
                </div>
              </div>
              <div class="form-col">
                <div class="checkbox-container">
                  <input type="checkbox" id="import-filters" checked>
                  <label for="import-filters">Import Content Filters</label>
                </div>
              </div>
              <div class="form-col">
                <div class="checkbox-container">
                  <input type="checkbox" id="import-settings" checked>
                  <label for="import-settings">Import Filter Settings</label>
                </div>
              </div>
            </div>
            
            <div class="actions">
              <button id="import-btn">Import Configuration</button>
              <button id="validate-import-btn" class="secondary">Validate JSON</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    // State management
    let currentSources = [];
    let currentNegativeTerms = [];
    let currentPositiveTerms = [];
    let currentFilterSettings = {};
    
    // DOM elements
    const loginPanel = document.getElementById('login-panel');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    const loginNotification = document.getElementById('login-notification');
    const adminNotification = document.getElementById('admin-notification');
    const sourcesList = document.getElementById('sources-list');
    const negativeTermsList = document.getElementById('negative-terms-list');
    const positiveTermsList = document.getElementById('positive-terms-list');
    const sourceForm = document.getElementById('source-form');
    const negativeTermForm = document.getElementById('negative-term-form');
    const positiveTermForm = document.getElementById('positive-term-form');
    const logoutBtn = document.getElementById('logout-btn');
    const exportJson = document.getElementById('export-json');
    const importJson = document.getElementById('import-json');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const copyExportBtn = document.getElementById('copy-export-btn');
    const validateImportBtn = document.getElementById('validate-import-btn');
    const saveSettingsBtn = document.getElementById('save-settings');
    const resetSettingsBtn = document.getElementById('reset-settings');
    const sourcesCounter = document.getElementById('sources-counter');
    const negativeCounter = document.getElementById('negative-counter');
    const positiveCounter = document.getElementById('positive-counter');
    const searchSources = document.getElementById('search-sources');
    const searchNegative = document.getElementById('search-negative');
    const searchPositive = document.getElementById('search-positive');
    
    // Main tab navigation
    const tabButtons = document.querySelectorAll('.tabs > .tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // Hide all tabs and remove active class
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Show selected tab and add active class
        button.classList.add('active');
        document.getElementById(tabName + '-tab').classList.add('active');
      });
    });
    
    // Subtab navigation (for content filters)
    const setupSubtabs = (parentSelector) => {
      const subtabButtons = document.querySelectorAll(parentSelector + ' [data-subtab]');
      const subtabContents = document.querySelectorAll(parentSelector + ' .tab-content');
      
      subtabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const subtabName = button.getAttribute('data-subtab');
          
          // Hide all subtabs and remove active class
          subtabButtons.forEach(btn => btn.classList.remove('active'));
          subtabContents.forEach(content => content.classList.remove('active'));
          
          // Show selected subtab and add active class
          button.classList.add('active');
          document.getElementById(subtabName + '-subtab').classList.add('active');
        });
      });
    };
    
    setupSubtabs('#filters-tab');
    setupSubtabs('#bulk-tab');
    
    // Check for existing session
    function checkSession() {
      if (validateAdminSession()) {
        showAdminPanel();
        loadAllData();
      }
    }
    
    // Load all data from storage
    function loadAllData() {
      loadSources();
      loadFilterConfig();
      updateCounters();
    }
    
    // Update counters
    function updateCounters() {
      sourcesCounter.textContent = currentSources.length;
      negativeCounter.textContent = currentNegativeTerms.length;
      positiveCounter.textContent = currentPositiveTerms.length;
    }
    
    // Show notifications
    function showLoginNotification(message, isError) {
      loginNotification.textContent = message;
      loginNotification.className = 'notification';
      loginNotification.classList.add(isError ? 'error' : 'success');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        loginNotification.className = 'notification';
      }, 5000);
    }
    
    function showAdminNotification(message, isError) {
      adminNotification.textContent = message;
      adminNotification.className = 'notification';
      adminNotification.classList.add(isError ? 'error' : 'success');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        adminNotification.className = 'notification';
      }, 5000);
    }
    
    // Authentication
    async function login(username, accessKey) {
      try {
        const isValid = await verifyAdminCredentials(username, accessKey);
        
        if (!isValid) {
          throw new Error('Invalid credentials');
        }
        
        createAdminSession(username);
        showAdminPanel();
        loadAllData();
        
        return true;
      } catch (error) {
        showLoginNotification(error.message || 'Authentication failed', true);
        return false;
      }
    }
    
    function logout() {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      showLoginPanel();
    }
    
    // UI management
    function showLoginPanel() {
      loginPanel.classList.remove('hidden');
      adminPanel.classList.add('hidden');
    }
    
    function showAdminPanel() {
      loginPanel.classList.add('hidden');
      adminPanel.classList.remove('hidden');
    }
    
    // Sources management
    function loadSources() {
      try {
        sourcesList.innerHTML = '<div class="loading">Loading sources...</div>';
        
        const config = loadSourcesConfig();
        currentSources = config.sources || [];
        renderSources();
        
        return true;
      } catch (error) {
        showAdminNotification(error.message || 'Failed to load sources', true);
        return false;
      }
    }
    
    function renderSources(searchTerm = '') {
      let filteredSources = currentSources;
      
      // Apply search filter if provided
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filteredSources = currentSources.filter(source => 
          source.name.toLowerCase().includes(search) || 
          source.domain.toLowerCase().includes(search)
        );
      }
      
      if (filteredSources.length === 0) {
        sourcesList.innerHTML = `
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <h4>No sources found</h4>
            <p>Add your first source using the form below</p>
          </div>
        `;
        
}
  html += \`<div style="font-weight:700">\${t}</div>\`;
  html += \`<div class="meta"><strong>Site:</strong> \${site} &nbsp; Ã¢ÂÂ¢ &nbsp; <strong>Runtime:</strong> \${rt}</div>\`;
  html += \`<div><a class="link" href="\${url}" target="_blank" rel="noopener noreferrer">View Content</a></div>\`;
  html += '</div>';
  
  return html;
}

// Render loading skeletons for better perceived performance
function renderLoadingSkeleton(count = 3) {
  const html = Array(count).fill(\`
    <div class="card skeleton">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-meta"></div>
      <div class="skeleton-link"></div>
    </div>
  \`).join('');
  
  resultsEl.innerHTML = html;
}

// Enhanced result rendering with lazy loading
function render(items) {
  resultsEl.innerHTML = (items || []).map(it => cardHtml(it, showThumbsEl.checked)).join("");
  
  // Initialize lazy loading with Intersection Observer
  if ('IntersectionObserver' in window) {
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const card = entry.target;
          
          // Lazy load thumbnail if available
          const thumb = card.querySelector('img.thumb[data-src]');
          if (thumb) {
            thumb.src = thumb.dataset.src;
            thumb.removeAttribute('data-src');
          }
          
          // Add animation
          card.classList.add('visible');
          
          // Stop observing once loaded
          cardObserver.unobserve(card);
        }
      });
    }, {
      rootMargin: '100px 0px',
      threshold: 0.1
    });
    
    // Observe all cards
    document.querySelectorAll('.card').forEach(card => {
      cardObserver.observe(card);
    });
  }
}

// Persistence functions
function saveDefaults() {
  const obj = {
    fresh: freshSel.value,
    limit: limitEl.value,
    showThumbs: showThumbsEl.checked,
    mode: modeSel.value,
    hostMode: hostModeSel.value,
    durationMode: durationModeSel.value
  };
  try {
    localStorage.setItem("jack.defaults", JSON.stringify(obj));
  } catch (e) {
    console.error("Failed to save defaults:", e);
  }
}

function loadDefaults() {
  try {
    const s = localStorage.getItem("jack.defaults");
    if (!s) return;
    const d = JSON.parse(s);
    if (d.fresh) freshSel.value = d.fresh;
    if (d.limit) limitEl.value = d.limit;
    if (typeof d.showThumbs === "boolean") showThumbsEl.checked = d.showThumbs;
    if (d.mode) {
      modeSel.value = d.mode;
      chipSync(d.mode);
    }
    if (d.hostMode) hostModeSel.value = d.hostMode;
    if (d.durationMode) durationModeSel.value = d.durationMode;
  } catch (e) {
    console.error("Failed to load defaults:", e);
  }
}

// Recent searches management
function saveRecentSearch(query) {
  if (!query.trim()) return;
  
  try {
    const searches = JSON.parse(localStorage.getItem('jack.recent-searches') || '[]');
    
    // Remove if already exists
    const index = searches.indexOf(query);
    if (index !== -1) {
      searches.splice(index, 1);
    }
    
    // Add to beginning
    searches.unshift(query);
    
    // Keep only 5 most recent
    const updated = searches.slice(0, 5);
    
    localStorage.setItem('jack.recent-searches', JSON.stringify(updated));
    renderRecentSearches();
  } catch (e) {
    console.error('Failed to save recent search:', e);
  }
}

function renderRecentSearches() {
  try {
    const searches = JSON.parse(localStorage.getItem('jack.recent-searches') || '[]');
    
    if (searches.length === 0) {
      recentSearchesEl.style.display = 'none';
      return;
    }
    
    recentSearchesEl.style.display = 'block';
    recentSearchesChips.innerHTML = '';
    
    searches.forEach(search => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = search;
      chip.addEventListener('click', () => {
        qEl.value = search;
        document.getElementById('searchForm').dispatchEvent(new Event('submit'));
      });
      recentSearchesChips.appendChild(chip);
    });
  } catch (e) {
    console.error('Failed to load recent searches:', e);
  }
}

// Error handling
function showError(message) {
  errorContainer.textContent = message;
  errorContainer.classList.add("show");
  
  // Automatically hide after 5 seconds
  setTimeout(() => {
    errorContainer.classList.remove("show");
  }, 5000);
}

function clearError() {
  errorContainer.textContent = "";
  errorContainer.classList.remove("show");
}

// Progress bar
function startProgress() {
  searchProgress.classList.add("active");
  let progress = 0;
  const interval = setInterval(() => {
    progress += 5;
    progressBar.style.width = progress + "%";
    if (progress > 90) {
      clearInterval(interval);
    }
  }, 150);
  
  return interval;
}

function completeProgress(interval) {
  clearInterval(interval);
  progressBar.style.width = "100%";
  setTimeout(() => {
    searchProgress.classList.remove("active");
    progressBar.style.width = "0%";
  }, 500);
}

// Enhanced fetch with retry and error handling
async function fetchWithRetry(url, options = {}, retries = 2) {
  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store"
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || \`HTTP \${response.status}\`);
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new Error(\`HTTP \${response.status}: \${errorText.slice(0, 100)}\`);
        }
        throw e;
      }
    }
    
    return response;
  } catch (error) {
    if (retries > 0 && (error.message.includes('timeout') || error.message.includes('network'))) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Toast notifications
function showToast(message, type = '') {
  // Remove any existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = \`toast \${type ? \`\${type}-toast\` : ''}\`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger reflow for animation
  toast.offsetHeight;
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Check for updates
function checkForUpdates() {
  showToast('Checking for updates...');
  
  fetch('/version.json?_=' + Date.now())
    .then(response => {
      if (!response.ok) {
        throw new Error(\`Server returned \${response.status}\`);
      }
      return response.json();
    })
    .then(data => {
      if (data.version !== '${APP_VERSION}') {
        showUpdateNotification(data.version);
      } else {
        showToast('You\\'re running the latest version!');
      }
    })
    .catch(error => {
      console.error('Failed to check for updates:', error);
      showToast('Update check failed. Please try again later.');
    });
}

function showUpdateNotification(version) {
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = \`
    <div class="update-card">
      <h3>Update Available</h3>
      <p>Version \${version} is now available. You're currently on v${APP_VERSION}.</p>
      <div class="update-actions">
        <button id="updateNow" class="update-button">Update Now</button>
        <button id="updateLater" class="update-later">Later</button>
      </div>
    </div>
  \`;
  
  document.body.appendChild(notification);
  
  document.getElementById('updateNow').addEventListener('click', () => {
    // Clear cache and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      });
    }
    
    // Clear caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      });
    }
    
    // Reload to get the latest version
    window.location.reload();
  });
  
  document.getElementById('updateLater').addEventListener('click', () => {
    notification.remove();
  });
}

// Offline support
class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.offlineContent = [];
    this.offlineMode = false;
    
    // Setup event listeners
    window.addEventListener('online', () => this.handleConnectivityChange(true));
    window.addEventListener('offline', () => this.handleConnectivityChange(false));
    
    // Initialize
    this.init();
  }
  
  async init() {
    try {
      // Load cached searches from localStorage
      const searches = localStorage.getItem('jack.offline-searches');
      if (searches) {
        this.offlineContent = JSON.parse(searches);
      }
      
      // Check if we're starting in offline mode
      if (!this.isOnline) {
        this.enableOfflineMode();
      }
    } catch (e) {
      console.error('Failed to initialize offline manager:', e);
    }
  }
  
  handleConnectivityChange(isOnline) {
    this.isOnline = isOnline;
    
    if (isOnline) {
      this.disableOfflineMode();
    } else {
      this.enableOfflineMode();
    }
  }
  
  enableOfflineMode() {
    this.offlineMode = true;
    document.body.classList.add('offline-mode');
    
    // Show offline notification
    this.showOfflineNotification();
    
    // Replace search with offline content
    this.displayOfflineContent();
  }
  
  disableOfflineMode() {
    this.offlineMode = false;
    document.body.classList.remove('offline-mode');
    
    // Show back online notification
    this.showOnlineNotification();
  }
  
  saveSearch(query, results) {
    if (!this.isOnline || !results || results.length === 0) return;
    
    try {
      // Load existing searches
      const searches = JSON.parse(localStorage.getItem('jack.offline-searches') || '[]');
      
      // Add new search
      searches.unshift({
        id: crypto.randomUUID(),
        query,
        results,
        timestamp: Date.now()
      });
      
      // Keep only 5 most recent
      const updated = searches.slice(0, 5);
      
      // Save back to localStorage
      localStorage.setItem('jack.offline-searches', JSON.stringify(updated));
      this.offlineContent = updated;
    } catch (e) {
      console.error('Failed to save search for offline use:', e);
    }
  }
  
  displayOfflineContent() {
    if (this.offlineContent.length === 0) {
      resultsEl.innerHTML = \`
        <div class="offline-message" style="text-align:center;padding:20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 15px;display:block;color:var(--muted)">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
          <h3>You're offline</h3>
          <p>No saved searches available. Connect to the internet to search for content.</p>
        </div>
      \`;
      return;
    }
    
    // Display cached searches
    let html = \`
      <div class="offline-banner">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="min-width:24px">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
        </svg>
        <span>You're offline. Showing saved searches.</span>
      </div>
    \`;
    
    this.offlineContent.forEach(item => {
      html += \`
        <div class="offline-search-item">
          <h3>Search: "\${item.query}"</h3>
          <div class="offline-results-grid">
            \${item.results.slice(0, 6).map(result => cardHtml(result, showThumbsEl.checked)).join('')}
          </div>
          <div class="offline-timestamp">Saved \${this.formatTimestamp(item.timestamp)}</div>
        </div>
      \`;
    });
    
    resultsEl.innerHTML = html;
    
    // Initialize lazy loading for offline content
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            observer.unobserve(img);
          }
        });
      });
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        observer.observe(img);
      });
    }
  }
  
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  
  showOfflineNotification() {
    showToast('You are offline. Showing saved content.', 'offline');
  }
  
  showOnlineNotification() {
    showToast('You\'re back online!', 'online');
  }
}

// Initialize offline manager
const offlineManager = new OfflineManager();

// Add voice search if supported
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const voiceButton = document.createElement('button');
  voiceButton.type = 'button';
  voiceButton.className = 'voice-search';
  voiceButton.innerHTML = 'Ã°ÂÂÂ¤';
  voiceButton.title = 'Search by voice';
  voiceButton.setAttribute('aria-label', 'Search by voice');
  
  qEl.parentNode.insertBefore(voiceButton, qEl.nextSibling);
  
  voiceButton.addEventListener('click', () => {
    // Create speech recognition instance
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      voiceButton.classList.add('listening');
      voiceButton.innerHTML = 'Ã°ÂÂÂ´';
      showToast('Listening...');
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      qEl.value = transcript;
      // Trigger input event for UI updates
      qEl.dispatchEvent(new Event('input'));
      // Submit the form after a short delay
      setTimeout(() => {
        document.getElementById('searchForm').dispatchEvent(new Event('submit'));
      }, 500);
    };
    
    recognition.onend = () => {
      voiceButton.classList.remove('listening');
      voiceButton.innerHTML = 'Ã°ÂÂÂ¤';
    };
    
    recognition.onerror = (event) => {
      voiceButton.classList.remove('listening');
      voiceButton.innerHTML = 'Ã°ÂÂÂ¤';
      showToast('Voice recognition error: ' + event.error);
    };
    
    recognition.start();
  });
}

// Add clear button to search input
const clearButton = document.createElement('button');
clearButton.type = 'button';
clearButton.className = 'search-clear';
clearButton.innerHTML = 'Ã¢ÂÂ';
clearButton.setAttribute('aria-label', 'Clear search');
clearButton.style.display = 'none';
qEl.parentNode.insertBefore(clearButton, qEl.nextSibling);

qEl.addEventListener('input', () => {
  clearButton.style.display = qEl.value ? 'block' : 'none';
});

clearButton.addEventListener('click', () => {
  qEl.value = '';
  clearButton.style.display = 'none';
  qEl.focus();
});

// Add share button if Web Share API is available
if (navigator.share) {
  const shareButton = document.createElement('button');
  shareButton.type = 'button';
  shareButton.className = 'secondary';
  shareButton.innerHTML = 'Share';
  shareButton.title = 'Share results';
  
  const actionsContainer = document.querySelector('.actions');
  actionsContainer.appendChild(shareButton);
  
  shareButton.addEventListener('click', () => {
    const results = [...document.querySelectorAll('.card')].map(card => {
      const title = card.querySelector('div[style*="font-weight"]').textContent.trim();
      const url = card.querySelector('a.link').href;
      return \`\${title} - \${url}\`;
    }).join('\\n\\n');
    
    const searchQuery = qEl.value;
    
    navigator.share({
      title: \`Jack Portal Results for "\${searchQuery}"\`,
      text: results,
      url: window.location.href
    }).catch(err => {
      console.error('Share failed:', err);
      showToast('Sharing failed');
    });
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Load saved defaults
  loadDefaults();
  
  // Load recent searches
  renderRecentSearches();
  
  // Chip selection for search mode
  modeChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    chipSync(chip.dataset.mode);
  });
  
  // Support keyboard navigation for chips
  modeChips.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        chipSync(chip.dataset.mode);
      }
    });
  });
  
  // Debug toggle
  dbgBtn.addEventListener("click", () => debugEl.classList.toggle("show"));
  
  // Save defaults
  saveBtn.addEventListener("click", () => {
    saveDefaults();
    setStatus("defaults saved");
    showToast('Defaults saved');
    setTimeout(() => setStatus("idle"), 800);
  });
  
  // Reset form
  resetBtn.addEventListener("click", () => {
    qEl.value = "";
    durationEl.value = "";
    siteEl.value = "";
    freshSel.value = "all";
    limitEl.value = "20";
    showThumbsEl.checked = true;
    chipSync("niche");
    hostModeSel.value = "normal";
    durationModeSel.value = "normal";
    setStatus("reset");
    showToast('Form reset');
    setTimeout(() => setStatus("idle"), 800);
  });
  
  // Copy results
  copyBtn.addEventListener("click", async () => {
    const data = [...resultsEl.querySelectorAll(".card")].map(c => {
      const title = c.querySelector("div[style*='font-weight']").textContent.trim();
      const site = c.querySelector(".meta").textContent.replace(/\\s+/g, " ").trim();
      const url = c.querySelector("a.link")?.href || "";
      return title + " Ã¢ÂÂ " + site + " Ã¢ÂÂ " + url;
    }).join("\\n");
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(data);
        setStatus("copied");
        showToast('Results copied to clipboard');
      } else {
        const ta = document.createElement("textarea");
        ta.value = data;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setStatus("copied");
        showToast('Results copied to clipboard');
      }
    } catch (e) {
      console.error('Copy failed:', e);
      setStatus("copy failed");
      showToast('Copy failed');
    } finally {
      setTimeout(() => setStatus("idle"), 1200);
    }
  });
  
  // Check for updates button
  document.getElementById('checkUpdates').addEventListener('click', checkForUpdates);
  
  // Search form submission
  const searchForm = document.getElementById('searchForm');
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const query = qEl.value.trim();
    if (!query) {
      showError("Please enter a search query");
      setStatus("enter a query");
      return;
    }
    
    // Handle offline mode
    if (!navigator.onLine) {
      showError("You're offline. Connect to the internet to search.");
      return;
    }
    
    // Clear previous results and error messages
    clearError();
    goBtn.disabled = true;
    setStatus("loadingÃ¢ÂÂ¦");
    
    // Show loading skeletons
    renderLoadingSkeleton(parseInt(limitEl.value) > 6 ? 6 : parseInt(limitEl.value));
    
    // Show progress indicator
    const progressInterval = startProgress();
    
    try {
      // Execute search
      const response = await fetchWithRetry(buildUrl());
      const data = await response.json();
      
      // Save to recent searches
      saveRecentSearch(query);
      
      // Save for offline use
      offlineManager.saveSearch(query, data.results || []);
      
      // Render results
      render(data.results || []);
      
      // Show debug info if available
      if (data.diag) {
        debugEl.textContent = JSON.stringify(data.diag, null, 2);
      }
      
      setStatus('done (' + ((data.results || []).length) + ')');
    } catch (error) {
      console.error('Search error:', error);
      showError(error.message || "Search failed");
      setStatus("error");
      debugEl.textContent = String(error);
    } finally {
      goBtn.disabled = false;
      completeProgress(progressInterval);
    }
  });
});

// Register service worker for offline capability and PWA support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(registration => {
      console.log('Service worker registered successfully');
    })
    .catch(error => {
      console.error('Service worker registration failed:', error);
    });
}
</script>
</body>
</html>`;

// -------------------- Service Worker Script --------------------
const SW_JS = `// Jack-GPT Enterprise Service Worker v${APP_VERSION}
const CACHE_NAME = 'jack-portal-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  // Skip API requests - they're handled separately
  if (event.request.url.includes('/aggregate')) return;
  
  // For HTML requests (navigation), try network first, then cache
  if (event.request.mode === 'navigate' || 
      (event.request.method === 'GET' && 
       event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/');
        })
    );
    return;
  }
  
  // For all other assets, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses or non-GET requests
            if (!response || response.status !== 200 || event.request.method !== 'GET') {
              return response;
            }
            
            // Clone the response to cache it and return it
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            
            return response;
          })
          .catch(() => {
            // For image requests, return a fallback if available
            if (event.request.url.match(/\\.(jpg|jpeg|png|gif|webp|svg)$/)) {
              return caches.match('/icon-192.png');
            }
            return new Response('Network error occurred', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
`;

// -------------------- Web App Manifest --------------------
const MANIFEST_JSON = JSON.stringify({
  "name": "Jack Portal",
  "short_name": "Jack",
  "description": "Advanced content search interface",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0b0b0c",
  "theme_color": "#0b0b0c",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "New Search",
      "url": "/?fresh=true",
      "description": "Start a new search"
    }
  ],
  "categories": ["utilities", "productivity"]
});

// -------------------- Health Check Response --------------------
function serveHealthCheck() {
  return new Response(JSON.stringify({
    status: 'healthy',
    version: APP_VERSION,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*'
    }
  });
}

// -------------------- Version Check Response --------------------
function serveVersionCheck() {
  return new Response(JSON.stringify({
    version: APP_VERSION,
    buildDate: BUILD_DATE,
    updateUrl: '/'
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-cache',
      'access-control-allow-origin': '*'
    }
  });
}

// -------------------- Main Worker Export --------------------

// ==== CORS (Origin allowlist) ====
const ALLOWED_ORIGINS = [
  'https://your-main-domain.com',
  'https://admin.your-domain.com',
  'https://localhost:3000',
  'http://127.0.0.1:8787'
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  const allAllowedOrigins = [
    ...ALLOWED_ORIGINS,
    'http://localhost:8787',
    'http://localhost:3000',
    'http://127.0.0.1:8787',
    'http://127.0.0.1:3000'
  ];
  return allAllowedOrigins.includes(origin);
}

function corsHeadersFor(request) {
  const origin = request.headers.get('Origin');
  const headers = {
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization, X-Requested-With',
    'access-control-max-age': '86400',
    'vary': 'Origin'
  };
  if (isAllowedOrigin(origin)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
}

function withCors(resp, request) {
  const extra = corsHeadersFor(request);
  if (resp instanceof Response) {
    const h = new Headers(resp.headers);
    Object.entries(extra).forEach(([k, v]) => h.set(k, v));
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
  }
  return new Response(JSON.stringify(resp), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra }
  });
}
// ==== end CORS helpers ====


// ===== KV storage utilities =====
const CACHE_TTL = 3600;       // 1 hour
const RATE_LIMIT_TTL = 60;    // 60 seconds
const RATE_LIMIT_MAX = 50;    // 50 req/min

async function getWithCache(env, key, fetchFunction, ttl = CACHE_TTL) {
  if (!env?.JACK_STORAGE) return { data: await fetchFunction(), cached: false };
  try {
    const cached = await env.JACK_STORAGE.get(key, { type: 'json' });
    if (cached) return { data: cached, cached: true };
    const data = await fetchFunction();
    await env.JACK_STORAGE.put(key, JSON.stringify(data), { expirationTtl: ttl });
    return { data, cached: false };
  } catch (err) {
    console.error('KV cache error for', key, err);
    return { data: await fetchFunction(), cached: false };
  }
}

async function checkRateLimit(env, clientIP) {
  if (!env?.JACK_STORAGE) return { limited: false };
  const key = `ratelimit:${clientIP}`;
  try {
    const current = await env.JACK_STORAGE.get(key);
    const count = current ? parseInt(current, 10) : 0;
    if (count >= RATE_LIMIT_MAX) {
      return { limited: true, remaining: 0, reset: RATE_LIMIT_TTL };
    }
    await env.JACK_STORAGE.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_TTL });
    return { limited: false, remaining: Math.max(0, RATE_LIMIT_MAX - (count + 1)), reset: RATE_LIMIT_TTL };
  } catch (err) {
    console.error('Rate limit KV error', err);
    return { limited: false };
  }
}
// ===== end KV utilities =====

// ------------------ Site Adapters Manager ------------------
class SiteAdaptersManager {
  constructor(env) { this.env = env; }
  async getAdapters() {
    if (!this.env?.JACK_STORAGE) return {};
    try {
      const data = await this.env.JACK_STORAGE.get(KV_KEYS.ADAPTERS_CONFIG);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('KV get error for adapters:', error);
      return {};
    }
  }
  async setAdapter(hostname, config) {
    const adapters = await this.getAdapters();
    adapters[hostname] = { ...config, updatedAt: new Date().toISOString() };
    if (!this.env?.JACK_STORAGE) return false;
    try {
      await this.env.JACK_STORAGE.put(KV_KEYS.ADAPTERS_CONFIG, JSON.stringify(adapters));
      return true;
    } catch (error) {
      console.error('KV set error for adapters:', error);
      return false;
    }
  }
  async removeAdapter(hostname) {
    const adapters = await this.getAdapters();
    delete adapters[hostname];
    if (!this.env?.JACK_STORAGE) return false;
    try {
      await this.env.JACK_STORAGE.put(KV_KEYS.ADAPTERS_CONFIG, JSON.stringify(adapters));
      return true;
    } catch (error) {
      console.error('KV set error for adapters:', error);
      return false;
    }
  }
  extractVideoLinks(html, baseUrl, selectors = {}) {
    // Very light extractor to avoid altering core parser
    const links = [];
    const urlRe = /href=["']([^"'#]+)["']/gi;
    let m;
    while ((m = urlRe.exec(html))) {
      try {
        const u = new URL(m[1], baseUrl);
        const host = u.hostname.replace(/^www\./, "");
        if (/video|watch|view|\/v\//i.test(u.pathname)) {
          links.push({ url: u.href, title: u.pathname.split('/').pop() });
        }
      } catch {}
    }
    return links;
  }
  async harvestFromAdapter(adapter, maxResults = 20) {
    const results = [];
    for (const seedUrl of adapter.seeds || []) {
      try {
        const response = await fetchLimited(seedUrl, {
          headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (compatible; JackBot/2.1)"
          }
        });
        if (!response.ok) continue;
        const html = await response.text();
        const videoLinks = this.extractVideoLinks(html, seedUrl, adapter.selectors);
        for (const link of videoLinks) {
          if (results.length >= maxResults) break;
          results.push({
            title: link.title || "Video",
            site: new URL(seedUrl).hostname.replace(/^www\./, ""),
            url: link.url,
            runtimeSec: null,
            thumbnail: link.thumbnail || null,
            tags: [],
            notes: "adapter-harvest",
            source: "adapter"
          });
        }
        if (results.length >= maxResults) break;
      } catch (error) {
        console.error(`Adapter harvest error for ${seedUrl}:`, error);
      }
    }
    return results;
  }
}

// ------------------ AdultDataLink API ------------------
class AdultDataLinkAPI {
  constructor(env) {
    this.env = env;
    this.baseUrl = ADL_API_BASE;
    this.apiKey = env?.ADL_API_KEY || env?.RAPIDAPI_KEY;
  }
  async search(query, options = {}) {
    if (!this.apiKey) {
      console.warn('AdultDataLink API key not configured');
      return [];
    }
    try {
      const cacheKey = `${KV_KEYS.ADL_PREFIX}${btoa(query + JSON.stringify(options))}`;
      if (this.env?.JACK_STORAGE) {
        const cached = await this.env.JACK_STORAGE.get(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          if (data.timestamp > Date.now() - 1800000) { // 30 minutes
            return data.results;
          }
        }
      }
      const searchParams = new URLSearchParams({
        q: query,
        limit: String(options.limit || 20),
        offset: String(options.offset || 0)
      });
      const response = await fetchWithTimeout(`${this.baseUrl}/search?${searchParams}`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'porn-api-adultdatalink.p.rapidapi.com',
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`ADL API error: ${response.status}`);
      const data = await response.json();
      const normalized = this.normalizeResults(data.results || data.videos || data);
      if (this.env?.JACK_STORAGE) {
        await this.env.JACK_STORAGE.put(cacheKey, JSON.stringify({ results: normalized, timestamp: Date.now() }), { expirationTtl: 1800 });
      }
      return normalized;
    } catch (error) {
      console.error('AdultDataLink API error:', error);
      return [];
    }
  }
  normalizeResults(rawResults) {
    if (!Array.isArray(rawResults)) return [];
    return rawResults.map(item => ({
      title: item.title || item.name || "Video",
      site: item.site || item.host || "unknown",
      url: item.url || item.link || item.video_url || "",
      runtimeSec: typeof item.duration === 'number' ? item.duration : null,
      thumbnail: item.thumbnail || item.thumb || item.preview || null,
      tags: Array.isArray(item.tags) ? item.tags.slice(0, 5) : [],
      notes: "adl-api",
      source: "adl"
    })).filter(item => item.url);
  }
}

// ------------------ Enhanced Search (wrapper) ------------------
class EnhancedSearchService {
  constructor(env) {
    this.core = new SearchService(env);
  }
  async searchNormalMode(q, opts) {
    return this.core.search(q, opts);
  }
  async searchDeepNicheMode(q, opts) {
    const expanded = expandQuery(q + ' "gay porn"', 'deep_niche');
    return this.core.search(expanded, opts);
  }
  async searchLightMode(q, opts) {
    const o = { ...opts, limit: Math.max(5, Math.floor((opts?.limit || 20) / 2)) };
    return this.core.search(q, o);
  }
}

// ------------------ Query Expansion ------------------
function expandQuery(originalQuery, mode) {
  if (mode !== 'niche' && mode !== 'deep_niche') return originalQuery;
  const numTerms = Math.floor(Math.random() * 2) + 2; // 2 or 3
  const selectedTerms = [];
  const availableTerms = [...NICHE_EXPANSION_TERMS];
  for (let i = 0; i < numTerms && availableTerms.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableTerms.length);
    selectedTerms.push(availableTerms.splice(randomIndex, 1)[0]);
  }
  if (selectedTerms.length === 0) return originalQuery;
  const expansion = selectedTerms.map(term => `"${term}"`).join(' OR ');
  return `${originalQuery} (${expansion})`;
}

// ------------------ Admin Handlers ------------------

async function handleAdminLogin(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
      }
    });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const adminUsername = env?.ADMIN_USERNAME;
  const adminPassword = env?.ADMIN_PASSWORD;
  const jwtSecret = env?.JWT_SECRET;
  if (!adminUsername || !adminPassword || !jwtSecret) {
    console.error('Admin authentication not configured');
    return new Response(JSON.stringify({ error: 'Service misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  try {
    const credentials = await request.json();
    if (credentials.username !== adminUsername || credentials.password !== adminPassword) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const now = Math.floor(Date.now() / 1000);
    const payload = { sub: adminUsername, iat: now, exp: now + JWT_TTL, jti: crypto.randomUUID() };
    const token = await generateJWT(payload, jwtSecret);
    const response = new Response(JSON.stringify({ token, expiresIn: JWT_TTL, tokenType: 'Bearer' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    return addCorsHeaders(response, request);
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleAdminLogout(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
      }
    });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const token = authHeader.substring(7);
  const jwtSecret = env?.JWT_SECRET;
  if (!jwtSecret) {
    return new Response(JSON.stringify({ error: 'Service misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const verification = await verifyJWT(token, jwtSecret);
  if (!verification.valid || !verification.payload.jti) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const revoked = await revokeToken(env, verification.payload.jti, verification.payload.exp);
  if (revoked) {
    const response = new Response(JSON.stringify({ message: 'Logged out successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    return addCorsHeaders(response, request);
  } else {
    return new Response(JSON.stringify({ error: 'Failed to revoke token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleAdminAdapters(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/admin/adapters/', '');
  const manager = new SiteAdaptersManager(env);
  if (request.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
      }
    });
  }
  if (path === "" && request.method === "GET") {
    const adapters = await manager.getAdapters();
    const response = new Response(JSON.stringify({ ok: true, adapters }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    return addCorsHeaders(response, request);
  }
  if (path === "" && request.method === "POST") {
    try {
      const body = await request.json();
      if (!body.hostname || !body.config) {
        return new Response(JSON.stringify({ ok: false, error: "Missing hostname or config" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const success = await manager.setAdapter(body.hostname, body.config);
      if (success) {
        const response = new Response(JSON.stringify({ ok: true, message: "Adapter saved successfully" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
        return addCorsHeaders(response, request);
      } else {
        return new Response(JSON.stringify({ ok: false, error: "Failed to save adapter" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path !== "" && request.method === "DELETE") {
    const hostname = path;
    const success = await manager.removeAdapter(hostname);
    if (success) {
      const response = new Response(JSON.stringify({ ok: true, message: "Adapter removed successfully" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      return addCorsHeaders(response, request);
    } else {
      return new Response(JSON.stringify({ ok: false, error: "Failed to remove adapter" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path !== "" && request.method === "GET") {
    const hostname = path;
    const adapters = await manager.getAdapters();
    if (adapters[hostname]) {
      const response = new Response(JSON.stringify({ ok: true, adapter: adapters[hostname] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      return addCorsHeaders(response, request);
    } else {
      return new Response(JSON.stringify({ ok: false, error: "Adapter not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}

async function handleAdminFrontier(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/admin/frontier/', '');
  if (request.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
      }
    });
  }
  if (path === "tags" && request.method === "GET") {
    try {
      const tags = await env.JACK_STORAGE.get(KV_KEYS.FRONTIER_TAGS, { type: 'json' }) || [];
      const response = new Response(JSON.stringify({ ok: true, tags }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      return addCorsHeaders(response, request);
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: "Failed to get tags" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path === "tags" && request.method === "POST") {
    try {
      const body = await request.json();
      if (!Array.isArray(body.tags)) {
        return new Response(JSON.stringify({ ok: false, error: "Tags must be an array" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      await env.JACK_STORAGE.put(KV_KEYS.FRONTIER_TAGS, JSON.stringify(body.tags));
      const response = new Response(JSON.stringify({ ok: true, message: "Tags updated successfully" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      return addCorsHeaders(response, request);
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path.startsWith("data/") && request.method === "GET") {
    const key = path.replace("data/", "");
    if (!key) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    try {
      const data = await env.JACK_STORAGE.get(KV_KEYS.FRONTIER_PREFIX + key, { type: 'json' }) || null;
      const response = new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      return addCorsHeaders(response, request);
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: "Failed to get data" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path.startsWith("data/") && request.method === "POST") {
    const key = path.replace("data/", "");
    if (!key) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    try {
      const body = await request.json();
      await env.JACK_STORAGE.put(KV_KEYS.FRONTIER_PREFIX + key, JSON.stringify(body.data));
      const response = new Response(JSON.stringify({ ok: true, message: "Data updated successfully" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      return addCorsHeaders(response, request);
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid request body" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path.startsWith("data/") && request.method === "DELETE") {
    const key = path.replace("data/", "");
    if (!key) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    try {
      await env.JACK_STORAGE.delete(KV_KEYS.FRONTIER_PREFIX + key);
      const response = new Response(JSON.stringify({ ok: true, message: "Data deleted successfully" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      return addCorsHeaders(response, request);
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: "Failed to delete data" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "*",
            "access-control-max-age": "86400"
          }
        });
      }
      
      // API routes
      // Admin panel
      
      // Admin API routes
      if (path.startsWith("/admin/adapters/")) {
        if (typeof handleAdminAdapters === "function") {
          return withCors(await handleAdminAdapters(request, env), request);
        } else {
          return withCors(new Response(JSON.stringify({ error: "Not Implemented" }), { status: 501, headers: { "content-type": "application/json" } }), request);
        }
      }
      if (path.startsWith("/admin/frontier/")) {
        if (typeof handleAdminFrontier === "function") {
          return withCors(await handleAdminFrontier(request, env), request);
        } else {
          return withCors(new Response(JSON.stringify({ error: "Not Implemented" }), { status: 501, headers: { "content-type": "application/json" } }), request);
        }
      }
if (path === "/admin/login") {
        return handleAdminLogin(request, env);
      }
      if (path === "/admin/logout") {
        return handleAdminLogout(request, env);
      }
      if (path === "/admin") {
        return withAuth(
          (req, env) => addCorsHeaders(new Response(ADMIN_PANEL_HTML, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }), req),
          request,
          env
        );
      }
      if (path.startsWith("/admin/adapters/")) {
        return withAuth(handleAdminAdapters, request, env);
      }
      if (path.startsWith("/admin/frontier/")) {
        return withAuth(handleAdminFrontier, request, env);
      }
      if (path === "/aggregate") {
        const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
        const rateLimit = await checkRateLimit(env, clientIP);
        if (rateLimit.limited) {
          return withCors(new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later.", status: 429 }), { status: 429, headers: { "content-type": "application/json", "retry-after": String(rateLimit.reset) } }), request);
        }
        return handleAggregate(request, env, ctx);
      }
      
      // Health check
      if (path === "/health") {
        return serveHealthCheck();
      }
      
      // Version check
      if (path === "/version.json") {
        return serveVersionCheck();
      }
      
      // Service worker
      if (path === "/sw.js") {
        return new Response(SW_JS, {
          headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": "no-store"
          }
        });
      }
      
      // App manifest (support both paths for compatibility)
      if (path === "/manifest.json" || path === "/site.webmanifest") {
        return new Response(MANIFEST_JSON, {
          headers: {
            "content-type": "application/manifest+json",
            "cache-control": "public, max-age=86400"
          }
        });
      }
      
      // Icon serving from GitHub
      if (path === "/icon-192.png") {
        return fetch(
          "https://raw.githubusercontent.com/itstanner5216/Jack-GPT/main/icon_jackportal_fixed_192.png",
          { 
            headers: { 
              "cache-control": "public, max-age=31536000, immutable" 
            } 
          }
        );
      }
      
      if (path === "/icon-512.png") {
        return fetch(
          "https://raw.githubusercontent.com/itstanner5216/Jack-GPT/main/icon_jackportal_fixed_512.png",
          { 
            headers: { 
              "cache-control": "public, max-age=31536000, immutable" 
            } 
          }
        );
      }
      
      // Main UI (HTML)
      return htmlResponse(PORTAL_HTML);
    } catch (error) {
      // Global error handler
      console.error(`[Jack-GPT] Unhandled error: ${error.message}`, error.stack);
      return new Response(JSON.stringify({
        error: 'An unexpected error occurred',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
          'cache-control': 'no-store'
        }
      });
    }
  }
};
// ==== Env helper ====
function getRequiredEnv(env, key, msg) {
  const value = env[key];
  if (!value) throw new Error(msg || `Missing required environment variable: ${key}`);
  return value;
}
// ==== end Env helper ====


// ==== Embedded icons (placeholder PNGs) ====
const ICON_192_BYTES = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,28,73,68,65,84,8,153,99,96,96,96,96,96,96,96,0,0,3,17,1,0,199,136,16,0,13,0,1,0,1,2,0,170,51,6,41,0,0,0,0,73,69,78,68,174,66,96,130]);
const ICON_512_BYTES = ICON_192_BYTES;
// ==== end embedded icons ====
