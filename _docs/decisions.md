# Architecture Decision Records

> Living document. New ADRs are appended as decisions are made during development.

---

## ADR-001: Use Google Gemini 2.5 Flash for NLP Parsing

**Status:** Accepted
**Date:** 2026-03-12

### Context

The app needs to convert free-form text like "cheap sushi in downtown LA open now" into structured search parameters (`query`, `near`, `price`, `open_now`). Three approaches were considered.

### Decision

Use **Google Gemini 2.5 Flash** via the `@google/genai` SDK with **structured output mode** (`responseMimeType: 'application/json'` + `responseJsonSchema`).

### Rationale

- **Structured output mode** — The SDK guarantees the response is valid JSON matching our schema. No `JSON.parse` failures, no stripping markdown fences, no regex cleanup.
- **Speed** — Flash model averages ~200-400ms, well within acceptable latency for a search request.
- **Cost** — $0.30/1M input tokens. For short messages (10-30 tokens), effectively free.
- **Existing access** — Developer already has Google AI Ultra subscription with $100/mo in credits.
- **Low temperature (0.1)** — Makes output deterministic. Same input → same parameters every time.

### Alternatives Considered

| Alternative                               | Why Rejected                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **OpenAI GPT-4o-mini**                    | No existing account. Adds billing overhead. Similar quality for this use case.                         |
| **Groq (free tier)**                      | Free but less reliable for structured extraction. No native JSON mode guarantee.                       |
| **Regex / keyword parsing**               | Brittle. Can't handle "not too pricey Italian near Times Square" — requires understanding of nuance.   |
| **Hybrid (LLM primary + regex fallback)** | Excellent idea. Deferred to post-MVP. Adds complexity without immediate benefit.                       |
| **Function calling mode**                 | Heavier API pattern designed for multi-tool agentic workflows. Overkill for single-purpose extraction. |

### Consequences

- **External dependency** — If Gemini is down, the app can't parse requests. Mitigated by retry logic (2 retries).
- **Latency** — Adds ~200-500ms per request. Acceptable for search UX. Could cache LLM output post-MVP.
- **Post-MVP improvement** — Add regex-based fallback parser so the app degrades gracefully if the LLM is unavailable.

---

## ADR-002: Double Validation — SDK Schema + Zod

**Status:** Accepted
**Date:** 2026-03-12

### Context

The Gemini SDK's `responseJsonSchema` guarantees the response _structure_ matches (correct types, correct field names). But it does NOT guarantee _business-valid values_ — e.g., `price: 7` is a valid number but not a valid price level (1-4).

### Decision

