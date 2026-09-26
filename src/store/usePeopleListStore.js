import { create } from "zustand";

export const usePeopleListStore = create((set) => ({
  hasArchived: false,
  hasArchivedExternal: false,

  setHasArchived: (status) => set({ hasArchived: status }),
  setHasArchivedExternal: (status) => set({ hasArchivedExternal: status }),

  refreshArchiveStatus: async () => {
    const [all, external] = await Promise.all([
      window.peopleAPI.getAll(),
      window.externalAPI.getAll(),
    ]);
    set({
      hasArchived: all.some((p) => p.archived),
      hasArchivedExternal: external.some((e) => e.archived),
    });
  },
}));
