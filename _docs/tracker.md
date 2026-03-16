# Tracker: Restaurant Finder

**Status:** IN PROGRESS
**Current Phase:** Phase 5: Deployment & Documentation
**Next Immediate Step:** Record demo video and finalize submission
**Last Updated:** 2026-03-17

## The "Next Immediate Step"

> **AI Instruction:** Read this section to know what to do next.

- [x] Merge `fix/resiliency-timeouts` branch to `main`
- [x] Merge `fix/query-key-geolocation` branch to `main`
- [ ] Begin Phase 5: Deployment & Documentation

## Development Checklist

### Phase 0: SDD & Planning

- [x] Research LLM integration (Google Gemini SDK)
- [x] Research Foursquare Places API
- [x] Examine flux-ai-be/fe patterns for reuse
- [x] Resolve architecture decisions with user
- [x] Generate product.md
- [x] Generate sdd_readme.md (Technical Blueprint)
- [x] Generate tracker.md

---

### Phase 1: Project Setup

- [x] Create `restaurant-finder/` root folder with `server/`, `client/`, `_docs/` subdirectories
- [x] Clone flux-ai-be into `server/` and strip project-specific code
- [x] Clone flux-ai-fe into `client/` and strip project-specific code
- [x] Set up `.env.example` for both server and client
- [x] Create Foursquare developer account and get API key
- [x] Create Gemini API key from aistudio.google.com
- [x] Initialize git repo
- [x] Verify both projects start without errors
- [x] Both `bun run check` (server) and `pnpm run check` (client) pass
- [x] Rename `docs/` → `_docs/` for alphabetical folder priority

---

### Phase 2: Backend Core

- [x] Update `config/env.ts` — add `GEMINI_API_KEY`, `FOURSQUARE_API_KEY`, remove DB vars
- [x] Update `common/utils/api-errors.ts` — add `UpstreamError`, remove unused subclasses
- [x] Update `common/middleware/error-handler.ts` — remove Prisma error mapping
- [x] Create `common/middleware/code-gate.middleware.ts`
- [x] Create LLM Service (`src/services/llm.service.ts`)
- [x] Create Foursquare Service (`src/services/foursquare.service.ts`)
- [x] Create Execute Module (types, schema, service, controller, route)
- [x] Mount execute routes in `app.ts` at `/api`
- [x] Manual smoke test with curl

---

### Phase 3: Frontend Core

- [x] Design tokens: Typography Focus palette (forest green, mint, orange accent)
- [x] shadcn components: Button, Input, Skeleton
- [x] Data layer: restaurant types, search API function (withApiError), TanStack Query hook
- [x] Components: SearchBar, RestaurantCard, RestaurantList, LoadingSkeleton, ErrorDisplay, EmptyState, AppHeader, SearchContent
- [x] App shell: SearchPage → AppHeader + SearchContent
- [x] Zustand store (TkDodo pattern): atomic selectors, nested actions, `getState()` for imperative reads
- [x] Re-render isolation: local `useState` + `triggerSearch()` in query hook
- [x] Refactored RestaurantList to own all conditional rendering (flux-ai pattern)
- [x] Committed and merged to `main`

---

### Phase 3.5: Hardening

- [x] `cursor:pointer` on all buttons (global CSS rule)
- [x] `ENV.API_CODE` — moved hardcoded code gate string to env vars
- [x] `QUICK_SEARCHES as const` — tighter TypeScript inference
- [x] Soft 400 error message — gentle inline hint instead of red error panel
- [x] Four-tier error display:
  - `AMBIGUOUS_LOCATION` → MapPin icon, "Did you mean?" chip with full reconstructed query (ADR-019)
  - `MISSING_LOCATION` → MapPinOff icon, location-specific hint
  - Other 400s → SearchX icon, rephrase hint
  - Server errors → red panel with retry button
- [x] Geolocation fallback:
  - Frontend: Zustand store for browser coordinates, requested on app mount
  - API sends `ll` (lat,lng) as query param when coordinates available
  - Backend: optional `ll` query param, optional `near` in searchParamsSchema
- [x] Three-tier location priority chain:
  1. LLM-extracted `near` from user's text (highest priority)
  2. Browser geolocation `ll` from frontend
  3. IP geolocation via `geoip-lite` (local MaxMind DB, zero API calls)
  4. 400 error with `MISSING_LOCATION` reason if all fail
