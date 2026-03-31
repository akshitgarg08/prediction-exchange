// frontend/src/store/useMarketStore.js
import { create } from 'zustand';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:8080';

export const useMarketStore = create((set, get) => ({
  socket: null,
  orderBook: { bids: [], asks: [] },
  lastPrice: null,

  // 1. Connect to the live market stream
  connectToMarket: (marketId) => {
    // Prevent duplicate connections
    if (get().socket) return;

    const socket = io(API_URL);
    
    socket.on('connect', () => {
      console.log('Connected to market stream!');
      socket.emit('joinMarket', marketId);
    });

    // Listen for order book updates from our backend
    socket.on('orderBookUpdate', () => {
      get().fetchOrderBook(marketId);
    });

    socket.on('marketResolved', ({ outcome }) => {
      alert(`Market Resolved! The winner is ${outcome}.`);
    });

    set({ socket });
  },

  // 2. Fetch the current Order Book
  fetchOrderBook: async (marketId) => {
    try {
      const response = await fetch(`${API_URL}/markets/${marketId}/orderbook?outcome=YES`);
      const data = await response.json();
      set({ orderBook: data });
    } catch (error) {
      console.error("Failed to fetch order book:", error);
    }
  },

  // 3. Clean up when leaving the page
  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, orderBook: { bids: [], asks: [] } });
    }
  }
}));