import { create } from "zustand";

export const useFaceReviewStore = create((set) => ({
  open: false,
  noFacesOpen: false,
  pendingCount: 0,
  noFacesCount: 0,
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setNoFacesCount: (noFacesCount) => set({ noFacesCount }),
  openReview: () => set({ open: true }),
  closeReview: () => set({ open: false }),
  openNoFacesReview: () => set({ noFacesOpen: true }),
  closeNoFacesReview: () => set({ noFacesOpen: false }),
}));
