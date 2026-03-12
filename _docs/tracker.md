# Tracker: Restaurant Finder

**Status:** 🟢 IN PROGRESS
**Current Phase:** Phase 2: Backend Core

## The "Next Immediate Step"

> **AI Instruction:** Read this section to know what to do next.

- [ ] Create LLM Service (`src/services/llm.service.ts`) — Gemini 2.5 Flash wrapper with structured output
- [ ] Create Foursquare Service (`src/services/foursquare.service.ts`) — Places API wrapper
- [ ] Create Execute Module (`src/modules/execute/`) — route, controller, service, schema, types
- [ ] Mount routes in `app.ts` at `/api`
- [ ] Manual smoke test with curl

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

- [ ] Update `config/env.ts` — add `GEMINI_API_KEY`, `FOURSQUARE_API_KEY`, remove DB vars
- [ ] Update `common/utils/api-errors.ts` — add `UpstreamError`, remove unused subclasses
- [ ] Update `common/middleware/error-handler.ts` — remove Prisma error mapping
- [ ] Create `common/middleware/code-gate.middleware.ts`
- [ ] Create LLM Service (`src/services/llm.service.ts`):
  - [ ] Initialize GoogleGenAI client
  - [ ] Define response JSON schema
  - [ ] Implement `parseMessage()` with structured output
  - [ ] Implement retry logic
- [ ] Create Foursquare Service (`src/services/foursquare.service.ts`):
  - [ ] Implement `searchRestaurants()` with proper param mapping
  - [ ] Handle API errors
- [ ] Create Execute Module:
  - [ ] `execute.types.ts` — SearchParams, TransformedRestaurant, ExecuteResponse
  - [ ] `execute.schema.ts` — executeQuerySchema, searchParamsSchema
  - [ ] `execute.service.ts` — orchestrator (LLM → Foursquare → transform)
  - [ ] `execute.controller.ts` — input validation, response formatting
  - [ ] `execute.route.ts` — wire GET /api/execute with code-gate middleware
- [ ] Mount execute routes in `app.ts` at `/api`
- [ ] Manual smoke test: `curl "http://localhost:3000/api/execute?message=sushi+in+la&code=pioneerdevai"`

---

### Phase 3: Frontend Core

- [ ] Set up API client (`src/api/api-client.ts`) — ky instance pointing to backend
- [ ] Create `search-restaurants.ts` API function (withApiError wrapped)
- [ ] Create TanStack Query hook `useSearchRestaurants`
- [ ] Create shared types (`src/types/restaurant.ts`)
- [ ] Build components:
  - [ ] `SearchBar` — input + submit button
  - [ ] `RestaurantCard` — individual result card
  - [ ] `RestaurantList` — list/grid of cards
  - [ ] `LoadingSkeleton` — skeleton loading state
  - [ ] `ErrorDisplay` — error message component
  - [ ] `EmptyState` — initial state / no results
- [ ] Wire everything in `App.tsx`
- [ ] Style with TailwindCSS — clean, modern design
- [ ] Test in browser — full flow working

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
- [ ] Write project-level `README.md` with:
  - [ ] Setup instructions
  - [ ] Env var configuration
  - [ ] How to run locally
  - [ ] How to test the API endpoint
  - [ ] Deployed URLs
  - [ ] Testing notes (what was tested, how to run, what wasn't)
  - [ ] Assumptions, tradeoffs, limitations
- [ ] Clean up git history — meaningful commits per phase
- [ ] Final end-to-end test on deployed version

## Changelog

| Date       | Change                                                                                                        |
| :--------- | :------------------------------------------------------------------------------------------------------------ |
| 2026-03-12 | Initial SDD generation. Full planning phase complete.                                                         |
| 2026-03-12 | Phase 1 complete. Server & client scaffolds passing all checks. Git initialized. `docs/` renamed to `_docs/`. |