- [x] `geoip-lite` installed — resolves IP to city-level lat/lng, handles IPv6-mapped prefixes, skips private IPs
- [x] Extracted `buildSearchSummary` to `server/src/modules/execute/execute.utils.ts`
- [x] Committed and merged to `main`

---

### Phase 4: Testing

- [x] Backend tests:
  - [x] `execute.schema.test.ts` — code validation, message validation, searchParams validation (20 tests)
  - [x] `execute.service.test.ts` — mocked LLM/Foursquare, transform logic, error handling (9 tests)
  - [x] `execute.integration.test.ts` — 401/422/200/400 cases with Supertest (13 tests)
- [x] Run `bun test` — 67 tests passing
- [x] Run `bun run check` — no lint/type errors

---

### Phase 4.5: Security Hardening

Conducted adversarial security audit. Implemented 4 of 6 identified vulnerabilities (V3/V4 deferred as out-of-scope for coding test).

- [x] V1: Access code moved to `API_ACCESS_CODE` env variable (was hardcoded in source)
- [x] V2: Per-route rate limiter on `/api/execute` (10 req/min per IP) — extracted to `execute.middleware.ts`
  - ADR-010: Per-Route Rate Limiting
- [x] V5: Default `NODE_ENV` to `production` (prevents accidental stack trace leaks)
- [x] V6: Conditional Foursquare error meta — raw error body only in development
  - ADR-011: Conditional Upstream Error Meta

---

### Phase 4.6: Search Relevance Tuning

Conducted search relevance engineering audit focused on prompt loopholes, parameter mapping, location edge cases, and ranking conflicts.

- [x] R1: ADR-012 — Foursquare relevance sort + frontend distance default (design decision)
- [x] R2: IP geolocation city-level precision guard (prevents country-center fallback)
- [x] R3: Fixed schema limit description mismatch (10 → 20 to match system instruction)
- [x] R4: Added negation handling to LLM prompt (price + query negations)
- [x] R5: Added non-Latin query translation rule to LLM prompt

---

### Phase 4.7: Resiliency Hardening

Conducted network chaos monkey audit focused on timeout gaps, cascading failures, and partial failure modes.

- [x] F1: Gemini AbortController timeout (15s) — prevents hanging LLM calls
- [x] F2: Express request timeout middleware (20s) — responds 504 before client's 30s timeout
  - New: `GatewayTimeoutError` class (504), `GATEWAY_TIMEOUT` HTTP status constant
  - ADR-013: Layered Timeout Budget (Client 30s → Express 20s → Gemini 15s → Foursquare 10s)

---

### Phase 4.8: Frontend State Audit

Conducted frontend state architecture review focused on state desync, query key coverage, race conditions, and rendering efficiency.

- [x] S1: Added geolocation (`ll`) to TanStack Query key — prevents stale cache when GPS changes between searches
- [x] S1: Purified `searchRestaurants` API function — accepts `ll` as parameter instead of reading store internally
- [x] S2: Extracted `RESTAURANT_STALE_TIME` constant (5 min) with intent comment
- [x] S2: Added staleTime override note to global `query-client.ts`

---

### Phase 4.9: UI Polish & Client Sorting

- [x] Client-side sorting dropdown (Relevance / Distance) using `shadcn/select`
- [x] Fixed React Query structural sharing issue by removing query `select` callback
- [x] Refactored sorting derived state into `useMemo` in UI layer
- [x] Zustand store (`sort-store.ts`) for managing UI sort state

---

### Phase 4.10: UX Audit & Accessibility

Conducted UX and a11y audit from the perspective of an accessibility advocate. Implemented 8 fixes focused on screen readers, keyboard navigation, and mobile UX.

- [x] U1: Added `aria-live="polite"` region to `RestaurantList`
- [x] U2: Focus management after search via `useFocusOnResults` hook
- [x] U3: `aria-hidden` on decorative icons in cards and errors
- [x] U4: Accessible "View on Maps" link names
- [x] U5: Loading skeleton screen reader announcement (`sr-only`)
- [x] U6/U7: Explicit `aria-label` / `aria-hidden` on search input/icon
- [x] U12: Bumped mobile touch targets for pills and sort dropdown
- [x] Implemented dynamic, time-based quick search pills with Lucide icons

---

### Phase 4.11: NLP Fuzzing & Input Hardening

Conducted NLP edge-case fuzzing audit targeting emoji/symbol overload, slang/idioms, contradictions/sarcasm, multilingual/mixed-script, and Unicode/Zalgo abuse vectors.