Apply **two layers of validation** (later extended to five — see [ADR-014](#adr-014-unicode-sanitization-pre-processor) and [ADR-015](#adr-015-five-layer-defense-pipeline-prompt-injection--output-filtering)):

1. **Layer 1 — SDK schema** — Guarantees JSON structure (types, field names)
2. **Layer 2 — Zod schema** — Validates business rules (price 1-4, limit 1-50, non-empty strings)
3. **Layer 0 — Unicode sanitization** — _(Added in ADR-014)_ Strips adversarial characters before the LLM sees the input
4. **Pre-screen — Injection detection** — _(Added in ADR-015)_ Regex catches known injection patterns before LLM call
5. **Post-gate — Output filtering** — _(Added in ADR-015)_ Checks for system prompt leakage and PII in output

### Rationale

- Defense-in-depth is standard practice when consuming external/untrusted data.
- The LLM is a black box — even with structured output, the _values_ it chooses are non-deterministic.
- Zod validation is cheap (~0ms) and catches edge cases before they reach Foursquare.
- The Zod schema also serves as runtime documentation of what "valid parameters" means.

### Alternatives Considered

| Alternative                            | Why Rejected                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| Trust SDK schema alone                 | Values like `price: 99` would pass through to Foursquare, causing confusing empty results. |
| Validate only with Zod (no SDK schema) | Would need to handle malformed JSON, missing fields, wrong types manually.                 |

### Consequences

- Small amount of code duplication (schema defined in both Gemini format and Zod format).
- But each serves a different purpose: Gemini schema describes what the LLM should return; Zod schema enforces what our business logic accepts.

---

## ADR-003: Code-Gate Middleware (Adapted from Auth Middleware Pattern)

**Status:** Accepted
**Date:** 2026-03-12

### Context

The spec requires validating `code === 'pioneerdevai'` before processing any request. The flux-ai-be codebase uses an `authMiddleware` pattern that validates sessions via `better-auth` and attaches user data to the request.

### Decision

Retain the **middleware pattern** but replace the `better-auth` session logic with simple string comparison. The code-gate middleware runs before the controller, same as `authMiddleware` does in flux-ai-be.

```typescript
// code-gate.middleware.ts
export const codeGateMiddleware = (req, _res, next) => {
  if (req.query.code !== 'pioneerdevai') {
    throw new UnauthorizedError('Invalid or missing access code');
  }
  next();
};
```

### Rationale

- **Familiar pattern** — Same middleware-first approach used in the existing codebase. Shows architectural consistency.
- **Separation of concerns** — Auth logic lives in middleware, not in the controller. Controller only handles business logic.
- **Reusable** — If more routes are added, just apply the middleware to them.
- **Error standardization** — Uses `UnauthorizedError` → flows through `errorHandler` → returns RFC 7807 response. Consistent with all other errors.

### Alternatives Considered

| Alternative                              | Why Rejected                                          |
| ---------------------------------------- | ----------------------------------------------------- |
| Validate code inside the controller      | Mixes auth concern with business logic.               |
| Use a header-based API key               | Spec explicitly requires `code` as a query parameter. |
| Environment-variable code (configurable) | Over-engineering. The spec hardcodes `pioneerdevai`.  |

### Consequences

- The `code` is visible in URLs and server logs. Acceptable because this is a coding challenge, not a production auth system.
- Post-MVP improvement: Could move to a proper API key header (`Authorization: Bearer <key>`) for production use.

---

## ADR-004: No Database — Stateless Pass-Through Architecture

**Status:** Accepted
**Date:** 2026-03-12

### Context

The flux-ai-be stack includes Prisma + PostgreSQL. We need to decide whether the restaurant finder needs a database.

### Decision

**Strip the database entirely.** The app is a stateless pass-through: message in → structured parameters → Foursquare search → results out. No data is persisted.

### Rationale

- There is nothing to store in MVP. No user accounts, no saved searches, no favorites.
- Removing Prisma, `@prisma/client`, `pg`, `pg-boss`, and all DB config significantly simplifies the project.
- Reduces deployment complexity — no need to provision a database.
- Faster cold starts — no DB connection pool to initialize.

### Post-MVP Improvements (to discuss in interview)

If this were a real product, a database would enable:

| Feature                       | Why DB is needed                                                               |
| ----------------------------- | ------------------------------------------------------------------------------ |
| **Query logging / analytics** | Track what users search for, popular cuisines, common locations                |
| **Response caching**          | Store Foursquare results for identical queries to reduce latency and API costs |
| **User accounts + favorites** | Save preferred restaurants, search history                                     |
| **Rate limiting per user**    | More granular than IP-based rate limiting                                      |

### Consequences

- No data persistence between requests.
- No query analytics.
- Every request pays the full LLM + Foursquare latency cost (no caching).
- These are all acceptable tradeoffs for a coding challenge MVP.

---

## ADR-005: Monorepo with Subdirectory Deployment

**Status:** Accepted
**Date:** 2026-03-12

### Context

The project has a frontend (React + Vite) and backend (Express + Bun). They could be in separate repos or a single repo. Both need to be deployed independently.

### Decision

Single monorepo with `server/` and `client/` subdirectories, deployed as separate services using the platform's **Root Directory** feature.

```
restaurant-finder/
├── server/     ← Backend (Render/Railway service, root: /server)
├── client/     ← Frontend (Render/Vercel service, root: /client)
├── _docs/      ← SDD docs, ADRs
└── README.md   ← Project overview
```

### Rationale

- **One repo = one PR = one review** — evaluators clone one repo and see everything.
- **Shared git history** — shows coherent development across FE and BE together.
- **All platforms support it** — Render, Railway, and Vercel all support setting a Root Directory per service. Standard pattern.
- **Simpler CI/CD** — one set of GitHub Actions if needed.

### Alternatives Considered

| Alternative          | Why Rejected                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Two separate repos   | Evaluators need to clone two repos. Git history is split. More overhead.                   |
| Next.js (all-in-one) | Doesn't match existing stack (Express + separate React). Would need to learn new patterns. |

### Consequences

- Each deployment service must have its Root Directory correctly configured.
- Frontend needs `VITE_API_URL` env var pointing to the deployed backend URL.

---

## ADR-006: No React Router for Single-Page App

**Status:** Accepted
**Date:** 2026-03-12

### Context

The frontend has exactly one view: search bar + results. The flux-ai-fe template uses React Router 7 with multiple routes.

### Decision

Remove React Router entirely. Render everything in a single `App.tsx`. Configure the static host with SPA fallback (`/*` → `index.html`).

### Rationale

- Zero routes to define = zero routing bugs.
- Removes `react-router` dependency (~45KB gzipped).
- SPA fallback (a one-line deploy config) handles any manual URL entry gracefully — it always loads the app.

### Alternatives Considered

| Alternative                                     | Why Rejected                                         |
| ----------------------------------------------- | ---------------------------------------------------- |
| Keep React Router with single route + catch-all | Extra boilerplate for no benefit.                    |
| Add multiple routes (search, about, etc.)       | Over-scoping. The spec asks for a simple, usable UI. |

### Consequences

- If subroutes are needed post-MVP (e.g., `/restaurant/:id` detail page), React Router would need to be re-added.
- Users who type invalid URLs see the main app (good — search is always accessible).

---

## ADR-007: Three-Tier Location Fallback with geoip-lite

**Status:** Accepted
**Date:** 2026-03-13

### Context

Users can search with queries like "ramen" (no location) or "sushi near me" (vague location). The LLM extracts a `near` field, but it can be empty when no location is mentioned. Without a location, Foursquare returns an error, and the user sees a 400 failure.

### Decision

Implement a **three-tier location priority chain**:

```
1. LLM-extracted "near" → Foursquare's "near" param (text-based, e.g., "Makati City")
2. Browser geolocation "ll" → Foursquare's "ll" param (lat,lng from navigator.geolocation)
3. IP geolocation via geoip-lite → Foursquare's "ll" param (city-level lat,lng from IP)
4. If all three fail → 400 error with MISSING_LOCATION reason
```

- **Tier 1 (LLM `near`)** takes absolute priority — if the user says "pizza near Makati City", Foursquare searches Makati City even if the user's browser is in Cebu.
- **Tier 2 (browser `ll`)** — Zustand store requests `navigator.geolocation` on app mount. The API function reads it imperatively (no subscription, no re-renders) and passes `ll` as a query param.
- **Tier 3 (IP geoip)** — `geoip-lite` npm package bundles the MaxMind GeoLite2 database locally. Zero API calls, zero latency, zero rate limits. City-level accuracy (~5-50km). Handles IPv6-mapped prefixes, skips private/loopback IPs.

### Rationale

- **Best UX** — Users can type "ramen" and get results near them without ever mentioning a city.
- **No external API dependency** — `geoip-lite` uses a local database file, so IP geolocation works offline and doesn't add latency.
- **Progressive degradation** — Each tier is a fallback for the one above. The MISSING_LOCATION error is a last resort.
- **LLM text always wins** — A user in Cebu typing "pizza near Makati" gets Makati results, not Cebu results. This avoids the confusion of browser coordinates overriding explicit intent.

### Alternatives Considered

| Alternative                               | Why Rejected                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Browser geolocation only**              | Users who deny permission get no fallback.                                                       |
| **IP-based API (ip-api.com, ipinfo.io)**  | External API call adds latency and rate limits. `geoip-lite`'s local DB is faster and unlimited. |
| **Default city fallback (e.g., Manila)**  | Wrong for most users. A hardcoded default is a bad UX.                                           |
| **Require location in every search**      | Friction. Users expect "ramen" to just work.                                                     |
| **Ask the user to set location manually** | Good UX pattern but adds UI complexity. Deferred to post-MVP.                                    |

### Consequences

- `geoip-lite` adds ~60MB to `node_modules` (MaxMind GeoLite2 DB). Server-side only, doesn't affect client bundle.
- IP geolocation is city-level, not street-level. Acceptable for restaurant search (we just need the right metro area).
- Local development on `127.0.0.1` / `::1` will skip IP geolocation (private IPs don't resolve). Browser geolocation covers this.
- The MaxMind DB in `geoip-lite` is bundled and updated periodically with new npm versions. Not real-time accurate.

> **Amendment (2026-03-15):** A fourth path was added alongside the three-tier chain: when Tier 1 (`near`) is provided but Foursquare cannot geocode it (ambiguous district abbreviation), the request now follows the `AMBIGUOUS_LOCATION` error path — see [ADR-019](#adr-019-two-layer-ambiguous-location-fix). `geoip-lite` is also used in that path to derive the country-based suggestion string.

---

## ADR-008: Three-Tier Error Display Strategy

**Status:** Accepted
**Date:** 2026-03-13

### Context

The original `ErrorDisplay` component showed a single alarming red error panel for all errors. This was too aggressive for user-side mistakes (typos, missing location) which are not system failures.

### Decision

Use **four-tier error display** based on error type (updated 2026-03-15 — see [ADR-019](#adr-019-two-layer-ambiguous-location-fix)):

| Tier               | Condition                                      | Icon          | Style                    | Message                                                   |
| ------------------ | ---------------------------------------------- | ------------- | ------------------------ | --------------------------------------------------------- |
| Ambiguous location | `400` + `meta.reason === 'AMBIGUOUS_LOCATION'` | MapPin        | Subtle gray text         | "Couldn't pinpoint X. Did you mean: X, Philippines?" chip |
| Missing location   | `400` + `meta.reason === 'MISSING_LOCATION'`   | MapPinOff     | Subtle gray text         | "Include a city, or enable location access"               |
| Bad request        | `400` (other)                                  | SearchX       | Subtle gray text         | "Try something like 'sushi in downtown LA'"               |
| Server error       | `500`, network errors                          | AlertTriangle | Red panel + retry button | Error details + "Try again"                               |

### Rationale

- **User-side errors (400s)** are the user's fault — a gentle hint to rephrase is more helpful than a scary error.
- **`MISSING_LOCATION`** is a specific, actionable error — the user can either add a city or enable geolocation. A dedicated message for this guides the user.
- **Server errors (500s, network)** are system failures — the red panel with retry is appropriate because the user can't fix it themselves.
- The backend passes `meta.reason: 'MISSING_LOCATION'` so the frontend can distinguish error types without parsing error message strings.

### Consequences

- Frontend depends on the `meta.reason` field from the backend. If new error reasons are added, the frontend needs corresponding handling.
- The gentle 400 messages don't include a "Try again" button — the user is expected to rephrase and re-submit via the search bar.

---

## ADR-009: Non-Food Query Detection with Fail-Open Default

**Status:** Accepted
**Date:** 2026-03-13

### Context

The app is a restaurant finder, but users may type non-food queries like "nearest gas station" or "ATMs near me". Without detection, the LLM still extracts a `query` and `near`, and Foursquare returns irrelevant results or empty sets.

### Decision

Add an `is_food_related: boolean` field to the LLM structured output schema. The system prompt classifies queries as food-related or not. When the LLM returns `is_food_related: false`, the backend throws a `BadRequestError` with `reason: 'NOT_FOOD_RELATED'`, and the frontend shows a dedicated hint.

**Critical design choice:** The system prompt instructs the LLM to **"when in doubt, set `is_food_related` to true"** — a **fail-open** default.

### Rationale: Fail-Open vs. Fail-Closed

This is a classic **false positive vs. false negative trade-off**:

| Failure Mode                                 | What Happens                                                                     | Severity                      |
| -------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------- |
| **False positive** (non-food passes through) | Foursquare returns few/no results → user sees empty state → rephrases            | Mild annoyance                |
| **False negative** (food gets blocked)       | Valid query rejected → user told "this isn't about food" → **broken experience** | Frustrating, feels like a bug |

**Industry standard for search/discovery apps is fail-open:**

| Product              | Behavior                                            | Default    |
| -------------------- | --------------------------------------------------- | ---------- |
| Google Search        | Processes any query, never says "not valid"         | Permissive |
| Uber Eats / DoorDash | "gas" → shows "Gas Monkey Bar & Grill"              | Permissive |
| ChatGPT / Claude     | Responds unless safety guardrail hit                | Permissive |
| Yelp                 | Searches anything — restaurants, plumbers, dentists | Fully open |

**Fail-closed** is appropriate for **security and moderation** (fraud detection, content moderation). **Fail-open** is appropriate for **search and discovery** — which is what we are.

### Alternatives Considered

| Alternative                             | Why Rejected                                                       |
| --------------------------------------- | ------------------------------------------------------------------ |
| No detection at all                     | Non-food queries return confusing empty results with no guidance   |
| Fail-closed default (block when unsure) | Risks blocking legitimate food queries ("boba", "poke", "izakaya") |
| Keyword blocklist                       | Brittle, doesn't scale, misses nuance                              |
| Separate classification API call        | Adds latency and cost for a low-priority concern                   |

### Consequences

- Edge cases like "coffee shop" or "bubble tea" correctly pass through (food-related).
- A truly non-food query ("car wash") that slips through just returns empty results — harmless.
- The LLM classification is not perfect, but the fail-open default ensures valid food queries are never incorrectly blocked.
- Frontend has a fourth error tier: `NOT_FOOD_RELATED` → `UtensilsCrossed` icon with food-specific hint.

---

## ADR-010: Per-Route Rate Limiting on /api/execute

**Status:** Accepted
**Date:** 2026-03-14

### Context

Each call to `/api/execute` triggers two paid API calls: Gemini (LLM parsing) and Foursquare (place search). The existing global rate limiter (100 requests / 15 minutes per IP) applies to all routes equally, including `/health`. An attacker who knows the access code could fire 100 searches in 15 minutes, consuming significant API budget (~$1–10/day, scaling to ~$100+/day sustained).

### Decision

Add a **per-route rate limiter** on `/api/execute` with a stricter threshold: **10 requests per minute per IP**. The global limiter remains as an outer defense layer for all routes.

### Rationale

- **Budget protection** — Caps the most expensive endpoint independently from cheap routes like health checks.
- **Layered defense** — Global limiter handles broad abuse; route limiter targets the costly pipeline.
- **No user impact** — 10 searches/minute is generous for normal usage. A real user rarely exceeds 2-3 searches/minute.
- **Test compatibility** — Rate limiter is skipped in test mode (`NODE_ENV=test`), same pattern as the global limiter.

### Alternatives Considered

| Alternative              | Why Rejected                                                       |
| ------------------------ | ------------------------------------------------------------------ |
| Lower global limit only  | Would throttle health checks and future lightweight endpoints      |
| Per-access-code limiting | All users share the same code — no differentiation possible        |
| Token bucket algorithm   | Over-engineered for current traffic; `express-rate-limit` suffices |

### Consequences

- Middleware chain for `/api/execute` is now: code-gate → executeLimiter → validation → controller.
- Constants live in `app.constants.ts` (`EXECUTE_RATE_LIMIT`) for easy tuning.
- A user exceeding 10 req/min gets a `429` with message: "Too many searches. Please slow down and try again."

---

## ADR-011: Conditional Upstream Error Meta (Dev vs Production)

**Status:** Accepted
**Date:** 2026-03-14

### Context

When the Foursquare API returns an error, the backend captures the raw error response body (including internal API parameter names, account tier info, and version details) and includes it in the `meta` field of the RFC 7807 error response sent to the client.

This is useful for debugging during development (the frontend developer can see exactly what Foursquare rejected), but constitutes **information leakage** in production — exposing internal API details to potential attackers.

### Decision

Include the raw Foursquare error body in `meta.foursquareBody` **only when `NODE_ENV=development`**. In production, `meta` contains only the HTTP status code (`foursquareStatus`). The full error body is always logged server-side regardless of environment.

### Rationale

- **DX in development** — Frontend developers can diagnose Foursquare failures without checking backend logs.
- **Security in production** — Internal API details (parameter names, account tier, version) are not exposed to end users.
- **Server-side logging unaffected** — The `logger.error()` call captures the full error body in all environments, so no debugging information is lost.

### Alternatives Considered

| Alternative              | Why Rejected                                                     |
| ------------------------ | ---------------------------------------------------------------- |
| Always include full meta | Information leakage risk in production                           |
| Never include error body | Hurts DX — developers must check server logs for every FSQ error |
| Separate debug endpoint  | Over-engineered for a coding test; adds surface area             |

### Consequences

- Error responses in production are "opaque" — they confirm a failure occurred but not why.
- Developers must set `NODE_ENV=development` locally to see full Foursquare error details.
- Same pattern can be extended to Gemini API errors if needed in the future.

---

## ADR-012: Foursquare Relevance Sort + Frontend Distance Default

**Status:** Accepted
**Date:** 2026-03-14

### Context

Foursquare's Place Search API supports two sort modes: `RELEVANCE` (popularity/quality weighted) and `DISTANCE` (proximity only). The frontend currently re-sorts all results by distance via TanStack Query's `select` callback, which overwrites whatever ordering Foursquare returned.

This creates a conflict: if we ask Foursquare for relevance-sorted results then immediately discard that ordering on the client, the quality signal is lost. But if we use distance sort at the API level, we lose popularity weighting and might surface obscure places over well-known ones.

### Decision

1. **Keep `sort: 'RELEVANCE'` on the Foursquare API call** — every search already has a location scope (`near` or `ll`), so Foursquare returns popular/quality-weighted results within that area.
2. **Default the frontend sort to distance** (current behavior via `select` callback) — gives users a "nearest first" view, which is the most practical default.
3. **Backlog: Add a dynamic sorting UI toggle** — let users switch between Distance, Relevance (original Foursquare order), and Name (alphabetical) without refetching, using TanStack Query's `select`.

### Rationale

- Foursquare's relevance sort is the better data source — it considers popularity, reviews, and match quality, not just coordinates.
- Requesting `sort: 'DISTANCE'` from Foursquare would be redundant since the frontend already sorts by distance. Worse, it would lose the quality signal entirely — there'd be no way to recover it without re-fetching.
- By keeping relevance data in the cache and sorting on the client, we preserve both signals and can offer user choice with zero network cost.

### Alternatives Considered

| Alternative                  | Why Rejected                                                    |
| ---------------------------- | --------------------------------------------------------------- |
| Foursquare `sort: DISTANCE`  | Redundant with frontend sort; permanently loses quality signal  |
| No frontend sort (trust FSQ) | Distances appear random to user; poor UX for "find nearest" use |
| Hybrid bucket sort           | Complex to implement; quality signal is subjective per user     |

### Consequences

- The cached response always contains Foursquare's relevance ordering — switching sort modes on the frontend is instant and free.
- The default "nearest first" view may push a popular place down the list if it's farther away. This is an acceptable tradeoff for a location-first app.
- Dynamic sorting UI (future backlog item) will reuse the same `select` pattern with zero refetch.

---

## ADR-013: Layered Timeout Budget

**Status:** Accepted
**Date:** 2026-03-14

### Context

The backend orchestrates two external API calls (Gemini + Foursquare) per search request. Without server-side timeouts, a hanging upstream service can block the Express event loop for minutes. The frontend has a 30s ky timeout, but when it fires, the backend keeps running — wasting resources on a response nobody will receive.

### Decision

Implement a **layered timeout budget** where each layer is shorter than its parent:

| Layer                    | Timeout | Responsibility                                  |
| ------------------------ | ------- | ----------------------------------------------- |
| Client (ky)              | 30s     | Outer boundary — user sees error                |
| Express middleware       | 20s     | Server responds with 504 before client gives up |
| Gemini (AbortController) | 15s     | Abort LLM call if hanging                       |
| Foursquare (ky default)  | 10s     | HTTP client timeout                             |
| Browser geolocation      | 10s     | Non-blocking, separate from request chain       |

### Rationale

- Each timeout is shorter than its parent, so the **inner layer always fires first**. This prevents orphaned work.
- 15s for Gemini Flash is generous (typical: 200-800ms). If it hasn't responded in 15s, it's not going to.
- Express 20s > Gemini 15s means the server has 5s of headroom to catch the Gemini timeout, format the error, and respond cleanly rather than hitting a raw 504.
- Client 30s > Express 20s means the server always responds first — the client never has to guess whether the server crashed or is just slow.

### Alternatives Considered

| Alternative                        | Why Rejected                                                     |
| ---------------------------------- | ---------------------------------------------------------------- |
| Single global timeout              | Can't differentiate between Gemini and Foursquare failures       |
| No server timeout (rely on client) | Server wastes resources on responses nobody will receive         |
| Shorter timeouts (5s Gemini)       | Flash can occasionally take 2-3s on long queries; too aggressive |

### Consequences

- Changing any single timeout requires understanding the full cascade. Document the budget in code comments.
- The `AbortSignal` cancels the client HTTP request but Gemini may still process the prompt server-side (and charge for it).
- Future endpoints that don't call external APIs inherit the 20s Express timeout unnecessarily — acceptable overhead.

---

## ADR-014: Unicode Sanitization Pre-Processor

**Status:** Accepted
**Date:** 2026-03-15

### Context

An NLP fuzzing audit (Phase 4.11) revealed that adversarial Unicode input can silently degrade search quality. Zalgo text (combining diacritical marks stacked on base characters), zero-width joiners/non-joiners, null bytes, and variation selectors all pass the existing validation pipeline — Zod's `min(2)` / `max(500)` counts them as normal characters, and Gemini's structured output mode returns valid JSON. But the _values_ inside that JSON are corrupted: a Zalgo-mangled `"s̸u̷s̷h̴ì"` passes Zod's `min(1)` on `query`, yet Foursquare returns zero results for it.

This is a **silent failure** — no error is thrown, the user just sees an empty result set with no explanation.

### Decision

Add a **Unicode sanitization layer** (`sanitizeUnicode()`) that runs _before_ the message reaches Gemini. This becomes **Layer 0** in the validation pipeline (see [ADR-002](#adr-002-double-validation--sdk-schema--zod)), promoting it from double to triple validation:

```text
Layer 0: sanitizeUnicode()     → strips adversarial characters
Layer 1: Gemini SDK schema     → guarantees JSON structure
Layer 2: Zod schema            → validates business rules
```

The sanitizer strips:

| Category                                | Unicode Range         | Why Removed                                     |
| --------------------------------------- | --------------------- | ----------------------------------------------- |
| Combining diacritical marks (Zalgo)     | U+0300–U+036F, U+0489 | Corrupts base words → garbage API queries       |
| Zero-width characters (ZWSP, ZWNJ, ZWJ) | U+200B–U+200D, U+FEFF | Invisible padding, wastes LLM tokens            |
| Null bytes                              | U+0000                | Can truncate strings or break JSON parsing      |
| Variation selectors                     | U+FE00–U+FE0F         | No semantic value, confuses downstream matching |

The sanitizer also collapses multiple whitespace characters into a single space and trims. If the sanitized string is fewer than 2 characters, `parseMessage()` throws a `BadRequestError` immediately — skipping the LLM call entirely.

The sanitizer does **NOT** remove:

- **Emojis** — They carry semantic meaning (🍣 → "sushi") and the LLM prompt has explicit emoji translation rules.
- **Non-Latin scripts** — Arabic, CJK, Cyrillic, Devanagari are all valid input languages.
- **Standard diacritics** — Characters like é, ñ, ü are part of real words, not Zalgo.

### Rationale

- **Pre-LLM is the right place** — Sanitizing before Gemini sees the input prevents garbage-in-garbage-out. Post-LLM sanitization would be too late: the LLM would already return corrupted `query`/`near` values.
- **Targeted stripping** — Only characters with zero semantic value are removed. This avoids the false-positive risk of over-sanitizing legitimate multilingual input.
- **Cost savings** — Rejecting pure-Zalgo or pure-ZWSP inputs at Layer 0 avoids wasting a Gemini API call (~$0.30/1M tokens) on input that would produce unusable output.
- **Complements existing prompt rules** — The SYSTEM*INSTRUCTION already handles emoji translation, slang, and multilingual text. The sanitizer handles what the LLM \_cannot* — invisible/corrupted characters that survive tokenization.

### Alternatives Considered

| Alternative                                      | Why Rejected                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Trust the LLM to handle Zalgo                    | Gemini sometimes passes through combining marks verbatim → silent 0-result failures |
| Full Unicode normalization (NFC/NFD)             | Too aggressive — would alter legitimate CJK and diacritical input                   |
| Allowlist approach (only permit certain scripts) | Blocks legitimate scripts we haven't anticipated; fails-closed                      |
| Post-LLM sanitization of `query`/`near` values   | Too late — the LLM already misinterpreted the corrupted input                       |

### Consequences

- The validation pipeline is now triple-layered: sanitize → SDK schema → Zod. All three are cheap (<1ms combined for non-LLM layers).
- Edge case: a user who _intentionally_ uses combining marks in a legitimate way (e.g., Vietnamese tonal marks) could have them stripped. In practice, JavaScript regex `[\u0300-\u036F]` covers combining marks that overlay existing characters (Zalgo), not precomposed Vietnamese characters like `ệ` which are single code points.
- The `SYSTEM_INSTRUCTION` was also expanded in this phase with emoji handling, location translation, expanded `open_now` triggers, and contradiction handling rules — these are prompt tuning, not architectural decisions, so they are tracked in the Phase 4.11 changelog rather than a separate ADR.

---

## ADR-015: Five-Layer Defense Pipeline (Prompt Injection + Output Filtering)

**Status:** Accepted
**Date:** 2026-03-15

### Context

The LLM pipeline used a triple-validation pattern (Unicode sanitization → SDK schema → Zod). A security research audit (Concept 09) identified three unimplemented defenses: prompt injection detection, output filtering, and token usage monitoring. While the structured output mode (JSON schema constraint) provides strong structural protection — the model physically cannot output free-form text — additional pre-screen and post-validation guards were identified as low-cost improvements.

### Decision

Upgrade the pipeline from triple-validation to a **five-layer defense**:

```
detectInjection(message)        Pre-screen: regex catches known injection patterns
  ↓
sanitizeInput(message)          Stage 1: strips adversarial unicode
  ↓
callLlm(sanitized)              Stage 2: Gemini SDK enforces JSON schema shape (+ token logging)
  ↓
validateAndNormalize(raw)       Stage 3: Zod enforces business rules + food guard
  ↓
guardOutput(params)             Post-gate: checks for prompt leakage + PII in output
```

**Layer details:**

| Layer      | Function                   | What it catches                                                            | Performance                          |
| ---------- | -------------------------- | -------------------------------------------------------------------------- | ------------------------------------ |
| Pre-screen | `detectInjection`          | Common injection phrases ("ignore instructions", "you are now", "system:") | ~0.01ms (regex on ≤500 chars)        |
| Post-gate  | `guardOutput`              | System prompt leakage in output fields, PII (phone/email) in output        | ~0.01ms (regex + string search)      |
| Monitoring | Token logging in `callLlm` | Anomalous input/output token ratios (jailbreak signal)                     | ~0ms (reads existing response field) |

**Architectural choice:** `detectInjection` is **exported** from `llm.service.ts` and called in `execute.service.ts` (not inside `parseMessage`). This ensures:

- Injection detection runs even when `parseMessage` is mocked in integration tests
- The service layer controls the call order (injection check → LLM parse)
- Both functions remain independently testable

### Rationale

- **Total latency impact: negligible** — All three features are pure CPU operations on short strings. The LLM call (~200–800ms) dominates by 4 orders of magnitude.
- **Pre-screen is a "speed bump"** — Regex-based injection detection catches low-effort attacks and saves API credits. It is not a silver bullet; determined attackers can rephrase. The real structural defense remains the JSON-schema-constrained output.
- **Output filtering is defense-in-depth** — Even though structured output mode prevents free-form leakage, checking for system prompt keywords in the `query`/`near` fields catches edge cases where the LLM echoes fragments of the system instruction as "food types."
- **Token monitoring is passive** — Zero overhead, creates an audit trail for forensic analysis without affecting request latency.

### Alternatives Considered

| Alternative                                              | Why Rejected                                                                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ML-based injection classifier (Rebuff, fine-tuned model) | Adds latency and complexity. Regex pre-screen is sufficient for current threat model.                                      |
| Inject detection inside `parseMessage` only              | Integration tests mock `parseMessage`, bypassing detection. Exporting and calling separately ensures testability.          |
| Block all queries containing "system"                    | Too aggressive — "sushi restaurant with sound system" would be rejected. Pattern-based detection is more precise.          |
| Skip output filtering (trust structured output)          | Structured output constrains the shape but not the values. The LLM can still echo system prompt fragments as field values. |

### Consequences

- The `INJECTION_PATTERNS` array is static and requires manual updates for new attack vectors. A production system would benefit from a dynamic blocklist or ML classifier.
- `guardOutput` checks only `query` and `near` fields. Other fields (`price`, `open_now`, `limit`) are numeric/boolean and inherently safe from text-based leakage.
- Frontend error handling already covers the new `PROMPT_INJECTION` and `OUTPUT_FILTERED` reason codes via the existing generic 400 handler (`SearchX` icon + rephrase hint). No frontend changes were needed.
- Test count increased from 38 to 42 (4 new injection detection integration tests).

---

## ADR-016: Few-Shot Prompting for Edge Case Accuracy

**Status:** Accepted
**Date:** 2026-03-15

### Context

The `SYSTEM_INSTRUCTION` used pure **zero-shot prompting** — detailed rules described in plain English, with no concrete examples. This works well for common queries but fails on edge cases:

- Price negations: `"not too pricey"` → LLM may return `price: 0` instead of `price: 2`
- Open-now slang: `"still serving"` → LLM may not recognize the open-now signal
- Abbreviations: `"DTLA"` → LLM may return `"DTLA"` literally instead of expanding it
- Emoji inputs: `"🍕 near times square"` → LLM may not translate the emoji to `"pizza"`
- Multilingual: `"拉麺 東京"` → LLM may not translate both food and location to English

### Decision

Add a **few-shot examples block** at the end of `SYSTEM_INSTRUCTION`, immediately before the user's message is processed. The block contains 6 representative examples covering the highest-value edge cases:

| Example                                               | Edge Case Demonstrated                           |
| ----------------------------------------------------- | ------------------------------------------------ |
| `"cheap sushi in downtown LA that's open now"`        | Baseline: price + location + open_now            |
| `"not too expensive ramen near me"`                   | Price negation → `price: 2`, empty near          |
| `"anything still serving in DTLA, something upscale"` | Slang → `open_now: true`, abbreviation expansion |
| `"🍕 near times square"`                              | Emoji → English food translation                 |
| `"find me a hospital"`                                | Non-food rejection → `is_food_related: false`    |
| `"拉麺 東京"`                                         | Multilingual → both fields translated to English |

Each example uses the **full 6-field schema** to reinforce the exact expected output shape.

### Rationale

- **OpenAI and Google's own guidance** both recommend few-shot examples for structured extraction tasks. Expected accuracy improvement on edge cases: 20–40%.
- **Token cost is predictable and modest**: ~80–120 tokens per example × 6 examples ≈ **~500 additional input tokens per request**. At Gemini 2.5 Flash pricing, this is fractions of a cent per call.
- **The system prompt was already ~700 tokens** — a ~70% increase in prompt size, but the accuracy gain on edge cases justifies it for a production-quality parser.
- **6 examples is the sweet spot**: enough to cover the major edge case categories without excessive token overhead.

### Alternatives Considered

| Alternative                    | Why Rejected                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep zero-shot, add more rules | Rules alone are less effective than examples for pattern recognition. Adding more rules increases token count without the same accuracy gain. |
| Fine-tuning the model          | Requires thousands of labeled examples and significant cost. Few-shot is 80% of the benefit at 1% of the cost.                                |
| 10+ examples                   | Diminishing returns beyond 6. Token cost scales linearly while accuracy gains plateau.                                                        |

### Consequences

- Prompt token count increases by ~500 tokens per request (from ~700 to ~1200).
- The examples block must be kept in sync with rule changes. If a rule is updated (e.g., new `open_now` trigger phrases), the examples may need updating too.

> **Amendment (2026-03-15):** A district expansion rule was added to `SYSTEM_INSTRUCTION` as part of [ADR-019](#adr-019-two-layer-ambiguous-location-fix) (Layer 1 prevention). The rule instructs the LLM to always expand neighborhood abbreviations and district names with city + country (e.g. `"BGC"` → `"Bonifacio Global City, Taguig, Philippines"`). This adds ~40 tokens per request.

---

## ADR-017: NER Heuristic Fallback for Gemini Unavailability

**Status:** Accepted
**Date:** 2026-03-15

### Context

The LLM (`parseMessage`) can fail when Gemini is down, times out (>15s), or returns rate-limit errors. Previously, this surfaced as a `BadRequestError` to the user — a dead end. The research audit (Concept 15) documented a full NER-based non-LLM parser using `compromise` + regex that handles the 80% common case.

### Decision

Implement a **try-LLM → catch → fallback-to-heuristic** pattern in `execute.service.ts`:

```typescript
try {
  searchParams = await parseMessage(message); // LLM
} catch (error) {
  if (error instanceof BadRequestError) throw error; // user's fault — don't fallback
  searchParams = await parseMessageHeuristic(message); // Gemini's fault — degrade gracefully
  parsedBy = 'heuristic';
}
```

The heuristic parser (`parseMessageHeuristic`) uses:

- **`compromise`** NLP library for location extraction (place tagging)
- **Regex `PRICE_MAP`** for price signal detection (cheap → 1, upscale → 3, etc.)
- **Tokenizer + stop word removal** for cuisine/query extraction
- **`OPEN_NOW_REGEX`** for availability phrases

A `parsedBy: 'llm' | 'heuristic'` field is included in `ExecuteResponse.meta` so the frontend can display a ⚡ "Quick mode" badge when the fallback ran.

### Rationale

- **Heuristic over a second LLM provider** — Zero cost, zero external dependencies when Gemini is down. No additional API key management. A more impressive engineering story than "I added OpenAI as backup."
- **`UpstreamError` vs `BadRequestError` branching** — `BadRequestError` (injection, non-food) is re-thrown because the heuristic would process the same bad input. `UpstreamError` (Gemini down) triggers the fallback because the input is fine, only the parser failed.
- **`parsedBy` transparency** — Feeds directly into the existing AI transparency pills (Concept 12), keeping the user informed about parsing quality.

### Alternatives Considered

| Alternative                        | Why Rejected                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| Second LLM provider (OpenAI)       | Requires separate API key, billing, SDK. Adds cost and secret management for a demo app. |
| Different Gemini model as fallback | Same API — if Gemini is down, all models are likely affected.                            |
| Return an error and let user retry | Poor UX. The heuristic handles common queries well enough to return useful results.      |
| Always use heuristic (skip LLM)    | Loses the 20% edge case accuracy (emoji, multilingual, negations) that the LLM handles.  |

### Consequences

- `compromise` is added as a production dependency (~350KB). It has zero dependencies itself.
- The heuristic cannot handle emoji, non-Latin scripts, negations, or food-relatedness checks. These edge cases will return degraded (but still functional) results.
- The `services/` directory was also restructured into feature folders (`llm/`, `foursquare/`) during this phase to accommodate the growing number of LLM-related files.

---

## ADR-018: Exponential Backoff with Full Jitter for LLM Retries

**Status:** Accepted
**Date:** 2026-03-15

### Context

The existing retry loop in `parseMessage` retried the Gemini call immediately on failure with no delay. This creates a thundering herd risk: if 100 users simultaneously hit a rate-limited Gemini endpoint, all of them retry instantly, making the rate limit worse. Adding exponential backoff required re-examining the entire timeout budget chain.

### Decision

Implement **exponential backoff with full jitter** between LLM retry attempts, and rebalance the per-call timeout from 15s to 8s to fit the budget.

**Timeout budget chain (updated):**

```text
Express server timeout:          20,000ms
  Attempt 1 LLM:          ≤ 8,000ms
  Backoff jitter (max):   ≤   200ms  (only fires between attempt 1 and 2)
  Attempt 2 LLM:          ≤ 8,000ms
  Foursquare + middleware: ≤ 2,000ms
  Total worst case:        ≈ 18,200ms  ← fits inside 20s ✅
```

**Backoff formula (full jitter per AWS recommendation):**

```typescript
const getBackoffDelay = (attempt: number): number => {
  const exponentialMax = BASE_DELAY_MS * Math.pow(2, attempt - 1);
  return Math.random() * exponentialMax; // random in [0, max]
};
```

With `BASE_DELAY_MS = 200` and `MAX_ATTEMPTS = 2`, only one inter-attempt delay ever fires (after attempt 1), with a max of ~200ms.

**Error classification (`isRetryableError`):**

| Error type                    | Retryable?  | Rationale                                   |
| ----------------------------- | ----------- | ------------------------------------------- |
| `AbortError` (our 8s timeout) | ❌ No delay | API is slow; delaying doesn't help          |
| HTTP 400/401/403/404/422      | ❌ No delay | Structural errors; won't improve with retry |
| HTTP 429/500/502/503/504      | ✅ Delay    | Rate limit or transient; backoff may help   |
| Network/unknown errors        | ✅ Delay    | May be transient                            |

The heuristic fallback (`parseMessageHeuristic`) acts as the effective **attempt 3** with zero latency cost — it runs only when `parseMessage` throws `UpstreamError` after all retries.

### Rationale

- **Per-call timeout reduced 15s → 8s** — necessary to fit two attempts within the Express budget. Gemini Flash typically responds in 200–800ms; 8s is still extremely generous.
- **Full jitter over "equal jitter"** — AWS research shows full jitter produces the best trade-off between latency and load distribution. `Math.random() * max` is a one-liner.
- **No delay on `AbortError`** — if attempt 1 timed out at 8s, immediately spending another 8s on attempt 2 is necessary to even give it a chance. A jitter delay here would just burn budget.
- **`MAX_ATTEMPTS` kept at 2** — the heuristic fallback provides a better "third path" than a third Gemini call under load.

### Consequences

- LLM calls that exceed 8s now abort earlier than before (was 15s). Gemini Flash rarely takes >2s; this is an acceptable tradeoff.
- `BASE_DELAY_MS = 200` is intentionally conservative — the max possible inter-attempt delay is ~200ms, which is negligible for users.

---

## ADR-019: Two-Layer Ambiguous Location Fix

**Status:** Accepted
**Date:** 2026-03-15

### Context

Foursquare rejects `near` values that are too ambiguous to geocode `(400 "Boundaries could not be determined for near param")`. This happens when the LLM extracts a local district abbreviation or short neighborhood name (e.g. `"Bonifacio Global City"` from `"Japanese BGC"`) without country context. The previous behavior was to surface a generic 502 error to the user.

Three approaches were evaluated:

| Option | Approach                                                   | Verdict                                                                               |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A      | Retry with user's GPS `ll`                                 | ❌ Results drift from stated intent (user asked for BGC, gets results near their GPS) |
| B      | Geocode `near` via Nominatim → retry with BGC coordinates  | ⚠️ Accurate, but Nominatim's 1 req/sec/IP limit becomes a server-wide bottleneck      |
| C      | LLM prompt rule (prevention) + geoip suggestion (recovery) | ✅ **Chosen**                                                                         |

### Decision

Implement a **two-layer defense**:

**Layer 1 — Prevention (`llm.constants.ts`):** Add a rule to `SYSTEM_INSTRUCTION` instructing the LLM to always expand district names and abbreviations with city + country:

> _For district names, neighborhood abbreviations, or local shorthand (e.g. "BGC", "QC", "NAIA"), always expand "near" to include the city and country (e.g. "BGC" → "Bonifacio Global City, Taguig, Philippines")._

**Layer 2 — Recovery (safety net):** When Foursquare still returns the specific 400, the backend:

1. Throws `AmbiguousLocationError` (status 400, code `AMBIGUOUS_LOCATION`) from `foursquare.service.ts`
2. `execute.service.ts` catches it, looks up the client IP via `geoip-lite` → resolves country name, and re-throws with `meta: { near, suggestion, query }`
3. The frontend `ErrorDisplay` shows a `MapPin` icon, the extracted `near` value, and a clickable "Did you mean?" chip with the full reconstructed query: `"[food] in [near], [country]"`
4. Clicking the chip calls `onSearch(fullSuggestion)` → fires a new search with the corrected, fully-qualified string

### Rationale

- **Prevention is better than recovery** — Layer 1 handles 95%+ of real-world cases (~40 extra tokens, fractions of a cent per request). The LLM has global geographic knowledge and reliably expands Philippine districts, US neighborhoods, and international abbreviations.
- **Silent fallbacks are UX-dishonest** — Using the user's GPS coordinates when they explicitly asked for a different location (Option A) would return results the user didn't expect, with no indication of the substitution.
- **Nominatim bottleneck eliminated** — Option B's 1 req/sec/IP limit would make Nominatim a server-wide bottleneck shared across all concurrent users. Our `geoip-lite` lookup is a local DB read with zero latency and no rate limits.
- **User agency preserved** — Instead of guessing, we show the user exactly what failed (`near` value) and what we suggest (`near, country`), and let them choose. The chip is a one-click recovery; they can also retype freely.
- **Full intent reconstruction** — The chip includes the original food query (`query in suggestion`), so clicking "japanese in Bonifacio Global City, Philippines" re-runs the full intended search, not just the location.

### Alternatives Considered

| Alternative                              | Why Rejected                                                          |
| ---------------------------------------- | --------------------------------------------------------------------- |
| Retry with user GPS `ll`                 | Silently returns wrong-location results — semantically incorrect      |
| Nominatim geocode + retry                | 1 req/sec/IP shared across all users → server bottleneck at any scale |
| LLM to extract broader location on retry | Second LLM call on error path — latency + cost, no guarantee          |
| Generic error with no suggestion         | Less helpful — user doesn't know what we tried or how to fix it       |

### Consequences

- **Layer 1**: `SYSTEM_INSTRUCTION` grows by ~40 tokens per request.
- **Layer 2**: `api-errors.ts` gains a new `AmbiguousLocationError` class. `foursquare.service.ts` reads the raw Foursquare 400 body before classifying the error. `execute.service.ts` calls `geoip-lite` a second time (country only; cheap local read) to build the suggestion.
- **Frontend**: `ErrorDisplay` gains a fourth tier with a `MapPin` icon and an interactive suggestion chip. `onSearch` prop threaded through `RestaurantList` → `ErrorDisplay`.
- **Known limitation**: The geoip country comes from the user's IP, not the searched place. Rare edge case: a user in Japan searching for "tacos in LA" where "LA" fails — they'd see "Los Angeles, Japan" as the suggestion. Acceptable for the current scope.
- Tests added for `AmbiguousLocationError` detection and re-throw behavior.

---

## ADR-020: Security Hardening (SAST Fixes)

**Status:** Accepted
**Date:** 2026-03-15

### Context

A comprehensive Static Application Security Testing (SAST) review identified 8 vulnerabilities across the backend. Four were prioritized for immediate fixing based on exploitability and impact. The remaining four (V1: query-string auth leakage, V3: 10MB body parser, V5: access code in logs, V6: `instance` URL leakage) are deferred — they require broader architectural changes (auth header migration) or are low risk given the app's current scope.

### Decision

Implement fixes for four vulnerabilities:

| ID  | Vulnerability                    | Fix                                                                       | File(s)               |
| --- | -------------------------------- | ------------------------------------------------------------------------- | --------------------- |
| V2  | Trust proxy unconfigured         | `app.set('trust proxy', 1)` as first action in `registerGlobalMiddleware` | `middleware/index.ts` |
| V4  | CORS null-origin bypass          | Block `!origin` when `NODE_ENV === 'production'`                          | `middleware/cors.ts`  |
| V7  | ReDoS in `ll` regex              | `.max(40)` + bounded quantifiers `\d{1,3}` / `\d{1,10}`                   | `execute.schema.ts`   |
| V8  | Injection regex homoglyph bypass | `confusables@1.1.1` normalizes to ASCII before pattern matching           | `llm/llm.guards.ts`   |

### Rationale

- **V2 — `trust proxy: 1`:** Render/Railway add exactly one proxy hop. `trust proxy: true` (trust all) is dangerous — an attacker can prepend fake IPs in `X-Forwarded-For`. The integer `1` trusts only the immediately preceding hop.
- **V4 — Production-only null-origin block:** Dev workflows (curl, Postman) send no `Origin` header. The `NODE_ENV` gate preserves DX while closing the sandboxed iframe vector.
- **V7 — Bounded quantifiers:** `.max(40)` is the first defense (Zod rejects before regex). Bounded quantifiers guarantee linear-time execution.
- **V8 — `confusables` over hand-rolled mapping:** The Unicode Consortium's confusables dataset (UAX #39) has ~9K entries. A hand-rolled map would cover only a few dozen characters and drift out of date.

### Deferred Items

| ID  | Vulnerability                      | Reason Deferred                                          |
| --- | ---------------------------------- | -------------------------------------------------------- |
| V1  | Access code in query string        | Requires auth header migration across frontend + backend |
| V3  | 10MB body parser on GET-only API   | Low risk — no POST routes exist                          |
| V5  | Access code logged in request URL  | Coupled to V1                                            |
| V6  | Error handler leaks `instance` URL | Coupled to V1                                            |

### Consequences

- `confusables@1.1.1` added as a server dependency (~150KB).
- Rate limiter now correctly isolates per-user buckets in production.
- Legitimate searches from sandboxed iframes are blocked in production (acceptable — not a supported use case).
- `AGENTS.md` updated with explicit commit body format rules.

---

_More ADRs will be added during development as decisions emerge._
