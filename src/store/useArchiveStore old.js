import { create } from "zustand";

export const useArchiveStore = create((set, get) => ({
  activeTab: 0,
  search: "",
  selected: new Set(), // массив ID выбранных людей

  // --- Экшен для смены таба
  setActiveTab: (index) => set({ activeTab: index }),
  resetTab: () => set({ activeTab: 0 }),

  // --- Поиск
  setSearch: (value) => set({ search: value }),

  // --- Выбор людей

  // Важно: Прямая замена массива для скорости
  setSelected: (id) =>
    set((state) => {
      const newSelected = new Set(state.selected);
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
      return { selected: newSelected };
    }),

  // Оптимизированный переключатель "Все"
  toggleAll: (visibleIds) =>
    set((state) => {
      const isAll =
        visibleIds.length > 0 &&
        visibleIds.every((id) => state.selected.includes(id));
      return {
        selected: isAll
          ? state.selected.filter((id) => !visibleIds.includes(id))
          : [...new Set([...state.selected, ...visibleIds])],
      };
    }),
}));
