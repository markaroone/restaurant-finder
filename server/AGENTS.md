# Server — AI Context

> Also read the root `../AGENTS.md` for shared TypeScript, naming, and Git rules.

## Tech Stack

| Tech           | Choice                      | Purpose                        |
| :------------- | :-------------------------- | :----------------------------- |
| **Runtime**    | **Bun**                     | Native TS, no build step.      |
| **Framework**  | **Express 5**               | Middleware ecosystem.          |
| **Validation** | **Zod**                     | Runtime schema validation.     |
| **LLM**        | **Google Gemini**           | Structured output NLP parsing. |
| **Places API** | **Foursquare (2025-06-17)** | Restaurant search data.        |

> **No database.** No Prisma. No PostgreSQL. Stateless pass-through API.

## Folder Structure

```text
src/
├── config/            # Env config (Zod-validated)
├── common/
│   ├── middleware/     # Error handler, code-gate, rate-limiter, logger
│   ├── utils/         # AppError, api-errors, response-handler, logger
│   ├── constants/     # HTTP status codes, rate limits
│   └── types/         # ProblemDocument (RFC 7807), Express augmentation
├── modules/
│   ├── health/        # Health check endpoint
│   └── execute/       # Main search endpoint (controller, service, schema, types)
├── services/          # External service wrappers (llm.service, foursquare.service)
├── app.ts             # Express app assembly
└── index.ts           # Server entry point
```

## Rules

**1. Module First** — Features go in `src/modules/`. External service wrappers in `src/services/`.

**2. No Repository Layer** — No database = no repositories. Flow: Router → Controller → Service → External API.

**3. Configuration** — Never use `process.env` directly. Import from `@/config/env`.

**4. Clean Code** — Run `bun run check` before committing. Run `bun run fix` to auto-fix.

**5. Functional Architecture** — Controllers and Services are pure functional exports. No classes (except Error subclasses).

## Error Handling (RFC 7807)

- **Throw, don't respond.** Never use `res.status().json()` for errors. Throw an `AppError` subclass.
- **Available classes:** `BadRequestError`, `UnauthorizedError`, `RateLimitError`, `ValidationError`, `UpstreamError`.
- **Zod errors** are auto-converted to `422` by the validation middleware.

```typescript
// ❌ Bad
if (!data) return res.status(400).json({ error: 'Bad request' });

// ✅ Good
if (!data) throw new BadRequestError('Message is required');
```

## Success Responses

Use `handleSuccess` from `@/common/utils/response-handler`. Never use `res.json()` directly.

```typescript
return handleSuccess({
  response: res,
  message: 'Restaurants found',
  data: results,
  meta: { resultCount: results.length },
});
```

## Authentication

Code-gate middleware (not user auth). Expects `code=pioneerdevai` query parameter.

## Testing

- **Tool:** `bun test`
- **Strategy:** Unit tests for services/schemas. Integration tests with Supertest for HTTP contracts.
- **No DB tests.** Mock external services (Gemini, Foursquare).
- **Error assertions:** Deterministic try/catch, not `.rejects.toThrow()`.
