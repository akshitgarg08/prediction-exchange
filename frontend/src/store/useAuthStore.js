import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      
      setAuth: (user, token) => set({ user, token }),
      
      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('auth-storage');
      },
    }),
    {
      name: 'auth-storage', // Saves login state in browser local storage
    }
  )
);