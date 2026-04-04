import { create } from "zustand";

export const useSettingsStore = create((set, get) => ({
  // Дефолтные значения (пока не загрузились из базы)
  appSettings: {
    newLabelDuration: 24,
    maxUploadSize: 0.5,
  },

  // 1. Метод для первоначальной загрузки (вызовем при старте приложения)
  loadSettings: async () => {
    if (window.settings && window.settings.get) {
      const saved = await window.settings.get("appSettings");
      if (saved) {
        set({ appSettings: { ...get().appSettings, ...saved } });
      }
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
}));