- [x] Unicode sanitization pre-processor (`sanitizeUnicode()`) — strips Zalgo, zero-width chars, null bytes, variation selectors before LLM call
  - ADR-014: Unicode Sanitization Pre-Processor
- [x] SYSTEM_INSTRUCTION: emoji handling rules (food/location emoji → English translation)
- [x] SYSTEM_INSTRUCTION: location translation to English (closes gap where only `query` was translated)
- [x] SYSTEM_INSTRUCTION: expanded `open_now` triggers (`"rn"`, `"right now"`, `"still open"`, `"open late"`)
- [x] SYSTEM_INSTRUCTION: contradiction handling defaults (contradictory price → 0, open/closed → false)
- [x] SYSTEM_INSTRUCTION: location abbreviation expansion (`"dtla"`, `"k-town"`)
- [x] SYSTEM_INSTRUCTION: quality ratings added to unsearchable criteria (`"best"`, `"worst"`)
- [x] Updated ADR-002 cross-reference: double → triple validation pipeline

---

### Phase 4.12: Guardrails & Prompt Injection Defense

Implemented three remaining security features from the guardrails research audit. Upgraded pipeline from triple-validation to five-layer defense.

- [x] Prompt injection detection (`detectInjection`) — regex pre-screen catches common injection patterns before LLM call
  - Exported from `llm.service.ts`, called in `execute.service.ts` for testability
- [x] Output filtering (`guardOutput`) — post-validation check for system prompt leakage and PII in output fields
- [x] Token usage monitoring — logs `usageMetadata` from Gemini response for anomaly detection
- [x] 4 new integration tests for injection detection (42/42 total)
  - ADR-015: Five-Layer Defense Pipeline
- [x] Refactored `llm.service.ts` into clearly-named pipeline stages (`sanitizeInput`, `callLlm`, `validateAndNormalize`, `guardOutput`)

---

### Phase 4.13: AI Transparency UI

Implemented the "What the AI Understood" transparency feature from the research audit.

- [x] T1: Create `SearchParamsPills` component to render AI-extracted parameters (Cuisine, Location, Price, Open Now)
- [x] T2: Integrate pills into `SearchContent` immediately below the `SearchBar`
- [x] T3: Add a clear (`X`) button inside the `SearchBar` input for better UX

---

### Phase 4.14: Few-Shot Prompting

Upgraded the LLM system prompt from zero-shot to few-shot, improving edge case accuracy.

- [x] Appended 6-example few-shot block to `SYSTEM_INSTRUCTION` in `llm.service.ts`
  - Price negation: `"not too expensive"` → `price: 2`
  - Open-now slang: `"still serving"` → `open_now: true`
  - Abbreviation expansion: `"DTLA"` → `"Downtown Los Angeles, CA"`
  - Emoji translation: `"🍕"` → `"pizza"`
  - Non-food rejection: `"find me a hospital"` → `is_food_related: false`
  - Multilingual: `"拉麺 東京"` → `query: "ramen", near: "Tokyo, Japan"`
  - ADR-016: Few-Shot Prompting for Edge Case Accuracy

---

### Phase 4.15: NER Heuristic Fallback & Service Refactoring

Added graceful degradation when Gemini is unavailable and restructured services into feature folders.

- [x] Install `compromise` NLP library for local heuristic parsing
- [x] Add `parseMessageHeuristic()` — regex PRICE_MAP + compromise location extraction + tokenizer
- [x] Wire try-LLM → catch-UpstreamError → fallback-to-heuristic in `execute.service.ts`
- [x] Add `parsedBy: 'llm' | 'heuristic'` to `ExecuteResponse.meta` (server + client)
- [x] Show ⚡ "Quick mode" badge in `SearchParamsPills` when heuristic ran
- [x] Refactor flat `services/` into feature folders: `services/llm/` (5 files) and `services/foursquare/` (3 files)
- [x] Update all imports and test mocks — 42/42 tests pass
  - ADR-017: NER Heuristic Fallback Strategy

---

### Phase 4.16: Exponential Backoff with Full Jitter

Upgraded the LLM retry logic from immediate retries to proper exponential backoff.

- [x] Add `BASE_DELAY_MS = 200` constant to `llm.constants.ts`
- [x] Add `getBackoffDelay(attempt)` — full jitter: random in `[0, BASE * 2^(attempt-1)]`
- [x] Add `isRetryableError(error)` — skips delay for `AbortError` and non-retryable HTTP codes (400/401/403/404/422)
- [x] Reduce `LLM_TIMEOUT_MS` from 15s to 8s to fit 2 attempts + jitter inside the 20s Express budget
- [x] Wire delay between attempts (never after the last) in the `parseMessage` retry loop
  - ADR-018: Exponential Backoff Timeout Budget

