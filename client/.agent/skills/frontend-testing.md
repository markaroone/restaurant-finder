---
name: frontend-testing
description: Definitive guide for integration and unit testing in the Flux AI frontend using Vitest, React Testing Library, MSW v2, and happy-dom. Use this skill when writing new tests, configuring the test environment, debugging test failures related to shadcn/Radix, or adding MSW handlers for new API endpoints.
---

# Frontend Testing

## Core Stack

| Tool                      | Purpose                       |
| ------------------------- | ----------------------------- |
| **Vitest**                | Test runner (v4+)             |
| **React Testing Library** | Component rendering & queries |
| **MSW v2**                | Network-level API mocking     |
| **happy-dom**             | DOM environment               |
| **userEvent**             | Simulating user interactions  |

## Configuration

### Vite Config (`vite.config.ts`)

```typescript
test: {
  environment: 'happy-dom',
  globals: true,
  setupFiles: './src/tests/setup.ts',
  css: false,
  pool: 'threads',
}
```

> **⚠️ CRITICAL:** Use `happy-dom` and `pool: 'threads'` — NOT `jsdom` or `forks`. Node v24+ has a breaking ESM/CJS interop issue with `jsdom`'s `glob → lru-cache` dependency chain that crashes worker startup.

### TypeScript (`tsconfig.app.json`)

Add `"vitest/globals"` to the `types` array so `describe`, `it`, `expect` are available without imports.

### Running Tests

```bash
pnpm test          # vitest run (single pass)
pnpm test:watch    # vitest (watch mode)
pnpm test:alt      # node ./node_modules/vitest/vitest.mjs run (Yarn 4 fallback)
```

> **⚠️ CRITICAL — Targeted Execution:** Always target the specific folder or file when running tests. Example:
>
> ```bash
> pnpm run test:alt src/features/your-feature-name
> ```

> **⚠️ CRITICAL — Verbose Output:** Do **NOT** use the `--silent` flag when running tests yourself. You MUST read `stdout` and `stderr` logs (React Query errors, missing provider warnings, mock mismatches) to debug failing tests accurately.

---

## Setup File (`src/tests/setup.ts`)

This file handles three concerns:

### 1. Global ENV Stub

The app uses `ENV.API_URL` everywhere (not `import.meta.env`). Define it globally:

```typescript
(globalThis as Record<string, unknown>).ENV = {
  ENVIRONMENT: 'local',
  API_URL: 'http://localhost:3000/api/v1',
} as const;
```

### 2. Shadcn / Radix Polyfills (Required)

> **⚠️ CRITICAL:** Without these stubs, any test using `Dialog`, `DropdownMenu`, `Select`, `Tooltip`, or other Radix primitives will crash in happy-dom.

Must stub all of:

- `window.matchMedia` — returns `{ matches: false, addListener, removeListener, ... }`
- `ResizeObserver` — noop class with `observe`, `unobserve`, `disconnect`
- `PointerEvent` — class extending `MouseEvent` with `pointerId`, `pointerType`, etc.
- `Element.prototype.scrollIntoView` — noop
- `Element.prototype.hasPointerCapture` / `setPointerCapture` / `releasePointerCapture` — noop stubs

### 3. MSW Lifecycle

```typescript
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Custom Render (`src/tests/test-utils.tsx`)

Always import `render`, `screen`, `userEvent`, `waitFor` from `@/tests/test-utils`, NOT from `@testing-library/react`.

The custom render wraps every test component in:

| Provider              | Reason                                       |
| --------------------- | -------------------------------------------- |
| `QueryClientProvider` | TanStack Query (retry disabled, gcTime 0)    |
| `MemoryRouter`        | Route context without a full browser history |
| `TooltipProvider`     | Required by Radix — crashes without it       |
| `Toaster` (sonner)    | Enables asserting on toast messages          |

> **Note:** `ThemeProvider` is intentionally excluded — not needed for functional tests.

### React Query Provider Rule

> **⚠️ CRITICAL — Always Wrap Components:** Components that use React Query (`useQuery`, `useMutation`) **will crash** the test if rendered without a `QueryClientProvider`. The custom render in `test-utils.tsx` handles this automatically. If you ever render outside of the custom render, you **MUST** provide one manually:

```typescript
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

