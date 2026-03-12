---
name: api-consumption
description: Guidelines for consuming APIs in Flux AI frontend. Use this skill when implementing data fetching logic with Ky or TanStack Query.
---

# API Consumption Standards

## 1. Type Safety

All `ky` requests or TanStack Query hooks **MUST** be explicitly typed using the standard response types from `@/common/types/api.types`.

- `ApiResponse<T>` for single entities.
- `OffsetPaginatedResponse<T>` for tables/grids.
- `CursorPaginatedResponse<T>` for infinite scroll.
- `BulkOperationResponse<T>` for batch operations.

### Exception: Better Auth Client Calls

When calling endpoints managed by the **better-auth client** (e.g., `authClient.signIn.email()`, `authClient.signUp.email()`), the response will use **Better Auth's native types**.

- **DO NOT** type these calls with `ApiResponse<T>`.
- **DO NOT** expect a `data.data` wrapper — Better Auth uses `data.user`, `data.session`, etc. directly.
- The auth client handles its own error typing via `data.error`.

```typescript
// ✅ Correct — Better Auth call, use its native type
const { data, error } = await authClient.signIn.email({ ... });
if (error) throw error;

// ✅ Correct — Regular API call, use our ApiResponse type
const result: ApiResponse<User> = await api.get('me').json();
```

### Example

```typescript
import { ApiResponse } from '@/common/types/api.types';

// ✅ Good
const fetchUser = async (id: string): Promise<ApiResponse<User>> => {
  return api.get(\`users/\${id}\`).json();
};
```

## 2. Error Handling

### Authentication Errors

Use the `resolveAuthError` utility to handle Better Auth failures gracefully.

### Global Error Mapping

Failed requests return an `ApiErrorResponse` (RFC 7807).
**Action:** Map these errors to user-friendly toasts using `toast.error()`.

```typescript
onError: (error) => {
  const apiError = error as ApiErrorResponse; // Ensure proper casting/checking
  toast.error(apiError.detail || 'An unexpected error occurred');
};
```

## 3. Environment Variables

**Critical Rule:** strictly **FORBID** `import.meta.env` and `process.env` in feature code.
**Action:** Always use the global `ENV` object.

```typescript
// ❌ Bad
const url = import.meta.env.VITE_API_URL;

// ✅ Good
const url = ENV.API_URL;
```
