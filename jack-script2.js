// Jack-GPT - Enhanced Content Search Portal
// Author: itstanner5216
// Updated: 2025-08-29

// ---------------- Service Worker payload (served at /sw.js) ----------------
const SW_JS = `const CACHE_NAME = 'jack-portal-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/site.webmanifest',
  '/manifest.json'
];

// Install event - cache assets
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

// Fetch event - serve from cache if available
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  // Skip API requests
  if (event.request.url.includes('/aggregate')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Clone the response to cache it and return it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
  );
});`;

// ---------------- Web Manifest JSON ----------------
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
  ]
});

// ---------------- Configuration Storage Keys ----------------
const SOURCES_CONFIG_KEY = 'jack.admin.customSources';
const FILTER_CONFIG_KEY = 'jack.admin.filterConfig';
const ADMIN_TOKEN_KEY = 'jack.admin.token';
const USER_PREFS_KEY = 'jack.userPreferences';
const RECENT_SEARCHES_KEY = 'jack.recentSearches';

// ---------------- Admin Configuration System ----------------

// Admin configuration and authentication
const ADMIN_CONFIG = {
  ownerUsername: 'itstanner5216',
  // This hash represents a secure password (replace with proper secure hash in production)
  credentialsHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
};

const ADMIN_SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Default configuration structure for sources
const DEFAULT_SOURCES_CONFIG = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  sources: [
    // Pre-populated with default gay male tube sites
    {
      name: "Homo Tube Videos",
      domain: "homotube.com",
      mode: "all",
      priority: "high",
      enabled: true
    },
    {
      name: "Gay Male Tube",
      domain: "gaymaletube.com",
      mode: "all",
      priority: "high",
      enabled: true
    },
    {
      name: "Boyfriend TV",
      domain: "boyfriendtv.com",
      mode: "all",
      priority: "normal",
      enabled: true
    },
    {
      name: "Man Porn",
      domain: "manporn.xxx",
      mode: "all",
      priority: "normal",
      enabled: true
    },
    {
      name: "Gay Tube",
      domain: "gaytube.com",
      mode: "all",
      priority: "normal",
      enabled: true
    },
    {
      name: "Gay Sex Videos",
      domain: "gaysexvideos.tv",
      mode: "all",
      priority: "normal",
      enabled: true
    },
    {
      name: "Only Dudes TV",
      domain: "onlydudes.tv",
      mode: "all",
      priority: "normal",
      enabled: true
    },
    {
      name: "Red Gay",
      domain: "redgay.net",
      mode: "all",
      priority: "normal",
      enabled: true
    }
  ]
};

// Default filter configuration
const DEFAULT_FILTER_CONFIG = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  
  // Negative terms to filter out unwanted content
  negativeTerms: [
    { id: 'n1', term: 'lesbian', category: 'content', enabled: true },
    { id: 'n2', term: 'female', category: 'content', enabled: true },
    { id: 'n3', term: 'straight sex', category: 'content', enabled: true },
    { id: 'n4', term: 'f/f', category: 'content', enabled: true },
    { id: 'n5', term: 'f/m', category: 'content', enabled: true },
    { id: 'n6', term: 'girl on girl', category: 'content', enabled: true },
    { id: 'n7', term: 'woman', category: 'content', enabled: true }
  ],
  
  // Positive terms to prioritize relevant content
  positiveTerms: [
    { id: 'p1', term: 'gay male', category: 'content', enabled: true },
    { id: 'p2', term: 'men only', category: 'content', enabled: true },
    { id: 'p3', term: 'male gay', category: 'content', enabled: true },
    { id: 'p4', term: 'm/m', category: 'content', enabled: true },
    { id: 'p5', term: 'homo', category: 'content', enabled: true }
  ],
  
  // Filter settings
  settings: {
    filterStrength: 'moderate', // 'light', 'moderate', 'strict'
    confidenceThreshold: 0.7,
    requirePositiveMatch: false,
    prioritizeCustomSources: true
  }
};

// User preferences configuration
const DEFAULT_USER_PREFERENCES = {
  // Search preferences
  defaultMode: "niche",
  defaultFreshness: "y1",
  defaultLimit: 10,
  
  // Display preferences
  displayMode: "list", // "list" or "grid"
  thumbnailSize: "medium", // "small", "medium", "large", "hidden"
  showTags: true,
  showRuntime: true,
  colorTheme: "system", // "light", "dark", "system"
  compactMode: false,
  
  // Advanced settings
  openLinksInNewTab: true,
  enableRecentSearches: true,
  maxRecentSearches: 5,
  
  // Version for migrations
  preferencesVersion: 1
};

// Performance configuration
const DEBOUNCE_DELAY = 300; // ms
const THROTTLE_DELAY = 500; // ms

// Link extraction and optimization utilities
const LINK_EXTRACTION_CONFIG = {
  // Minimum confidence threshold for link extraction
  minConfidence: 0.7,
  
  // Maximum number of retries for failed link extraction
  maxRetries: 2,
  
  // Timeout for link extraction in milliseconds
  timeout: 5000,
  
  // Enabled content types for extraction
  enabledContentTypes: ['video', 'audio', 'image', 'article']
};

// CORS Configuration
const CORS_CONFIG = {
  allowOrigin: "*",
  allowMethods: "GET, POST, OPTIONS",
  allowHeaders: "Content-Type, Authorization, X-Requested-With",
  maxAge: "86400", // Cache preflight results for 24 hours
  allowCredentials: false // Set to true if you need to support credentials
};

// Helper function to add proper CORS headers to responses
function addCorsHeaders(response, options = {}) {
  const headers = response.headers;
  
  // Use default CORS config with any overrides
  const config = { ...CORS_CONFIG, ...options };
  
  // Add standard CORS headers
  headers.set("access-control-allow-origin", config.allowOrigin);
  headers.set("access-control-allow-methods", config.allowMethods);
  headers.set("access-control-allow-headers", config.allowHeaders);
  
  // Add cache duration for preflight requests
  if (config.maxAge) {
    headers.set("access-control-max-age", config.maxAge);
  }
  
  // Allow credentials if specified
  if (config.allowCredentials) {
    headers.set("access-control-allow-credentials", "true");
  }
  
  // Add Vary header for proper caching behavior when origin varies
  if (config.allowOrigin !== "*") {
    headers.set("vary", headers.get("vary") 
      ? headers.get("vary") + ", Origin" 
      : "Origin");
  }
  
  return response;
}

// ---------------- Utility Functions ----------------

// Helper functions
function validateQuery(query, limit) {
  if (!query || query.trim().length < 2) {
    return "Please enter a valid search query (at least 2 characters)";
  }
  
  if (limit && (isNaN(limit) || limit < 3 || limit > 20)) {
    return "Result limit must be between 3 and 20";
  }
  
  return null;
}

// Join path segments, handling trailing slashes correctly
function joinPath(base, path) {
  if (base.endsWith("/")) {
    base = base.slice(0, -1);
  }
  if (path.startsWith("/")) {
    path = path.slice(1);
  }
  return base ? `${base}/${path}` : path;
}

// Secure hash function using Web Crypto API
async function secureHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a unique ID for new terms
function generateId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
}

// Extract domain from URL or site string
function extractDomain(url) {
  try {
    // Try to parse as URL
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (e) {
    // If parsing fails, try simpler extraction
    return url.replace(/^(?:https?:\/\/)?(?:www\.)?([^\/]+).*$/, '$1');
  }
}

// ---------------- Authentication System ----------------

// Verify admin credentials
async function verifyAdminCredentials(username, accessKey) {
  if (username !== ADMIN_CONFIG.ownerUsername) {
    return false;
  }
  
  const hashedInput = await secureHash(accessKey);
  return hashedInput === ADMIN_CONFIG.credentialsHash;
}

// Create secure admin session
function createAdminSession(username) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_EXPIRY);
  
  const sessionData = {
    username,
    expiresAt: expiresAt.toISOString()
  };
  
  localStorage.setItem(ADMIN_TOKEN_KEY, JSON.stringify({
    token,
    data: sessionData
  }));
  
  return { token, expiresAt };
}

