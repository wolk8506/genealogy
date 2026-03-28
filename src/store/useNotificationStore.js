import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useNotificationStore = create(
  persist(
    (set) => ({
      notifications: [],
      hasNew: false, // Точка на самом колокольчике

      // Добавление уведомления
      addNotification: ({ title, message, type = "info", link = null }) => {
        const timestamp = new Date().toISOString();
        const newNote = {
          id: Date.now() + Math.random(),
          title,
          message,
          type,
          link,
          timestamp,
          isNew: true, // Желтая точка внутри списка
        };

        // Сохраняем "вечный" лог в файл через Electron API
        // Используем опциональную цепочку, чтобы не упало при тестах в браузере
        if (window.appAPI?.logHistory) {
          window.appAPI.logHistory({ timestamp, title, message, type });
        }

        set((state) => ({
          notifications: [newNote, ...state.notifications],
          hasNew: true,
        }));
      },

      // Когда открыли список — гасим точку на колокольчике
      markAsSeen: () => set({ hasNew: false }),

      // Когда закрыли список — снимаем желтые метки с самих уведомлений
      clearNewStatus: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            isNew: false,
          })),
        })),

      // Удаление одного
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      // Очистка всего
      clearAll: () => set({ notifications: [], hasNew: false }),
    }),
    {
      name: "genealogy-notifications", // Ключ в localStorage
    },
  ),
);
