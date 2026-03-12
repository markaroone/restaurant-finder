---
name: Zustand Architecture Pattern
description: Rules for TkDodo's "Working with Zustand" pattern
---

# Zustand Global State Pattern

We follow TkDodo's "Working with Zustand" pattern for global state management.

## Rule 1: Hide the Store

Never export the bare Zustand store.
`const useMyStore = create(...)` must NOT have an `export` keyword.

## Rule 2: Only Export Custom Hooks

Consumers should never write their own selectors. Export specific selector hooks for them.

## Rule 3: Prefer Atomic Selectors

Do not return large objects from selectors. Create separate exported hooks for individual state values to prevent unnecessary re-renders.
Example: `export const useBears = () => useBearStore(state => state.bears)`

## Rule 4: Separate Actions from State

Group all state mutation functions inside a nested `actions` object within the store.

## Rule 5: Export a Single Hook for Actions

Create one hook to export the entire actions object. Since action functions never change, this does not cause re-renders.
Example: `export const useMyStoreActions = () => useMyStore(state => state.actions)`

## Example Implementation

```typescript
import { create } from 'zustand';

// 1. Define the state shape
type BearState = {
  bears: number;
  isLoading: boolean;
};

// 2. Define the actions shape
type BearActions = {
  actions: {
    addBear: () => void;
    setLoading: (isLoading: boolean) => void;
    clearBears: () => void;
  };
};

type BearStore = BearState & BearActions;

// 3. INTERNAL STORE (Do not export!)
const useBearStore = create<BearStore>((set) => ({
  bears: 0,
  isLoading: false,

  // 4. Nested actions object
  actions: {
    addBear: () => set((state) => ({ bears: state.bears + 1 })),
    setLoading: (isLoading) => set({ isLoading }),
    clearBears: () => set({ bears: 0 }),
  },
}));

// 5. EXPORTED SELECTOR HOOKS (Atomic)
export const useBears = () => useBearStore((state) => state.bears);
export const useBearsIsLoading = () => useBearStore((state) => state.isLoading);

// 6. EXPORTED ACTIONS HOOK
export const useBearActions = () => useBearStore((state) => state.actions);
```
