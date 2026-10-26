import { create } from "zustand";

export const useFaceReviewStore = create((set) => ({
  pendingCount: 0,
  noFacesCount: 0,
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setNoFacesCount: (noFacesCount) => set({ noFacesCount }),
}));
