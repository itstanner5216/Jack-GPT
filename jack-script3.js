// @ts-nocheck
// Jack All-in-One — UI + /aggregate API + PWA with multi-provider search
// ---------------- Configuration and Environment ----------------

const APP_VERSION = '2.0.0';
const BUILD_DATE = '2025-08-29';

// API Keys - Configure in environment variables
const DEFAULT_KEYS = {
  SERPER_API_KEY: 'a1feeb90cb8f651bafa0b8c1a0d1a2d3f35e9d12',
  GOOGLE_KEY: 'AIzaSyAZhWamw25pgVB_3NAhvQOuSbkeh-mEWu0',
  GOOGLE_CX: '73e4998767b3c4800',
  FORUM_KEY: '39c5bdf0ac8645b5c9cc3f9a88c7ad4683395e78ec517ac35466bf5df2cf305e'
};

// Base configuration
const BASE_PATH = "/";
const DEBOUNCE_DELAY = 300; // ms
const THROTTLE_DELAY = 500; // ms

// Provider configuration
const JackConfig = {
  hosts: {
    FREE_HOSTS: [
      "xvideos.com","xnxx.com","xhamster.com","spankbang.com","eporner.com","porntrex.com",
      "thisvid.com","motherless.com","pornhub.com","youporn.com","redtube.com",
      "gayporntube.com","gaymaletube.com","boyfriendtv.com",
      // additions
      "ggroot.com","gotgayporn.com","gotporn.com","nuvid.com","winporn.com",
      "youporngay.com","rockettube.com","gaymenring.com","gayfuckporn.com",
      "manpornxxx.com","hotxxx.com","gayrookievideos.com","guystricked.com",
      "101boyvideos.com","gaytwinksporn.net","tumbex.com"
    ],
    SOFT_ALLOW_HOSTS: [
      "redgifs.com","twitter.com","x.com","yuvutu.com","tnaflix.com","tube8.com",
      "empflix.com","hqporner.com","txxx.com","porndoe.com"
    ],
    KNOWN_PAYWALL: [
      "onlyfans.com","justfor.fans","camsoda.com","chaturbate.com",
      "men.com","seancody.com","helixstudios.net","corbinfisher.com","belamistudios.com",
      "timtales.com","sayuncle.com","peterfever.com","chaosmen.com","justusboys.com","gayforit.eu","xtube.com"
    ],
    BAD_PATH_HINTS: [
      "/verify","/signup","/login","/premium","/trial","/join","/checkout","/subscribe","/account","/members"
    ]
  },
  
  patterns: {
    // Player signals
    HTML_PLAYER_RX: /(og:video|<video|\bsource\s+src=|jwplayer|video-js|plyr|hls|m3u8|\.mp4\b|data-hls|player-container|html5player)/i,
    // Orientation rules
    GAY_POSITIVE: /\b(gay|gayporn|gaytube|m\/m|\bmm\b|boyfriend|twink|otter|cub|bearsex|gaysex|straight friend|bottom|anal)\b/i,
    HETERO_RED_FLAGS: /\b(boy\/girl|man\/woman|m\/f|\bmf\b|f\/m|\bff\b|pussy|boobs|lesbian|stepmom|stepsis|milf|sister)\b/i
  },
  
  freshness: {
    FRESH_OK: new Set(["d7","m1","m3","y1","all"])
  },
  
  defaults: {
    mode: "niche",
    fresh: "y1",
    limit: 10
  }
};