render(
  <QueryClientProvider client={queryClient}>
    {ui}
  </QueryClientProvider>
);
```

> Instantiate a **fresh** `QueryClient` with `retry: false` to prevent slow, hanging tests.

### Feature-Specific Providers

`test-utils.tsx` only handles **global** providers. If a component needs a feature-specific context (e.g., `PhysicalAccountProvider`), wrap it explicitly in the test:

```typescript
render(
  <PhysicalAccountProvider account={mockAccount}>
    <GridCard />
  </PhysicalAccountProvider>
);
```

---

## Strict TypeScript & Zero `any` Policy

> **⚠️ CRITICAL:** The `any` type is **strictly forbidden** in ALL test files. No exceptions.

### Typed UI Component Mocks

When mocking complex UI components (e.g., Shadcn/Radix `Form`, `FormField`, `Select`), define **explicit prop types**. Never use implicit `any` typing on render props or callbacks.

```typescript
// ✅ Correct — explicit types for the mock's render prop
type FormFieldRenderProps = {
  field: {
    value: undefined;
    onChange: typeof mockOnChange;
    name: string;
  };
};

vi.mock('@/components/ui/form', () => ({
  FormField: ({ render }: { render: (props: FormFieldRenderProps) => ReactNode }) =>
    render({ field: { value: undefined, onChange: mockOnChange, name: 'testField' } }),
}));

// ❌ Wrong — implicit `any` on the render prop
vi.mock('@/components/ui/form', () => ({
  FormField: ({ render }: { render: (props: any) => ReactNode }) => render({ ... }),
}));
```

### Event Simulation in Mocked Components

When mocking a `Select` component, attach `onClick` or `onDoubleClick` handlers to the mock container and trigger the `onValueChange` prop internally. This allows tests to trigger selection via `fireEvent.click()`.

```typescript
vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, children }: { onValueChange: (v: string) => void; children: ReactNode }) => (
    <div onClick={() => onValueChange('BANK')} data-testid="mock-select">
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));
```

---

## Proper State Selector Mocking

> **⚠️ CRITICAL — Selector Precision:** When mocking hooks that use selectors (e.g., Zustand stores or context hooks with selectors), your mock **MUST** return the exact shape the selector extracts, **NOT** the entire store/context object.

### Understanding Selector Extraction

When a component does:

```typescript
const { id } = usePhysicalAccount((state) => state.account);
```

The hook receives a **selector function** and returns `state.account` (not the full state). Your mock must mirror this behavior.

```typescript
// ✅ Correct — returns what the selector would extract
vi.mocked(usePhysicalAccount).mockReturnValue({ id: 1 });

// ❌ Wrong — returns the full store shape; the component will get `undefined`
vi.mocked(usePhysicalAccount).mockReturnValue({ account: { id: 1 } });
```

### Handling Multiple Selectors in One Component

If a component calls the same hook with different selectors, use `mockReturnValueOnce` to return the correct shape for each call in order:

```typescript
vi.mocked(usePhysicalAccount)
  .mockReturnValueOnce({ id: 1, name: 'Savings' }) // first call: state => state.account
  .mockReturnValueOnce('delete'); // second call: state => state.mode
```

---

## MSW Handlers (`src/mocks/handlers.ts`)

### Absolute URL Rule

> **⚠️ CRITICAL:** Handlers MUST use absolute URLs. The `ky` client uses `ENV.API_URL` as `prefixUrl`, constructing full URLs like `http://localhost:3000/api/v1/physical-accounts`. Similarly, `authClient` uses `${ENV.API_URL}/auth`.

```typescript
// ✅ Correct — matches what ky/authClient actually sends
const API_BASE = 'http://localhost:3000/api/v1';
http.get(`${API_BASE}/physical-accounts`, () => { ... });
http.post(`${API_BASE}/auth/sign-in/email`, () => { ... });

// ❌ Wrong — MSW will never intercept these
http.get('/api/v1/physical-accounts', () => { ... });
http.get('*/physical-accounts', () => { ... });
```

### Local Overrides for Error States

Override handlers inside a specific `it()` block using `server.use()`. The override is auto-reset by `afterEach(() => server.resetHandlers())`.

```typescript
it('shows error when API returns 401', async () => {
  server.use(
    http.post(`${API_BASE}/auth/sign-in/email`, () => {
      return HttpResponse.json(
        { code: 'INVALID_CREDENTIALS', message: 'Invalid' },
        { status: 401 },
      );
    }),
  );
  // ... render, interact, assert error message
});
```

