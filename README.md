# Restaurant Finder

A full-stack application that lets users find restaurants by typing a natural language request. Type something like _"cheap sushi in downtown LA that's open now"_ and the app does the rest.

**Live demo:** [restaurant-finder-production-c728.up.railway.app](https://restaurant-finder-production-c728.up.railway.app)
**API endpoint:** [restaurant-finder-production.up.railway.app](https://restaurant-finder-production.up.railway.app/api/execute?message=sushi+in+LA&code=pioneerdevai)

---

## How It Works

1. User types a free-form message in the search box
2. The backend sends it to **Google Gemini** to extract structured search parameters (cuisine, location, price, open status)
3. Those parameters query the **Foursquare Places API**
4. Results are returned as clean JSON and rendered as restaurant cards

If Gemini is unavailable, a **heuristic fallback parser** (regex + NER) kicks in automatically so the app keeps working.

---

## Stack

| Layer    | Tech                                       |
| -------- | ------------------------------------------ |
| Backend  | Node.js · TypeScript · Express 5 · Bun     |
| Frontend | React · TypeScript · Vite · TanStack Query |
| AI       | Google Gemini 2.5 Flash                    |
| Places   | Foursquare Places API (2025-06-17)         |

---

## Project Structure

```text
restaurant-finder/
├── server/     — Express 5 + Bun backend
├── client/     — React 19 + Vite frontend
├── _docs/      — SDD, ADRs, tracker
└── README.md   — You are here
```

---

## Local Setup

### Prerequisites

- [Bun](https://bun.sh/) — backend runtime and test runner
- [Node.js 20+](https://nodejs.org/) and [pnpm](https://pnpm.io/) — frontend
- [Google AI Studio](https://aistudio.google.com/) API key (free tier)
- [Foursquare Developer](https://developer.foursquare.com/) API key (free tier)

### 1. Install dependencies

```bash
# Backend
cd server && bun install

# Frontend
cd client && pnpm install
```

### 2. Configure environment variables

**Backend** — copy `server/.env.example` → `server/.env` and fill in your keys:

```env
PORT=3000
NODE_ENV=development

GEMINI_API_KEY=your_gemini_api_key_here
FOURSQUARE_API_KEY=your_foursquare_api_key_here

# CORS — must match where the frontend runs
ALLOWED_ORIGINS=http://localhost:5173

# Static access code gate
API_ACCESS_CODE=<the access code provided in the challenge>
```

**Frontend** — copy `client/.env.example` → `client/.env`:

```env
ENVIRONMENT=local
API_URL=http://localhost:3000/api
API_CODE=<same access code as above>
```

### 3. Run the app

```bash
# Terminal 1 — backend (http://localhost:3000)
cd server && bun run dev

# Terminal 2 — frontend (http://localhost:5173)
cd client && pnpm dev
```

---

## API Endpoint

```http
GET /api/execute?message=<query>&code=<access-code>
```

**Optional:** append `&ll=<lat>,<lng>` to send browser geolocation as a location fallback when the user doesn't mention a specific place.

### Example

```bash
curl "http://localhost:3000/api/execute?message=cheap+sushi+in+downtown+LA+open+now&code=<access-code>"
```

### Success response (200)

```json
{
  "status": "success",
  "message": "Restaurants found",
  "data": {
    "results": [
      {
        "id": "4b60ade0f964a52012e529e3",
        "name": "Sushi Gen",
        "address": "422 E 2nd St, Los Angeles, CA 90012",
        "categories": [{ "name": "Sushi Restaurant", "icon": "https://..." }],
        "price": null,
        "rating": null,
        "distance": 450,
        "hours": null,
        "location": { "lat": 34.0483, "lng": -118.239 },
        "link": "..."
      }
    ],
    "searchParams": {
      "query": "sushi",
      "near": "downtown Los Angeles",
      "price": 1,
      "open_now": true,
      "limit": 20,
      "is_food_related": true
    },
    "meta": {
      "resultCount": 1,
      "searchedAt": "2026-03-15T18:00:00Z",
      "distanceLabel": "away from downtown Los Angeles",
      "parsedBy": "llm"
    }
  }
}
```

> `parsedBy` will be `"llm"` or `"heuristic"` — useful for seeing when the fallback ran.
>
> `price`, `rating`, and `hours` are always `null` — these are Foursquare premium fields, skipped per the challenge spec.

### Error responses

All errors follow [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807):

| Status | Code                    | When                                          |
| ------ | ----------------------- | --------------------------------------------- |
| `401`  | `UNAUTHORIZED`          | `code` is missing or invalid                  |
| `400`  | `BAD_REQUEST`           | `message` is missing, too short, or too long  |
| `422`  | `PARSE_ERROR`           | LLM could not parse the message after retries |
| `502`  | `UPSTREAM_ERROR`        | Gemini or Foursquare is unavailable           |
| `429`  | `TOO_MANY_REQUESTS`     | Rate limit exceeded (10 req/min per IP)       |
| `500`  | `INTERNAL_SERVER_ERROR` | Unexpected error                              |

---

## Testing

### How to run

```bash
cd server && bun test
```

66 tests, 4 suites, under 1 second. No network calls — all external services are mocked.

### What is tested

**Schema tests** (`execute.schema.test.ts`) — Covers validation of both incoming user query parameters (message length, required fields, optional `ll` format) and the LLM response search parameters schema (ensuring structured output from Gemini has valid `query`, `near`, `price`, `open_now`, `limit`, and `is_food_related` fields). These ensure we receive correct and predictable data from both the user input and the LLM output before they enter the pipeline.

**Service tests** (`execute.service.test.ts`) — Covers the core `executeSearch` pipeline business logic: the location priority chain (LLM near → browser geolocation → IP fallback), Foursquare result transformation (raw API shape → clean client shape with safe fallbacks for missing fields), heuristic fallback behavior (graceful degradation when Gemini is unavailable), and placeholder location sanitization (stripping "near me" / "current location" from LLM output). The LLM and Foursquare services are mocked since we're testing the orchestration logic, not the external APIs.

**Integration tests** (`execute.integration.test.ts`) — Tests the full HTTP request/response cycle through Express using `supertest`. Verifies authentication (401 for missing/wrong access code), input validation (422 for invalid messages), prompt injection detection (400 for known attack patterns using the real `detectInjection` function), success response shape, and upstream error propagation (502 when Foursquare/Gemini fails).

**Error handler tests** (`error-handler.test.ts`) — Tests the global error handling middleware: every custom error class maps to the correct HTTP status code, all responses follow the RFC 7807 Problem Details format, meta/errors are included for application errors but not generic ones, trace IDs are correctly extracted from request headers, `AmbiguousLocationError` includes the `near` and `suggestion` fields the frontend relies on for its "Did you mean..." UI, and stack traces are verified to not leak in non-development environments (security).

### What is intentionally not tested

- **LLM service (`parseMessage`)** and **Foursquare API client** — These depend on external APIs requiring network calls and API keys. They are mocked in the service and integration tests so we can test the orchestration logic around them.
- **Injection guard regex patterns and heuristic NLP parser as standalone unit tests** — These are covered indirectly through the integration tests (injection detection over HTTP) and service tests (heuristic fallback path). Dedicated unit tests for these functions would require test process isolation due to Bun's `mock.module` sharing a single process across all test files, which was unnecessary for this scope.
- **Frontend components** — No React unit tests. The UI is thin enough that manual testing and visual inspection cover the meaningful surface area.
- **End-to-end tests** — No Playwright/Cypress. Covered by manual smoke tests against the deployed URL.

---

## Design Decisions & Tradeoffs

| Decision                                             | Rationale                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LLM-first, heuristic fallback**                    | Gemini gives best accuracy for natural language; heuristic catches outages and reduces hard failures                                                                                                                                                                                                                |
| **`near` string over raw coordinates**               | Foursquare's `near` handles fuzzy city names ("downtown LA") far better than raw lat/lng                                                                                                                                                                                                                            |
| **Location priority chain** (LLM → geolocation → IP) | Maximizes location accuracy while ensuring every request has a location. LLM understands "downtown LA"; browser geolocation gives precise coords; GeoIP is the last resort so the user never gets a "location required" error                                                                                       |
| **Ambiguous location UX**                            | When Foursquare can't geocode a vague location like "Springfield," the backend returns a structured `AmbiguousLocationError` with a GeoIP-derived `suggestion`. The frontend renders a "Did you mean..." prompt instead of a generic error                                                                          |
| **Client-side sorting (Relevance / Distance)**       | Foursquare returns results sorted by relevance by default, and we cap the fetch at 20 items, so re-sorting on the frontend requires no extra API call and doesn't break TanStack Query's structural caching. This highlights the most relevant results first while still letting users sort by distance client-side |
| **RFC 7807 error format**                            | Machine-readable errors let the frontend and curl testers distinguish error types programmatically                                                                                                                                                                                                                  |
| **Exponential backoff with full jitter**             | Avoids thundering herd on Gemini retries; two attempts fit inside the 20s Express timeout budget                                                                                                                                                                                                                    |
| **No SSE streaming**                                 | Deferred real-time streaming of results. The current request/response cycle completes in ~2s which is acceptable. SSE would add complexity (connection management, partial rendering) for marginal UX gain at this scale                                                                                            |
| **No secondary LLM fallback**                        | The heuristic parser handles Gemini downtime. Adding a second LLM (e.g., OpenAI) would add another API key dependency, cost, and latency without significantly improving reliability                                                                                                                                |
| **No caching layer**                                 | No Redis or in-memory cache for LLM/Foursquare responses. Search queries are highly varied (long-tail natural language), making cache hit rates low. The added infrastructure wasn't justified for this scope                                                                                                       |

### Known Limitations

- No pagination — results capped at `limit` (default 20, max 50)
- No user accounts or sessions — authentication is a static access code, not per-user
- Single-language — LLM prompts and heuristic parser are English-only
- Heuristic parser is significantly less accurate than the LLM — catches basic patterns but misses nuance (e.g., "somewhere fancy for a date night")
- Distance is Foursquare-dependent — distances are from Foursquare's geocoded center, not the user's exact position (unless `ll` is provided)
- No restaurant photos — Foursquare photos require premium tier

---

## Documentation

- [Technical Blueprint](./_docs/README.md) — Architecture, data models, and API spec
- [Product Spec](./_docs/product.md) — Features and requirements
- [Architecture Decisions](./_docs/decisions.md) — All ADRs with rationale
- [Development Tracker](./_docs/tracker.md) — Phase-by-phase progress
