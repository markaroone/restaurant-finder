# Restaurant Finder

A full-stack application that lets users find restaurants by typing a natural language request. Type something like _"cheap sushi in downtown LA that's open now"_ and the app does the rest.

**Live demo:** `<deployed URL — coming soon>`

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

### Run all tests

```bash
cd server && bun test
```

49 tests, 3 suites, under 1 second. No network calls — all external services are mocked.

### What is tested

| Area                                                  | What's covered                                                                                                                                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Input validation** (`execute.schema.test.ts`)       | Access code gate, `message` min (2) / max (500) length, `ll` coordinate format and regex, `price` range (1–4), `limit` range (1–50), `is_food_related` defaults                                                                                              |
| **Result transformation** (`execute.service.test.ts`) | Full clean output shape, safe fallbacks for every missing Foursquare field (`name → "Unknown"`, `address → "Address unavailable"`, etc.), icon URL assembly from prefix + suffix + size                                                                      |
| **Location priority** (`execute.service.test.ts`)     | LLM `near` takes priority over browser `ll`; browser `ll` used when `near` is empty; private IP with no location throws `MISSING_LOCATION`; placeholder strings ("near me", "current location", "my location") stripped and replaced by geolocation fallback |
| **Heuristic fallback** (`execute.service.test.ts`)    | Heuristic parser fires when Gemini throws `UpstreamError`; `parsedBy` field correctly set to `"llm"` or `"heuristic"`                                                                                                                                        |
| **Error propagation** (`execute.service.test.ts`)     | Foursquare `UpstreamError` propagates to caller; upstream errors don't get swallowed                                                                                                                                                                         |
| **Response meta** (`execute.service.test.ts`)         | `resultCount`, `searchedAt`, `distanceLabel` contextual label ("away from {city}" vs "away from you"), `parsedBy` all correctly set                                                                                                                          |

### What is intentionally not tested

- **Foursquare HTTP calls** — `searchRestaurants` is mocked in service tests. A real network integration test would require live credentials in CI and introduce unnecessary flakiness. The transformation and error-handling logic are tested independently of the HTTP layer.
- **LLM output quality** — Gemini's ability to correctly interpret natural language is not unit-testable. The system prompt, few-shot examples, and retry logic are validated manually.
- **Frontend components** — No React unit tests. The UI is thin enough that manual testing and visual inspection cover the meaningful surface area.
- **End-to-end tests** — No Playwright/Cypress. Covered by manual smoke tests against the deployed URL.

---

## Design Decisions & Tradeoffs

| Decision                                       | Rationale                                                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **LLM-first, heuristic fallback**              | Gemini gives best accuracy for natural language; heuristic catches outages and reduces hard failures |
| **`near` string over raw coordinates**         | Foursquare's `near` handles fuzzy city names ("downtown LA") far better than raw lat/lng             |
| **`fsq_category_ids` Food root filter**        | Without it Foursquare leaks supermarkets, hotels, and city landmarks into results                    |
| **Client-side sorting (Relevance / Distance)** | Re-sorting needs no extra API call and doesn't break TanStack Query's structural caching             |
| **RFC 7807 error format**                      | Machine-readable errors let the frontend and curl testers distinguish error types programmatically   |
| **Exponential backoff with full jitter**       | Avoids thundering herd on Gemini retries; two attempts fit inside the 20s Express timeout budget     |

### Known Limitations

- `price`, `rating`, and `hours` are always `null` — Foursquare premium fields, skipped per spec
- No persistent storage — all queries are stateless
- No pagination — results capped at `limit` (default 20, max 50)
- Rate limiting is in-memory — resets on server restart

---

## Documentation

- [Technical Blueprint](./_docs/README.md) — Architecture, data models, and API spec
- [Product Spec](./_docs/product.md) — Features and requirements
- [Architecture Decisions](./_docs/decisions.md) — All ADRs with rationale
- [Development Tracker](./_docs/tracker.md) — Phase-by-phase progress
