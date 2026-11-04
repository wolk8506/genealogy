import { create } from "zustand";

export const useSettingsStore = create((set, get) => ({
  // Дефолтные значения (пока не загрузились из базы)
  appSettings: {
    newLabelDuration: 24,
    maxUploadSize: 0.5,
    homePersonId: null,
  },
  settingsLoaded: false,

  // 1. Метод для первоначальной загрузки (вызовем при старте приложения)
  loadSettings: async () => {
    try {
      if (window.settings && window.settings.get) {
        const saved = await window.settings.get("appSettings");
        if (saved) {
          set({ appSettings: { ...get().appSettings, ...saved } });
        }
      }
    } finally {
      set({ settingsLoaded: true });
    }
  },

  // 2. Метод для обновления (будем вызывать из карточки настроек)
  updateAppSettings: async (newValues) => {
    const updated = { ...get().appSettings, ...newValues };

    // Обновляем стейт для мгновенной реакции UI
    set({ appSettings: updated });

    // Фоном сохраняем на жесткий диск
    if (window.settings && window.settings.set) {
      await window.settings.set("appSettings", updated);
    }
  },

  // Домашний человек («Это я»): корень дерева по умолчанию.
  // null снимает отметку.
  setHomePersonId: async (personId) => {
    const id =
      personId === null || personId === undefined || personId === ""
        ? null
        : String(personId);
    await get().updateAppSettings({ homePersonId: id });
  },
}));
