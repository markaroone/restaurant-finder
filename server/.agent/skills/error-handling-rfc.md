---
name: error-handling-rfc
description: Standards for system-wide error handling (RFC 7807) in Flux AI backend. Use this skill when implementing error handling or creating custom error classes.
---

# System-Wide Error Handling (RFC 7807)

- **Standard:** All API errors must return a standardized **Problem Details** JSON object (RFC 7807).
  - **Structure:** `type`, `title`, `status`, `detail`, `instance`, `code`, `errors` (optional), `traceId`.
- **Implementation:**
  - **Throwing Errors:** Do NOT send responses directly (e.g., `res.status(404).send(...)`).
  - **Action:** Throw a typed `AppError` subclass. The global error handler will catch, format, and log it.
  - **Classes:** Use `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, or `RateLimitError`.
- **Automatic Handling:**
  - **Zod:** Validation errors in `@/common/middleware/validation` are automatically converted to `422 Unprocessable Entity` with detailed field errors.
  - **Prisma:** Common DB errors (Unique Constraint `P2002`, Not Found `P2025`) are automatically mapped to `409 Conflict` and `404 Not Found`.

### Example

```typescript
// ❌ Bad
if (!user) return res.status(404).json({ error: 'User not found' });

// ✅ Good
if (!user) throw new NotFoundError('User not found');
```
