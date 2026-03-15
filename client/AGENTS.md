# Client — AI Context

> Also read the root `../AGENTS.md` for shared TypeScript, naming, and Git rules.

## Tech Stack

| Tech             | Choice                        | Purpose                   |
| :--------------- | :---------------------------- | :------------------------ |
| **Framework**    | **React 19 + Vite 7**         | Fast HMR, modern tooling. |
| **Styling**      | **TailwindCSS 4 + shadcn/ui** | Accessible, polished UI.  |
| **Server State** | **TanStack Query v5**         | Data fetching, caching.   |
| **Global State** | **Zustand 5**                 | Lightweight store.        |
| **HTTP Client**  | **Ky**                        | Typed, prefixUrl support. |
| **Forms**        | **React Hook Form + Zod**     | Validation-first forms.   |
| **Testing**      | **Vitest + RTL + happy-dom**  | Component + integration.  |

## Critical Rules

- **Exports:** Named only. `export const SearchBar` not `export default`.
- **Fragments:** Use `<Fragment>` not `<>`.
- **Environment:** Use global `ENV` object, never `import.meta.env` directly.
- **Props:** Define in separate `type`, never inline.
- **Hooks:** Custom hooks return objects `{ data, isLoading }`, not arrays.
- **Event Handlers:** Define inside component (`handleClick`), not inline in JSX.
- **Class merging:** Use `cn()` from `@/utils/cn`.

## Architecture

- **No React Router.** Single-page app.
- **No `features/` nesting.** Flat `src/components/`, `src/hooks/`, `src/api/`.
- **Clean Code:** Run `pnpm check` before committing. Run `pnpm fix` to auto-fix.

## Data Fetching (TanStack Query + Ky)

- Use pre-configured `ky` instance from `@/lib/api-client` with `prefixUrl`.
- Wrap ALL API functions in `withApiError` HOF.
- Use typed `ApiError` class mirroring RFC 7807 backend responses.

```typescript
// api/search-restaurants.ts
export const searchRestaurants = withApiError(async (message: string) => {
  return apiClient
    .get('execute', {
      searchParams: { message, code: 'pioneerdevai' },
    })
    .json<SearchResponse>();
});
```

## Zod Schemas

- Always provide `required_error` and `invalid_type_error`.
- Use `.min(1, 'message')` not `.nonempty()`.
- Error messages should read like SaaS copy: clear, polite, actionable.

## Testing

- **Custom render** from `@/tests/test-utils` — wraps in QueryClientProvider.
- **Query priority:** `getByRole` > `getByText` > `getByPlaceholderText`.
- **No invented `data-testid`** — only query real attributes.
