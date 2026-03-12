# Product Spec: Restaurant Finder

## What Is Restaurant Finder?

Restaurant Finder is a full-stack web application that helps users discover restaurants by typing a free-form, natural language request. It translates human language into structured search parameters using AI, queries the Foursquare Places API, and presents relevant restaurant results in a clean, usable interface.

## What Problem Does It Solve?

Traditional restaurant search tools (Google Maps, Yelp) require users to fill out multiple form fields — location, cuisine type, price range, open hours — separately. Users often **think** in full sentences:

> "Find me a cheap sushi place in downtown LA that's open now."

Restaurant Finder eliminates the friction between how users **think** and how search engines **work** by using an LLM to bridge the gap. A user types one sentence, and the system handles the rest.

## Glossary of Terms

| Term | Definition |
|------|-----------|
| **Message** | The user's free-form text input (e.g., "cheap sushi in LA open now") |
| **Code** | A static access code (`pioneerdevai`) required to authenticate API requests |
| **Parsed Parameters** | The structured JSON object extracted from the user's message by the LLM |
| **LLM** | Large Language Model — the AI service (Google Gemini) that parses natural language into structured data |
| **Foursquare** | Third-party Places API used to search for real restaurant data |
| **Price Level** | 1 = cheap/budget, 2 = moderate, 3 = expensive, 4 = very expensive |

## Features

### 1. Natural Language Search

- **What:** Users type a free-form sentence describing what they're looking for
- **How users use it:** Type in the search box → press Enter or click Search → see results
- **Example:** Maria types "I want Korean BBQ near Times Square that won't break the bank" → Sees a list of affordable Korean BBQ restaurants near Times Square

### 2. Smart Parameter Extraction

- **What:** The system interprets the user's message and extracts structured parameters (cuisine, location, price, open status)
- **How it works:** The backend sends the user's message to Google Gemini with a structured output schema → Gemini returns JSON → Backend validates with Zod
- **Example:** "cheap Italian near the Eiffel Tower" → `{ query: "Italian", near: "Eiffel Tower, Paris", price: 1, open_now: false }`

### 3. Restaurant Results Display

- **What:** A clean list of restaurant cards showing relevant information
- **What's shown per restaurant:**
  - Name
  - Address (formatted)
  - Category / cuisine type
  - Price level (visual indicator)
  - Open/closed status
  - Distance from search center
  - Rating (if available from Foursquare free tier)

### 4. Loading & Error States

- **What:** The UI communicates system status clearly
- **Loading:** Skeleton cards or spinner while waiting for results
- **Errors:** Friendly error messages (e.g., "No restaurants found matching your search", "Something went wrong — please try again")
- **Empty state:** Helpful prompt when no query has been made yet

### 5. Backend API Endpoint

- **What:** A public GET endpoint that returns JSON results directly
- **Route:** `GET /api/execute?message=<query>&code=pioneerdevai`
- **Who uses it:** Both the frontend UI and external testers (evaluators)

## Key Mechanics

### Search Flow

| Step | What Happens | Where |
|------|-------------|-------|
| 1 | User types message | Frontend |
| 2 | Frontend calls `GET /api/execute?message=...&code=...` | Frontend → Backend |
| 3 | Backend validates `code` | Backend (middleware) |
| 4 | Backend sends message to Gemini for parsing | Backend → Gemini API |
| 5 | Backend validates parsed parameters (Zod) | Backend |
| 6 | Backend queries Foursquare with structured params | Backend → Foursquare API |
| 7 | Backend transforms and filters raw results | Backend |
| 8 | Clean JSON returned to frontend | Backend → Frontend |
| 9 | Frontend renders restaurant cards | Frontend |

### Authentication

This app uses a **static code gate** — not user-based auth. The code `pioneerdevai` must be passed with every API request. If invalid or missing, the request is rejected with `401 Unauthorized`.

## Connections to Other Modules

| Module | Relationship |
|--------|-------------|
| Google Gemini API | External service for natural language → structured data parsing |
| Foursquare Places API | External service for restaurant search data |

## MVP vs Post-MVP

### ✅ MVP (Must ship)
- ✅ Natural language text input
- ✅ LLM-powered parameter extraction (Gemini 2.5 Flash)
- ✅ Foursquare API integration
- ✅ Restaurant results display (cards)
- ✅ Loading, error, and empty states
- ✅ `GET /api/execute` endpoint with code validation
- ✅ Input validation (message + code)
- ✅ Clean JSON response format
- ✅ Automated tests (validation, parsing, error handling)
- ✅ README with setup/deploy instructions
- ✅ Deployed live URL

### 🧊 Post-MVP (Improvements to explain in interview)
- 🧊 Map view showing restaurant locations — *High Priority*
- 🧊 Smooth micro-animations and transitions — *High Priority*
- 🧊 Dark mode toggle — *Medium Priority*
- 🧊 Non-LLM fallback parser for reliability — *Medium Priority*
- 🧊 Response caching (same query = instant) — *Medium Priority*
- 🧊 Search history (localStorage) — *Low Priority*
- 🧊 Database for query logging/analytics — *Low Priority*
- 🧊 User accounts and saved favorites — *Low Priority*
