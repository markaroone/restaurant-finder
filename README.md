# Restaurant Finder

A full-stack application that helps users find restaurants by typing a natural language request. Built as a coding challenge for Pioneer Dev AI.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (for backend)
- [Node.js 20+](https://nodejs.org/) (for frontend)
- [Google Gemini API key](https://aistudio.google.com/)
- [Foursquare API key](https://developer.foursquare.com/)

### Backend Setup

```bash
cd server
cp .env.example .env    # Fill in your API keys
bun install
bun run dev             # Runs on http://localhost:3000
```

### Frontend Setup

```bash
cd client
pnpm install
pnpm dev                # Runs on http://localhost:5173
```

### Test the API

```bash
curl "http://localhost:3000/api/execute?message=sushi+in+downtown+LA&code=pioneerdevai"
```

## Project Structure

```
restaurant-finder/
├── server/     — Express 5 + Bun backend
├── client/     — React 19 + Vite frontend
├── _docs/      — SDD documentation
└── README.md   — You are here
```

## Architecture

See [\_docs/README.md](./_docs/README.md) for the technical blueprint.

## Documentation

- [Product Spec](./_docs/product.md) — Features and requirements
- [Technical Blueprint](./_docs/README.md) — Architecture and API spec
- [Development Tracker](./_docs/tracker.md) — Progress tracking
- [Architecture Decisions](./_docs/decisions.md) — ADRs with rationale

## License

tation

- [Product Spec](./_docs/product.md) — Features and requirements
- [Technical Blueprint](./_docs/README.md) — Architecture and API spec
- [Development Tracker](./_docs/tracker.md) — Progress tracking
- [Architecture Decisions](./_docs/decisions.md) — ADRs with rationale

## License

Private — coding challenge submission.
