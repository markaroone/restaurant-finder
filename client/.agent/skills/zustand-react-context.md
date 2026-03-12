---
name: Zustand + React Context
description: Guidelines on using Zustand with React Context for scoped, reusable, and testable state management based on TkDodo's pattern.
---

# Zustand + React Context Pattern

While Zustand is primarily designed for global client-state management, there are scenarios where state needs to be scoped to a specific component subtree rather than the entire application.

In these cases, we combine **Zustand** with **React Context** as recommended by TkDodo.

## When to Use This Pattern

1. **Initializing from Props:** When you need a store to be initialized with data that comes from React props. Global stores evaluate outside the React lifecycle, making true initialization (rather than post-render syncing via `useEffect`) impossible without Context.
2. **Reusability:** When you have a complex component (like a multi-selection data grid) that needs its own dedicated store, and you might render multiple instances of this component on the same page. A global store would cause instances to conflict and overwrite each other's state.
3. **Testing:** Scoped stores are highly isolated. You can test components that use this store without needing to globally mock Zustand or reset store state between test runs.

## The Implementation

We share the **store instance** via React Context, NOT the store values themselves. This avoids React Context re-rendering issues while still taking advantage of Zustand's optimizations.

### 1. Create the Vanilla Store

Use `createStore` from `zustand/vanilla` instead of the default `create` hook. Define your types, state, and the store creator function.

```tsx
import { createStore } from 'zustand/vanilla';

type FilterProps = {
  initialSearch: string;
};

type FilterState = FilterProps & {
  setSearch: (search: string) => void;
};

type FilterStore = ReturnType<typeof createFilterStore>;

export const createFilterStore = (initProps: FilterProps) => {
  return createStore<FilterState>()((set) => ({
    ...initProps,
    setSearch: (search) => set({ initialSearch: search }),
  }));
};
```

### 2. Create the Context and Provider

Create the Context, and in your Provider component, strictly initialize the store once using `useState`. Avoid using `useRef` as accessing refs during render can trigger React Compiler warnings.

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';

export const FilterStoreContext = createContext<FilterStore | null>(null);

type FilterProviderProps = {
  children: ReactNode;
} & FilterProps;

export const FilterProvider = ({
  children,
  ...props
}: FilterProviderProps): ReactNode => {
  // 1. Initialize the store only once using useState lazy initialization
  const [store] = useState(() => createFilterStore(props));

  return (
    <FilterStoreContext.Provider value={store}>
      {children}
    </FilterStoreContext.Provider>
  );
};
```

### 3. Consume the Store with a Custom Hook

Create a custom hook that wraps `useContext` and Zustand's `useStore`. This enforces that components consuming the state must be wrapped in the Provider.

```tsx
export function useFilterStore<T>(selector: (state: FilterState) => T): T {
  const store = useContext(FilterStoreContext);
  if (!store) {
    throw new Error('useFilterStore must be used within FilterProvider');
  }
  return useStore(store, selector);
}
```

### 4. Grouping it all together

Usually, you put the types, the store creator, the context, the provider, and the custom hook in a single file named `*-provider.tsx` (e.g., `filter-provider.tsx`). To avoid fast refresh issues with exporting both React components and plain JS, you can add `/* eslint-disable react-refresh/only-export-components */` at the top of the file, or separate the vanilla store logic from the React Provider logic if preferred in larger modules.