---

## Querying Elements

### Shadcn / Radix Quirk

> **⚠️ IMPORTANT:** Radix UI dynamically generates `id` attributes for form fields. `happy-dom` struggles to associate `<label for="...">` with these dynamic IDs, making `getByLabelText` unreliable.

### Preferred Query Priority

Always follow this priority order:

1. `getByRole` — most reliable and accessible
2. `getByText` — for visible text content
3. `getByPlaceholderText` — for form inputs
4. `getByLabelText` — use cautiously (flaky with Radix)
5. `container.querySelector` — last resort for icons/SVGs

> **⚠️ CRITICAL:** Ensure your regex matches the **actual visible text**. Example: use `name: /try again/i` if the button says "Try Again", NOT `name: /retry/i`.

```typescript
// ✅ Preferred — reliable across all environments
screen.getByPlaceholderText('name@example.com');
screen.getByRole('button', { name: /sign in/i });
screen.getByRole('combobox'); // Select trigger
screen.getByRole('option', { name: /bank/i }); // Select option
screen.getByRole('heading', { name: /add account/i });

// ❌ Avoid — flaky with shadcn/Radix in happy-dom
screen.getByLabelText(/email/i);
```

### Avoid Fake `data-testid` Attributes

> **⚠️ CRITICAL:** Do **NOT** query elements by `data-testid` unless you are **absolutely certain** that attribute exists in the source code. Never invent `data-testid` values that don't exist in the component implementation.

### Icon / SVG Testing

Third-party icons (e.g., `lucide-react`) do **not** inherently have `data-testid` or accessible names. To test if a specific icon is rendered, use DOM querying for the CSS class generated by the library:

```typescript
const { container } = render(<MyComponent />);

// ✅ Correct — query by lucide's generated class name
const iconElement = container.querySelector('.lucide-landmark');
expect(iconElement).toBeInTheDocument();

// ❌ Wrong — this data-testid does not exist
screen.getByTestId('landmark-icon');
```

### Handling Ambiguous Buttons

When multiple elements match (e.g., "Add Account" appears in both the header and grid):

```typescript
const buttons = screen.getAllByRole('button', {
  name: /add physical account/i,
});
await user.click(buttons[0]); // Click the header button
```

---

## Test Architecture

### Co-location

Tests live in `__tests__/` alongside the feature:

```
src/features/auth/__tests__/sign-in.test.tsx
src/features/auth/__tests__/sign-up.test.tsx
src/features/physical-accounts/__tests__/physical-accounts.test.tsx
src/features/physical-accounts/components/__tests__/grid-card.test.tsx
```

### Routing Bypass

Test inner components directly — NOT through the full route tree. This bypasses `AuthGuard`/`GuestGuard` and keeps tests fast and focused:

```typescript
// ✅ Direct component render
render(<SignInContent />);

// ❌ Don't render the full route
render(<SignIn />);  // Wraps in AuthLayout + AuthBackground — unnecessary
```

### Strategy

- **Integration tests** for features: render the full component tree, use MSW for API, assert on user-visible outcomes.
- **Unit tests** for pure utilities: test `formatCurrency`, `slugify`, etc. without rendering. Use `describe` / `it` directly.

### Standard Test Patterns

```typescript
it('submits valid data', async () => {
  const user = userEvent.setup();
  render(<Component />);

  // Arrange — fill form
  await user.type(screen.getByPlaceholderText('...'), 'value');

  // Act — submit
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // Assert — verify outcome
  await waitFor(() => {
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });
});
```

---

## Quick Reference Checklist

Before writing or reviewing any test, verify:

- [ ] Using custom `render` from `@/tests/test-utils` (not `@testing-library/react`)
- [ ] Zero `any` types in the entire test file
- [ ] All UI component mocks have explicit prop types
- [ ] Selector mocks return the **extracted shape**, not the full store
- [ ] No invented `data-testid` values — only query real attributes
- [ ] Icons tested via `container.querySelector('.lucide-*')`
- [ ] Regex in `getByRole`/`getByText` matches **actual visible text**
- [ ] Tests run with `pnpm run test:alt src/features/<feature>` (targeted, verbose)
- [ ] React Query components wrapped in `QueryClientProvider` (via custom render or manually)
