import { create } from "zustand";

// Поля фото, редактируемые в правой панели.
export function draftFromPhoto(photo) {
  return {
    title: photo?.title ?? "",
    description: photo?.description ?? "",
    owner: photo?.owner ?? null,
    people: photo?.people ? [...photo.people] : [],
    externalPeople: photo?.externalPeople ? [...photo.externalPeople] : [],
    datePhoto: photo?.datePhoto ?? "",
    locationName: photo?.locationName ?? "",
    lat: photo?.lat ?? null,
    lng: photo?.lng ?? null,
    filename: photo?.filename ?? "",
  };
}

// Общее состояние правой панели-инспектора фото в галереях.
// Галерея кладёт выбранное фото и регистрирует действия, панель их вызывает.
export const usePhotoInspectorStore = create((set, get) => ({
  open: false,
  selectedId: null,
  draft: null,
  dirty: false,
  // Фото, на которое хотят переключиться при наличии несохранённых правок.
  pendingFrom: null,
  pendingPhoto: null,
  // Нужно ли открыть панель после разрешения несохранённых правок.
  pendingOpen: false,
  // Источник данных: активная галерея регистрирует свой список и его сеттер.
  photos: [],
  setPhotos: null,
  actions: {
    openFullscreen: null,
    openFaces: null,
    openPreview: null,
    onSaved: null,
  },

  setActions: (actions) => set({ actions }),

  // Активная галерея (глобальная или персональная) регистрирует свой список фото.
  registerSource: ({ photos, setPhotos }) => set({ photos, setPhotos }),

  // options.open=false — только выделить фото, не открывая панель.
  select: (photo, { open = true } = {}) => {
    if (!photo) return;
    const { selectedId, dirty } = get();
    if (photo.id === selectedId) {
      if (open) set({ open: true });
      return;
    }
    if (dirty) {
      // Сначала автосохраняем текущее фото, затем переключаемся.
      set({ pendingFrom: get().draft, pendingPhoto: photo, pendingOpen: open });
      return;
    }
    set({
      selectedId: photo.id,
      draft: draftFromPhoto(photo),
      dirty: false,
      pendingFrom: null,
      pendingPhoto: null,
      pendingOpen: false,
      ...(open ? { open: true } : {}),
    });
  },

  // Применить переключение после автосохранения текущего фото.
  resolvePending: () => {
    const { pendingPhoto, pendingOpen } = get();
    if (!pendingPhoto) return;
    set({
      selectedId: pendingPhoto.id,
      draft: draftFromPhoto(pendingPhoto),
      dirty: false,
      pendingFrom: null,
      pendingPhoto: null,
      pendingOpen: false,
      ...(pendingOpen ? { open: true } : {}),
    });
  },

  cancelPending: () =>
    set({ pendingFrom: null, pendingPhoto: null, pendingOpen: false }),

  update: (patch) =>
    set((s) => ({ draft: { ...s.draft, ...patch }, dirty: true })),

  // Отменить правку поля (ESC): вернуть сохранённое значение и снять dirty.
  revertField: (name, value) =>
    set((s) =>
      s.draft ? { draft: { ...s.draft, [name]: value }, dirty: false } : {},
    ),

  // Обновить геометку в черновике, не помечая панель как изменённую:
  // координаты сохраняются сразу из модалки карты, отдельно от прочих правок.
  setLocation: ({ lat, lng, locationName }) =>
    set((s) =>
      s.draft ? { draft: { ...s.draft, lat, lng, locationName } } : {},
    ),

  // Переинициализировать черновик свежими данными фото (когда нет правок).
  resetDraft: (photo) => set({ draft: draftFromPhoto(photo), dirty: false }),

  markSaved: () => set({ dirty: false }),

  toggle: () => set((s) => ({ open: !s.open })),

  reset: () =>
    set({
      open: false,
      selectedId: null,
      draft: null,
      dirty: false,
      pendingFrom: null,
      pendingPhoto: null,
      pendingOpen: false,
      photos: [],
      setPhotos: null,
    }),
}));
