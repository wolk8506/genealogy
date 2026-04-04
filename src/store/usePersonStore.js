import { create } from "zustand";

export const usePersonStore = create((set) => ({
  // Ссылка на функцию загрузки
  executeUpload: null,

  // Метод, чтобы "привязать" функцию к стору
  setUploadHandler: (fn) => set({ executeUpload: fn }),
}));
