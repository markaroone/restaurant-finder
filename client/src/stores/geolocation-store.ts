import { create } from 'zustand';

/**
 * Geolocation store following TkDodo's Zustand pattern.
 * Captures the user's browser coordinates on app load.
 * Used as a fallback when the user doesn't specify a location in their search.
 */

// ── Types ──────────────────────────────────────────────────

type GeolocationState = {
  /** User's latitude, null if not yet acquired or denied. */
  lat: number | null;
  /** User's longitude, null if not yet acquired or denied. */
  lng: number | null;
  /** Current status of the geolocation request. */
  status: 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';
};

type GeolocationActions = {
  actions: {
    /** Request the user's location via the browser Geolocation API. */
    requestLocation: () => void;
  };
};

type GeolocationStore = GeolocationState & GeolocationActions;

// ── Internal Store (Do NOT export!) ────────────────────────

const useGeolocationStore = create<GeolocationStore>((set) => ({
  lat: null,
  lng: null,
  status: 'idle',

  actions: {
    requestLocation: () => {
      if (!navigator.geolocation) {
        set({ status: 'unavailable' });
        return;
      }

      set({ status: 'loading' });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          set({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            status: 'granted',
          });
        },
        () => {
          set({ status: 'denied' });
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
    },
  },
}));

// ── Exported Atomic Selector Hooks ─────────────────────────

export const useGeolocationStatus = () => useGeolocationStore((s) => s.status);

// ── Exported Actions Hook ──────────────────────────────────

export const useGeolocationActions = () =>
  useGeolocationStore((s) => s.actions);

// ── Imperative Read (No subscription!) ─────────────────────

/**
 * Read coordinates without subscribing. Used by the API layer
 * to attach ll param to search requests.
 */
export const getGeolocationState = () => useGeolocationStore.getState();
