# Product Spec: Restaurant Finder

## What Is Restaurant Finder?

Restaurant Finder is a full-stack web application that helps users discover restaurants by typing a free-form, natural language request. It translates human language into structured search parameters using AI, queries the Foursquare Places API, and presents relevant restaurant results in a clean, usable interface.

## What Problem Does It Solve?

Traditional restaurant search tools (Google Maps, Yelp) require users to fill out multiple form fields — location, cuisine type, price range, open hours — separately. Users often **think** in full sentences:

> "Find me a cheap sushi place in downtown LA that's open now."

Restaurant Finder eliminates the friction between how users **think** and how search engines **work** by using an LLM to bridge the gap. A user types one sentence, and the system handles the rest.

## Glossary of Terms

| Term                  | Definition                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Message**           | The user's free-form text input (e.g., "cheap sushi in LA open now")                                                                            |
| **Code**              | A static access code required to authenticate every API request (configured via environment variable)                                           |
| **Parsed Parameters** | The structured JSON object extracted from the user's message by the LLM                                                                         |
| **LLM**               | Large Language Model — the AI service (Google Gemini) that parses natural language into structured data                                         |
| **Foursquare**        | Third-party Places API used to search for real restaurant data                                                                                  |
| **Price Level**       | 1 = cheap/budget, 2 = moderate, 3 = expensive, 4 = very expensive. Supports single values and ranges (e.g., "cheap to moderate" → min=1, max=2) |

## Features

### 1. Natural Language Search

- **What:** Users type a free-form sentence describing what they're looking for
- **How users use it:** Type in the search box → press Enter or click Search → see results
- **Example:** Maria types "I want Korean BBQ near Times Square that won't break the bank" → Sees a list of affordable Korean BBQ restaurants near Times Square

### 2. Smart Parameter Extraction

- **What:** The system interprets the user's message and extracts structured parameters (cuisine, location, price, open status)
- **How it works:** The backend sends the user's message to Google Gemini with a structured output schema → Gemini returns JSON → Backend validates with Zod
- **Example:** "cheap Italian near the Eiffel Tower" → `{ query: "Italian", near: "Eiffel Tower, Paris", min_price: 1, max_price: 1, open_now: false }`

### 3. Restaurant Results Display

- **What:** A clean list of restaurant cards showing relevant information
- **What's shown per restaurant:**
  - Name
  - Address (formatted)
  - Category / cuisine type with icon
  - Distance from search area (labelled contextually: "away from you", "away from Downtown LA", etc.)
  - Foursquare link
- **Sorting Options:** Users can change the default sort order from Relevance to Distance via a dropdown menu, sorted client-side without additional API calls.

### 4. Loading & Error States

- **What:** The UI communicates system status clearly
- **Loading:** Skeleton cards or spinner while waiting for results
- **Errors:** Friendly error messages (e.g., "No restaurants found matching your search", "Something went wrong — please try again")
- **Empty state:** Helpful prompt when no query has been made yet

### 5. Browser Geolocation Support

- **What:** The browser can share the user's current coordinates to bias results toward their real location
- **How it works:** The frontend prompts for geolocation permission → sends `ll=lat,lng` as a query param → backend uses it as a fallback when no city/area is mentioned in the message
- **Example:** User types "coffee shop near me" while in Manila → results are biased toward Manila

### 6. Heuristic Fallback Parser

- **What:** A regex-based fallback parser that runs if Gemini is unavailable
- **How it works:** Simple keyword extraction for cuisine, location, price keywords — ensures the app keeps working even during LLM outages

### 7. Backend API Endpoint

- **What:** A public GET endpoint that returns JSON results directly
- **Route:** `GET /api/execute?message=<query>&code=<access-code>&ll=<lat,lng>`
- **Who uses it:** Both the frontend UI and external testers (evaluators)

## Key Mechanics

### Search Flow

| Step | What Happens                                                    | Where                    |
| ---- | --------------------------------------------------------------- | ------------------------ |
| 1    | User types message                                              | Frontend                 |
| 2    | Frontend calls `GET /api/execute?message=...&code=...&ll=...`   | Frontend → Backend       |
| 3    | Backend validates `code`                                        | Backend (middleware)     |
| 4    | Backend screens message for prompt injection                    | Backend (LLM guards)     |
| 5    | Backend sends message to Gemini for structured parsing          | Backend → Gemini API     |
| 6    | If Gemini fails, heuristic fallback parser runs                 | Backend                  |
| 7    | Backend validates parsed parameters (Zod)                       | Backend                  |
| 8    | Backend queries Foursquare with structured params + Food filter | Backend → Foursquare API |
| 9    | Backend transforms and filters raw results                      | Backend                  |
| 10   | Clean JSON returned to frontend                                 | Backend → Frontend       |
| 11   | Frontend renders restaurant cards                               | Frontend                 |

### Authentication

This app uses a **static code gate** — not user-based auth. A static access code must be passed with every API request via the `code` query parameter. If invalid or missing, the request is rejected with `401 Unauthorized`.

## Connections to Other Modules

| Module                | Relationship                                                    |
| --------------------- | --------------------------------------------------------------- |
| Google Gemini API     | External service for natural language → structured data parsing |
| Foursquare Places API | External service for restaurant search data                     |

## MVP vs Post-MVP

### ✅ MVP (Must ship)

- ✅ Natural language text input
- ✅ LLM-powered parameter extraction (Gemini 2.5 Flash)
- ✅ Foursquare API integration (2025-06-17, Food category filter)
- ✅ Restaurant results display (cards with distance label)
- ✅ Loading, error, and empty states
- ✅ `GET /api/execute` endpoint with code validation
- ✅ `ll` query param for browser geolocation fallback
- ✅ Ambiguous location detection with geoip suggestion
- ✅ Heuristic fallback parser (LLM outage resilience)
- ✅ Prompt injection detection and Unicode confusable normalization
- ✅ Input validation (message + code) and rate limiting
- ✅ Clean JSON response format (RFC 7807 errors)
- ✅ Automated tests (validation, parsing, error handling)
- ✅ Client-side sorting by relevance / distance
- ✅ Dynamic search suggestion chips
- ✅ Micro-animations and transitions
- ✅ README with setup/deploy instructions
- ⬜ Deployed live URL

### 🧊 Post-MVP (Improvements to explain in interview)

- 🧊 Map view showing restaurant locations — _High Priority_
- 🧊 Dark mode toggle — _Medium Priority_
- 🧊 Response caching (same query = instant) — _Medium Priority_
- 🧊 Search history (localStorage) — _Low Priority_
- 🧊 Database for query logging/analytics — _Low Priority_
- 🧊 User accounts and saved favorites — _Low Priority_
