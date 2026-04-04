import { create } from "zustand";

export const useModalStore = create((set) => ({
  isGlobalPhotoUploadOpen: false,
  openGlobalPhotoUpload: () => set({ isGlobalPhotoUploadOpen: true }),
  closeGlobalPhotoUpload: () => set({ isGlobalPhotoUploadOpen: false }),
}));