// Validate admin session
function validateAdminSession() {
  try {
    const stored = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!stored) return false;
    
    const { token, data } = JSON.parse(stored);
    if (!token || !data) return false;
    
    const { username, expiresAt } = data;
    
    if (username !== ADMIN_CONFIG.ownerUsername) return false;
    if (new Date(expiresAt) < new Date()) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

// ---------------- Configuration Management ----------------

// Load sources configuration
function loadSourcesConfig() {
  try {
    const stored = localStorage.getItem(SOURCES_CONFIG_KEY);
    
    if (!stored) {
      return DEFAULT_SOURCES_CONFIG;
    }
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load sources configuration', error);
    return DEFAULT_SOURCES_CONFIG;
  }
}

// Save sources configuration
function saveSourcesConfig(config) {
  try {
    // Update metadata
    config.lastUpdated = new Date().toISOString();
    
    localStorage.setItem(SOURCES_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Failed to save sources configuration', error);
    return false;
  }
}

// Load filter configuration
function loadFilterConfig() {
  try {
    const stored = localStorage.getItem(FILTER_CONFIG_KEY);
    
    if (!stored) {
      return DEFAULT_FILTER_CONFIG;
    }
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load filter configuration', error);
    return DEFAULT_FILTER_CONFIG;
  }
}

// Save filter configuration
function saveFilterConfig(config) {
  try {
    // Update metadata
    config.lastUpdated = new Date().toISOString();
    
    localStorage.setItem(FILTER_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Failed to save filter configuration', error);
    return false;
  }
}

// User preferences system
function getUserPreferences() {
  try {
    const stored = localStorage.getItem(USER_PREFS_KEY);
    if (!stored) {
      return DEFAULT_USER_PREFERENCES;
    }
    
    const preferences = JSON.parse(stored);
    
    // Handle version migrations
    if (!preferences.preferencesVersion || preferences.preferencesVersion < DEFAULT_USER_PREFERENCES.preferencesVersion) {
      // For future migrations between versions
      preferences.preferencesVersion = DEFAULT_USER_PREFERENCES.preferencesVersion;
    }
    
    // Merge with defaults (in case new options were added)
    return { ...DEFAULT_USER_PREFERENCES, ...preferences };
  } catch (e) {
    console.error('Failed to parse user preferences', e);
    return DEFAULT_USER_PREFERENCES;
  }
}

function saveUserPreferences(preferences) {
  try {
    localStorage.setItem(USER_PREFS_KEY, JSON.stringify(preferences));
    return true;
  } catch (e) {
    console.error('Failed to save user preferences', e);
    return false;
  }
}

// ---------------- Content Filtering System ----------------

// Apply content filters to search results
function applyContentFilters(results, filterConfig) {
  if (!results || !Array.isArray(results)) return [];
  
  // Get active filters
  const negativeTerms = filterConfig.negativeTerms
    .filter(term => term.enabled)
    .map(term => term.term.toLowerCase());
    
  const positiveTerms = filterConfig.positiveTerms
    .filter(term => term.enabled)
    .map(term => term.term.toLowerCase());
  
  // Get filter settings
  const settings = filterConfig.settings || {};
  const filterStrength = settings.filterStrength || 'moderate';
  const confidenceThreshold = parseFloat(settings.confidenceThreshold || 0.7);
  const requirePositiveMatch = settings.requirePositiveMatch || false;
  
  // Process each result
  return results.filter(result => {
    // Combined text for analysis
    const title = (result.title || '').toLowerCase();
    const snippet = (result.snippet || '').toLowerCase();
    const combinedText = `${title} ${snippet}`;
    const domain = (result.site || '').toLowerCase();
    
    // Calculate confidence score
    let score = 0.5; // Start with neutral score
    
    // Check for negative terms
    const hasNegativeTerms = negativeTerms.some(term => {
      // Apply different matching logic based on filter strength
      if (filterStrength === 'strict') {
        // In strict mode, even partial matches are considered
        return combinedText.includes(term);
      } else if (filterStrength === 'moderate') {
        // In moderate mode, check for word boundaries
        const regex = new RegExp(`\\b${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        return regex.test(combinedText);
      } else {
        // In light mode, only exact phrases are filtered
        return combinedText.includes(` ${term} `);
      }
    });
    
    // If has negative terms, reduce score significantly
    if (hasNegativeTerms) {
      score -= 0.4;
    }
    
    // Check for positive terms
    const hasPositiveTerms = positiveTerms.some(term => {
      return combinedText.includes(term);
    });
    
    // If has positive terms, increase score
    if (hasPositiveTerms) {
      score += 0.3;
    }
    
    // Boost score for relevant domains
    if (domain.includes('gay') || domain.includes('male') || domain.includes('men')) {
      score += 0.2;
    }
    
    // Apply additional rules based on filter strength
    if (filterStrength === 'strict') {
      // In strict mode, require positive terms if enabled
      if (requirePositiveMatch && !hasPositiveTerms) {
        return false;
      }
    }
    
    // Store the confidence score in the result for debugging
    result._confidence = score;
    result._filtered = true;
    
    // Compare score against threshold
    return score >= confidenceThreshold;
  });
}

// Optimized link extraction logic
function extractUsableLinks(results, customSources = []) {
  if (!results || !Array.isArray(results)) return [];
  
  // Combine trusted domains from customSources with default ones
  const trustedDomains = [
    'homotube.com',
    'gaymaletube.com',
    'boyfriendtv.com',
    'manporn.xxx',
    'pornmd.com',
    'gaytube.com',
    'gaysexvideos.tv',
    'hellomorningstarrs.com',
    'onlydudes.tv',
    'redgay.net',
    'eporner.com',
    'gayforfans.com',
    'youngsfun.com',
    'redtube.com',
    'gotgayporn.com',
    'tubegalore.com',
    'manhub.com',
    'txxx.com',
    ...customSources.map(source => source.domain)
  ];
  
  // Enhanced link extraction with confidence scoring
  return results.map(result => {
    // Original result
    const original = { ...result };
    
    // Confidence scoring for link quality
    let confidenceScore = 0;
    
    // Check if URL is from trusted domain
    const domain = result.site?.toLowerCase() || '';
    const isTrustedDomain = trustedDomains.some(td => domain.includes(td));
    if (isTrustedDomain) confidenceScore += 0.5;
    
    // Check if URL appears valid (basic validation)
    const hasValidUrl = result.url && /^https?:\/\/.+/.test(result.url);
    if (hasValidUrl) confidenceScore += 0.3;
    
    // Check if content has necessary metadata
    const hasMetadata = result.title && result.thumbnail;
    if (hasMetadata) confidenceScore += 0.2;
    
    // Boost confidence for sites with explicit gay male content
    if (domain.includes('gay') || domain.includes('male') || domain.includes('homo')) {
      confidenceScore += 0.3;
    }

    // Check URL for relevance indicators
    if (result.url && (
      result.url.includes('/gay/') || 
      result.url.includes('/male/') || 
      result.url.includes('/men/')
    )) {
      confidenceScore += 0.2;
    }

    // Check title for relevance
    if (result.title && (
      result.title.toLowerCase().includes('gay') || 
      result.title.toLowerCase().includes('male')
    )) {
      confidenceScore += 0.2;
    }

    // Reduce confidence for potentially irrelevant content
    if (result.title && (
      result.title.toLowerCase().includes('female') || 
      result.title.toLowerCase().includes('lesbian') ||
      result.title.toLowerCase().includes('straight')
    )) {
      confidenceScore -= 0.4;
    }
    
    // Apply link optimization filters
    if (confidenceScore >= LINK_EXTRACTION_CONFIG.minConfidence) {
      // URL cleanup and normalization
      let url = result.url;
      
      // Fix common URL issues
      if (url && !url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      // Remove tracking parameters
      try {
        const urlObj = new URL(url);
        ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source'].forEach(param => {
          urlObj.searchParams.delete(param);
        });
        url = urlObj.toString();
      } catch (e) {
        // URL parsing failed, use original
      }
      
      // Update the result with optimized URL
      result.url = url;
      
      // Add confidence metadata for debugging
      result._confidence = confidenceScore;
      result._optimized = true;
      
      return result;
    }
    
    // If confidence is too low, return original result
    return original;
  });
}

// ---------------- API Documentation Endpoint ----------------

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
  "version": "1.0.0",
  "timestamp": "2025-08-29T00:15:22Z"
}</code></pre>

    <h2>Usage Limits</h2>
    <p>
      The API currently does not implement strict rate limiting, but excessive usage may be restricted.
      For high-volume applications, please implement reasonable request throttling.
    </p>
    
    <h2>CORS Support</h2>
    <p>
      All API endpoints support Cross-Origin Resource Sharing (CORS) with the following headers:
    </p>
    <pre><code>Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400</code></pre>
    
    <h2>Caching Behavior</h2>
    <p>
      Results are cached for 1 hour by default to improve performance and reduce load.
      Use the <code>nocache=1</code> parameter to bypass the cache for time-sensitive queries.
    </p>
    
    <div class="version-info">
      <p>API Version: 1.0.0 | Last Updated: August 2025</p>
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

// ---------------- Admin Panel HTML ----------------

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
        return;
      }
      
      sourcesList.innerHTML = filteredSources.map((source, index) => `
        <div class="list-item ${!source.enabled ? 'item-disabled' : ''}" data-index="${index}">
          <div class="item-content">
            <div class="item-primary">${source.name}</div>
            <div class="item-secondary">
              ${source.domain}
              <span class="item-badge ${source.mode === 'all' ? 'content' : 'source'}">${source.mode === 'all' ? 'All Modes' : source.mode}</span>
              ${source.priority ? `<span class="item-badge">${source.priority} priority</span>` : ''}
            </div>
          </div>
          <div class="item-actions">
            <button class="remove-source-btn danger" data-index="${index}">Remove</button>
            <button class="toggle-source-btn ${source.enabled ? '' : 'secondary'}" data-index="${index}">
              ${source.enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      `).join('');
      
      // Add event listeners
      document.querySelectorAll('.remove-source-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index, 10);
          removeSource(index);
        });
      });
      
      document.querySelectorAll('.toggle-source-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index, 10);
          toggleSource(index);
        });
      });
    }
    
    function saveAndRenderSources() {
      const config = loadSourcesConfig();
      config.sources = currentSources;
      saveSourcesConfig(config);
      renderSources();
      updateCounters();
    }
    
    function addSource(name, domain, mode, priority, enabled) {
      // Basic domain validation
      domain = domain.toLowerCase().trim();
      if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(domain)) {
        showAdminNotification('Please enter a valid domain (e.g., example.com)', true);
        return false;
      }
      
      const newSource = {
        name,
        domain,
        mode,
        priority: priority || 'normal',
        enabled: enabled === 'true' || enabled === true
      };
      
      currentSources.push(newSource);
      saveAndRenderSources();
      showAdminNotification(`Added source: ${name}`, false);
      return true;
    }
    
    function removeSource(index) {
      if (confirm('Are you sure you want to remove this source?')) {
        const name = currentSources[index].name;
        currentSources.splice(index, 1);
        saveAndRenderSources();
        showAdminNotification(`Removed source: ${name}`, false);
      }
    }
    
    function toggleSource(index) {
      currentSources[index].enabled = !currentSources[index].enabled;
      const status = currentSources[index].enabled ? 'Enabled' : 'Disabled';
      const name = currentSources[index].name;
      saveAndRenderSources();
      showAdminNotification(`${status} source: ${name}`, false);
    }
    
    // Filter terms management
    function loadFilterConfig() {
      try {
        const config = loadFilterConfig();
        currentNegativeTerms = config.negativeTerms || [];
        currentPositiveTerms = config.positiveTerms || [];
        currentFilterSettings = config.settings || {};
        
        renderNegativeTerms();
        renderPositiveTerms();
        renderFilterSettings();
        
        return true;
      } catch (error) {
        showAdminNotification(error.message || 'Failed to load filter configuration', true);
        return false;
      }
    }
    
    function renderNegativeTerms(searchTerm = '') {
      let filteredTerms = currentNegativeTerms;
      
      // Apply search filter if provided
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filteredTerms = currentNegativeTerms.filter(term => 
          term.term.toLowerCase().includes(search)
        );
      }
      
      if (filteredTerms.length === 0) {
        negativeTermsList.innerHTML = `
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <h4>No negative terms found</h4>
            <p>Add terms to filter out unwanted content</p>
          </div>
        `;
        return;
      }
      
      negativeTermsList.innerHTML = filteredTerms.map((term, index) => `
        <div class="list-item ${!term.enabled ? 'item-disabled' : ''}" data-index="${index}">
          <div class="item-content">
            <div class="item-primary">${term.term}</div>
            <div class="item-secondary">
              <span class="item-badge ${term.category}">${term.category}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="remove-negative-btn danger" data-index="${index}">Remove</button>
            <button class="toggle-negative-btn ${term.enabled ? '' : 'secondary'}" data-index="${index}">
              ${term.enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      `).join('');
      
      // Add event listeners
      document.querySelectorAll('.remove-negative-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index, 10);
          removeNegativeTerm(index);
        });
      });
      
      document.querySelectorAll('.toggle-negative-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index, 10);
          toggleNegativeTerm(index);
        });
      });
    }
    
    function renderPositiveTerms(searchTerm = '') {
      let filteredTerms = currentPositiveTerms;
      
      // Apply search filter if provided
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filteredTerms = currentPositiveTerms.filter(term => 
          term.term.toLowerCase().includes(search)
        );
      }
      
      if (filteredTerms.length === 0) {
        positiveTermsList.innerHTML = `
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <h4>No positive terms found</h4>
            <p>Add terms to prioritize relevant content</p>
          </div>
        `;
        return;
      }
      
      positiveTermsList.innerHTML = filteredTerms.map((term, index) => `
        <div class="list-item ${!term.enabled ? 'item-disabled' : ''}" data-index="${index}">
          <div class="item-content">
            <div class="item-primary">${term.term}</div>
            <div class="item-secondary">
              <span class="item-badge ${term.category}">${term.category}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="remove-positive-btn danger" data-index="${index}">Remove</button>
            <button class="toggle-positive-btn ${term.enabled ? '' : 'secondary'}" data-index="${index}">
              ${term.enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      `).join('');
      
      // Add event listeners
      document.querySelectorAll('.remove-positive-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index, 10);
          removePositiveTerm(index);
        });
      });
      
      document.querySelectorAll('.toggle-positive-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index, 10);
          togglePositiveTerm(index);
        });
      });
    }
    
    function renderFilterSettings() {
      // Update UI to reflect current settings
      document.getElementById('filter-strength').value = currentFilterSettings.filterStrength || 'moderate';
      document.getElementById('confidence-threshold').value = currentFilterSettings.confidenceThreshold || '0.7';
      document.getElementById('require-positive-match').checked = currentFilterSettings.requirePositiveMatch || false;
      document.getElementById('prioritize-custom-sources').checked = currentFilterSettings.prioritizeCustomSources !== false; // Default to true
    }
    
    function saveFilterConfigToStorage() {
      const config = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        negativeTerms: currentNegativeTerms,
        positiveTerms: currentPositiveTerms,
        settings: currentFilterSettings
      };
      
      saveFilterConfig(config);
      updateCounters();
    }
    
    function addNegativeTerm(term, category) {
      if (!term || term.trim() === '') {
        showAdminNotification('Please enter a valid term', true);
        return false;
      }
      
      const newTerm = {
        id: generateId('n'),
        term: term.trim(),
        category: category || 'content',
        enabled: true
      };
      
      currentNegativeTerms.push(newTerm);
      saveFilterConfigToStorage();
      renderNegativeTerms();
      showAdminNotification(`Added negative term: ${term}`, false);
      return true;
    }
    
    function removeNegativeTerm(index) {
      if (confirm('Are you sure you want to remove this term?')) {
        const term = currentNegativeTerms[index].term;
        currentNegativeTerms.splice(index, 1);
        saveFilterConfigToStorage();
        renderNegativeTerms();
        showAdminNotification(`Removed negative term: ${term}`, false);
      }
    }
    
    function toggleNegativeTerm(index) {
      currentNegativeTerms[index].enabled = !currentNegativeTerms[index].enabled;
      const status = currentNegativeTerms[index].enabled ? 'Enabled' : 'Disabled';
      const term = currentNegativeTerms[index].term;
      saveFilterConfigToStorage();
      renderNegativeTerms();
      showAdminNotification(`${status} negative term: ${term}`, false);
    }
    
    function addPositiveTerm(term, category) {
      if (!term || term.trim() === '') {
        showAdminNotification('Please enter a valid term', true);
        return false;
      }
      
      const newTerm = {
        id: generateId('p'),
        term: term.trim(),
        category: category || 'content',
        enabled: true
      };
      
      currentPositiveTerms.push(newTerm);
      saveFilterConfigToStorage();
      renderPositiveTerms();
      showAdminNotification(`Added positive term: ${term}`, false);
      return true;
    }
    
    function removePositiveTerm(index) {
      if (confirm('Are you sure you want to remove this term?')) {
        const term = currentPositiveTerms[index].term;
        currentPositiveTerms.splice(index, 1);
        saveFilterConfigToStorage();
        renderPositiveTerms();
        showAdminNotification(`Removed positive term: ${term}`, false);
      }
    }
    
    function togglePositiveTerm(index) {
      currentPositiveTerms[index].enabled = !currentPositiveTerms[index].enabled;
      const status = currentPositiveTerms[index].enabled ? 'Enabled' : 'Disabled';
      const term = currentPositiveTerms[index].term;
      saveFilterConfigToStorage();
      renderPositiveTerms();
      showAdminNotification(`${status} positive term: ${term}`, false);
    }
    
    function saveFilterSettings() {
      currentFilterSettings = {
        filterStrength: document.getElementById('filter-strength').value,
        confidenceThreshold: parseFloat(document.getElementById('confidence-threshold').value),
        requirePositiveMatch: document.getElementById('require-positive-match').checked,
        prioritizeCustomSources: document.getElementById('prioritize-custom-sources').checked
      };
      
      saveFilterConfigToStorage();
      showAdminNotification('Filter settings saved successfully', false);
    }
    
    function resetFilterSettings() {
      if (confirm('Are you sure you want to reset all filter settings to default?')) {
        currentFilterSettings = DEFAULT_FILTER_CONFIG.settings;
        renderFilterSettings();
        saveFilterConfigToStorage();
        showAdminNotification('Filter settings reset to defaults', false);
      }
    }
    
    // Bulk operations
    function generateExport() {
      try {
        const exportSources = document.getElementById('export-sources').checked;
        const exportFilters = document.getElementById('export-filters').checked;
        const exportSettings = document.getElementById('export-settings').checked;
        
        if (!exportSources && !exportFilters && !exportSettings) {
          showAdminNotification('Please select at least one component to export', true);
          return;
        }
        
        const exportData = {
          version: 1,
          exportDate: new Date().toISOString(),
          creator: ADMIN_CONFIG.ownerUsername
        };
        
        if (exportSources) {
          exportData.sources = currentSources;
        }
        
        if (exportFilters || exportSettings) {
          exportData.filterConfig = {};
          
          if (exportFilters) {
            exportData.filterConfig.negativeTerms = currentNegativeTerms;
            exportData.filterConfig.positiveTerms = currentPositiveTerms;
          }
          
          if (exportSettings) {
            exportData.filterConfig.settings = currentFilterSettings;
          }
        }
        
        exportJson.value = JSON.stringify(exportData, null, 2);
        showAdminNotification('Export generated successfully', false);
        
      } catch (error) {
        showAdminNotification('Export failed: ' + error.message, true);
      }
    }
    
    function copyExportToClipboard() {
      try {
        exportJson.select();
        document.execCommand('copy');
        showAdminNotification('Copied to clipboard', false);
      } catch (error) {
        showAdminNotification('Copy failed: ' + error.message, true);
        // Fallback method
        const textarea = document.createElement('textarea');
        textarea.value = exportJson.value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    }
    
    function validateImportJson() {
      try {
        const jsonText = importJson.value.trim();
        if (!jsonText) {
          throw new Error('Please enter configuration JSON');
        }
        
        const data = JSON.parse(jsonText);
        
        if (!data.version) {
          throw new Error('Invalid configuration format: missing version');
        }
        
        // Check each section
        if (data.sources && !Array.isArray(data.sources)) {
          throw new Error('Invalid sources format: must be an array');
        }
        
        if (data.filterConfig) {
          if (data.filterConfig.negativeTerms && !Array.isArray(data.filterConfig.negativeTerms)) {
            throw new Error('Invalid negative terms format: must be an array');
          }
          
          if (data.filterConfig.positiveTerms && !Array.isArray(data.filterConfig.positiveTerms)) {
            throw new Error('Invalid positive terms format: must be an array');
          }
          
          if (data.filterConfig.settings && typeof data.filterConfig.settings !== 'object') {
            throw new Error('Invalid settings format: must be an object');
          }
        }
        
        showAdminNotification('JSON validation successful', false);
        return true;
      } catch (error) {
        showAdminNotification('Validation failed: ' + error.message, true);
        return false;
      }
    }
    
    function importConfiguration() {
      try {
        if (!validateImportJson()) {
          return;
        }
        
        const data = JSON.parse(importJson.value.trim());
        const importSources = document.getElementById('import-sources').checked;
        const importFilters = document.getElementById('import-filters').checked;
        const importSettings = document.getElementById('import-settings').checked;
        
        if (!importSources && !importFilters && !importSettings) {
          showAdminNotification('Please select at least one component to import', true);
          return;
        }
        
        // Import sources
        if (importSources && data.sources) {
          if (confirm(`Import ${data.sources.length} sources? This will overwrite any existing sources with the same domain.`)) {
            // Merge with existing sources by domain
            const domainMap = new Map();
            
            // Add existing sources to map
            currentSources.forEach(source => {
              domainMap.set(source.domain, source);
            });
            
            // Add or replace with imported sources
            data.sources.forEach(source => {
              domainMap.set(source.domain, source);
            });
            
            // Convert map back to array
            currentSources = Array.from(domainMap.values());
            saveAndRenderSources();
          }
        }
        
        // Import filter configuration
        if (data.filterConfig) {
          // Import negative terms
          if (importFilters && data.filterConfig.negativeTerms) {
            if (confirm(`Import ${data.filterConfig.negativeTerms.length} negative terms? This will merge with your existing terms.`)) {
              // Create a set of existing terms to avoid duplicates
              const existingTerms = new Set(currentNegativeTerms.map(t => t.term.toLowerCase()));
              
              // Add new terms that don't already exist
              data.filterConfig.negativeTerms.forEach(term => {
                if (!existingTerms.has(term.term.toLowerCase())) {
                  // Ensure the term has an ID
                  if (!term.id) {
                    term.id = generateId('n');
                  }
                  currentNegativeTerms.push(term);
                  existingTerms.add(term.term.toLowerCase());
                }
              });
              
              renderNegativeTerms();
            }
          }
          
          // Import positive terms
          if (importFilters && data.filterConfig.positiveTerms) {
            if (confirm(`Import ${data.filterConfig.positiveTerms.length} positive terms? This will merge with your existing terms.`)) {
              // Create a set of existing terms to avoid duplicates
              const existingTerms = new Set(currentPositiveTerms.map(t => t.term.toLowerCase()));
              
              // Add new terms that don't already exist
              data.filterConfig.positiveTerms.forEach(term => {
                if (!existingTerms.has(term.term.toLowerCase())) {
                  // Ensure the term has an ID
                  if (!term.id) {
                    term.id = generateId('p');
                  }
                  currentPositiveTerms.push(term);
                  existingTerms.add(term.term.toLowerCase());
                }
              });
              
              renderPositiveTerms();
            }
          }
          
          // Import settings
          if (importSettings && data.filterConfig.settings) {
            if (confirm('Import filter settings? This will overwrite your existing settings.')) {
              currentFilterSettings = { ...currentFilterSettings, ...data.filterConfig.settings };
              renderFilterSettings();
            }
          }
          
          // Save changes
          saveFilterConfigToStorage();
        }
        
        showAdminNotification('Import completed successfully', false);
        updateCounters();
        
      } catch (error) {
        showAdminNotification('Import failed: ' + error.message, true);
      }
    }
    
    // Search functionality for lists
    function setupSearchListeners() {
      // Source search
      searchSources.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        renderSources(searchTerm);
      });
      
      // Negative terms search
      searchNegative.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        renderNegativeTerms(searchTerm);
      });
      
      // Positive terms search
      searchPositive.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        renderPositiveTerms(searchTerm);
      });
    }
    
    // Event listeners
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const accessKey = document.getElementById('accessKey').value;
      
      await login(username, accessKey);
    });
    
    logoutBtn.addEventListener('click', () => {
      logout();
    });
    
    sourceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const success = addSource(
        document.getElementById('source-name').value,
        document.getElementById('source-domain').value,
        document.getElementById('source-mode').value,
        document.getElementById('source-priority').value,
        'true' // Enabled by default
      );
      
      if (success) {
        // Reset form
        document.getElementById('source-name').value = '';
        document.getElementById('source-domain').value = '';
        document.getElementById('source-mode').value = 'all';
        document.getElementById('source-priority').value = 'normal';
      }
    });
    
    negativeTermForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const success = addNegativeTerm(
        document.getElementById('negative-term').value,
        document.getElementById('negative-category').value
      );
      
      if (success) {
        // Reset form
        document.getElementById('negative-term').value = '';
        document.getElementById('negative-category').value = 'content';
      }
    });
    
    positiveTermForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const success = addPositiveTerm(
        document.getElementById('positive-term').value,
        document.getElementById('positive-category').value
      );
      
      if (success) {
        // Reset form
        document.getElementById('positive-term').value = '';
        document.getElementById('positive-category').value = 'content';
      }
    });
    
    exportBtn.addEventListener('click', () => {
      generateExport();
    });
    
    copyExportBtn.addEventListener('click', () => {
      copyExportToClipboard();
    });
    
    validateImportBtn.addEventListener('click', () => {
      validateImportJson();
    });
    
    importBtn.addEventListener('click', () => {
      importConfiguration();
    });
    
    saveSettingsBtn.addEventListener('click', () => {
      saveFilterSettings();
    });
    
    resetSettingsBtn.addEventListener('click', () => {
      resetFilterSettings();
    });
    
    // Initialize
    checkSession();
    setupSearchListeners();
  </script>
</body>
</html>`;

// ---------------- Main UI HTML ----------------
const PORTAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=yes" />
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
      --bg: #0b0b0c;
      --panel: #12131a;
      --panel-2: #17181e;
      --panel-3: #1c1d26;
      --accent: #7f5af0;
      --text: #e2e2e3;
      --muted: #9c9cb0;
      --good: #2cb67d;
      --bad: #ef4444;
      --radius: 8px;
      --max-width: 800px;
      --mobile-breakpoint: 640px;
      --small-breakpoint: 480px;
      --desktop-padding: 30px;
      --mobile-padding: 16px;
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
      width: 100%;
      max-width: var(--max-width);
      margin: 0 auto;
      padding: var(--desktop-padding);
      box-sizing: border-box;
    }
    h2.title {
      font-weight: 600;
      margin: 0;
      margin-bottom: 16px;
      color: var(--text);
    }
    h3 {
      font-weight: 600;
      margin: 0;
      margin-bottom: 8px;
      color: var(--text);
      font-size: 16px;
    }
    a {
      color: var(--accent);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    label {
      display: block;
      font-size: 14px;
      margin-bottom: 6px;
      color: var(--muted);
    }
    input, select {
      width: 100%;
      padding: 10px 14px;
      background: var(--panel);
      border: 1px solid #1f2024;
      border-radius: var(--radius);
      color: var(--text);
      font-size: 15px;
      margin-bottom: 16px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus, select:focus {
      border-color: var(--accent);
      outline: none;
      box-shadow: 0 0 0 2px rgba(127, 90, 240, 0.2);
    }
    button {
      padding: 10px 20px;
      background: var(--accent);
      color: var(--text);
      border: none;
      border-radius: var(--radius);
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: filter 0.2s, transform 0.1s;
    }
    button:hover {
      filter: brightness(1.1);
    }
    button:active {
      transform: translateY(1px);
    }
    button.secondary {
      background: var(--panel-2);
      margin-left: 8px;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .actions {
      display: flex;
      margin-bottom: 24px;
    }
    .muted {
      color: var(--muted);
      font-size: 14px;
    }
    .result {
      margin-bottom: 16px;
      padding: 16px;
      background: var(--panel);
      border-radius: var(--radius);
      display: flex;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .result:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .thumb {
      width: 180px;
      height: 100px;
      background: var(--panel-2);
      border-radius: calc(var(--radius) - 2px);
      margin-right: 16px;
      flex-shrink: 0;
      background-size: cover;
      background-position: center;
      overflow: hidden;
    }
    .info {
      flex: 1;
      min-width: 0;
    }
    .title {
      font-weight: 600;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .site {
      color: var(--muted);
      font-size: 14px;
      margin-bottom: 8px;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .tag {
      padding: 3px 8px;
      border-radius: 12px;
      background: var(--panel-2);
      color: var(--muted);
      font-size: 12px;
    }
    .monospace {
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 13px;
      white-space: pre-wrap;
      margin-top: 20px;
      padding: 12px;
      background: var(--panel);
      border-radius: var(--radius);
      overflow: auto;
      max-height: 400px;
    }
    .status {
      margin-left: 12px;
      font-size: 14px;
      color: var(--muted);
    }
    .hide {
      display: none;
    }
    .search-indicators {
      margin-top: 15px;
      padding: 12px;
      background: var(--panel-2);
      border-radius: var(--radius);
      border: 1px solid #1f2024;
      display: none;
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
    .chip {
      display: inline-block;
      padding: 4px 10px;
      background: var(--panel-2);
      border-radius: 16px;
      margin: 0 6px 6px 0;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .chip:hover {
      background: var(--panel-3);
    }
    .recent-searches {
      margin-top: 15px;
      display: none;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      margin-top: 8px;
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
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
    :focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    
    /* Modal styles */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      overflow-y: auto;
      padding: 20px;
      box-sizing: border-box;
      backdrop-filter: blur(3px);
    }
    
    .modal.show {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .modal-content {
      background: var(--panel);
      border-radius: var(--radius);
      max-width: 560px;
      width: 100%;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      animation: modalFadeIn 0.3s;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    
    @keyframes modalFadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .modal-header {
      padding: 16px;
      border-bottom: 1px solid var(--panel-3);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-header h3 {
      margin: 0;
      font-size: 18px;
    }
    
    .close-button {
      background: none;
      border: none;
      color: var(--muted);
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    
    .modal-body {
      padding: 16px;
      max-height: 70vh;
      overflow-y: auto;
    }
    
    .modal-footer {
      padding: 16px;
      border-top: 1px solid var(--panel-3);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    
    /* Tabs */
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--panel-3);
      margin-bottom: 16px;
      overflow-x: auto;
      scrollbar-width: thin;
    }
    
    .tab-button {
      background: none;
      border: none;
      color: var(--muted);
      padding: 8px 16px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      font-size: 14px;
      margin: 0;
      white-space: nowrap;
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
    
    /* Preference items */
    .preference-group {
      margin-bottom: 24px;
    }
    
    .preference-group h4 {
      font-size: 15px;
      margin: 0 0 12px 0;
      color: var(--text);
    }
    
    .preference-item {
      margin-bottom: 12px;
    }
    
    .preference-item label {
      display: block;
      margin-bottom: 4px;
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    
    .checkbox-label input {
      margin-right: 8px;
      width: auto;
    }
    
    /* Grid view styles */
    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }
    
    .results-grid .result {
      flex-direction: column;
    }
    
    .results-grid .thumb {
      width: 100%;
      height: 140px;
      margin-right: 0;
      margin-bottom: 12px;
    }
    
    /* Thumbnail sizes */
    .thumb-small {
      width: 120px !important;
      height: 67px !important;
    }
    
    .thumb-large {
      width: 240px !important;
      height: 135px !important;
    }
    
    .thumb-hidden {
      display: none !important;
    }
    
    /* Compact mode */
    .compact-mode .result {
      padding: 10px;
      margin-bottom: 10px;
    }
    
    .compact-mode .thumb {
      height: 80px;
    }
    
    .compact-mode .title {
      font-size: 14px;
    }
    
    .compact-mode .site {
      font-size: 12px;
      margin-bottom: 4px;
    }
    
    .compact-mode .tags .tag {
      padding: 2px 6px;
      font-size: 10px;
    }
    
    /* User preferences button */
    .user-preferences-button {
      display: inline-flex;
      align-items: center;
      margin-left: 8px;
      padding: 4px 8px;
      font-size: 13px;
    }
    
    .user-preferences-button svg {
      margin-right: 6px;
      width: 16px;
      height: 16px;
    }
    
    /* Theme styles */
    .theme-light {
      --bg: #f5f5f7;
      --panel: #ffffff;
      --panel-2: #f0f0f2;
      --panel-3: #e5e5e7;
      --text: #1c1c1e;
      --muted: #6b6b70;
    }
    
    .theme-dark {
      --bg: #0b0b0c;
      --panel: #12131a;
      --panel-2: #17181e;
      --panel-3: #1c1d26;
      --text: #e2e2e3;
      --muted: #9c9cb0;
    }
    
    /* Animations */
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    
    .skeleton {
      animation: pulse 1.5s ease-in-out infinite;
      background: var(--panel-2);
      border-radius: var(--radius);
    }
    
    /* Toast notifications */
    .toast-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
    }
    
    .toast {
      background: var(--panel);
      color: var(--text);
      padding: 12px 16px;
      border-radius: var(--radius);
      margin-top: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      max-width: 300px;
      animation: toastIn 0.3s forwards;
    }
    
    .toast.hiding {
      animation: toastOut 0.3s forwards;
    }
    
    .toast svg {
      margin-right: 12px;
      flex-shrink: 0;
    }
    
    .toast.success svg {
      color: var(--good);
    }
    
    .toast.error svg {
      color: var(--bad);
    }
    
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes toastOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(20px); }
    }
    
    /* Media queries for responsive design */
    @media (max-width: 640px) {
      .container {
        padding: var(--mobile-padding);
      }
      h2.title {
        font-size: 20px;
      }
      .actions {
        flex-direction: column;
        align-items: stretch;
      }
      .actions button {
        width: 100%;
        margin-right: 0;
        margin-bottom: 10px;
        margin-left: 0;
      }
      button.secondary {
        margin-left: 0;
        margin-top: 8px;
      }
      input, select {
        font-size: 16px; /* Prevents iOS zoom on focus */
      }
      .result {
        flex-direction: column;
      }
      .thumb {
        width: 100%;
        height: 120px;
        margin-right: 0;
        margin-bottom: 12px;
      }
      .status {
        display: block;
        margin-left: 0;
        margin-top: 8px;
      }
      .modal-content {
        width: calc(100% - 20px);
      }
    }
    
    /* Dark mode optimizations */
    @media (prefers-color-scheme: dark) {
      :root {
        color-scheme: dark;
      }
    }
    
    /* Reduced motion preferences */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    
    /* Skip to content for accessibility */
    .skip-link {
          /* Skip to content for accessibility */
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--accent);
      color: white;
      padding: 8px;
      z-index: 100;
      transition: top 0.3s;
    }
    
    .skip-link:focus {
      top: 0;
    }
    
    /* Print styles */
    @media print {
      body {
        background: white;
        color: black;
      }
      .container {
        max-width: 100%;
        padding: 0;
      }
      .actions, #debugToggle, .search-indicators, .recent-searches, #preferences-modal {
        display: none !important;
      }
      .result {
        break-inside: avoid;
        page-break-inside: avoid;
        border: 1px solid #ddd;
        margin-bottom: 15px;
      }
      a[href]:after {
        content: " (" attr(href) ")";
        font-size: 90%;
        color: #333;
      }
    }
  </style>
</head>
<body>
  <a href="#results" class="skip-link">Skip to content</a>
  <div class="container">
    <h2 class="title">Jack Portal</h2>
    
    <div id="error-container" class="error-message" role="alert"></div>
    
    <form id="searchForm" role="search" aria-label="Content search">
      <div>
        <label for="q" id="query-label">Query</label>
        <input id="q" type="search" placeholder="Type a query" aria-labelledby="query-label" required autocomplete="off" />
      </div>
      
      <div>
        <label for="mode" id="mode-label">Mode</label>
        <select id="mode" aria-labelledby="mode-label">
          <option value="niche">Niche</option>
          <option value="keywords">Keywords</option>
          <option value="deep_niche">Deep niche</option>
          <option value="forums">Forums</option>
          <option value="tumblrish">Tumblrish</option>
        </select>
      </div>
      
      <div>
        <label for="fresh" id="fresh-label">Freshness</label>
        <select id="fresh" aria-labelledby="fresh-label">
          <option value="d7">7 days</option>
          <option value="m1">1 month</option>
          <option value="m3">3 months</option>
          <option value="y1" selected>1 year</option>
          <option value="all">All time</option>
        </select>
      </div>
      
      <div class="actions">
        <button id="goBtn" type="submit" aria-label="Search content">Search</button>
        <button type="button" id="historyBtn" class="secondary">History</button>
        <button type="button" id="preferencesBtn" class="secondary user-preferences-button">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Preferences
        </button>
        <button type="button" id="cancel-search-btn" class="secondary hide">Cancel</button>
      </div>
    </form>
    
    <div id="search-indicators" class="search-indicators">
      <div class="muted">Searching...</div>
      <div class="progress">
        <div id="progress-bar" class="progress-bar"></div>
      </div>
    </div>
    
    <div id="recent-searches" class="recent-searches">
      <h3>Recent Searches</h3>
      <div id="recent-chips" class="chips"></div>
    </div>
    
    <div id="results"></div>
    
    <div id="debug" class="monospace hide"></div>
    
    <!-- Preferences Modal -->
    <div id="preferences-modal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Preferences</h3>
          <button type="button" class="close-button" id="close-preferences">&times;</button>
        </div>
        <div class="modal-body">
          <div class="tabs">
            <button class="tab-button active" data-tab="display">Display</button>
            <button class="tab-button" data-tab="search">Search</button>
            <button class="tab-button" data-tab="advanced">Advanced</button>
          </div>
          
          <div class="tab-content active" id="display-tab">
            <div class="preference-group">
              <h4>Appearance</h4>
              <div class="preference-item">
                <label for="pref-color-theme">Theme</label>
                <select id="pref-color-theme">
                  <option value="system">System Default</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div class="preference-item">
                <label for="pref-display-mode">Results Layout</label>
                <select id="pref-display-mode">
                  <option value="list">List View</option>
                  <option value="grid">Grid View</option>
                </select>
              </div>
              <div class="preference-item">
                <label class="checkbox-label">
                  <input type="checkbox" id="pref-compact-mode">
                  Compact Mode
                </label>
              </div>
            </div>
            
            <div class="preference-group">
              <h4>Thumbnails</h4>
              <div class="preference-item">
                <label for="pref-thumbnail-size">Thumbnail Size</label>
                <select id="pref-thumbnail-size">
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </div>
            
            <div class="preference-group">
              <h4>Content Display</h4>
              <div class="preference-item">
                <label class="checkbox-label">
                  <input type="checkbox" id="pref-show-tags">
                  Show Tags
                </label>
              </div>
              <div class="preference-item">
                <label class="checkbox-label">
                  <input type="checkbox" id="pref-show-runtime">
                  Show Runtime
                </label>
              </div>
            </div>
          </div>
          
          <div class="tab-content" id="search-tab">
            <div class="preference-group">
              <h4>Default Search Settings</h4>
              <div class="preference-item">
                <label for="pref-default-mode">Default Mode</label>
                <select id="pref-default-mode">
                  <option value="niche">Niche</option>
                  <option value="keywords">Keywords</option>
                  <option value="deep_niche">Deep niche</option>
                  <option value="forums">Forums</option>
                  <option value="tumblrish">Tumblrish</option>
                </select>
              </div>
              <div class="preference-item">
                <label for="pref-default-freshness">Default Freshness</label>
                <select id="pref-default-freshness">
                  <option value="d7">7 days</option>
                  <option value="m1">1 month</option>
                  <option value="m3">3 months</option>
                  <option value="y1">1 year</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <div class="preference-item">
                <label for="pref-default-limit">Results Per Page</label>
                <select id="pref-default-limit">
                  <option value="5">5 results</option>
                  <option value="10">10 results</option>
                  <option value="15">15 results</option>
                  <option value="20">20 results</option>
                </select>
              </div>
            </div>
            
            <div class="preference-group">
              <h4>Recent Searches</h4>
              <div class="preference-item">
                <label class="checkbox-label">
                  <input type="checkbox" id="pref-enable-recent-searches">
                  Enable Recent Searches
                </label>
              </div>
              <div class="preference-item">
                <label for="pref-max-recent-searches">Maximum Recent Searches</label>
                <select id="pref-max-recent-searches">
                  <option value="3">3 searches</option>
                  <option value="5">5 searches</option>
                  <option value="10">10 searches</option>
                  <option value="20">20 searches</option>
                </select>
              </div>
              <div class="preference-item">
                <button type="button" id="clear-recent-searches" class="secondary">Clear Search History</button>
              </div>
            </div>
          </div>
          
          <div class="tab-content" id="advanced-tab">
            <div class="preference-group">
              <h4>Browser Behavior</h4>
              <div class="preference-item">
                <label class="checkbox-label">
                  <input type="checkbox" id="pref-open-links-in-new-tab">
                  Open Links in New Tab
                </label>
              </div>
            </div>
            
            <div class="preference-group">
              <h4>Content Filtering</h4>
              <div class="preference-item">
                <label for="pref-filter-strength">Filter Strength</label>
                <select id="pref-filter-strength">
                  <option value="light">Light (Less Filtering)</option>
                  <option value="moderate">Moderate (Balanced)</option>
                  <option value="strict">Strict (More Filtering)</option>
                </select>
              </div>
              <div class="preference-item">
                <label class="checkbox-label">
                  <input type="checkbox" id="pref-apply-filters">
                  Apply Content Filters
                </label>
              </div>
            </div>
            
            <div class="preference-group">
              <h4>Debug Options</h4>
              <div class="preference-item">
                <button type="button" id="debugToggle" class="secondary">Toggle Debug Panel</button>
              </div>
            </div>
            
            <div class="preference-group">
              <h4>Data Management</h4>
              <div class="preference-item">
                <button type="button" id="reset-preferences" class="secondary">Reset All Preferences</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" id="save-preferences">Save Preferences</button>
          <button type="button" id="cancel-preferences" class="secondary">Cancel</button>
        </div>
      </div>
    </div>
    
    <!-- Toast Container -->
    <div id="toast-container" class="toast-container"></div>
  </div>
  
  <script>
    // DOM elements
    const searchForm = document.getElementById('searchForm');
    const qEl = document.getElementById('q');
    const modeEl = document.getElementById('mode');
    const freshEl = document.getElementById('fresh');
    const goBtn = document.getElementById('goBtn');
    const resultsEl = document.getElementById('results');
    const debugEl = document.getElementById('debug');
    const debugToggle = document.getElementById('debugToggle');
    const progressBar = document.getElementById('progress-bar');
    const searchIndicators = document.getElementById('search-indicators');
    const cancelSearchBtn = document.getElementById('cancel-search-btn');
    const preferencesBtn = document.getElementById('preferencesBtn');
    const preferencesModal = document.getElementById('preferences-modal');
    const closePreferences = document.getElementById('close-preferences');
    const savePreferences = document.getElementById('save-preferences');
    const cancelPreferences = document.getElementById('cancel-preferences');
    const historyBtn = document.getElementById('historyBtn');
    const recentSearches = document.getElementById('recent-searches');
    const recentChips = document.getElementById('recent-chips');
    const clearRecentSearches = document.getElementById('clear-recent-searches');
    const resetPreferences = document.getElementById('reset-preferences');
    const toastContainer = document.getElementById('toast-container');
    const errorContainer = document.getElementById('error-container');
    
    // Global state
    let searchTimeout = null;
    let currentSearchController = null;
    let userPreferences = getUserPreferences();
    
    // Toast notification system
    function showToast(message, type = 'info', duration = 3000) {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      
      let icon = '';
      if (type === 'success') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
      } else if (type === 'error') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
      } else {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
      }
      
      toast.innerHTML = `${icon}<span>${message}</span>`;
      toastContainer.appendChild(toast);
      
      // Automatically remove after duration
      if (duration > 0) {
        setTimeout(() => {
          toast.classList.add('hiding');
          // Remove from DOM after animation completes
          setTimeout(() => {
            if (toastContainer.contains(toast)) {
              toastContainer.removeChild(toast);
            }
          }, 300);
        }, duration);
      }
      
      return toast;
    }
    
    // Function to set status text
    function setStatus(text) {
      const statusEl = document.querySelector('.status');
      if (!statusEl) {
        const newStatus = document.createElement('span');
        newStatus.className = 'status';
        newStatus.textContent = text;
        goBtn.parentNode.appendChild(newStatus);
      } else {
        statusEl.textContent = text;
      }
    }
    
    // Show/hide error messages
    function showError(message) {
      errorContainer.textContent = message;
      errorContainer.classList.add('show');
    }
    
    function clearError() {
      errorContainer.textContent = '';
      errorContainer.classList.remove('show');
    }
    
    // Render search results
    function render(results) {
      if (!results || !results.length) {
        resultsEl.innerHTML = '<div class="muted" style="text-align: center; padding: 30px 0;">No results found</div>';
        return;
      }
      
      // Get admin-defined custom sources
      const sourcesConfig = loadSourcesConfig();
      const customSources = sourcesConfig.sources || [];
      
      // Apply link extraction optimizations
      const optimizedResults = extractUsableLinks(results, customSources);
      
      // Store processed results for re-rendering
      window.lastSearchData = optimizedResults;
      
      // Determine if we should show grid or list view
      const isGridView = userPreferences.displayMode === 'grid';
      resultsEl.className = isGridView ? 'results-grid' : '';
      
      // Apply compact mode if enabled
      document.body.classList.toggle('compact-mode', userPreferences.compactMode);
      
      // Create HTML for results
      resultsEl.innerHTML = optimizedResults.map(r => {
        const thumbnailClass = r.thumbnail ? ` thumb-${userPreferences.thumbnailSize}` : ' thumb-hidden';
        const confidenceIndicator = r._confidence !== undefined ? 
          `<span class="muted" style="font-size: 12px; margin-left: 8px;">Score: ${r._confidence.toFixed(2)}</span>` : '';
        
        return `
          <div class="result${r._lowConfidence ? ' low-confidence' : ''}" data-url="${encodeURIComponent(r.url)}">
            <div class="thumb${thumbnailClass}" style="background-image: url('${r.thumbnail || ''}')"></div>
            <div class="info">
              <div class="title">
                <a href="${r.url}" target="${userPreferences.openLinksInNewTab ? '_blank' : '_self'}" rel="noopener noreferrer">
                  ${r.title}
                </a>
                ${debugEl.classList.contains('hide') ? '' : confidenceIndicator}
              </div>
              <div class="site">${r.site}${userPreferences.showRuntime && r.runtime ? ` • ${r.runtime}` : ''}</div>
              ${userPreferences.showTags && r.tags && r.tags.length ? `
                <div class="tags">
                  ${r.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
      
      // Add event listeners for results if needed
      document.querySelectorAll('.result').forEach(result => {
        result.addEventListener('click', (e) => {
          // Ignore clicks on links (handled by browser)
          if (e.target.tagName === 'A') return;
          
          // For clicks on the result container, navigate to the URL
          const url = decodeURIComponent(result.dataset.url);
          if (url) {
            if (userPreferences.openLinksInNewTab) {
              window.open(url, '_blank', 'noopener,noreferrer');
            } else {
              window.location.href = url;
            }
          }
        });
      });
    }
    
    // Search function with AbortController for cancellation
    async function performSearch(query) {
      // Cancel existing search if any
      if (currentSearchController) {
        currentSearchController.abort();
      }
      
      // Create a new AbortController
      currentSearchController = new AbortController();
      const signal = currentSearchController.signal;
      
      try {
        // Show search indicators
        searchIndicators.style.display = 'block';
        cancelSearchBtn.classList.remove('hide');
        
        // Animate progress bar
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += 5;
          if (progress > 90) {
            progress = 90; // Max out at 90% until complete
          }
          progressBar.style.width = `${progress}%`;
        }, 200);
        
        // Build URL with parameters
        const params = new URLSearchParams();
        params.set("q", query);
        params.set("mode", modeEl.value);
        params.set("fresh", freshEl.value);
        
        // Add limit from preferences
        if (userPreferences && userPreferences.defaultLimit) {
          params.set("limit", userPreferences.defaultLimit.toString());
        }
        
        // Get filter settings
        const filterConfig = loadFilterConfig();
        
        // Add filter strength if enabled
        if (userPreferences.applyFilters !== false) {
          params.set("filterStrength", filterConfig.settings.filterStrength || 'moderate');
        }
        
        // Add custom sources if any
        const sourcesConfig = loadSourcesConfig();
        const relevantSources = sourcesConfig.sources?.filter(source => 
          source.enabled && (source.mode === 'all' || source.mode === modeEl.value)
        ) || [];
        
        if (relevantSources.length > 0) {
          // Convert to a comma-separated list of domains
          const sourcesList = relevantSources.map(s => s.domain).join(',');
          params.set("custom_sources", sourcesList);
        }
        
        // Add request ID for tracking
        const requestId = crypto.randomUUID();
        params.set("requestId", requestId);
        
        // Perform fetch with abort signal
        const response = await fetch(`/aggregate?${params.toString()}`, { 
          signal,
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Complete progress bar
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        
        if (data.error) {
          return { success: false, error: data.error };
        }
        
        // Apply client-side content filtering if enabled
        let finalResults = data.results || [];
        if (userPreferences.applyFilters !== false) {
          finalResults = applyContentFilters(finalResults, filterConfig);
        }
        
        // Process results
        return { 
          success: true, 
          data: { ...data, results: finalResults },
          metadata: {
            resultCount: finalResults.length,
            originalCount: data.results?.length || 0,
            query,
            mode: modeEl.value,
            freshness: freshEl.value,
            requestId
          }
        };
      } catch (error) {
        if (error.name === 'AbortError') {
          return { success: false, aborted: true };
        }
        throw error;
      } finally {
        // Hide search indicators and reset
        setTimeout(() => {
          searchIndicators.style.display = 'none';
          progressBar.style.width = '0%';
          cancelSearchBtn.classList.add('hide');
          currentSearchController = null;
        }, 300);
      }
    }
    
    // Save and retrieve recent searches
    function saveRecentSearch(query, resultCount) {
      if (!userPreferences.enableRecentSearches) return;
      
      try {
        const recentSearches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
        
        // Add new search to the beginning
        recentSearches.unshift({
          query,
          timestamp: new Date().toISOString(),
          resultCount,
          mode: modeEl.value,
          freshness: freshEl.value
        });
        
        // Keep only the latest N searches
        const maxSearches = userPreferences.maxRecentSearches || 5;
        const trimmedSearches = recentSearches.slice(0, maxSearches);
        
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(trimmedSearches));
        
        // Update the UI
        renderRecentSearches();
      } catch (error) {
        console.error('Failed to save recent search', error);
      }
    }
    
    function renderRecentSearches() {
      if (!userPreferences.enableRecentSearches) {
        recentSearches.style.display = 'none';
        return;
      }
      
      try {
        const searches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
        
        if (searches.length === 0) {
          recentSearches.style.display = 'none';
          return;
        }
        
        // Create chips for recent searches
        recentChips.innerHTML = searches.map(search => `
          <div class="chip" data-query="${search.query}" data-mode="${search.mode}" data-fresh="${search.freshness}">
            ${search.query}
            <span class="muted">(${search.resultCount})</span>
          </div>
        `).join('');
        
        // Add click event to chips
        recentChips.querySelectorAll('.chip').forEach(chip => {
          chip.addEventListener('click', () => {
            qEl.value = chip.dataset.query;
            modeEl.value = chip.dataset.mode;
            freshEl.value = chip.dataset.fresh;
            searchForm.dispatchEvent(new Event('submit'));
          });
        });
        
        // Show the recent searches section
        recentSearches.style.display = 'block';
      } catch (error) {
        console.error('Failed to render recent searches', error);
        recentSearches.style.display = 'none';
      }
    }
    
    // Preferences system
    function applyPreferences() {
      // Apply theme preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (userPreferences.colorTheme === 'light') {
        document.body.classList.add('theme-light');
        document.body.classList.remove('theme-dark');
      } else if (userPreferences.colorTheme === 'dark') {
        document.body.classList.add('theme-dark');
        document.body.classList.remove('theme-light');
      } else {
        // System default
        document.body.classList.toggle('theme-dark', prefersDark);
        document.body.classList.toggle('theme-light', !prefersDark);
      }
      
      // Apply compact mode
      document.body.classList.toggle('compact-mode', userPreferences.compactMode);
      
      // Set default search options
      if (userPreferences.defaultMode) {
        modeEl.value = userPreferences.defaultMode;
      }
      
      if (userPreferences.defaultFreshness) {
        freshEl.value = userPreferences.defaultFreshness;
      }
      
      // Re-render results if available
      if (window.lastSearchData && window.lastSearchData.length) {
        render(window.lastSearchData);
      }
    }
    
    function populatePreferencesForm() {
      // Display tab
      document.getElementById('pref-color-theme').value = userPreferences.colorTheme || 'system';
      document.getElementById('pref-display-mode').value = userPreferences.displayMode || 'list';
      document.getElementById('pref-compact-mode').checked = userPreferences.compactMode || false;
      document.getElementById('pref-thumbnail-size').value = userPreferences.thumbnailSize || 'medium';
      document.getElementById('pref-show-tags').checked = userPreferences.showTags !== false; // Default to true
      document.getElementById('pref-show-runtime').checked = userPreferences.showRuntime !== false; // Default to true
      
      // Search tab
      document.getElementById('pref-default-mode').value = userPreferences.defaultMode || 'niche';
      document.getElementById('pref-default-freshness').value = userPreferences.defaultFreshness || 'y1';
      document.getElementById('pref-default-limit').value = userPreferences.defaultLimit || '10';
      document.getElementById('pref-enable-recent-searches').checked = userPreferences.enableRecentSearches !== false; // Default to true
      document.getElementById('pref-max-recent-searches').value = userPreferences.maxRecentSearches || '5';
      
      // Advanced tab
      document.getElementById('pref-open-links-in-new-tab').checked = userPreferences.openLinksInNewTab !== false; // Default to true
      document.getElementById('pref-filter-strength').value = userPreferences.filterStrength || 'moderate';
      document.getElementById('pref-apply-filters').checked = userPreferences.applyFilters !== false; // Default to true
    }
    
    function collectPreferencesFromForm() {
      // Create a new preferences object
      const prefs = { ...userPreferences };
      
      // Display tab
      prefs.colorTheme = document.getElementById('pref-color-theme').value;
      prefs.displayMode = document.getElementById('pref-display-mode').value;
      prefs.compactMode = document.getElementById('pref-compact-mode').checked;
      prefs.thumbnailSize = document.getElementById('pref-thumbnail-size').value;
      prefs.showTags = document.getElementById('pref-show-tags').checked;
      prefs.showRuntime = document.getElementById('pref-show-runtime').checked;
      
      // Search tab
      prefs.defaultMode = document.getElementById('pref-default-mode').value;
      prefs.defaultFreshness = document.getElementById('pref-default-freshness').value;
      prefs.defaultLimit = document.getElementById('pref-default-limit').value;
      prefs.enableRecentSearches = document.getElementById('pref-enable-recent-searches').checked;
      prefs.maxRecentSearches = document.getElementById('pref-max-recent-searches').value;
      
      // Advanced tab
      prefs.openLinksInNewTab = document.getElementById('pref-open-links-in-new-tab').checked;
      prefs.filterStrength = document.getElementById('pref-filter-strength').value;
      prefs.applyFilters = document.getElementById('pref-apply-filters').checked;
      
      return prefs;
    }
    
    function initPreferencesSystem() {
      // Load user preferences
      userPreferences = getUserPreferences();
      
      // Add tab switching behavior
      const tabButtons = document.querySelectorAll('.tab-button');
      const tabContents = document.querySelectorAll('.tab-content');
      
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          // Remove active class from all buttons and contents
          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));
          
          // Add active class to current button and its content
          button.classList.add('active');
          const tabName = button.dataset.tab;
          document.getElementById(`${tabName}-tab`).classList.add('active');
        });
      });
      
      // Modal open/close handlers
      preferencesBtn.addEventListener('click', () => {
        populatePreferencesForm();
        preferencesModal.classList.add('show');
      });
      
      closePreferences.addEventListener('click', () => {
        preferencesModal.classList.remove('show');
      });
      
      cancelPreferences.addEventListener('click', () => {
        preferencesModal.classList.remove('show');
      });
      
      // Save preferences
      savePreferences.addEventListener('click', () => {
        const newPreferences = collectPreferencesFromForm();
        userPreferences = newPreferences;
        saveUserPreferences(newPreferences);
        applyPreferences();
        preferencesModal.classList.remove('show');
        showToast('Preferences saved successfully', 'success');
        
        // Update recent searches display
        renderRecentSearches();
      });
      
      // Reset preferences
      resetPreferences.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all preferences to default?')) {
          userPreferences = { ...DEFAULT_USER_PREFERENCES };
          saveUserPreferences(userPreferences);
          populatePreferencesForm();
          applyPreferences();
          showToast('Preferences reset to defaults', 'success');
        }
      });
      
      // Clear recent searches
      clearRecentSearches.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your search history?')) {
          localStorage.removeItem(RECENT_SEARCHES_KEY);
          renderRecentSearches();
          showToast('Search history cleared', 'success');
        }
      });
    }
    
    // Enhanced form submission with debouncing
    searchForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      const query = qEl.value.trim();
      
      if (!query) {
        showError("Please enter a search query");
        setStatus("enter a query");
        return;
      }
      
      // Clear previous results and error messages
      clearError();
      goBtn.disabled = true;
      setStatus("searching...");
      resultsEl.innerHTML = "";
      debugEl.textContent = "";
      
      // Show loading state
      resultsEl.innerHTML = Array(5).fill(0).map(() => `
        <div class="result skeleton">
          <div class="thumb"></div>
          <div class="info">
            <div class="title" style="height: 20px; width: 80%; margin-bottom: 8px;"></div>
            <div class="site" style="height: 14px; width: 60%;"></div>
          </div>
        </div>
      `).join('');
      
      // Execute search with debouncing
      searchTimeout = setTimeout(async () => {
        try {
          // Perform search
          const result = await performSearch(query);
          
          if (result.success) {
            // Store results for preference changes
            window.lastSearchData = result.data.results || [];
            
            // Render results
            render(result.data.results || []);
            
            // Update debug info if available
            if (result.data.diag) {
              const enhancedDiag = {
                ...result.data.diag,
                filtering: {
                  originalCount: result.metadata.originalCount,
                  filteredCount: result.metadata.resultCount,
                  filterStrength: loadFilterConfig().settings.filterStrength,
                  requirePositiveMatch: loadFilterConfig().settings.requirePositiveMatch,
                  requestId: result.metadata.requestId
                }
              };
              
              debugEl.textContent = JSON.stringify(enhancedDiag, null, 2);
            }
            
            // Update status with filtering information
            if (result.metadata.originalCount > result.metadata.resultCount) {
              setStatus(`Found ${result.metadata.resultCount} results (filtered from ${result.metadata.originalCount})`);
            } else {
              setStatus(`Found ${result.metadata.resultCount} results`);
            }
            
            // Save search to recent searches
            saveRecentSearch(query, result.metadata.resultCount);
            
            // Update URL without page reload (for sharing/bookmarking)
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.set('q', query);
                          const match = result.link.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
              domain = match ? match[1] : '';
            }
            
            // Extract video duration if available
            let runtime = null;
            const durationMatches = [
              // Look for timestamps
              result.title.match(/(\d+:\d+(?::\d+)?)/),
              result.snippet?.match(/(\d+:\d+(?::\d+)?)/),
              // Look for duration mentions
              result.title.match(/(\d+)\s*min/i),
              result.snippet?.match(/(\d+)\s*min/i),
              // Look for length mentions
              result.title.match(/length[:\s]+(\d+[\s:]*\d*)/i),
              result.snippet?.match(/length[:\s]+(\d+[\s:]*\d*)/i),
              // Look for duration mentions
              result.title.match(/duration[:\s]+(\d+[\s:]*\d*)/i),
              result.snippet?.match(/duration[:\s]+(\d+[\s:]*\d*)/i)
            ].find(m => m);
            
            if (durationMatches) {
              runtime = durationMatches[1];
            }
            
            // Extract potential tags
            const tags = [];
            
            // Look for hashtags
            const hashtagMatches = (result.title + ' ' + (result.snippet || '')).match(/#([a-zA-Z0-9_]+)/g);
            if (hashtagMatches) {
              hashtagMatches.forEach(tag => {
                tags.push(tag.substring(1));
              });
            }
            
            // Look for common porn categories
            const categoryKeywords = ['amateur', 'hardcore', 'twink', 'bear', 'daddy', 'jock', 'muscle', 'bareback', 'group', 'solo'];
            categoryKeywords.forEach(keyword => {
              if ((result.title + ' ' + (result.snippet || '')).toLowerCase().includes(keyword)) {
                if (!tags.includes(keyword)) {
                  tags.push(keyword);
                }
              }
            });
            
            // Get thumbnail URL
            let thumbnail = null;
            if (result.thumbnailUrl) {
              thumbnail = result.thumbnailUrl;
            } else if (result.imageUrl) {
              thumbnail = result.imageUrl;
            }
            
            return {
              title: result.title,
              site: domain,
              url: result.link,
              runtime: runtime,
              thumbnail: thumbnail,
              tags: tags.slice(0, 5), // Limit to 5 tags max
              notes: "search result",
              snippet: result.snippet
            };
          });
          
          // Apply server-side content filtering before returning results
          if (filterStrength !== 'none') {
            const filterConfig = {
              settings: {
                filterStrength,
                confidenceThreshold: 0.7,
                requirePositiveMatch: false
              },
              // Default filter terms if custom filters are unavailable
              negativeTerms: [
                { term: 'lesbian', enabled: true, category: 'content' },
                { term: 'female', enabled: true, category: 'content' },
                { term: 'straight sex', enabled: true, category: 'content' },
                { term: 'f/f', enabled: true, category: 'content' },
                { term: 'woman', enabled: true, category: 'content' }
              ],
              positiveTerms: [
                { term: 'gay male', enabled: true, category: 'content' },
                { term: 'men only', enabled: true, category: 'content' },
                { term: 'male gay', enabled: true, category: 'content' },
                { term: 'm/m', enabled: true, category: 'content' }
              ]
            };
            
            results = applyContentFilters(results, filterConfig);
          }
          
          // Prepare final response with enhanced metadata
          const response = {
            query,
            site,
            mode,
            durationQuery: duration,
            freshness: fresh,
            results,
            diag: {
              mode,
              hostMode,
              durationMode,
              fresh,
              cached: cacheHit,
              processTime: new Date().getTime(),
              filterStrength,
              requestId,
              resultCount: results.length,
              originalCount: organicResults.length
            }
          };
          
          // Enhance logging if analytics are available
          if (env && env.JACK_ANALYTICS) {
            const analyticsData = {
              timestamp: new Date().toISOString(),
              clientIP: clientIP,
              query: searchQuery,
              mode,
              freshness: fresh,
              resultCount: results.length,
              originalCount: organicResults.length,
              requestId
            };
            
            // Don't await to avoid delaying response
            env.JACK_ANALYTICS.put(`search:${requestId}`, JSON.stringify(analyticsData), {
              expirationTtl: 604800 // 7 days
            }).catch(error => {
              console.error('Analytics error:', error);
            });
          }
          
          return addCorsHeaders(new Response(JSON.stringify(response), {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": noCache ? "no-store" : "public, max-age=3600"
            }
          }));
        } catch (error) {
          console.error(`[handleAggregate] Error: ${error.message}`, error.stack);
          return addCorsHeaders(new Response(JSON.stringify({
            error: "an unexpected error occurred",
            requestId: crypto.randomUUID(),
            status: 500
          }), {
            status: 500,
            headers: { "content-type": "application/json" }
          }));
        }
      }
      
      // Main page
      if (path === "/" || path === "/index.html") {
        return addCorsHeaders(new Response(PORTAL_HTML, {
          status: 200,
          headers: { 
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=300" // 5 minute cache
          }
        }));
      }
      
      // 404 Not Found for any other routes
      return addCorsHeaders(new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain" }
      }));
    } catch (error) {
      // Global error handler for unhandled exceptions
      console.error(`[Jack-GPT] Unhandled error: ${error.message}`, error.stack);
      return addCorsHeaders(new Response(JSON.stringify({
        error: 'An unexpected error occurred',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store'
        }
      }));
    }
  }
};

