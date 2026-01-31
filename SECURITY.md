# Security Fixes

Resolved vulnerabilities and how they were fixed. These issues were identified by Dependabot and CodeQL; fixes are applied at the package level (overrides) or by replacing vulnerable dependencies.

## Resolved Issues

### Undici (Moderate) - Unbounded decompression chain

**Vulnerability:** Content-Encoding decompression in Node.js Fetch API can lead to resource exhaustion (DoS).

**Affected bots:** coding-practice-bot, grammar-bot, reddit-filter-bot, todoist bot, youtube-monitor-bot

**Source:** Transitive dependency via discord.js -> @discordjs/rest -> undici

**Resolution:** npm `overrides` to force undici >= 6.23.0 in each bot's package.json.

**Why override:** discord.js pins an older undici; the package maintainers have not yet released a discord.js version that bumps it. Overriding is safe because undici's API is stable and the patched version is backward-compatible.

---

### form-data (Critical) - Unsafe random boundary

**Vulnerability:** Uses unsafe random function for multipart form boundary generation.

**Affected bots:** reddit-filter-bot (via snoowrap -> request -> form-data)

**Resolution:** Replaced snoowrap entirely (see request, below). snoowrap is archived and depended on request, which pulled in vulnerable form-data. No longer applicable.

---

### qs (High) - DoS via arrayLimit bypass

**Vulnerability:** Bracket notation arrayLimit bypass allows memory exhaustion.

**Affected bots:** reddit-filter-bot (via snoowrap -> request -> qs)

**Resolution:** Replaced snoowrap. No longer applicable.

---

### ws (High) - DoS with many HTTP headers

**Vulnerability:** DoS when handling requests with many HTTP headers.

**Affected bots:** reddit-filter-bot (via discord.js -> @discordjs/ws -> ws)

**Resolution:** npm `overrides` to force ws >= 8.19.0 in reddit-filter-bot/package.json.

**Why override:** discord.js pins an older ws; override ensures the patched version is used without upgrading discord.js (which could introduce breaking changes).

---

### tough-cookie (Moderate) - Prototype pollution

**Vulnerability:** Prototype pollution in cookie parsing.

**Affected bots:** reddit-filter-bot (via snoowrap -> request -> tough-cookie)

**Resolution:** Replaced snoowrap. No longer applicable.

---

### request (Moderate) - Server-Side Request Forgery

**Vulnerability:** SSRF when following redirects or fetching user-controlled URLs.

**Affected bots:** reddit-filter-bot (via snoowrap)

**Resolution:** Replaced snoowrap with direct Reddit API calls using axios. The reddit-filter-bot now uses Reddit OAuth2 (password grant) and axios for verifySubreddit and getNewPosts. No user-controlled URLs are passed to any HTTP client; only fixed Reddit API endpoints are called.

**Why replace:** The request package is deprecated and unmaintained with no patched version. snoowrap is archived and depends on request. Replacing with axios + direct API calls removes the dependency and eliminates the SSRF surface.

---

## CodeQL Fixes (Non-Package)

### Deploy workflow - Missing permissions

**Issue:** `actions/missing-workflow-permissions`

**Resolution:** Added explicit `permissions: contents: read` to the deploy job in `.github/workflows/deploy.yml`.

**Why:** CodeQL recommends least-privilege; declaring permissions makes the workflow's access explicit.

---

### github_service.py - Incomplete URL substring sanitization

**Issue:** `py/incomplete-url-substring-sanitization` - Using `"github.com" in url` can be bypassed (e.g. evil.github.com).

**Resolution:** Use `urllib.parse.urlparse` and validate `hostname in ("github.com", "www.github.com")` before extracting owner/repo.

**Why:** Substring checks allow bypass via malicious hostnames; proper URL parsing with host validation prevents SSRF.

---

### youtube-monitor add.js - Incomplete URL substring sanitization

**Issue:** `js/incomplete-url-substring-sanitization` - Using `channelInput.includes('youtube.com')` can be bypassed.

**Resolution:** Parse input with `new URL()` and check hostname against an allowlist (youtube.com, www.youtube.com, m.youtube.com, youtu.be).

**Why:** Same as above; hostname validation prevents redirect or SSRF via crafted URLs.

---

## Maintenance

- **Dependabot:** Configured in `.github/dependabot.yml` for weekly npm and pip updates. Merge security PRs promptly.
- **Overrides:** When adding overrides, document them here and verify with `npm audit` after `npm install`.
- **Python bots:** No known vulnerabilities in current pip dependencies; Dependabot will open PRs if any are found.
