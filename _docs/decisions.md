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

Apply **two layers of validation**:

1. **Layer 1 — SDK schema** — Guarantees JSON structure (types, field names)
2. **Layer 2 — Zod schema** — Validates business rules (price 1-4, limit 1-50, non-empty strings)

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

---

## ADR-008: Three-Tier Error Display Strategy

**Status:** Accepted
**Date:** 2026-03-13

### Context

The original `ErrorDisplay` component showed a single alarming red error panel for all errors. This was too aggressive for user-side mistakes (typos, missing location) which are not system failures.

### Decision

Use **three-tier error display** based on error type:

| Tier             | Condition                                    | Icon          | Style                    | Message                                     |
| ---------------- | -------------------------------------------- | ------------- | ------------------------ | ------------------------------------------- |
| Missing location | `400` + `meta.reason === 'MISSING_LOCATION'` | MapPinOff     | Subtle gray text         | "Include a city, or enable location access" |
| Bad request      | `400` (other)                                | SearchX       | Subtle gray text         | "Try something like 'sushi in downtown LA'" |
| Server error     | `500`, network errors                        | AlertTriangle | Red panel + retry button | Error details + "Try again"                 |

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

_More ADRs will be added during development as decisions emerge._
