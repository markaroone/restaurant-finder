---
name: API Error Handling
description: Unified API Error Handling and HOF wrappers for React applications
---

# API Error Handling

The `@flux-ai-fe` application uses a standardized approach for intercepting, parsing, and resolving API errors coming from the backend using the Higher-Order Function (HOF) wrapper `withApiError`, alongside the strongly typed custom `ApiError` class.

## Objectives

1. **Separation of Concerns:** Component UI code should only render UI, not parse network streams.
2. **Standardization:** All API queries/mutations must bubble up a strictly typed `ApiError`, regardless of if it's a Server Error (500), Validation (422), Conflict (409), or Network Timeout.
3. **Consistency:** Avoid try-catch bloat inside the actual API definition fetch calls.

## The Architecture

### 1. `ApiError` (The Class)

The `ApiError` class extends the native `Error` object. It perfectly mirrors the RFC 7807 Problem Document shape that the backend responds with (`ApiErrorResponse`).

Import from: `@/utils/api-error.ts`

```typescript
export class ApiError extends Error {
  public readonly status: number;
  public readonly detail: string; // Used for `error.message`
  public readonly meta?: Record<string, unknown>;
  public readonly errors?: ValidationErrorDetail[];
  // ...
}
```

### 2. `withApiError` (The Wrapper)

The `withApiError` HOF intercepts execution errors coming from `ky` (the HTTP client). If it catches an `HTTPError`, it asynchronously extracts the JSON body, builds an `ApiError` object, **logs it automatically**, and then throws the `ApiError` for React Query / UI to catch.

Import from: `@/utils/with-api-error.ts`

## 👨‍💻 How to use `withApiError`

When writing a new API function inside an `api/` directory (e.g. `create-physical-account.ts`), you MUST wrap the `async` query/mutation with `withApiError`:

**❌ BAD: Raw API Call**

```typescript
// Don't export the bare fetch function.
export const createAccount = async (data: Params) => {
  const response = await apiClient.post(url, { json: data }).json();
  return response.data;
};
```

**✅ GOOD: Wrapped API Call**

```typescript
import { withApiError } from '@/utils/with-api-error';

// 1. Wrap your API function
export const createAccount = withApiError(async (data: Params) => {
  const response = await apiClient.post(url, { json: data }).json();
  return response.data;
});
```

## 👨‍💻 How to handle errors in UI

Because the API function is wrapped in `withApiError`, React Query's `error` argument inside `onError` (or `error` state in `useQuery`) is guaranteed to be an `ApiError` (or gracefully map network failures).

You can synchronously inspect `error.status` or `error.meta` to perform specific UI actions like triggering inline validation errors via React Hook Form's `setError`.

```tsx
import { ApiError } from '@/utils/api-error';

const { mutate } = useCreateAccount();

const handleSubmit = form.handleSubmit((data) => {
  mutate(data, {
    onError: (error) => {
      // 1. Type check
      if (error instanceof ApiError) {
        // 2. Synchronously check the backend's RFC 7807 payload
        if (error.status === 409 && error.meta?.field === 'accountNumber') {
          form.setError('accountNumber', {
            type: 'manual',
            message: error.detail, // <-- Direct string mapping
          });
          return;
        }
      }

      // 3. Fallback generic handling
      toast.error(error.message);
    },
  });
});
```

## Logging

You do **not** need to manually use `logger.error(error)` during API calls or inside raw UI `onError` handling blocks. `withApiError` (and its counterpart `withAuthError`) automatically log failed requests to the console before bubbling up the structured error.
