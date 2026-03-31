// frontend/src/store/useMarketStore.js
import { create } from 'zustand';

const API_URL = 'http://localhost:8080';

export const useMarketStore = create((set, get) => ({
  markets: [],
  activeMarket: null,
  prices: { yes: 0.5, no: 0.5 },
  pollingInterval: null,

  // Fetch all markets and set the first one as active
  fetchMarkets: async () => {
    try {
      const res = await fetch(`${API_URL}/markets`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;

      const active = data[0];
      set({
        markets: data,
        activeMarket: active,
        prices: active.prices ?? { yes: 0.5, no: 0.5 },
      });
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    }
  },

  // Fetch the latest AMM price for the active market
  refreshPrice: async () => {
    const { activeMarket } = get();
    if (!activeMarket) return;

    try {
      const res = await fetch(`${API_URL}/markets/${activeMarket.id}/price`);
      const data = await res.json();
      if (data.prices) set({ prices: data.prices });
    } catch (error) {
      console.error('Failed to refresh price:', error);
    }
  },

  // Start polling for price updates every 5 seconds
  startPolling: () => {
    const existing = get().pollingInterval;
    if (existing) return;

    const id = setInterval(() => {
      get().refreshPrice();
    }, 5000);

    set({ pollingInterval: id });
  },

  // Stop polling and clean up
  stopPolling: () => {
    const id = get().pollingInterval;
    if (id) {
      clearInterval(id);
      set({ pollingInterval: null });
    }
  },
}));
