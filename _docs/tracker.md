# Tracker: Restaurant Finder

**Status:** IN PROGRESS
**Current Phase:** Phase 5: Deployment & Documentation
**Next Immediate Step:** Merge `fix/query-key-geolocation` branch, then start Phase 5 (deploy + README)
**Last Updated:** 2026-03-14

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
- [x] Three-tier error display:
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
  - [x] `execute.integration.test.ts` — 401/422/200/400 cases with Supertest (9 tests)
- [x] Run `bun test` — 38 tests passing, 72 assertions
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

### Phase 5: Deployment & Documentation

- [ ] Deploy backend to Render/Railway (root: `/server`)
- [ ] Deploy frontend to Render/Vercel (root: `/client`)
- [ ] Update frontend env to point to deployed backend URL
- [ ] Write project-level `README.md`
- [ ] Clean up git history
- [ ] Final end-to-end test on deployed version

## Changelog

| Date       | Change                                                                                                        |
| :--------- | :------------------------------------------------------------------------------------------------------------ |
| 2026-03-12 | Initial SDD generation. Full planning phase complete.                                                         |
| 2026-03-12 | Phase 1 complete. Server & client scaffolds passing all checks. Git initialized. `docs/` renamed to `_docs/`. |
| 2026-03-13 | Phase 2 Backend Core merged to `main`.                                                                        |
| 2026-03-13 | Phase 3 Frontend Core merged to `main`.                                                                       |
| 2026-03-13 | Phase 3.5 Hardening: geolocation fallback, geoip-lite, three-tier error display, cursor:pointer, ENV.API_CODE |
| 2026-03-14 | Phase 4 Testing: 38 backend tests (schema, service, integration), 72 assertions.                              |
| 2026-03-14 | Phase 4.5 Security: access code env var, per-route rate limiting, conditional error meta. ADR-010, ADR-011.   |
| 2026-03-14 | Phase 4.6 Relevance: IP geo guard, prompt fixes (limit, negation, non-Latin). ADR-012.                        |
| 2026-03-14 | Phase 4.7 Resiliency: Gemini 15s abort, Express 20s timeout, GatewayTimeoutError. ADR-013.                    |
| 2026-03-14 | Phase 4.8 Frontend State: query key geolocation fix, purified API function, staleTime docs.                   |
| 2026-03-14 | Phase 4.9 UI Polish & Client Sorting: dynamic sorting dropdown (Relevance/Distance) and reactivity fixes.     |
| 2026-03-15 | Phase 4.10 UX Audit: 8 a11y fixes (ARIA, focus, touch targets) and dynamic time-based quick search pills.     |
| 2026-03-15 | Phase 4.11 NLP Fuzzing: Unicode sanitizer, prompt hardening (emoji, location i18n, slang, contradictions). ADR-014. |