---

### Phase 4.17: Mocking APIs & Test Coverage

Expanded test suite to cover new resilience features.

- [x] Add heuristic fallback unit tests (UpstreamError triggers `parseMessageHeuristic`)
- [x] Add placeholder location sanitization unit tests
- [x] Add Foursquare UpstreamError integration test
- [x] 67/67 tests passing across 3 suites

---

### Phase 4.18: Ambiguous Location Fix

Two-layer defense against Foursquare 400 "Boundaries could not be determined" errors caused by ambiguous district/neighborhood abbreviations (e.g. "BGC").

- [x] **Layer 1 — Prevention:** Added district expansion rule to `SYSTEM_INSTRUCTION` in `llm.constants.ts`
  - LLM now always expands abbreviations to include city + country ("BGC" → "Bonifacio Global City, Taguig, Philippines")
  - Handles 95%+ of cases at ~40 extra tokens per request
- [x] **Layer 2 — Recovery (safety net for anything that slips through):**
  - `AmbiguousLocationError` class added to `api-errors.ts` (400, code `AMBIGUOUS_LOCATION`, meta: `near` + `suggestion` + `query`)
  - `foursquare.service.ts`: detects specific Foursquare 400 body string, throws `AmbiguousLocationError` instead of generic `UpstreamError`
  - `execute.service.ts`: catches it, resolves country from client IP via `geoip-lite`, re-throws with enriched suggestion + original `query`
  - `error-display.tsx`: new fourth error tier — MapPin icon, "We couldn't pinpoint X" message, clickable "Did you mean?" chip
  - Chip text is full reconstructed query: `"[food] in [near], [country]"` (e.g. "japanese in Bonifacio Global City, Philippines")
  - Clicking chip calls `onSearch(fullSuggestion)` → fires new search with corrected, fully-qualified string
  - `onSearch` prop threaded: `SearchContent` → `RestaurantList` → `ErrorDisplay`
- [x] 67/67 tests still passing; `bun run check` ✅; `pnpm build` ✅
  - ADR-019: Two-Layer Ambiguous Location Fix

---

### Phase 4.19: Security Hardening (SAST)

Conducted static application security testing (SAST) review. Fixed 4 of 8 identified vulnerabilities; remaining 4 (V1, V3, V5, V6) are deferred.

- [x] V2: `trust proxy` — set `app.set('trust proxy', 1)` in `registerGlobalMiddleware` so `req.ip` reflects the real client IP behind Render/Railway reverse proxies. Fixes rate limiter bucketing and geoip resolution.
- [x] V4: CORS null-origin bypass — block requests with no `Origin` header in production. Allows curl/Postman in development.
- [x] V7: ReDoS in `ll` regex — added `.max(40)` pre-check and bounded quantifiers (`\d{1,3}`, `\d{1,10}`) to eliminate catastrophic backtracking.
- [x] V8: Unicode homoglyph injection bypass — installed `confusables@1.1.1` to normalize Unicode confusables (Cyrillic і → i) before running injection detection regex.
- [x] Updated `AGENTS.md` with explicit commit body format rules.
- [x] 67/67 tests passing; `bun run check` ✅
  - ADR-020: Security Hardening (SAST Fixes)

---

### Phase 4.20: Price Range Support

Upgraded price filtering from a single value to a min/max range, enabling queries like "cheap to moderate."

- [x] Backend: replaced single `price` with `min_price`/`max_price` in types, Zod schema (with `min <= max` refinement), LLM schema/prompt, Foursquare integration, and heuristic parser
- [x] Frontend: updated `SearchParams` type, `SearchParamsPills` to render ranges ("Budget – Moderate"), extracted `formatPriceLabel()` utility to `lib/format-price.ts`
- [x] Tests: updated 3 test suites, added `min_price > max_price` rejection test — 67/67 passing
- [x] Docs: updated `_docs/README.md`, `product.md`, `decisions.md` with `min_price`/`max_price` references

---

### Phase 4.21: Error Guard Refactor & Ambiguous Location Bug Fix

Fixed a bug where the "Did you mean?" chip for ambiguous locations never appeared due to checking `error.meta?.reason` instead of `error.code`. Refactored error type detection into reusable type-guard functions.

