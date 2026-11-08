import { create } from "zustand";

// Состояние каркаса окна. Левый ящик навигации нужен фотогалереям: его
// ширина не должна перестраивать сетку снимков.
export const useLayoutStore = create((set) => ({
  drawerOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
}));
