import { create } from "zustand";

export const usePeopleListStore = create((set) => ({
  hasArchived: false,

  // Метод для обновления статуса корзины
  setHasArchived: (status) => set({ hasArchived: status }),

  // Опционально: функция, которая сама лезет в БД и обновляет стор
  refreshArchiveStatus: async () => {
    const all = await window.peopleAPI.getAll();
    const isFull = all.some((p) => p.archived);
    set({ hasArchived: isFull });
  },
}));
