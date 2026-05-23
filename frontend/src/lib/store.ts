import { create } from "zustand";

interface AppState {
  activePage: string | null;
  setActivePage: (id: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  activePage: null,
  setActivePage: (id) => set({ activePage: id }),
}));
