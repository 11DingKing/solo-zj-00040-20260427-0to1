import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IUser, UserRole, IStore } from "@/types";

interface AuthState {
  token: string | null;
  user: IUser | null;
  isAuthenticated: boolean;
  currentStore: IStore | null;

  setToken: (token: string) => void;
  setUser: (user: IUser) => void;
  setCurrentStore: (store: IStore | null) => void;
  logout: () => void;
  login: (token: string, user: IUser) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: localStorage.getItem('token') || null,
      user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
      isAuthenticated: !!localStorage.getItem('token'),
      currentStore: null,

      setToken: (token) => {
        localStorage.setItem("token", token);
        set({ token });
      },

      setUser: (user) => {
        localStorage.setItem("user", JSON.stringify(user));
        set({ user });
      },

      setCurrentStore: (store) => set({ currentStore: store }),

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          currentStore: null,
        });
      },

      login: (token, user) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        set({
          token,
          user,
          isAuthenticated: true,
        });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

interface AppState {
  loading: boolean;
  notifications: {
    id: string;
    type: "success" | "error" | "warning" | "info";
    message: string;
  }[];

  setLoading: (loading: boolean) => void;
  addNotification: (
    type: "success" | "error" | "warning" | "info",
    message: string,
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  loading: false,
  notifications: [],

  setLoading: (loading) => set({ loading }),

  addNotification: (type, message) => {
    const id = Date.now().toString();
    set((state) => ({
      notifications: [...state.notifications, { id, type, message }],
    }));

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 5000);
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearNotifications: () => set({ notifications: [] }),
}));

export const isAdmin = (): boolean => {
  const { user } = useAuthStore.getState();
  return user?.role === UserRole.ADMIN;
};

export const isManager = (): boolean => {
  const { user } = useAuthStore.getState();
  return user?.role === UserRole.MANAGER || user?.role === UserRole.ADMIN;
};

export const isEmployee = (): boolean => {
  const { user } = useAuthStore.getState();
  return user?.role === UserRole.EMPLOYEE;
};
