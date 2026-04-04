// ! СОХРАНЕНИЕ НЕ В JSON - скорость работы высокая
// import { create } from "zustand";
// import { persist } from "zustand/middleware";

// // Пастельная палитра (чтобы не резало глаза)
// export const DEFAULT_PALETTE = [
//   "#f44336", // Красный (Смягченный в UI через alpha)
//   "#e91e63", // Розовый
//   "#9c27b0", // Фиолетовый
//   "#3f51b5", // Индиго
//   "#2196f3", // Синий
//   "#00bcd4", // Бирюзовый
//   "#4caf50", // Зеленый
//   "#ff9800", // Оранжевый
// ];

// // Дефолтные метки для старта
// const INITIAL_TAGS = [
//   { id: "tag-1", name: "Родственник", color: DEFAULT_PALETTE[4] },
//   { id: "tag-2", name: "Исследуется", color: DEFAULT_PALETTE[7] },
//   { id: "tag-3", name: "Ветка по отцу", color: DEFAULT_PALETTE[3] },
//   { id: "tag-4", name: "Ветка по матери", color: DEFAULT_PALETTE[1] },
//   { id: "tag-5", name: "Тупик", color: DEFAULT_PALETTE[0] },
// ];

// export const useTagsStore = create(
//   persist(
//     (set, get) => ({
//       tags: INITIAL_TAGS, // Справочник всех меток
//       personTags: {}, // Связи: { personId: ['tag-1', 'tag-2'] }

//       togglePersonTag: (personId, tagId) => {
//         set((state) => {
//           const currentTags = state.personTags[personId] || [];
//           const hasTag = currentTags.includes(tagId);
//           const newTags = hasTag
//             ? currentTags.filter((id) => id !== tagId)
//             : [...currentTags, tagId];

//           return { personTags: { ...state.personTags, [personId]: newTags } };
//         });
//       },

//       // СОЗДАНИЕ НОВОЙ МЕТКИ (С лимитом 8)
//       addTag: (name, color) => {
//         set((state) => {
//           if (state.tags.length >= 8) return state; // Ограничение
//           const newTag = { id: `tag-${Date.now()}`, name, color };
//           return { tags: [...state.tags, newTag] };
//         });
//       },

//       // УДАЛЕНИЕ МЕТКИ ИЗ СИСТЕМЫ (чистим и у людей тоже)
//       deleteTag: (tagId) => {
//         set((state) => {
//           const newTags = state.tags.filter((t) => t.id !== tagId);
//           const newPersonTags = { ...state.personTags };

//           // Удаляем этот ID у всех людей
//           Object.keys(newPersonTags).forEach((personId) => {
//             newPersonTags[personId] = newPersonTags[personId].filter(
//               (id) => id !== tagId,
//             );
//           });

//           return { tags: newTags, personTags: newPersonTags };
//         });
//       },
//     }),
//     {
//       name: "family-app-tags-storage", // ОБЯЗАТЕЛЬНОЕ ПОЛЕ
//       // Можно добавить getStorage, если хочешь хранить не в localStorage
//     },
//   ),
// );
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const DEFAULT_PALETTE = [
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#3f51b5",
  "#2196f3",
  "#00bcd4",
  "#4caf50",
  "#ff9800",
];

const INITIAL_TAGS = [
  { id: "tag-1", name: "Родственник", color: DEFAULT_PALETTE[4] },
  { id: "tag-2", name: "Исследуется", color: DEFAULT_PALETTE[7] },
  { id: "tag-3", name: "Ветка по отцу", color: DEFAULT_PALETTE[3] },
  { id: "tag-4", name: "Ветка по матери", color: DEFAULT_PALETTE[1] },
  { id: "tag-5", name: "Тупик", color: DEFAULT_PALETTE[0] },
];

// 1. Создаем адаптер для вашего API
const electronStorage = {
  getItem: async (name) => {
    // Вызываем ваш метод загрузки из файла
    const data = await window.tagsAPI.load();
    return data ? JSON.stringify({ state: data }) : null;
  },
  setItem: async (name, newValue) => {
    const { state } = JSON.parse(newValue);
    // Вызываем ваш метод сохранения в файл
    await window.tagsAPI.save(state);
  },
  removeItem: async (name) => {
    // Если нужно удаление файла, но обычно для JSON это не требуется
  },
};

export const useTagsStore = create(
  persist(
    (set, get) => ({
      tags: INITIAL_TAGS,
      personTags: {},

      togglePersonTag: (personId, tagId) => {
        set((state) => {
          const currentTags = state.personTags[personId] || [];
          const hasTag = currentTags.includes(tagId);
          const newTags = hasTag
            ? currentTags.filter((id) => id !== tagId)
            : [...currentTags, tagId];

          return { personTags: { ...state.personTags, [personId]: newTags } };
        });
      },

      addTag: (name, color) => {
        set((state) => {
          if (state.tags.length >= 8) return state;
          const newTag = { id: `tag-${Date.now()}`, name, color };
          return { tags: [...state.tags, newTag] };
        });
      },

      deleteTag: (tagId) => {
        set((state) => {
          const newTags = state.tags.filter((t) => t.id !== tagId);
          const newPersonTags = { ...state.personTags };
          Object.keys(newPersonTags).forEach((personId) => {
            newPersonTags[personId] = newPersonTags[personId].filter(
              (id) => id !== tagId,
            );
          });
          return { tags: newTags, personTags: newPersonTags };
        });
      },
    }),
    {
      name: "family-app-tags-storage",
      // 2. Указываем кастомный сторадж вместо дефолтного localStorage
      storage: createJSONStorage(() => electronStorage),
    },
  ),
);
