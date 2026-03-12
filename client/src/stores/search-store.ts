import { create } from 'zustand';

/**
 * Search store following TkDodo's Zustand pattern.
 * The bare store is NOT exported — only atomic selector hooks and an actions hook.
 */

// ── Types ──────────────────────────────────────────────────

type SearchState = {
  /** The submitted search message (not the live input value). */
  message: string;
};

type SearchActions = {
  actions: {
    /** Submit a new search query. */
    search: (message: string) => void;
  };
};

type SearchStore = SearchState & SearchActions;

// ── Internal Store (Do NOT export!) ────────────────────────

const useSearchStore = create<SearchStore>((set) => ({
  message: '',

  actions: {
    search: (message: string) => set({ message: message.trim() }),
  },
}));

// ── Exported Atomic Selector Hooks ─────────────────────────

/** The submitted search message. */
export const useSearchMessage = () => useSearchStore((state) => state.message);

// ── Exported Actions Hook ──────────────────────────────────

/** Actions never change, so this does not cause re-renders. */
export const useSearchActions = () => useSearchStore((state) => state.actions);

// ── Imperative Read (No subscription!) ─────────────────────

/** Read the current store state without subscribing. Used by the query hook. */
export const getSearchState = () => useSearchStore.getState();
