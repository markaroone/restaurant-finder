# Tracker: Restaurant Finder

**Status:** IN PROGRESS
**Current Phase:** Phase 3.5: Hardening
**Next Immediate Step:** Commit Phase 3.5 changes, then proceed to Phase 4 (Testing)
**Last Updated:** 2026-03-13

## The "Next Immediate Step"

> **AI Instruction:** Read this section to know what to do next.

- [x] Commit `fix/phase3-hardening` branch
- [x] Merge to `main`
- [ ] Begin Phase 4: Backend Tests

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
- [ ] Commit and merge to `main`

---

### Phase 4: Testing

- [ ] Backend tests:
  - [ ] `execute.schema.test.ts` — code validation, message validation, searchParams validation
  - [ ] `execute.service.test.ts` — mocked LLM/Foursquare, transform logic, error handling
  - [ ] Integration test with Supertest — 401/400/200 cases
- [ ] Run `bun test` — all tests passing
- [ ] Run `bun run check` — no lint/type errors

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
