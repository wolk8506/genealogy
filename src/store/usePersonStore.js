import { create } from "zustand";

export const usePersonStore = create((set) => ({
  executeUpload: null,
  openFilesFolder: null,

  setUploadHandler: (fn) => set({ executeUpload: fn }),
  setOpenFolderHandler: (fn) => set({ openFilesFolder: fn }),
}));