- [x] **Bug fix:** `error-display.tsx` was checking `error.meta?.reason === 'AMBIGUOUS_LOCATION'` but the backend sends the code in `error.code` — the "Did you mean?" UI was fully built but never triggered
- [x] **Refactor:** Extracted `isAmbiguousLocationError()`, `isMissingLocationError()`, `isNotFoodRelatedError()`, `isBadRequestError()` type guards to `client/src/utils/error-guards.ts`
- [x] Each guard is a proper TypeScript type guard (`error is ApiError`), eliminating the need for casting
- [x] `error-display.tsx` updated to use guards: `if (isAmbiguousLocationError(error)) { ... }`

---

### Phase 5: Deployment & Documentation

- [x] Deploy backend to Railway (root: `/server`)
- [x] Deploy frontend to Railway (root: `/client`)
- [x] Update frontend env to point to deployed backend URL
- [x] Write project-level `README.md`

## Changelog

| Date       | Change                                                                                                                                            |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-03-12 | Initial SDD generation. Full planning phase complete.                                                                                             |
| 2026-03-12 | Phase 1 complete. Server & client scaffolds passing all checks. Git initialized. `docs/` renamed to `_docs/`.                                     |
| 2026-03-13 | Phase 2 Backend Core merged to `main`.                                                                                                            |
| 2026-03-13 | Phase 3 Frontend Core merged to `main`.                                                                                                           |
| 2026-03-13 | Phase 3.5 Hardening: geolocation fallback, geoip-lite, three-tier error display, cursor:pointer, ENV.API_CODE                                     |
| 2026-03-14 | Phase 4 Testing: 38 backend tests (schema, service, integration), 72 assertions.                                                                  |
| 2026-03-14 | Phase 4.5 Security: access code env var, per-route rate limiting, conditional error meta. ADR-010, ADR-011.                                       |
| 2026-03-14 | Phase 4.6 Relevance: IP geo guard, prompt fixes (limit, negation, non-Latin). ADR-012.                                                            |
| 2026-03-14 | Phase 4.7 Resiliency: Gemini 15s abort, Express 20s timeout, GatewayTimeoutError. ADR-013.                                                        |
| 2026-03-14 | Phase 4.8 Frontend State: query key geolocation fix, purified API function, staleTime docs.                                                       |
| 2026-03-14 | Phase 4.9 UI Polish & Client Sorting: dynamic sorting dropdown (Relevance/Distance) and reactivity fixes.                                         |
| 2026-03-15 | Phase 4.10 UX Audit: 8 a11y fixes (ARIA, focus, touch targets) and dynamic time-based quick search pills.                                         |
| 2026-03-15 | Phase 4.11 NLP Fuzzing: Unicode sanitizer, prompt hardening (emoji, location i18n, slang, contradictions). ADR-014.                               |
| 2026-03-15 | Phase 4.12 Guardrails: injection detection, output filtering, token monitoring. Pipeline → five-layer defense. ADR-015.                           |
| 2026-03-15 | Phase 4.13 UI Transparency: Search parameters pill badges and search bar clear button.                                                            |
| 2026-03-15 | Phase 4.14 Few-Shot Prompting: 6 examples in SYSTEM_INSTRUCTION for edge case accuracy. ADR-016.                                                  |
| 2026-03-15 | Phase 4.15 NER Fallback: heuristic parser + service folder refactoring (`llm/`, `foursquare/`). ADR-017.                                          |
| 2026-03-15 | Phase 4.16 Exponential Backoff: full jitter, `isRetryableError`, timeout budget rebalanced 15s→8s/call. ADR-018.                                  |
| 2026-03-15 | Phase 4.17 Test Coverage: expanded execute tests (49/49 passing).                                                                                 |
| 2026-03-15 | Phase 4.18 Ambiguous Location Fix: LLM district expansion rule (Layer 1) + `AmbiguousLocationError` + "Did you mean?" chip UI (Layer 2). ADR-019. |
| 2026-03-15 | Phase 4.19 Security Hardening: trust proxy, CORS null-origin block, ReDoS regex fix, Unicode confusables normalization. ADR-020.                  |
| 2026-03-16 | Phase 5 Deployment: deployed backend and frontend to Railway, updated README with deployed URLs.                                                  |
| 2026-03-16 | Phase 4.20 Price Range: `min_price`/`max_price` across backend, frontend, tests, and docs. `formatPriceLabel()` utility extracted.                |
| 2026-03-17 | Phase 4.21 Error Guards: fixed ambiguous location bug (`meta.reason` → `error.code`), extracted type-guard functions to `error-guards.ts`.        |
