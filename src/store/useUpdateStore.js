import { create } from "zustand";

// Состояние обновления держится здесь, а не в компоненте: слушатели
// electron-updater навешиваются один раз на модуль, поэтому диалог
// «Доступно обновление» и карточка в настройках видят один и тот же
// прогресс загрузки и не отписываются друг от друга.
let bound = false;

export const useUpdateStore = create((set, get) => ({
  currentVersion: "",
  platform: "",
  // updateInfo из фиды: версия, файлы и текст релиза («что нового»)
  latest: null,
  checking: true,
  error: null,
  progress: 0,
  downloading: false,
  downloaded: false,
  filePath: "",
  installing: false,
  // info, пришедший со стартовой проверки — по нему открывается диалог
  notice: null,

  bind: () => {
    if (bound || !window.updater) return;
    bound = true;

    window.updater.onAvailable((info) =>
      set({ latest: info, checking: false }),
    );
    window.updater.onProgress((pct) =>
      set({ downloading: true, progress: pct }),
    );
    window.updater.onDownloaded((path) =>
      set({ progress: 100, downloading: false, downloaded: true, filePath: path }),
    );
    window.updater.onError((msg) =>
      set({ error: msg, downloading: false, installing: false }),
    );
    window.updater.onAppUpdate((info) =>
      set({ latest: info, checking: false, notice: info }),
    );
  },

  loadMeta: async () => {
    const [version, platform] = await Promise.all([
      window.appAPI?.getVersion?.() ?? "",
      window.appAPI?.getPlatform?.() ?? "",
    ]);
    set({ currentVersion: version || "", platform: platform || "" });
  },

  check: () => {
    if (!window.updater) return;
    set({ checking: true, error: null });
    window.updater.check();
  },

  download: () => {
    const { latest } = get();
    if (!window.updater || !latest) return;
    set({
      error: null,
      progress: 0,
      downloaded: false,
      filePath: "",
      downloading: true,
    });
    window.updater.download(latest);
  },

  install: () => {
    const { filePath } = get();
    if (!window.updater) return;
    set({ error: null, installing: true });
    window.updater.install(filePath);
  },

  dismissNotice: () => set({ notice: null }),
}));