// -------------------- Deployment Guide --------------------

/*
# Jack-GPT Deployment Guide for Cloudflare Workers

## Prerequisites
1. Cloudflare account
2. Wrangler CLI installed: `npm install -g wrangler`
3. Node.js 14+ installed

## Setup Steps

### 1. Create a new Cloudflare Workers project

```bash
# Login to Cloudflare
wrangler login

# Create a new project
mkdir jack-gpt
cd jack-gpt
wrangler init searchParams.set('mode', modeEl.value);
            searchParams.set('fresh', freshEl.value);
            const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
            window.history.pushState({ query, mode: modeEl.value, fresh: freshEl.value }, '', newUrl);
          } else if (result.aborted) {
            // Search was canceled by user
            setStatus("Search canceled");
          } else {
            showError(result.error || "Search failed");
            setStatus("Error");
            console.error("Search error:", result.error);
          }
        } catch (error) {
          showError(error.message || "Search failed");
          setStatus("Error");
          console.error("Search error:", error);
          
          // Show detailed error for debugging
          if (debugEl && !debugEl.classList.contains('hide')) {
            debugEl.textContent = JSON.stringify({
              error: error.message,
              stack: error.stack,
              time: new Date().toISOString()
            }, null, 2);
          }
        } finally {
          goBtn.disabled = false;
        }
      }, DEBOUNCE_DELAY);
    });
    
    // Cancel button handler
    cancelSearchBtn.addEventListener('click', () => {
      if (currentSearchController) {
        currentSearchController.abort();
        showToast('Search canceled', 'info');
      }
    });
    
    // History button handler
    historyBtn.addEventListener('click', () => {
      const isVisible = recentSearches.style.display !== 'none';
      recentSearches.style.display = isVisible ? 'none' : 'block';
      historyBtn.textContent = isVisible ? 'History' : 'Hide History';
    });
    
    // Debug toggle
    debugToggle.addEventListener("click", () => {
      debugEl.classList.toggle("hide");
      if (!debugEl.classList.contains("hide")) {
        // If we have last search data, show debugging info
        if (window.lastSearchData) {
          debugEl.textContent = JSON.stringify({
            results: window.lastSearchData.length,
            preferences: userPreferences,
            filterConfig: loadFilterConfig(),
            timestamp: new Date().toISOString()
          }, null, 2);
        }
      }
    });
    
    // Handle browser navigation (back/forward)
    window.addEventListener('popstate', (event) => {
      if (event.state) {
        // Restore search from history state
        qEl.value = event.state.query || '';
        modeEl.value = event.state.mode || 'niche';
        freshEl.value = event.state.fresh || 'y1';
        
        // Only trigger search if there's a query
        if (event.state.query) {
          searchForm.dispatchEvent(new Event('submit'));
        }
      }
    });
    
    // Keyboard navigation enhancements
    function setupKeyboardNavigation() {
      // Enhanced focus management for results
      resultsEl.tabIndex = -1;
      
      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Focus search box on Ctrl+K or / when not in an input
        if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || 
            (e.key === '/' && document.activeElement.tagName !== 'INPUT' && 
             document.activeElement.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          qEl.focus();
          qEl.select();
        }
        
        // ESC to cancel search
        if (e.key === 'Escape' && currentSearchController) {
          cancelSearchBtn.click();
        }
        
        // ESC to close modals
        if (e.key === 'Escape' && preferencesModal.classList.contains('show')) {
          cancelPreferences.click();
        }
      });
    }
    
    // Mobile touch event handling
    function setupTouchOptimizations() {
      // Detect touch capability
      const isTouchDevice = 'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        navigator.msMaxTouchPoints > 0;
      
      if (isTouchDevice) {
        document.body.classList.add('touch-device');
        
        // Add tap-highlight color for better touch feedback
        const style = document.createElement('style');
        style.textContent = `
          .result, button, .chip {
            -webkit-tap-highlight-color: rgba(127, 90, 240, 0.1);
          }
        `;
        document.head.appendChild(style);
        
        // Enhance form controls for touch
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
          input.classList.add('touch-input');
        });
        
        // Prevent 300ms delay on mobile
        document.addEventListener('touchend', () => {}, { passive: true });
      }
    }
    
    // Handle viewport resizing and orientation changes
    function setupViewportHandling() {
      // Function to update viewport height (fix for mobile browser address bar)
      function updateViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      }
      
      // Set initial viewport height
      updateViewportHeight();
      
      // Handle orientation changes
      window.addEventListener('orientationchange', () => {
        // Adjust UI for orientation change after a short delay
        setTimeout(updateViewportHeight, 200);
      });
      
      // Handle window resize with debouncing
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateViewportHeight, 100);
      });
    }
    
    // Network status monitoring
    function setupNetworkMonitoring() {
      // Create a persistent status indicator
      const networkStatus = document.createElement('div');
      networkStatus.className = 'network-status';
      networkStatus.style.display = 'none';
      document.body.appendChild(networkStatus);
      
      // Function to show network status
      function updateNetworkStatus(isOnline) {
        if (!isOnline) {
          networkStatus.style.display = 'block';
          networkStatus.textContent = 'You are offline. Some features may be unavailable.';
          networkStatus.style.background = 'var(--bad)';
          networkStatus.style.color = 'white';
          networkStatus.style.textAlign = 'center';
          networkStatus.style.padding = '6px';
          networkStatus.style.position = 'fixed';
          networkStatus.style.top = '0';
          networkStatus.style.left = '0';
          networkStatus.style.right = '0';
          networkStatus.style.zIndex = '9999';
          showToast('You are offline. Some features may be unavailable.', 'error', 0); // 0 means don't auto-hide
        } else {
          networkStatus.style.display = 'none';
          // Remove persistent toast if it exists
          const errorToasts = document.querySelectorAll('.toast.error');
          errorToasts.forEach(toast => {
            if (toast.textContent.includes('offline')) {
              toast.classList.add('hiding');
              setTimeout(() => {
                if (toastContainer.contains(toast)) {
                  toastContainer.removeChild(toast);
                }
              }, 300);
            }
          });
          showToast('You are back online', 'success');
        }
      }
      
      // Handle online status
      window.addEventListener('online', () => {
        updateNetworkStatus(true);
      });
      
      // Handle offline status
      window.addEventListener('offline', () => {
        updateNetworkStatus(false);
      });
      
      // Check initial status
      updateNetworkStatus(navigator.onLine);
    }
    
    // PWA installation support
    function setupPWASupport() {
      let deferredPrompt;
      
      // Create install button
      const installButton = document.createElement('button');
      installButton.textContent = 'Install App';
      installButton.classList.add('secondary');
      installButton.id = 'install-button';
      installButton.style.display = 'none';
      
      // Insert after the preferences button
      const actionsDiv = document.querySelector('.actions');
      actionsDiv.appendChild(installButton);
      
      // Handle PWA install prompt
      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 76+ from automatically showing the prompt
        e.preventDefault();
        
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        
        // Show install button
        installButton.style.display = 'block';
      });
      
      // Add click handler to install button
      installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        // Hide the install button
        installButton.style.display = 'none';
        
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        
        // Clear the saved prompt - it can only be used once
        deferredPrompt = null;
      });
      
      // Track when the PWA is installed
      window.addEventListener('appinstalled', () => {
        // Hide install button
        installButton.style.display = 'none';
        
        // Show confirmation
        showToast('Application installed successfully', 'success');
        
        // Log installation
        console.log('PWA was installed');
      });
    }
    
    // Initialize everything when the DOM is ready
    window.addEventListener('DOMContentLoaded', () => {
      // Initialize preferences
      initPreferencesSystem();
      applyPreferences();
      
      // Initialize accessibility
      setupKeyboardNavigation();
      
      // Initialize recent searches
      renderRecentSearches();
      
      // Initialize mobile optimizations
      setupTouchOptimizations();
      setupViewportHandling();
      
      // Initialize network monitoring
      setupNetworkMonitoring();
      
      // Initialize PWA support
      setupPWASupport();
      
      // Set initial query from URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const urlQuery = urlParams.get('q');
      if (urlQuery) {
        qEl.value = urlQuery;
      }
      
      // Set initial mode from URL if present
      const urlMode = urlParams.get('mode');
      if (urlMode && modeEl.querySelector(`option[value="${urlMode}"]`)) {
        modeEl.value = urlMode;
      } else if (!urlMode && !urlQuery) {
        // Apply default from preferences if no URL params
        modeEl.value = userPreferences.defaultMode || 'niche';
      }
      
      // Set initial freshness from URL if present
      const urlFresh = urlParams.get('fresh');
      if (urlFresh && freshEl.querySelector(`option[value="${urlFresh}"]`)) {
        freshEl.value = urlFresh;
      } else if (!urlFresh && !urlQuery) {
        // Apply default from preferences if no URL params
        freshEl.value = userPreferences.defaultFreshness || 'y1';
      }
      
      // Initialize form with auto-focus if not on mobile
      if (!qEl.value && window.innerWidth > 640) {
        setTimeout(() => {
          qEl.focus();
        }, 100);
      }
      
      // Execute search from URL parameters if query is present
      if (urlQuery) {
        searchForm.dispatchEvent(new Event('submit'));
      }
    });
    
    // Register service worker for PWA support
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then(registration => {
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  console.log('New service worker version installed');
                  showToast('A new version is available. Refresh to update.', 'info');
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
      });
    }
  </script>
</body>
</html>`;

// ---------------- Server Implementation ----------------

export default {
  async fetch(request, env, ctx) {
    try {
      // Handle preflight requests with proper CORS
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-origin': CORS_CONFIG.allowOrigin,
            'access-control-allow-methods': CORS_CONFIG.allowMethods,
            'access-control-allow-headers': CORS_CONFIG.allowHeaders,
            'access-control-max-age': CORS_CONFIG.maxAge
          }
        });
      }
      
      const url = new URL(request.url);
      const path = url.pathname;
      const BASE_PATH = "";  // Set this if your app is not at the root
      
      // Admin panel route
      if (path === "/admin") {
        return addCorsHeaders(new Response(ADMIN_PANEL_HTML, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" }
        }));
      }
      
      // Service worker
      if (path === joinPath(BASE_PATH, "sw.js")) {
        return addCorsHeaders(new Response(SW_JS, {
          status: 200,
          headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": "no-store"
          }
        }));
      }
      
      // Manifest (support both paths for compatibility)
      if (path === joinPath(BASE_PATH, "site.webmanifest") || path === "/manifest.json") {
        return addCorsHeaders(new Response(MANIFEST_JSON, {
          status: 200,
          headers: {
            "content-type": "application/manifest+json; charset=utf-8",
            "cache-control": "public, max-age=3600"
          }
        }));
      }
      
      // Icons
      if (path === "/icon-192.png") {
        const iconResponse = await fetch("https://raw.githubusercontent.com/itstanner5216/Jack-GPT/main/icon_jackportal_fixed_192.png");
        return addCorsHeaders(new Response(await iconResponse.arrayBuffer(), { 
          headers: { 
            "content-type": "image/png", 
            "cache-control": "public, max-age=31536000, immutable" 
          }
        }));
      }
      if (path === "/icon-512.png") {
        const iconResponse = await fetch("https://raw.githubusercontent.com/itstanner5216/Jack-GPT/main/icon_jackportal_fixed_512.png");
        return addCorsHeaders(new Response(await iconResponse.arrayBuffer(), { 
          headers: { 
            "content-type": "image/png", 
            "cache-control": "public, max-age=31536000, immutable" 
          }
        }));
      }
      
      // API documentation
      if (path === "/api/docs") {
        return addCorsHeaders(serveApiDocs());
      }
      
      // Health check endpoint
      if (path === "/health") {
        return addCorsHeaders(new Response(JSON.stringify({ 
          status: 'healthy',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }));
      }
      
      // Aggregate endpoint (search API)
      if (path === "/aggregate") {
        try {
          const params = url.searchParams;
          
          // Validate required parameters
          const query = params.get("q");
          if (!query || !query.trim()) {
            return addCorsHeaders(new Response(JSON.stringify({
              error: "missing query",
              status: 400
            }), {
              status: 400,
              headers: { "content-type": "application/json" }
            }));
          }
          
          // Validate numeric parameters
          const limit = parseInt(params.get("limit") || "10", 10);
          if (isNaN(limit) || limit < 3 || limit > 20) {
            return addCorsHeaders(new Response(JSON.stringify({
              error: "invalid parameter: limit must be between 3 and 20",
              status: 400
            }), {
              status: 400,
              headers: { "content-type": "application/json" }
            }));
          }
          
          // Extract search parameters
          const mode = params.get("mode") || "niche";
          const fresh = params.get("fresh") || "y1";
          const site = params.get("site") || null;
          const duration = params.get("duration") || null;
          const hostMode = params.get("hostMode") || "normal";
          const durationMode = params.get("durationMode") || "normal";
          const filterStrength = params.get("filterStrength") || "moderate";
          const requestId = params.get("requestId") || crypto.randomUUID();
          
          // Parse nocache flag
          const noCache = params.get("nocache") === "1";
          
          // Apply rate limiting based on IP
          const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
          const rateLimitKey = `ratelimit:${clientIP}`;
          
          // If we have KV for storage, use it for rate limiting
          if (env && env.JACK_STORAGE) {
            const currentRateLimit = await env.JACK_STORAGE.get(rateLimitKey);
            const rateLimit = currentRateLimit ? parseInt(currentRateLimit) : 0;
            
            if (rateLimit > 50) { // Allow 50 requests per minute
              return addCorsHeaders(new Response(JSON.stringify({
                error: "rate limit exceeded, please try again in a minute",
                status: 429
              }), {
                status: 429,
                headers: { 
                  "content-type": "application/json",
                  "retry-after": "60"
                }
              }));
            }
            
            // Increment rate limit counter with 60 second expiry
            await env.JACK_STORAGE.put(rateLimitKey, `${rateLimit + 1}`, { expirationTtl: 60 });
          }
          
          // Configure search query
          let searchQuery = query;
          
          // Configure search for different modes
          let searchEndpoint = 'https://api.serper.dev/search';
          let searchOptions = {
            q: searchQuery,
            gl: 'us',
            hl: 'en',
            num: limit
          };
          
          // Apply freshness filter
          if (fresh === 'd7') {
            searchOptions.tbs = 'qdr:w';
          } else if (fresh === 'm1') {
            searchOptions.tbs = 'qdr:m';
          } else if (fresh === 'm3') {
            searchOptions.tbs = 'qdr:m3';
          } else if (fresh === 'y1') {
            searchOptions.tbs = 'qdr:y';
          }
          
          // Apply site filter if specified
          if (site) {
            searchOptions.q += ` site:${site}`;
          }
          
          // Modify query based on search mode
          if (mode === 'niche') {
            searchOptions.q += ' "homo gay male" video site:homotube.com OR site:gaymaletube.com OR site:boyfriendtv.com OR site:manporn.xxx OR site:pornmd.com OR site:gaytube.com OR site:gaysexvideos.tv OR site:hellomorningstarrs.com OR site:onlydudes.tv OR site:redgay.net OR site:eporner.com OR site:gayforfans.com OR site:youngsfun.com OR site:redtube.com OR site:gotgayporn.com OR site:tubegalore.com OR site:manhub.com OR site:txxx.com';
          } else if (mode === 'keywords') {
            searchOptions.q += ' "gay porn" OR "gay video" OR "homo video" OR "gay XXX" OR "gay adult" OR "male porn" OR "gay male"';
          } else if (mode === 'deep_niche') {
            searchOptions.q += ' "amateur homo" OR "gay male amateur" OR "home made gay" OR "gay male home" OR "gay male private" -commercial -professional';
          } else if (mode === 'forums') {
            searchOptions.q += ' gay OR homo OR male site:forum.* OR site:board.* OR site:community.* OR site:reddit.com OR inurl:forum OR inurl:thread OR inurl:topic OR inurl:board OR inurl:discussion';
          } else if (mode === 'tumblrish') {
            searchOptions.q += ' gay OR homo OR male site:tumblr.com OR site:blogspot.com OR site:wordpress.com OR site:blogger.com OR site:livejournal.com OR blog OR journal OR diary OR personal';
          }
          
          // Apply duration filter if specified
          if (duration) {
            if (durationMode === 'lenient') {
              // More flexible parsing
              searchOptions.q += ` "${duration}" OR "length ${duration}" OR "duration ${duration}" OR "time ${duration}"`;
            } else {
              searchOptions.q += ` "${duration}"`;
            }
          }
          
          // Add custom sources if provided
          const customSourcesParam = params.get("custom_sources");
          if (customSourcesParam) {
            const customDomains = customSourcesParam.split(',').map(d => d.trim()).filter(Boolean);
            if (customDomains.length > 0) {
              // Create a site: query for each domain OR'd together
              const sitesQuery = customDomains.map(domain => `site:${domain}`).join(' OR ');
              searchOptions.q += ` (${sitesQuery})`;
            }
          }
          
          // Check cache first if caching is enabled
          const cacheKey = `search:${searchOptions.q}:${searchOptions.tbs || 'all'}`;
          let cacheHit = false;
          let data;
          
          if (!noCache && env && env.JACK_STORAGE) {
            const cachedResponse = await env.JACK_STORAGE.get(cacheKey, { type: 'json' });
            if (cachedResponse) {
              data = cachedResponse;
              cacheHit = true;
            }
          }
          
          // If not in cache, perform the search
          if (!cacheHit) {
            // Full text search
            const searchFetch = await fetch(searchEndpoint, {
              method: 'POST',
              headers: {
                'X-API-KEY': env?.SERPER_API_KEY || 'a1feeb90cb8f651bafa0b8c1a0d1a2d3f35e9d12',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(searchOptions)
            });
            
            if (!searchFetch.ok) {
              throw new Error(`Serper API returned ${searchFetch.status}: ${searchFetch.statusText}`);
            }
            
            data = await searchFetch.json();
            
            // Cache the result for 1 hour if caching is enabled
            if (env && env.JACK_STORAGE) {
              await env.JACK_STORAGE.put(cacheKey, JSON.stringify(data), { expirationTtl: 3600 });
            }
          }
          
          // Process results
          const organicResults = data.organic || [];
          
          // Map results to standardized format
          let results = organicResults.map(result => {
            // Extract domain from URL
            let domain = '';
            try {
              const url = new URL(result.link);
              domain = url.hostname.replace(/^www\./, '');
            } catch (e) {
              // If URL parsing fails, extract domain using regex
              const match = result.link.match
