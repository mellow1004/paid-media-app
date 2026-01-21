import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthState } from '../types';
import { mockUsers, mockUserPasswords } from '../data/mockData';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string): Promise<boolean> => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check credentials against mock data
        const storedPassword = mockUserPasswords[email];
        if (!storedPassword || storedPassword !== password) {
          return false;
        }

        // Find user
        const user = mockUsers.find(u => u.email === email);
        if (!user) {
          return false;
        }

        set({ user, isAuthenticated: true });
        return true;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: (): boolean => {
        return get().isAuthenticated && get().user !== null;
      },
    }),
    {
      name: 'brightvision-auth',
      storage: createJSONStorage(() => localStorage, {
        reviver: (_key, value) => {
          // Convert ISO date strings back to Date objects
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            return new Date(value);
          }
          return value;
        },
      }),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Ensure user dates are proper Date objects
        if (state?.user) {
          state.user = {
            ...state.user,
            created_at: new Date(state.user.created_at),
          };
        }
      },
    }
  )
);