// ----------------------------- API Module -----------------------------
const JackAPI = (function() {
  // Multi-provider search service
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
        },
        {
          name: 'brave',
          isEnabled: true, 
          dailyQuota: 30,
          isQuotaExceeded: false,
          resetTime: null,
          handler: this.searchWithBrave.bind(this)
        }
      ];
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
          'X-API-KEY': this.env?.SERPER_API_KEY || DEFAULT_KEYS.SERPER_API_KEY,
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
          runtime: runtime || "—",
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
      const GOOGLE_KEY = this.env?.GOOGLE_KEY || DEFAULT_KEYS.GOOGLE_KEY;
      const GOOGLE_CX = this.env?.GOOGLE_CX || DEFAULT_KEYS.GOOGLE_CX;
      
      const u = new URL("https://www.googleapis.com/customsearch/v1");
      u.searchParams.set("key", GOOGLE_KEY);
      u.searchParams.set("cx", GOOGLE_CX);
      u.searchParams.set("q", query);
      u.searchParams.set("num", options.limit || "10");
      u.searchParams.set("start", "1");
      u.searchParams.set("gl", "us");
      u.searchParams.set("hl", "en");
      
      if (options.fresh && options.fresh !== "all") {
        u.searchParams.set("dateRestrict", options.fresh);
      }
      
      const response = await fetch(u.toString(), { 
        headers: { 
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
        }
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Google API error (${response.status}): ${text}`);
      }
      
      const data = await response.json();
      return this.normalizeGoogleResults(data);
    }
    
    normalizeGoogleResults(data) {
      const items = data.items || [];
      
      return items.map(item => {
        let domain = '';
        try {
          domain = new URL(item.link).hostname.replace(/^www\./, '');
        } catch {
          domain = '';
        }
        
        // Extract duration
        let runtime = null;
        try {
          if (item.pagemap?.videoobject?.[0]?.duration) {
            const duration = item.pagemap.videoobject[0].duration;
            if (/^PT/.test(duration)) {
              // Parse ISO 8601 duration
              const matches = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
              if (matches) {
                const hours = parseInt(matches[1] || '0', 10);
                const minutes = parseInt(matches[2] || '0', 10);
                const seconds = parseInt(matches[3] || '0', 10);
                
                if (hours > 0) {
                  runtime = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                  runtime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
              }
            } else {
              // Try to parse as seconds
              const seconds = parseInt(duration, 10);
              if (!isNaN(seconds)) {
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                runtime = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
              }
            }
          }
          
          if (!runtime && item.pagemap?.metatags?.[0]?.["og:video:duration"]) {
            const seconds = parseInt(item.pagemap.metatags[0]["og:video:duration"], 10);
            if (!isNaN(seconds)) {
              const minutes = Math.floor(seconds / 60);
              const remainingSeconds = seconds % 60;
              runtime = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
            }
          }
        } catch (e) {
          console.error("Error parsing duration:", e);
        }
        
        // If still no runtime, try to extract from title
        if (!runtime) {
          const durationMatch = item.title.match(/\b(\d{1,2}):(\d{2})\b/);
          if (durationMatch) {
            runtime = durationMatch[0];
          }
        }
        
        // Get thumbnail
        let thumbnail = null;
        if (item.pagemap?.cse_thumbnail?.[0]?.src) {
          thumbnail = item.pagemap.cse_thumbnail[0].src;
        } else if (item.pagemap?.cse_image?.[0]?.src) {
          thumbnail = item.pagemap.cse_image[0].src;
        } else if (item.pagemap?.metatags?.[0]?.["og:image"]) {
          thumbnail = item.pagemap.metatags[0]["og:image"];
        }
        
        // Extract tags
        const tags = [];
        const keywordMatches = (item.title + ' ' + (item.snippet || '')).match(/\b(gay|male|homo|amateur|twink|bear)\b/gi);
        if (keywordMatches) {
          const uniqueKeywords = [...new Set(keywordMatches.map(k => k.toLowerCase()))];
          tags.push(...uniqueKeywords.slice(0, 5));
        }
        
        return {
          title: item.title,
          site: domain,
          url: item.link,
          runtime: runtime || "—",
          thumbnail: thumbnail,
          tags: tags,
          notes: "search result",
          provider: 'google'
        };
      });
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
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
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
          runtime = durationMatches[1];
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
          runtime: runtime || "—",
          thumbnail: result.thumbnail || null,
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

  return {
    // Exported methods
    handleAggregate: async function(request, env, ctx) {
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
      const relaxHosts = (url.searchParams.get("hostMode") || String(env?.HOST_MODE || "")).toLowerCase() === "relaxed";
      const durationMode = (url.searchParams.get("durationMode") || String(env?.DURATION_MODE || "normal")).toLowerCase(); // "normal" | "lenient"
      const orientationMode = "lenient"; // locked, no toggle
      
      // Secondary hosts via env (comma-separated)
      const SECONDARY_HOSTS = String(env?.SECONDARY_HOSTS || "")
        .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      
      // Hosts configuration
      const FREE_HOSTS = JackConfig.hosts.FREE_HOSTS;
      const SOFT_ALLOW_HOSTS = JackConfig.hosts.SOFT_ALLOW_HOSTS;
      const KNOWN_PAYWALL = new Set(JackConfig.hosts.KNOWN_PAYWALL.flatMap(h => [h, `www.${h}`]));
      
      const PREF_BASE = [...FREE_HOSTS, ...(relaxHosts ? SECONDARY_HOSTS : [])];
      const SOFT_BASE = [...SOFT_ALLOW_HOSTS, ...(relaxHosts ? SECONDARY_HOSTS : [])];
      const PREFERRED_HOSTS = new Set(PREF_BASE.flatMap(h => [h, `www.${h}`]));
      const SOFT_ALLOW = new Set(SOFT_BASE.flatMap(h => [h, `www.${h}`]));
      
      const ALLOWED_FALLBACK = new Set([
        ...Array.from(PREFERRED_HOSTS),
        ...Array.from(SOFT_ALLOW),
        "reddit.com","www.reddit.com",
        "archive.org","www.archive.org","archive.ph","www.archive.ph"
      ]);
      
      if (relaxHosts) {
        for (const h of SECONDARY_HOSTS) { ALLOWED_FALLBACK.add(h); ALLOWED_FALLBACK.add(`www.${h}`); }
      }
      
      const BAD_PATH_HINTS = JackConfig.hosts.BAD_PATH_HINTS;
      
      // Player signals
      const HTML_PLAYER_RX = JackConfig.patterns.HTML_PLAYER_RX;
      
      // Orientation rules (lenient)
      const GAY_POSITIVE = JackConfig.patterns.GAY_POSITIVE;
      const HETERO_RED_FLAGS = JackConfig.patterns.HETERO_RED_FLAGS;

      // Content filtering utilities
      function gayOnlyPass(title, textSample, host) {
        const titleT = (title || "").toLowerCase();
        const textT = (textSample || "").toLowerCase();
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
      const FRESH_OK = JackConfig.freshness.FRESH_OK;
      let freshness = (url.searchParams.get("fresh") || "y1").trim().toLowerCase();
      if (!FRESH_OK.has(freshness)) freshness = "y1";
      const rawSite = (url.searchParams.get("site") || "").trim();
      let siteQuery = sanitizeSiteParam(rawSite) || null;
      let searchMode = (url.searchParams.get("mode") || "").trim().toLowerCase() || null;
      if (!searchMode) searchMode = "niche";
      if (siteQuery && /[\s"]/g.test(siteQuery)) siteQuery = null;
      const DEBUG = url.searchParams.get("debug") === "1" || String(env?.DEBUG || "").toLowerCase() === "true";
      
      // Analytics tracking
      const requestId = url.searchParams.get("reqId") || crypto.randomUUID();
      
      // Diagnostics
      let fetched_total = 0, dropped_paywall = 0, dropped_dead = 0;
      let dropped_forbidden = 0, dropped_removed = 0;
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
      
      // Page sniff (playability + orientation + duration + thumbnail + listing harvest)
      async function getPlayableMeta(uStr){
        const headers = { 
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
          "Accept-Language": "en-US,en;q=0.9" 
        };
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
      
      // Optimize thumbnail URLs
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
      
      // Scoring
      function rankScore(host, recent=false){
        if (KNOWN_PAYWALL.has(host)) return 5;
        if (PREFERRED_HOSTS.has(host)) return 100 + (recent ? 10 : 0);
        if (SOFT_ALLOW.has(host)) return 75 + (recent ? 6 : 0);
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
      
      try {
        // Initialize the multi-provider search service
        const searchService = new SearchService(env);
        
        // Create appropriate query based on search mode
        let enhancedQuery = q;
        if (searchMode === 'niche') {
          enhancedQuery += ' "gay porn"';
        } else if (searchMode === 'keywords') {
          enhancedQuery += ' "gay porn" OR "gay video" OR "homo video"';
        } else if (searchMode === 'deep_niche') {
          enhancedQuery += ' "amateur homo" OR "gay male amateur"';
        } else if (searchMode === 'forums') {
          enhancedQuery += ' gay OR homo OR male site:forum.* OR site:reddit.com';
        } else if (searchMode === 'tumblrish') {
          enhancedQuery += ' gay OR homo OR male site:tumblr.com OR site:blogspot.com';
        }
        
        // Add site restriction if specified
        if (siteQuery) {
          enhancedQuery += ` site:${siteQuery}`;
        }
        
        // Search options
        const searchOptions = {
          limit: limit * 2, // Request more results to allow for filtering
          fresh: freshness,
          site: siteQuery,
          country: 'us',
          language: 'en',
          mode: searchMode
        };
        
        // Perform search with automatic provider fallback
        const searchResult = await searchService.search(enhancedQuery, searchOptions);
        
        if (!searchResult.success) {
          return jerr(searchResult.error || "search failed", 500);
        }
        
        // Process results with content filtering
        fetched_total = searchResult.results.length;
        let candidates = searchResult.results.map(result => ({
          source: result.provider,
          title: neutralizeTitle(result.title || ""),
          site: result.site || "",
          url: result.url || "",
          runtimeSec: result.runtime ? durToSeconds(result.runtime) : null,
          thumbnail: result.thumbnail ? optimizeThumbnail(result.thumbnail) : null,
          tags: result.tags || [],
          notes: result.notes || "search result"
        })).filter(it => !!it.url);
        
        // Analyze candidates
        const nonForumIdx = candidates.map((it, idx) => ({ it, idx })).filter(x => x.it.source !== "forum");
        const analyses = await poolMap(nonForumIdx, async ({it}) => getPlayableMeta(it.url), 6);
        const analysisByUrl = new Map();
        nonForumIdx.forEach((x, k) => { analysisByUrl.set(normUrl(x.it.url), analyses[k]); });
        
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
        
        const res = jok(payload, 200);
        if (!bypassCache) ctx.waitUntil(edgeCache.put(request, res.clone()));
        return res;
      } catch (error) {
        console.error(`[handleAggregate] Error: ${error.message}`, error.stack);
        return jerr("an unexpected error occurred", 500);
      }
    },
  };
})();

// -------------------- UI and HTML --------------------
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
    }
    
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
      0% { opacity: 1

// ------------------------ Enhanced Client-Side JavaScript ------------------------
const CLIENT_JS = `
// Enhanced Jack Portal client-side JavaScript
const API_BASE = '/aggregate';

// --------- Offline Support ---------
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
    // Load cached searches from IndexedDB
    await this.loadCachedSearches();
    
    // Check if we're starting in offline mode
    if (!this.isOnline) {
      this.enableOfflineMode();
    }
  }
  
  handleConnectivityChange(isOnline) {
    this.isOnline = isOnline;
    
    if (isOnline) {
      this.disableOfflineMode();
      // Sync any pending operations
      this.syncPendingOperations();
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
  
  async loadCachedSearches() {
    try {
      // Use IndexedDB to store larger datasets
      const db = await this.openDatabase();
      const transaction = db.transaction(['searches'], 'readonly');
      const store = transaction.objectStore('searches');
      const cachedSearches = await store.getAll();
      
      this.offlineContent = cachedSearches;
    } catch (error) {
      console.error('Failed to load cached searches:', error);
    }
  }
  
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('JackOfflineDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore('searches', { keyPath: 'id' });
      };
      
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }
  
  async saveSearch(query, results) {
    if (!this.isOnline) return;
    
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['searches'], 'readwrite');
      const store = transaction.objectStore('searches');
      
      await store.put({
        id: crypto.randomUUID(),
        query,
        results,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to save search for offline use:', error);
    }
  }
  
  displayOfflineContent() {
    const resultsEl = document.getElementById('results');
    
    if (this.offlineContent.length === 0) {
      resultsEl.innerHTML = \`
        <div class="offline-message">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    const content = this.offlineContent
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
      
    let html = \`
      <div class="offline-banner">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
        <span>You're offline. Showing saved searches.</span>
      </div>
    \`;
    
    content.forEach(item => {
      html += \`
        <div class="offline-search-item">
          <h3>Search: "\${item.query}"</h3>
          <div class="offline-results-grid">
            \${item.results.slice(0, 6).map(result => cardHtml(result, true)).join('')}
          </div>
          <div class="offline-timestamp">Saved \${this.formatTimestamp(item.timestamp)}</div>
        </div>
      \`;
    });
    
    resultsEl.innerHTML = html;
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
    showToast('You are offline. Some features may be limited.', 'offline');
  }
  
  showOnlineNotification() {
    showToast('You\'re back online!', 'online');
  }
  
  async syncPendingOperations() {
    // Implement sync logic if needed
  }
}

// --------- Error Monitoring ---------
class ErrorMonitor {
  constructor() {
    this.errors = [];
    this.maxStoredErrors = 10;
    
    // Set up global error handlers
    this.setupGlobalHandlers();
  }
  
  setupGlobalHandlers() {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.captureError({
        type: 'uncaught_error',
        message: event.message,
        stack: event.error?.stack,
        source: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        type: 'unhandled_promise_rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
      });
    });
    
    // Patch fetch to catch network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Log API errors
        if (!response.ok && response.url.includes('/aggregate')) {
          const errorData = await response.clone().json().catch(() => null);
          this.captureError({
            type: 'api_error',
            status: response.status,
            url: response.url,
            data: errorData
          });
        }
        
        return response;
      } catch (error) {
        // Capture network errors
        this.captureError({
          type: 'network_error',
          message: error.message,
          url: args[0]
        });
        throw error;
      }
    };
  }
  
  captureError(error) {
    // Store locally
    this.errors.unshift({
      ...error,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxStoredErrors) {
      this.errors.pop();
    }
    
    // Log to console
    console.error('[JackGPT Error]', error);
    
    // Store in localStorage for diagnostics
    try {
      localStorage.setItem('jack.errors', JSON.stringify(this.errors));
    } catch {
      // Ignore storage errors
    }
  }
  
  getErrors() {
    return [...this.errors];
  }
  
  clearErrors() {
    this.errors = [];
    try {
      localStorage.removeItem('jack.errors');
    } catch {
      // Ignore storage errors
    }
  }
}

// --------- Analytics Service ---------
class AnalyticsService {
  constructor() {
    this.enabled = this.isAnalyticsEnabled();
    this.sessionId = this.generateSessionId();
    this.events = [];
    this.flushInterval = 30000; // 30 seconds
    
    if (this.enabled) {
      this.setupFlushInterval();
    }
  }
  
  isAnalyticsEnabled() {
    try {
      return localStorage.getItem('jack.analytics_enabled') !== 'false';
    } catch {
      return true; // Default to enabled
    }
  }
  
  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  setupFlushInterval() {
    setInterval(() => this.flush(), this.flushInterval);
    // Also flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }
  
  trackEvent(category, action, label = null, value = null) {
    if (!this.enabled) return;
    
    const event = {
      category,
      action,
      label,
      value,
      timestamp: new Date().toISOString()
    };
    
    this.events.push(event);
    
    // Auto-flush if we have too many events
    if (this.events.length >= 10) {
      this.flush();
    }
  }
  
  trackSearch(query, mode, resultsCount) {
    this.trackEvent('search', 'perform', mode, resultsCount);
  }
  
  trackContentView(url, title, site) {
    this.trackEvent('content', 'view', site, null);
  }
  
  trackError(errorType, errorMessage) {
    this.trackEvent('error', errorType, errorMessage);
  }
  
  trackPerformance(metric, value) {
    this.trackEvent('performance', metric, null, value);
  }
  
  async flush() {
    if (this.events.length === 0) return;
    
    const eventsToSend = [...this.events];
    this.events = [];
    
    try {
      const response = await fetch('/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          userAgent: navigator.userAgent,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          language: navigator.language,
          events: eventsToSend
        }),
        // Don't wait for analytics on page unload
        keepalive: true
      });
      
      if (!response.ok) {
        console.error('Failed to send analytics');
        // Put events back in the queue
        this.events = [...eventsToSend, ...this.events];
      }
    } catch (error) {
      console.error('Error sending analytics:', error);
      // Put events back in the queue
      this.events = [...eventsToSend, ...this.events];
    }
  }
  
  setEnabled(enabled) {
    this.enabled = enabled;
    try {
      localStorage.setItem('jack.analytics_enabled', enabled.toString());
    } catch {
      // Ignore storage errors
    }
  }
}

// --------- iOS Optimizer ---------
class IosOptimizer {
  constructor() {
    this.isIos = this.detectIos();
    this.isIos18 = this.detectIos18();
    this.supportsDynamicIsland = this.detectDynamicIsland();
    this.supportsApplePencil = this.detectApplePencil();
    
    // Apply iOS-specific optimizations
    if (this.isIos) {
      this.applyIosOptimizations();
      
      // Extra iOS 18 optimizations
      if (this.isIos18) {
        this.applyIos18Optimizations();
      }
    }
  }
  
  detectIos() {
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua);
  }
  
  detectIos18() {
    const ua = navigator.userAgent;
    return this.isIos && (/OS 18/.test(ua) || /Version\/18/.test(ua));
  }
  
  detectDynamicIsland() {
    // Check for notch and iOS 16+ (approximation - there's no direct API)
    const ua = navigator.userAgent;
    const isiPhone = /iPhone/.test(ua);
    const isIos16Plus = /OS 1[6-9]|OS 2\\d/.test(ua);
    
    // iPhones 14 Pro and newer have Dynamic Island
    // This is a heuristic as there's no direct way to detect
    return isiPhone && isIos16Plus && window.devicePixelRatio >= 3;
  }
  
  detectApplePencil() {
    // Check if device is iPad and supports touch with pressure
    return /iPad/.test(navigator.userAgent) && 
           (window.PointerEvent && 'pressure' in new PointerEvent('pointerdown'));
  }
  
  applyIosOptimizations() {
    // Add viewport-fit=cover for notched devices
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      if (!metaViewport.content.includes('viewport-fit=cover')) {
        metaViewport.content += ', viewport-fit=cover';
      }
    }
    
    // Optimize scrolling
    document.documentElement.style.webkitOverflowScrolling = 'touch';
    
    // Optimize inputs to prevent zoom
    document.querySelectorAll('input, select').forEach(el => {
      el.style.fontSize = '16px';
    });
    
    // Fix 100vh issue on iOS
    const fixHeight = () => {
      document.documentElement.style.setProperty('--real-height', \`\${window.innerHeight}px\`);
    };
    
    window.addEventListener('resize', fixHeight);
    window.addEventListener('orientationchange', fixHeight);
    fixHeight();
  }
  
  applyIos18Optimizations() {
    // iOS 18 specific enhancements
    document.body.classList.add('ios18');
    
    // Setup Dynamic Island integration if available
    if (this.supportsDynamicIsland) {
      document.body.classList.add('has-dynamic-island');
      
      // Add spacer for Dynamic Island in PWA mode
      if (window.matchMedia('(display-mode: standalone)').matches) {
        const spacer = document.createElement('div');
        spacer.className = 'dynamic-island-spacer';
        document.body.insertBefore(spacer, document.body.firstChild);
      }
    }
    
    // Apply Apple Pencil optimizations if supported
    if (this.supportsApplePencil) {
      document.body.classList.add('pencil-enabled');
    }
    
    // Enable enhanced backdrop filters
    const header = document.querySelector('header');
    if (header) {
      header.style.backdropFilter = 'saturate(120%) blur(10px)';
      header.style.webkitBackdropFilter = 'saturate(120%) blur(10px)';
    }
  }
}

// --------- UI Helpers ---------
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

// Enhanced card rendering with lazy loading
function cardHtml(item, showThumb) {
  const t = item.title || "clip";
  const site = item.site || "";
  const rt = item.runtime || "—";
  const url = item.url || "#";
  const thumb = item.thumbnail || item.thumb || "";
  
  let html = '<div class="card">';
  if (showThumb && thumb) {
    html += \`<img class="thumb" data-src="\${thumb}" alt="" loading="lazy">\`;
  }
  html += \`<div style="font-weight:700">\${t}</div>\`;
  html += \`<div class="meta"><strong>Site:</strong> \${site} &nbsp; • &nbsp; <strong>Runtime:</strong> \${rt}</div>\`;
  html += \`<div><a class="link" href="\${url}" target="_blank" rel="noopener noreferrer">View Content</a></div>\`;
  html += '</div>';
  
  return html;
}

function renderLoadingSkeleton(count = 3) {
  const html = Array(count).fill(\`
    <div class="card skeleton">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-meta"></div>
      <div class="skeleton-link"></div>
    </div>
  \`).join('');
  
  document.getElementById('results').innerHTML = html;
}

function buildUrl() {
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
  p.set("reqId", crypto.randomUUID()); // Request ID for tracking
  return API_BASE + "?" + p.toString();
}

// Debounce utility for search operations
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
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

// Initialize UI references
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
const searchForm = document.getElementById("searchForm");
const goBtn = document.getElementById("goBtn");
const copyBtn = document.getElementById("copyBtn");
const dbgBtn = document.getElementById("dbgBtn");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const modeChips = document.getElementById("modeChips");
const errorContainer = document.getElementById("error-container");
const recentSearchesContainer = document.getElementById("recent-searches");
const recentSearchesChips = document.getElementById("recent-searches-chips");

// Initialize services
const errorMonitor = new ErrorMonitor();
const analytics = new AnalyticsService();
const offlineManager = new OfflineManager();
const iosOptimizer = new IosOptimizer();

// Add UI enhancements
function initializeEnhancedUI() {
  // Add voice search if supported
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const voiceButton = document.createElement('button');
    voiceButton.type = 'button';
    voiceButton.className = 'voice-search';
    voiceButton.innerHTML = '🎤';
    voiceButton.title = 'Search by voice';
    
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
        voiceButton.innerHTML = '🔴';
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        qEl.value = transcript;
        qEl.dispatchEvent(new Event('input'));
      };
      
      recognition.onend = () => {
        voiceButton.classList.remove('listening');
        voiceButton.innerHTML = '🎤';
      };
      
      recognition.onerror = () => {
        voiceButton.classList.remove('listening');
        voiceButton.innerHTML = '🎤';
      };
      
      recognition.start();
    });
  }
  
  // Add clear button to search input
  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'search-clear';
  clearButton.innerHTML = '✕';
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
    shareButton.className = 'share-button secondary';
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
      });
    });
  }
  
  // Setup recent searches display
  renderRecentSearches();
  
  // Setup lazy loading with Intersection Observer
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
    
    // Override render function to use intersection observer
    window.render = function(items) {
      resultsEl.innerHTML = (items || []).map(it => cardHtml(it, showThumbsEl.checked)).join("");
      
      // Observe all cards for lazy loading
      document.querySelectorAll('.card').forEach(card => {
        cardObserver.observe(card);
      });
    };
  }
}

// Error handling
function showError(message) {
  errorContainer.textContent = message;
  errorContainer.classList.add("show");
  
  // Track error
  analytics.trackError('search_error', message);
  
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
  const searchProgress = document.getElementById("search-progress");
  const progressBar = document.getElementById("progress-bar");
  
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
  const searchProgress = document.getElementById("search-progress");
  const progressBar = document.getElementById("progress-bar");
  
  clearInterval(interval);
  progressBar.style.width = "100%";
  setTimeout(() => {
    searchProgress.classList.remove("active");
    progressBar.style.width = "0%";
  }, 500);
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
      recentSearchesContainer.style.display = 'none';
      return;
    }
    
    recentSearchesContainer.style.display = 'block';
    recentSearchesChips.innerHTML = '';
    
    searches.forEach(search => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = search;
      chip.addEventListener('click', () => {
        qEl.value = search;
        searchForm.dispatchEvent(new Event('submit'));
      });
      recentSearchesChips.appendChild(chip);
    });
  } catch (e) {
    console.error('Failed to load recent searches:', e);
  }
}

// Helpers
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
  } catch {}
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
  } catch {}
}

// Version check
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
        showUpdateNotification(data.version, data.updateUrl);
      } else {
        showToast('You\\'re running the latest version!');
      }
    })
    .catch(error => {
      console.error('Failed to check for updates:', error);
      showToast('Update check failed. Please try again later.');
    });
}

function showUpdateNotification(version, updateUrl) {
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
    window.location.href = updateUrl || window.location.href;
  });
  
  document.getElementById('updateLater').addEventListener('click', () => {
    notification.remove();
  });
}

// Diagnostic tools
window.jackDiagnostics = {
  getErrors: () => errorMonitor.getErrors(),
  clearErrors: () => errorMonitor.clearErrors(),
  checkNetwork: async () => {
    try {
      const start = performance.now();
      const response = await fetch('/health');
      const end = performance.now();
      
      return {
        online: true,
        latency: Math.round(end - start),
        status: response.status,
        healthy: response.ok
      };
    } catch (error) {
      return {
        online: false,
        error: error.message
      };
    }
  },
  getAnalytics: () => ({
    enabled: analytics.enabled,
    sessionId: analytics.sessionId,
    pendingEvents: analytics.events.length
  }),
  version: '${APP_VERSION}'
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize enhanced UI
  initializeEnhancedUI();
  
  // Load saved defaults
  loadDefaults();
  
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
    setTimeout(() => setStatus("idle"), 800);
  });
  
  // Copy results
  copyBtn.addEventListener("click", async () => {
    const data = [...resultsEl.querySelectorAll(".card")].map(c => {
      const title = c.querySelector("div[style*='font-weight']").textContent.trim();
      const site = c.querySelector(".meta").textContent.replace(/\\s+/g, " ").trim();
      const url = c.querySelector("a.link")?.href || "";
      return title + " — " + site + " — " + url;
    }).join("\\n");
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(data);
        setStatus("copied");
        setTimeout(() => setStatus("idle"), 800);
      } else {
        const ta = document.createElement("textarea");
        ta.value = data;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setStatus("copied");
        setTimeout(() => setStatus("idle"), 800);
      }
    } catch {
      setStatus("copy failed");
      setTimeout(() => setStatus("idle"), 1200);
    }
  });
  
  // Update check
  document.getElementById('checkUpdates').addEventListener('click', checkForUpdates);
  
  // Search form submission
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const query = qEl.value.trim();
    if (!query) {
      showError("Please enter a search query");
      setStatus("enter a query");
      return;
    }
    
    // Clear previous results and error messages
    clearError();
    goBtn.disabled = true;
    setStatus("loading…");
    
    // Show loading skeletons
    renderLoadingSkeleton(parseInt(limitEl.value) > 6 ? 6 : parseInt(limitEl.value));
    
    // Show progress indicator
    const progressInterval = startProgress();
    
    // Performance tracking
    const startTime = performance.now();
    
    try {
      // Execute search
      const response = await fetchWithRetry(buildUrl());
      const data = await response.json();
      
      // Save to recent searches
      saveRecentSearch(query);
      
      // Track successful search
      analytics.trackSearch(query, modeSel.value, data.results?.length || 0);
      
      // Track performance
      const endTime = performance.now();
      analytics.trackPerformance('search_time', Math.round(endTime - startTime));
      
      // Render results
      render(data.results || []);
      
      // Save for offline use
      offlineManager.saveSearch(query, data.results || []);
      
      // Show debug info if available
      if (data.diag) {
        debugEl.textContent = JSON.stringify(data.diag, null, 2);
      }
      
      setStatus('done (' + ((data.results || []).length) + ')');
    } catch (error) {
      showError(error.message || "Search failed");
      setStatus("error");
      debugEl.textContent = String(error);
      
      // Track error
      analytics.trackError('search_error', error.message || "Search failed");
      errorMonitor.captureError({
        type: 'search_error',
        message: error.message || "Search failed",
        query
      });
    } finally {
      goBtn.disabled = false;
      completeProgress(progressInterval);
    }
  });
  
  // Track page load
  analytics.trackEvent('page', 'load');
  
  // PWA installation support
  let deferredPrompt;
  if ('serviceWorker' in navigator) {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      
      // Show install button
      const installButton = document.createElement('button');
      installButton.textContent = 'Install App';
      installButton.classList.add('secondary');
      document.querySelector('.actions').appendChild(installButton);
      
      installButton.addEventListener('click', async () => {
        installButton.style.display = 'none';
        
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(\`User response to the install prompt: \${outcome}\`);
        
        // We've used the prompt, and can't use it again
        deferredPrompt = null;
        
        // Track installation
        analytics.trackEvent('pwa', 'install', outcome);
      });
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      analytics.trackEvent('pwa', 'installed');
    });
  }
});

// Register service worker for offline capability and PWA support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(registration => {
      console.log('Service worker registered successfully');
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('New service worker version installed');
            showToast('New version available. Refresh to update.');
          }
        });
      });
    })
    .catch(error => {
      console.error('Service worker registration failed:', error);
    });
  
  // Handle updates when the user returns to the app
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
`;

// -------------------- Service Worker --------------------
const SW_JS = `// Jack-GPT Service Worker v2.0.0
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

// Enhanced offline-first strategy
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
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
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

// Handle offline analytics
const offlineQueue = [];

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncAnalytics() {
  if (offlineQueue.length === 0) return;
  
  const events = [...offlineQueue];
  offlineQueue.length = 0;
  
  try {
    await fetch('/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events, isSync: true })
    });
  } catch (error) {
    // Push events back to queue
    offlineQueue.push(...events);
    return Promise.reject(error);
  }
}

// Listen for messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
`;

// -------------------- Manifest JSON --------------------
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

// -------------------- Main Worker Implementation --------------------
// Utility functions
function joinPath(base, leaf) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  return b + "/" + leaf;
}

// Health check response
function serveHealthCheck() {
  return new Response(JSON.stringify({
    status: 'healthy',
    version: APP_VERSION,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}

// API documentation
function serveApiDocs() {
  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jack-GPT API Documentation</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #333333;
      --border: #e0e0e0;
      --code-bg: #f5f7f9;
      --primary: #3b82f6;
      --secondary: #64748b;
      --radius: 6px;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #121212;
        --text: #e0e0e0;
        --border: #2a2a2a;
        --code-bg: #1e1e1e;
        --primary: #60a5fa;
        --secondary: #94a3b8;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
      line-height: 1.6;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
      color: var(--text);
      background: var(--bg);
    }
    h1 {
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
      font-size: 2rem;
      margin-top: 0;
    }
    h2 {
      margin-top: 2rem;
      font-size: 1.5rem;
      padding-bottom: 5px;
      border-bottom: 1px solid var(--border);
    }
    h3 {
      margin-top: 1.5rem;
      font-size: 1.2rem;
      color: var(--primary);
    }
    code {
      background: var(--code-bg);
      padding: 2px 5px;
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 0.9em;
    }
    pre {
      background: var(--code-bg);
      padding: 15px;
      border-radius: var(--radius);
      overflow-x: auto;
      border: 1px solid var(--border);
    }
    pre code {
      background: transparent;
      padding: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 10px 15px;
      text-align: left;
    }
    th {
      background: var(--code-bg);
      font-weight: 600;
    }
    a {
      color: var(--primary);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .endpoint {
      background: var(--code-bg);
      padding: 10px 15px;
      border-radius: var(--radius);
      border-left: 4px solid var(--primary);
      margin: 15px 0;
      font-weight: 600;
    }
    .method {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      background: var(--primary);
      color: white;
      font-size: 0.8rem;
      margin-right: 8px;
    }
    .version-info {
      text-align: right;
      font-size: 0.8rem;
      color: var(--secondary);
      margin-top: 2rem;
    }
  </style>
</head>
<body>
  <h1>Jack-GPT API Documentation</h1>
  <p>
    Jack-GPT provides powerful content search capabilities through a RESTful API.
    This documentation outlines available endpoints, parameters, and expected responses.
  </p>
  <h2>Aggregate Search API</h2>
  <p>The primary endpoint for performing content searches with advanced filtering capabilities.</p>
  <div class="endpoint">
    <span class="method">GET</span> /aggregate
  </div>
  <h3>Query Parameters</h3>
  <table>
    <tr>
      <th>Parameter</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
      <th>Default</th>
    </tr>
    <tr>
      <td><code>q</code></td>
      <td>string</td>
      <td>Search query text</td>
      <td>Yes</td>
      <td>—</td>
    </tr>
    <tr>
      <td><code>mode</code></td>
      <td>string</td>
      <td>Search mode: <code>niche</code>, <code>keywords</code>, <code>deep_niche</code>, <code>forums</code>, <code>tumblrish</code></td>
      <td>No</td>
      <td><code>niche</code></td>
    </tr>
    <tr>
      <td><code>fresh</code></td>
      <td>string</td>
      <td>Freshness filter: <code>d7</code> (7 days), <code>m1</code> (1 month), <code>m3</code> (3 months), <code>y1</code> (1 year), <code>all</code> (all time)</td>
      <td>No</td>
      <td><code>y1</code></td>
    </tr>
    <tr>
      <td><code>limit</code></td>
      <td>integer</td>
      <td>Maximum number of results (3-20)</td>
      <td>No</td>
      <td>10</td>
    </tr>
    <tr>
      <td><code>duration</code></td>
      <td>string</td>
      <td>Duration filter (e.g., <code>5-12m</code>, <code>&lt;3m</code>, <code>&gt;10m</code>, <code>7:30</code>, <code>PT1H5M</code>)</td>
      <td>No</td>
      <td>—</td>
    </tr>
    <tr>
      <td><code>site</code></td>
      <td>string</td>
      <td>Limit results to specific domain</td>
      <td>No</td>
      <td>—</td>
    </tr>
    <tr>
      <td><code>hostMode</code></td>
      <td>string</td>
      <td><code>normal</code> or <code>relaxed</code></td>
      <td>No</td>
      <td><code>normal</code></td>
    </tr>
    <tr>
      <td><code>durationMode</code></td>
      <td>string</td>
      <td><code>normal</code> or <code>lenient</code></td>
      <td>No</td>
      <td><code>normal</code></td>
    </tr>
    <tr>
      <td><code>nocache</code></td>
      <td>boolean</td>
      <td>Set to <code>1</code> to bypass cache</td>
      <td>No</td>
      <td>—</td>
    </tr>
    <tr>
      <td><code>reqId</code></td>
      <td>string</td>
      <td>Request identifier for tracking</td>
      <td>No</td>
      <td>auto-generated</td>
    </tr>
  </table>
  <h3>Example Request</h3>
  <pre><code>GET /aggregate?q=example+search&mode=niche&fresh=m1&limit=10</code></pre>
  <h3>Example Response</h3>
  <pre><code>{
  "query": "example search",
  "site": null,
  "mode": "niche",
  "durationQuery": null,
  "freshness": "m1",
  "results": [
    {
      "title": "Example Content",
      "site": "example.com",
      "url": "https://example.com/video/12345",
      "runtime": "5:30",
      "thumbnail": "https://example.com/thumb/12345.jpg",
      "tags": ["tag1", "tag2"],
      "notes": "search result"
    }
  ]
}</code></pre>
  <h3>Error Responses</h3>
  <h4>Missing Query</h4>
  <pre><code>{
  "error": "missing query",
  "status": 400
}</code></pre>
  <h4>Invalid Parameters</h4>
  <pre><code>{
  "error": "invalid parameter: limit must be between 3 and 20",
  "status": 400
}</code></pre>
  <h4>Server Error</h4>
  <pre><code>{
  "error": "an unexpected error occurred",
  "requestId": "7f28c64a-9b2a-4b69-b7f1-8d94a4abf4e3",
  "status": 500
}</code></pre>
  <h2>Health Check API</h2>
  <p>Endpoint for monitoring the service health status.</p>
  <div class="endpoint">
    <span class="method">GET</span> /health
  </div>
  <h3>Example Response</h3>
  <pre><code>{
  "status": "healthy",
  "version": "${APP_VERSION}",
  "timestamp": "2025-08-29T00:15:22Z"
}</code></pre>
  <h2>Usage Limits</h2>
  <p>
    The API currently implements multiple search providers with automatic fallback.
    For high-volume applications, please implement reasonable request throttling.
  </p>
  <h2>Caching Behavior</h2>
  <p>
    Results are cached for 1 hour by default to improve performance and reduce load.
    Use the <code>nocache=1</code> parameter to bypass the cache for time-sensitive queries.
  </p>
  <div class="version-info">
    <p>API Version: ${APP_VERSION} | Last Updated: ${BUILD_DATE}</p>
  </div>
</body>
</html>`, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}

// Add CORS headers to a response
function addCorsHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, OPTIONS");
  headers.set("access-control-allow-headers", "*");
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// Handle version check
function handleVersionCheck() {
  return new Response(JSON.stringify({
    version: APP_VERSION,
    buildDate: BUILD_DATE,
    updateUrl: '/'
  }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-cache"
    }
  });
}

// Handle analytics
function handleAnalytics(request) {
  // Simple logging, would normally store this data
  console.log('Analytics event received');
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    }
  });
}

// Main router
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
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, POST, OPTIONS",
            "access-control-allow-headers": "*",
            "access-control-max-age": "86400"
          }
        });
      }
      
      // Root UI
      if (path === BASE_PATH || (BASE_PATH !== "/" && path === BASE_PATH.replace(/\/$/, ""))) {
        const html = PORTAL_HTML.replace('</body>', `<script>${CLIENT_JS}</script></body>`);
        return htmlResponse(html, 200);
      }
      
      // Service worker
      if (path === joinPath(BASE_PATH, "sw.js")) {
        return new Response(SW_JS, {
          status: 200,
          headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": "no-store" // Ensure we always get the latest version
          }
        });
      }
      
      // Manifest (support both paths for compatibility)
      if (path === joinPath(BASE_PATH, "site.webmanifest") || path === "/manifest.json") {
        return new Response(MANIFEST_JSON, {
          status: 200,
          headers: {
            "content-type": "application/manifest+json; charset=utf-8",
            "cache-control": "public, max-age=3600"
          }
        });
      }
      
      // API on same origin
      if (path === "/aggregate") {
        return JackAPI.handleAggregate(request, env, ctx);
      }
      
      // API documentation
      if (path === "/api/docs") {
        return serveApiDocs();
      }
      
      // Health check endpoint
      if (path === "/health") {
        return serveHealthCheck();
      }
      
      // Version check
      if (path === "/version.json") {
        return handleVersionCheck();
      }
      
      // Analytics endpoint
      if (path === "/analytics") {
        return handleAnalytics(request);
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
      
      // 404 handler
      return new Response('Not found', {
        status: 404,
        headers: { 'content-type': 'text/plain' }
      });
    } catch (error) {
      // Global error handler for unhandled exceptions
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