import { create } from 'zustand';

/**
 * Sort store following TkDodo's Zustand pattern.
 * Controls the client-side sort order of restaurant results.
 */

// ── Types ──────────────────────────────────────────────────

/** The two user-selectable sort options for restaurant results. */
export type SortOption = 'relevance' | 'distance';

type SortState = {
  sortBy: SortOption;
};

type SortActions = {
  actions: {
    setSortBy: (option: SortOption) => void;
  };
};

type SortStore = SortState & SortActions;

// ── Internal Store (Do NOT export!) ────────────────────────

const useSortStore = create<SortStore>((set) => ({
  sortBy: 'relevance',

  actions: {
    setSortBy: (option) => set({ sortBy: option }),
  },
}));

// ── Exported Atomic Selector Hooks ─────────────────────────

/** The current sort option. */
export const useSortBy = () => useSortStore((state) => state.sortBy);

// ── Exported Actions Hook ──────────────────────────────────

/** Actions never change, so this does not cause re-renders. */
export const useSortActions = () => useSortStore((state) => state.actions);
