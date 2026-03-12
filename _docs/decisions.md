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

_More ADRs will be added during development as decisions emerge._
_More ADRs will be added during development as decisions emerge._
