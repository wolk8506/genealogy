import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSnackbar } from "notistack";
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Stack,
  Typography,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Backdrop,
  CircularProgress,
  TextField,
  LinearProgress,
  Grid,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Switch,
  Slider,
  Divider,
  Chip,
  useMediaQuery,
  Alert,
} from "@mui/material";
import { useNotificationStore } from "../../store/useNotificationStore";
import {
  Archive as ArchiveIcon,
  People as PeopleIcon,
  Delete as DeleteIcon,
  RestoreFromTrash as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import PersonAvatar from "../../components/PersonAvatar";
import ExportConfirmModal from "../../components/ExportConfirmModal";
import { exportPeopleToZip } from "../utils/exportToZip";
import { useTheme } from "@mui/material/styles";

import ErrorIcon from "@mui/icons-material/Error";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PieChartIcon from "@mui/icons-material/PieChart";
import PersonIcon from "@mui/icons-material/Person";
import PhotoConverterModal from "./PhotoConverterModal";
import SettingsIcon from "@mui/icons-material/Settings";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import SdStorageIcon from "@mui/icons-material/SdStorage";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CollectionsIcon from "@mui/icons-material/Collections";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import SaveIcon from "@mui/icons-material/Save";
import PhotoSizeSelectLargeIcon from "@mui/icons-material/PhotoSizeSelectLarge";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import DescriptionIcon from "@mui/icons-material/Description";
import StorageIcon from "@mui/icons-material/Storage";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { ImportDecisionModal } from "../Page_Settings/ImportDecisionModal";
import { ButtonScrollTop } from "../../components/ButtonScrollTop";
import { alpha } from "@mui/material/styles";

// Иконки

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function ArchivePage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const isSmall = useMediaQuery(theme.breakpoints.down("md"));
  const [people, setPeople] = useState([]);
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [search, setSearch] = useState("");

  const [exportStatus, setExportStatus] = useState("Подготовка архива...");
  const [exportError, setExportError] = useState(false);
  const [sizes, setSizes] = useState({});
  const [archiveProgress, setArchiveProgress] = useState({
    phase: "idle",
    percent: 0,
    processedFiles: 0,
    totalFiles: 0,
    currentFile: "",
    message: "",
    currentOwner: null, // Добавляем поле для имени текущего человека
  });
  const [converterOpen, setConverterOpen] = useState(false);
  const [exportPath, setExportPath] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  // * Для архивирования и восстановления

  const [totalSize, setTotalSize] = useState(null); // Для размера всей папки

  // Для импорта
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingOpen, setIsImportingOpen] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [confirmConflicts, setConfirmConflicts] = useState([]);
  const [modalToAdd, setModalToAdd] = useState([]);
  const confirmResolveRef = useRef(null);

  // Реф для троттлинга импорта (чтобы не было ошибки Maximum update depth)
  const lastUpdateRef = useRef(0);
  // *
  // 1. Инициализация стейта
  const [importSettings, setImportSettings] = useState({
    keepOriginals: true,
    quality: 80,
  });
  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [storageStats, setStorageStats] = useState(null);

  //----------
  // Загрузка при старте
  useEffect(() => {
    // Используем window.settings, как указано в вашем preload
    if (window.settings && window.settings.get) {
      window.settings.get("importSettings").then((saved) => {
        if (saved) setImportSettings(saved);
      });
    }
  }, []);

  // Сохранение изменений
  const handleSettingChange = async (changedValue) => {
    const updated = { ...importSettings, ...changedValue };
    setImportSettings(updated);

    if (window.settings && window.settings.set) {
      await window.settings.set("importSettings", updated);
    }
  };
  //----------
  // Получение общего размера папки документов
  function fetchTotalSize() {
    window.appAPI.getFolderSize().then(setTotalSize);
  }

  useEffect(() => {
    fetchTotalSize();
    // Обновляем размер, если сработал триггер в приложении
    window.appAPI.onFolderSizeUpdated?.(() => fetchTotalSize());
  }, []);

  useEffect(() => {
    let lastUpdate = 0;

    const onProgressHandler = (data) => {
      if (!data || typeof data !== "object") return;

      const now = Date.now();
      // Обновляем только если прошло 100мс или это финал/смена фазы
      if (now - lastUpdate > 100 || data.phase !== archiveProgress.phase) {
        lastUpdate = now;

        setArchiveProgress((prev) => {
          // Проверка: если данные те же, не обновляем (предотвращает петлю)
          if (
            prev.percent === data.percent &&
            prev.processedFiles === data.processedFiles &&
            prev.phase === data.phase
          ) {
            return prev;
          }
          return {
            ...prev,
            ...data,
            // Гарантируем, что если фаза записи, мы берем проценты из системы
            percent:
              typeof data.percent === "number" ? data.percent : prev.percent,
          };
        });
      }
    };

    let off = null;
    if (window.archiveAPI?.onProgress) {
      off = window.archiveAPI.onProgress(onProgressHandler);
    } else if (window.electron?.ipcRenderer) {
      const wrapped = (_, d) => onProgressHandler(d);
      window.electron.ipcRenderer.on("archive:progress", wrapped);
      off = () =>
        window.electron.ipcRenderer.removeListener("archive:progress", wrapped);
    }

    return () => {
      if (typeof off === "function") off();
    };
  }, []);

  useEffect(() => {
    const handler = (event, data) => {
      // data: { conflicts, toAdd, toUpdate }
      setModalToAdd(data.toAdd?.map((id) => ({ id })) || []);
      setConfirmConflicts(data.toUpdate || []);
      // ВАЖНО: Скрываем индикатор прогресса, чтобы показать модалку выбора
      setIsImporting(false);
      setImportConfirmOpen(true);

      confirmResolveRef.current = (response) => {
        window.electron.ipcRenderer.send("import:confirm-response", response);
        setImportConfirmOpen(false);
        // Возвращаем индикатор прогресса ПОСЛЕ выбора
        setIsImporting(true);
      };
    };

    window.electron.ipcRenderer.on("import:confirm", handler);
    return () => {
      window.electron.ipcRenderer.removeListener("import:confirm", handler);
    };
  }, []);

  const handleImportDecision = (response) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(response);
    }
  };

  // Подписка на прогресс импорта
  useEffect(() => {
    if (!window.importAPI?.onProgress) return;
    const removeListener = window.importAPI.onProgress((data) => {
      const now = Date.now();
      if (now - lastUpdateRef.current > 100 || data.current === data.total) {
        lastUpdateRef.current = now;
        setImportProgress((prev) => ({
          current: data.current ?? prev.current,
          total: data.total ?? prev.total,
        }));
        if (data.message) setImportStatus(data.message);
      }
    });
    return () => {
      if (typeof removeListener === "function") removeListener();
    };
  }, []);

  const handleExportAll = async () => {
    setIsSaving(true);
    setSaveDone(false);
    setExportError(false);
    setExportStatus("Подготовка файлов...");

    // Сброс прогресса
    setArchiveProgress({
      phase: "idle",
      percent: 0,
      processedFiles: 0,
      totalFiles: 0,
    });

    try {
      const basePath = (await window.appAPI.getDataPath?.()) || "";
      const allPeople = await window.peopleAPI.getAll();

      const archivePath = await exportPeopleToZip({
        people: allPeople,
        basePath: basePath,
        defaultFilename: `Full_Backup_${Date.now()}.zip`,
        onProgress: (payload) => {
          setArchiveProgress((prev) => ({
            ...prev,
            ...payload,
            // Явно подхватываем владельца или файл, если они пришли
            currentOwner: payload.message,
            currentFile: payload.currentFile ?? prev.currentFile,
            processedFiles: payload.processedFiles ?? prev.processedFiles,
            totalFiles: payload.totalFiles ?? prev.totalFiles,
          }));
        },
        onStatus: setExportStatus,
      });

      // ЕСЛИ ПОЛЬЗОВАТЕЛЬ ОТМЕНИЛ ВЫБОР ФАЙЛА
      if (!archivePath) {
        setIsSaving(false);
        setExportStatus("Отменено пользователем");
        addNotification({
          timestamp: new Date().toISOString(),
          title: "Бэкап",
          message: `Отменено пользователем`,
          type: "warning",
        });
        return; // Прерываем выполнение, чтобы не сработал setSaveDone(true)
      }

      // ЕСЛИ ВСЕ ОК
      setExportPath(archivePath);
      setSaveDone(true);
      setArchiveProgress((prev) => ({ ...prev, phase: "done", percent: 100 }));
      setExportStatus("✅ Полный архив сохранён");
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Бэкап",
        message: `✅ Полный архив сохранён`,
        type: "success",
      });
      fetchTotalSize();
    } catch (e) {
      setExportError(true);
      setExportStatus("Ошибка: " + e.message);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Бэкап",
        message: "Ошибка: " + e.message,
        type: "error",
      });
    }
  };
  const handleImportAll = async () => {
    try {
      setIsImporting(true);
      setIsImportingOpen(true);
      setImportStatus("📥 Выберите ZIP для восстановления...");
      const zipPath = await window.dialogAPI.chooseOpenZip();
      if (!zipPath) {
        setIsImportingOpen(false);
        return;
      }
      await window.importAPI.importZip(zipPath);
      // После импорта обновляем список людей
      loadAll();
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Импорт",
        message: "Импорт из ZIP архива выполнен успешно",
        type: "success",
      });
    } catch (err) {
      setImportStatus(`❌ Ошибка: ${err.message}`);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Импорт",
        message: `❌ Ошибка: ${err.message}`,
        type: "error",
      });
    } finally {
      setIsImporting(false);
    }
  };
  // ---

  // Логика расчета процентов как в SettingsPage
  const percentValue = (() => {
    if (saveDone || archiveProgress.phase === "done") return 100;

    // При записи ZIP ориентируемся строго на проценты от упаковщика
    if (archiveProgress.phase && archiveProgress.phase.startsWith("writing")) {
      return Math.round(archiveProgress.percent || 0);
    }

    // При подготовке файлов рассчитываем на основе кол-ва
    if (archiveProgress.totalFiles > 0) {
      return Math.round(
        ((archiveProgress.processedFiles || 0) / archiveProgress.totalFiles) *
          100,
      );
    }

    return Math.round(archiveProgress.percent || 0);
  })();

  // Вычисляем общее количество фото выбранных (по оригиналам)
  const totalSelectedPhotos = useMemo(() => {
    return selected.reduce((acc, id) => {
      const personData = sizes[id];
      return acc + (personData ? parseInt(personData.count, 10) : 0);
    }, 0);
  }, [selected, sizes]);

  useEffect(() => {
    loadAll();
  }, []);

  // --

  // Размер занимаемого места на диске человеком
  // 2. Функция для загрузки размеров всех отображаемых людей
  const loadSizes = async (peopleList) => {
    const newSizes = {};

    const results = await Promise.all(
      peopleList.map(async (p) => {
        // Этот вызов теперь возвращает { size, count }, где count взят из JSON на бэкенде
        const data = await window.appAPI.getPersonFolderSize(p.id);
        return { id: p.id, data };
      }),
    );

    results.forEach(({ id, data }) => {
      newSizes[id] = data;
    });

    setSizes(newSizes);
  };

  const loadAll = async () => {
    const data = await window.peopleAPI.getAll();
    const sortedData = data || [];
    setPeople(sortedData);

    // 3. Запускаем подсчет размеров после загрузки списка людей
    loadSizes(sortedData);
  };
  // --

  const archived = people.filter((p) => p.archived);
  const active = people.filter((p) => !p.archived);

  const filteredActive = useMemo(() => {
    const q = search.toLowerCase();
    return active.filter((p) => {
      const fullName = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase();
      return fullName.includes(q) || String(p.id).includes(q);
    });
  }, [active, search]);

  const allIds = filteredActive.map((p) => p.id);
  const allSelected = allIds.every((id) => selected.includes(id));
  const someSelected = allIds.some((id) => selected.includes(id));

  const handleToggleAll = () => {
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...allIds])]);
    }
  };

  const handleToggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleArchiveSelected = () => {
    // Не делайте getAll() здесь! У вас уже есть people в стейте.
    const toExport = people.filter((p) => selected.includes(p.id));
    setSelectedPeople(toExport);
    setConfirmOpen(true);
  };

  const handleConfirmExport = async () => {
    setConfirmOpen(false);
    setIsSaving(true);
    setSaveDone(false);
    setExportError(false);
    setExportStatus("Подготовка архива...");

    try {
      const resultPath = await exportPeopleToZip({
        people: selectedPeople,
        // ... ваши параметры onProgress и т.д.
      });

      if (!resultPath) {
        setIsSaving(false);
        return;
      }

      setExportPath(resultPath); // Теперь эта функция существует!
      setSaveDone(true);
      setSelected([]);
      setExportStatus("✅ Архив сохранён");

      // Необязательно: можно закрыть Backdrop автоматически через пару секунд
      // setTimeout(() => setIsSaving(false), 3000);
    } catch (err) {
      console.error("Export error:", err);
      setExportStatus(`❌ Ошибка: ${err?.message || "Неизвестно"}`);
      setExportError(true);
      // setIsSaving(false); // Можно оставить открытым, чтобы была видна ошибка
    }
  };

  const handleToggleArchive = async (id, toArchive) => {
    await window.peopleAPI.update(id, { archived: toArchive });
    await loadAll();
    setSelected((prev) => prev.filter((x) => x !== id));

    const p = people.filter((el) => el.id === id)[0];
    const name =
      [`${p.id} ::`, p.firstName, p.patronymic, p.lastName || p.maidenName]
        .filter(Boolean)
        .join(" ") || `ID ${p.id}`;

    addNotification({
      timestamp: new Date().toISOString(),
      title: toArchive
        ? "Человек перемещен в корзину"
        : "Человек восстановлен из корзины",
      message: toArchive
        ? `Из дерева удален: ${name} `
        : `В дерево восстановлен: ${name} `,
      type: toArchive ? "warning" : "success",
      // Если у вас есть роутинг, можно передать линк на карточку:
      link: toArchive ? `/archive` : `/person/${id}`,
    });
  };

  const handleDeleteForever = async (id) => {
    const now = new Date().toISOString();

    // 1) получить всех людей
    let all = await window.peopleAPI.getAll();
    const person = all.find((p) => p.id === id);
    if (!person) return;

    // 2) обновляем связи
    if (person.father) {
      const father = all.find((p) => p.id === person.father);
      if (father) {
        father.children = (father.children || []).filter((cid) => cid !== id);
        father.editedAt = now;
      }
    }

    if (person.mother) {
      const mother = all.find((p) => p.id === person.mother);
      if (mother) {
        mother.children = (mother.children || []).filter((cid) => cid !== id);
        mother.editedAt = now;
      }
    }

    (person.children || []).forEach((cid) => {
      const child = all.find((p) => p.id === cid);
      if (child) {
        if (child.father === id) child.father = null;
        if (child.mother === id) child.mother = null;
        child.editedAt = now;
      }
    });

    (person.spouse || []).forEach((sid) => {
      const sp = all.find((p) => p.id === sid);
      if (sp) {
        sp.spouse = (sp.spouse || []).filter((s) => s !== id);
        sp.editedAt = now;
      }
    });

    (person.siblings || []).forEach((sid) => {
      const sib = all.find((p) => p.id === sid);
      if (sib) {
        sib.siblings = (sib.siblings || []).filter((s) => s !== id);
        sib.editedAt = now;
      }
    });

    // 3) сохраняем обновлённые связи
    await window.peopleAPI.saveAll(all);

    // 4) удаляем самого человека
    await window.peopleAPI.delete(id);

    // 5) перезагружаем список
    await loadAll();

    // 🔔 Notification
    // const p = people.filter((el) => el.id === id)[0];
    const name =
      [
        `${person.id} ::`,
        person.firstName,
        person.patronymic,
        person.lastName || person.maidenName,
      ]
        .filter(Boolean)
        .join(" ") || `ID ${person.id}`;
    const connections = [
      person.children, //[],
      person.father, // 80001,
      person.mother, // null,
      person.siblings, // [],
      person.spouse, //[],
    ]
      .flat()
      .filter(Boolean)
      .join(", ");

    addNotification({
      timestamp: new Date().toISOString(),
      title: "Человек удален",
      message: `Из корзины удален: ${name} \n Затронутые связи: ${connections.length > 1 ? connections : "отсутствуют"}`,
      type: "error",
    });
  };

  const { enqueueSnackbar } = useSnackbar();

  const handleClearData = async (type) => {
    const label = type === "originals" ? "оригиналы" : "кэш (webp/thumbs)";

    // Подтверждение действия
    if (
      !window.confirm(
        `Вы уверены, что хотите удалить ${label}? Это действие необратимо.`,
      )
    ) {
      return;
    }

    try {
      // Вызов метода из preload.js / main.js
      const success = await window.appAPI.deleteMedia(type);

      if (success) {
        enqueueSnackbar(`Данные (${label}) успешно удалены`, {
          variant: "success",
        });
        addNotification({
          timestamp: new Date().toISOString(),
          title: "⚠️ Опасная зона",
          message: `Данные (${label}) успешно удалены`,
          type: "success",
        });
      } else {
        enqueueSnackbar(`Не удалось удалить ${label}`, { variant: "error" });
        addNotification({
          timestamp: new Date().toISOString(),
          title: "⚠️ Опасная зона",
          message: `Не удалось удалить ${label}`,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Ошибка при удалении:", error);
      enqueueSnackbar("Произошла системная ошибка при удалении", {
        variant: "error",
      });
      addNotification({
        timestamp: new Date().toISOString(),
        title: "⚠️ Опасная зона",
        message: "Произошла системная ошибка при удалении",
        type: "error",
      });
    }
  };

  const handleFullReset = async () => {
    if (resetConfirmText !== "УДАЛИТЬ") {
      enqueueSnackbar("Введите 'УДАЛИТЬ' для подтверждения", {
        variant: "error",
      });
      return;
    }

    try {
      const success = await window.appAPI.fullReset();
      if (success) {
        setResetDialogOpen(false);
        setResetConfirmText("");
        enqueueSnackbar("Все данные (база и фото) полностью удалены", {
          variant: "success",
        });
        addNotification({
          timestamp: new Date().toISOString(),
          title: "⚠️ Опасная зона",
          message: `Все данные (база и фото) полностью удалены`,
          type: "success",
        });
        loadAll(); // Обновляем список (станет пустым)
        fetchTotalSize(); // Обновляем размер папки
      }
    } catch (err) {
      enqueueSnackbar("Ошибка при очистке: " + err.message, {
        variant: "error",
      });
      addNotification({
        timestamp: new Date().toISOString(),
        title: "⚠️ Опасная зона",
        message: "Ошибка при очистке: " + err.message,
        type: "error",
      });
    }
  };

  // Функция для форматирования размера
  const formatSize = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " МБ";
  };
  // _________________________
  const [diskInfo, setDiskInfo] = useState({ total: 0, free: 0 });

  const formatStorage = (mb) => {
    const val = parseFloat(mb);
    if (!val || isNaN(val)) return "0 GB";
    if (val < 1024) return `${val.toFixed(1)} MB`;
    return `${(val / 1024).toFixed(1)} GB`;
  };

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // 1. Запрос общего состояния диска (то, что мы делали для полоски)
        const diskData = await window.electronAPI.getDiskUsage();
        if (diskData) setDiskInfo(diskData);

        // 2. Запрос детальной статистики (то, что раньше было в handleOpenStorageInfo)
        const detailedData = await window.appAPI.getDetailedStorageStats();
        if (detailedData) setStorageStats(detailedData);
      } catch (error) {
        console.error("Ошибка загрузки статистики:", error);
      }
    };

    loadAllData();

    // Если у тебя есть интервал обновления, можно оставить его
    const interval = setInterval(loadAllData, 60000); // Обновлять раз в минуту
    return () => clearInterval(interval);
  }, []);

  // Основные переменные для расчетов
  const total = diskInfo.total || 1;
  const free = diskInfo.free;
  const library = parseFloat(totalSize) || 0;

  // "Другое" — это (Всего - Свободно - Моя библиотека)
  const other = Math.max(0, total - free - library);

  // Проценты для полоски
  const libPct = (library / total) * 100;
  const otherPct = (other / total) * 100;

  function StatRow({ icon, label, value }) {
    return (
      <ListItem disableGutters>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            width: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              p: 0.5,
              bgcolor: "action.hover",
              borderRadius: 1,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                lineHeight: 1.2,
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, fontSize: "0.8rem" }}
            >
              {value}
            </Typography>
          </Box>
        </Box>
      </ListItem>
    );
  }

  return (
    <Box sx={{ p: 0 }}>
      <ImportDecisionModal
        open={importConfirmOpen}
        summary={`Найдено конфликтов: ${confirmConflicts.length}`}
        toAdd={modalToAdd}
        toUpdate={confirmConflicts.map((id) => ({ id }))}
        onSelect={handleImportDecision}
      />
      {/* Tabs */}
      <Paper elevation={1} sx={{ mb: 2, borderRadius: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            icon={<PeopleIcon />}
            iconPosition="start"
            // label={`Активные ${search.length>0?(filteredActive.length || 0):''}:(${filteredActive.length || 0})`}
            label={`Активные ${
              search.length > 0
                ? `(${filteredActive.length || 0} из ${active.length})`
                : `(${active.length || 0})`
            } `}
          />
          <Tab
            icon={<DeleteIcon />}
            iconPosition="start"
            label={`В корзине (${archived.length || 0})`}
          />
          <Tab
            icon={<SettingsIcon />}
            iconPosition="start"
            label={`Настройки`}
          />
        </Tabs>
      </Paper>
      {/* Action buttons */}
      {tab === 0 && (
        <Paper
          elevation={1}
          sx={{
            position: "sticky",
            borderRadius: 3,
            top: { xs: 56, sm: 64 },
            marginBottom: 2,
            zIndex: 10,
            p: 2,
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
          >
            <TextField
              label="Поиск по имени или ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ flexGrow: 1, minWidth: "200px" }}
            />

            {/* Статистика выбранного */}
            {selected.length > 0 && (
              <Box sx={{ textAlign: "right", px: 2, width: "210px" }}>
                <Typography
                  variant="caption"
                  display="block"
                  color="text.secondary"
                  sx={{
                    // fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  {selected.length > 1 ? (
                    <PeopleIcon sx={{ fontSize: "18px" }} />
                  ) : (
                    <PersonIcon sx={{ fontSize: "18px" }} />
                  )}
                  Выбрано: <b>{selected.length}</b>
                </Typography>
                <Typography
                  variant="caption"
                  display="block"
                  color="primary"
                  sx={{
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <CameraAltIcon sx={{ fontSize: 16 }} />
                    {totalSelectedPhotos}
                  </span>
                </Typography>
              </Box>
            )}

            <Button
              variant="contained"
              startIcon={<ArchiveIcon />}
              disabled={!selected.length}
              onClick={handleArchiveSelected}
            >
              Экспорт выбранных
            </Button>

            <FormControlLabel
              control={
                <Checkbox
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onChange={handleToggleAll}
                />
              }
              label="Все"
            />
          </Stack>
        </Paper>
      )}
      {/* Списки */}
      {tab === 0 && (
        <List disablePadding>
          {filteredActive.map((p) => (
            <Paper
              key={p.id}
              elevation={1}
              sx={{
                mb: 1,
                "&:hover": { boxShadow: 4 },
                borderRadius: 3,
              }}
            >
              <ListItem
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      color="warning"
                      variant="outlined"
                      onClick={() => handleToggleArchive(p.id, true)}
                    >
                      В корзину
                      <DeleteIcon sx={{ ml: 0.5 }} />
                    </Button>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selected.includes(p.id)}
                          onChange={() => handleToggle(p.id)}
                        />
                      }
                      label="В ZIP"
                    />
                  </Stack>
                }
              >
                <ListItemAvatar>
                  <PersonAvatar
                    personId={p.id}
                    initials={
                      (p.firstName?.[0] || "") +
                      (p.lastName?.[0] ||
                        (p.maidenName?.[0] ? p.maidenName?.[1] : ""))
                    }
                    size={40}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    [p.firstName, p.lastName || p.maidenName]
                      .filter(Boolean)
                      .join(" ") || "Без имени"
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        mt: 1,
                      }}
                    >
                      {/* Бейдж ID */}
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.04)",
                          px: 1,
                          py: 0.2,
                          borderRadius: "6px",
                          fontFamily: "monospace",
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        ID: {p.id}
                      </Typography>

                      {/* Кол-во из JSON */}
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.7 }}
                      >
                        <PhotoLibraryIcon // Библиотека фото лучше подходит для "количества из базы"
                          sx={{
                            fontSize: 16,
                            color: "primary.main",
                            opacity: 0.8,
                          }}
                        />
                        <Typography variant="body2">
                          В базе: <b>{sizes[p.id]?.count ?? 0}</b>
                        </Typography>
                      </Box>

                      {/* Размер папки */}
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.8 }}
                      >
                        <StorageIcon
                          sx={{ fontSize: 16, color: "text.secondary" }}
                        />
                        <Typography
                          variant="body2"
                          sx={{ color: "text.primary" }}
                        >
                          Вес папки: <b>{sizes[p.id]?.size ?? "0.00"} МБ</b>
                        </Typography>
                      </Box>
                    </Typography>
                  }
                  secondaryTypographyProps={{ component: "div" }}
                />
              </ListItem>
            </Paper>
          ))}
        </List>
      )}
      {tab === 1 && (
        <List disablePadding>
          {archived.length === 0 ? ( // --- ЗАГЛУШКА ПРИ ПУСТОМ СПИСККЕ ---
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 10,
                px: 3,
                borderRadius: 4,
                bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.02),
                border: "2px dashed",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderRadius: "50%",
                  // Используем нейтральный или зеленый цвет, т.к. пустая корзина — это хорошо
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  mb: 2,
                }}
              >
                <DeleteOutlineIcon
                  sx={{ fontSize: 40, color: "success.main", opacity: 0.5 }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "text.secondary" }}
              >
                Корзина пуста
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.disabled",
                  mt: 1,
                  textAlign: "center",
                  maxWidth: 300,
                }}
              >
                Здесь будут временно храниться люди, которых вы решили удалить
                из основного списка.
              </Typography>
            </Box>
          ) : (
            // --- КОД СТРАНИИЦЫ ---
            archived.map((p) => (
              <Paper
                key={p.id}
                elevation={1}
                sx={{
                  mb: 1,
                  "&:hover": { boxShadow: 4 },
                  borderRadius: 3,
                }}
              >
                <ListItem
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        color="success"
                        variant="outlined"
                        onClick={() => handleToggleArchive(p.id, false)}
                      >
                        Восстановить
                        <RestoreIcon sx={{ ml: 0.5 }} />
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => handleDeleteForever(p.id)}
                      >
                        Удалить навсегда
                        <DeleteForeverIcon sx={{ ml: 0.5 }} />
                      </Button>
                    </Stack>
                  }
                >
                  <ListItemAvatar>
                    <PersonAvatar
                      personId={p.id}
                      initials={
                        (p.firstName?.[0] || "") +
                        (p.lastName?.[0] ||
                          (p.maidenName?.[0] ? p.maidenName?.[1] : ""))
                      }
                      size={40}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      [p.firstName, p.lastName || p.maidenName]
                        .filter(Boolean)
                        .join(" ") || "Без имени"
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.04)",
                          px: 1,
                          py: 0.2,
                          borderRadius: "6px",
                          fontFamily: "monospace",
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        ID: {p.id}
                      </Typography>
                    }
                  />
                </ListItem>
              </Paper>
            ))
          )}
        </List>
      )}

      {tab === 2 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: 4,
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: 800,
              mb: 3,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <StorageIcon color="primary" /> Управление данными и медиа
          </Typography>
          <>
            <Grid
              container
              spacing={3}
              alignItems="flex-start"
              justifyContent={"space-around"}
            >
              {/* ЛЕВАЯ КОЛОНКА (например, 7 из 12) */}
              <Grid item xs={12} md={7}>
                <Stack spacing={3}>
                  {/* КАРТОЧКА: Резервное копирование */}
                  <Card
                    variant="outlined"
                    sx={{
                      width: "600px",
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: "divider",
                      overflow: "hidden",
                      bgcolor: "background.paper",
                    }}
                  >
                    {/* ШАПКА */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "action.hover",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        // alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <PieChartIcon color="primary" sx={{ fontSize: 20 }} />
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                          textTransform: "uppercase",
                          fontSize: "0.7rem",
                          letterSpacing: 1,
                        }}
                      >
                        Статистика хранилища
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2.5 }}>
                      <Stack spacing={3}>
                        {/* 1. ВИЗУАЛИЗАЦИЯ ДИСКА */}
                        {/* 1. ВИЗУАЛИЗАЦИЯ ДИСКА */}
                        <Box>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 2 }}
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <StorageIcon
                                sx={{
                                  fontSize: 20,
                                  color: "text.secondary",
                                  opacity: 0.8,
                                }}
                              />
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "text.secondary",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    fontSize: "0.6rem",
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  Системный том
                                </Typography>
                                <Typography
                                  variant="subtitle1"
                                  sx={{ fontWeight: 800, lineHeight: 1 }}
                                >
                                  {formatStorage(total)}
                                </Typography>
                              </Box>
                            </Stack>

                            <Box sx={{ textAlign: "right" }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "primary.main",
                                  fontWeight: 800,
                                  bgcolor: alpha(
                                    theme.palette.primary.main,
                                    0.1,
                                  ),
                                  px: 1,
                                  py: 0.2,
                                  borderRadius: 1,
                                }}
                              >
                                Занято:{" "}
                                {(((total - free) / total) * 100).toFixed(0)}%
                              </Typography>
                            </Box>
                          </Stack>

                          {/* Полоска прогресса (Трёхцветная) */}
                          <Box
                            sx={{
                              height: 14,
                              width: "100%",
                              // alignItems: "center",
                              bgcolor: alpha(theme.palette.divider, 0.2),
                              borderRadius: 7,
                              overflow: "hidden",
                              display: "flex",
                              boxShadow: `inset 0 1px 3px ${alpha("#000", 0.1)}`,
                              mb: 3,
                            }}
                          >
                            {/* Библиотека */}
                            <Box
                              sx={{
                                width: `${libPct}%`,
                                bgcolor: "primary.main",
                                transition: "width 1s",
                              }}
                            />
                            {/* Другие файлы */}
                            <Box
                              sx={{
                                width: `${otherPct}%`,
                                bgcolor: alpha(
                                  theme.palette.text.disabled,
                                  0.5,
                                ),
                                borderLeft: "1px solid rgba(255,255,255,0.2)",
                              }}
                            />
                            {/* Доступно (остаток полоски — автоматически прозрачный/фон) */}
                          </Box>

                          {/* ЛЕГЕНДА С ДВУХСТРОЧНОЙ ПОДПИСЬЮ */}
                          <Grid container spacing={2}>
                            {/* Библиотека */}
                            <Grid item xs={4}>
                              <Stack direction="row" spacing={1}>
                                <Box
                                  sx={{
                                    // alignItems: "center",
                                    width: 10,
                                    height: 10,
                                    borderRadius: "2px",
                                    bgcolor: "primary.main",
                                    mt: 0.5,
                                  }}
                                />
                                <Box>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: "block",
                                      fontSize: "0.65rem",
                                      fontWeight: 700,
                                      lineHeight: 1.1,
                                      color: "text.secondary",
                                    }}
                                  >
                                    Файлы библиотеки
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 800 }}
                                  >
                                    {formatStorage(library)}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Grid>

                            {/* Другое */}
                            <Grid item xs={4}>
                              <Stack direction="row" spacing={1}>
                                <Box
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "2px",
                                    bgcolor: alpha(
                                      theme.palette.text.disabled,
                                      0.8,
                                    ),
                                    mt: 0.5,
                                  }}
                                />
                                <Box>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: "block",
                                      fontSize: "0.65rem",
                                      fontWeight: 700,
                                      lineHeight: 1.1,
                                      color: "text.secondary",
                                    }}
                                  >
                                    Система и кэш
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 800 }}
                                  >
                                    {formatStorage(total - free - library)}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Grid>

                            {/* Доступно */}
                            <Grid item xs={4}>
                              <Stack direction="row" spacing={1}>
                                <Box
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "2px",
                                    bgcolor: alpha(theme.palette.divider, 0.8),
                                    mt: 0.5,
                                    border: "1px solid divider",
                                  }}
                                />
                                <Box>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: "block",
                                      fontSize: "0.65rem",
                                      fontWeight: 700,
                                      lineHeight: 1.1,
                                      color: "text.secondary",
                                    }}
                                  >
                                    Доступно (прибл.)
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 800,
                                      color:
                                        free < 10240 ? "error.main" : "inherit",
                                    }}
                                  >
                                    {formatStorage(free)}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Grid>
                          </Grid>
                        </Box>

                        <Divider sx={{ borderStyle: "dashed" }} />

                        {/* 2. ПОДРОБНАЯ СТАТИСТИКА (ИЗ МОДАЛКИ) */}
                        <Grid container spacing={9} justifyContent={"center"}>
                          {/* Секция МЕДИА */}
                          <Grid item xs={12} sm={6}>
                            <Typography
                              variant="overline"
                              sx={{
                                fontWeight: 900,
                                color: "primary.main",
                                ml: 1,
                              }}
                            >
                              Медиа файлы
                            </Typography>
                            <List
                              data-density="compact"
                              sx={{ "& .MuiListItem-root": { px: 1, py: 0.5 } }}
                            >
                              <StatRow
                                icon={
                                  <CameraAltIcon
                                    sx={{ fontSize: 18 }}
                                    color="primary"
                                  />
                                }
                                label="Оригиналы"
                                value={formatSize(storageStats?.original || 0)}
                              />
                              <StatRow
                                icon={
                                  <PhotoSizeSelectLargeIcon
                                    sx={{ fontSize: 18 }}
                                    color="action"
                                  />
                                }
                                label="Сжатые (WebP)"
                                value={formatSize(storageStats?.webp || 0)}
                              />
                              <StatRow
                                icon={
                                  <PhotoLibraryIcon
                                    sx={{ fontSize: 18 }}
                                    color="disabled"
                                  />
                                }
                                label="Превью (Thumbs)"
                                value={formatSize(storageStats?.thumbs || 0)}
                              />
                            </List>
                          </Grid>

                          {/* Секция ДАННЫЕ */}
                          <Grid item xs={12} sm={6}>
                            <Typography
                              variant="overline"
                              sx={{
                                fontWeight: 900,
                                color: "secondary.main",
                                ml: 1,
                              }}
                            >
                              Инфо и БД
                            </Typography>
                            <List
                              data-density="compact"
                              sx={{ "& .MuiListItem-root": { px: 1, py: 0.5 } }}
                            >
                              <StatRow
                                icon={
                                  <DescriptionIcon
                                    sx={{ fontSize: 18 }}
                                    color="secondary"
                                  />
                                }
                                label="Биографии (BIO)"
                                value={formatSize(storageStats?.bio || 0)}
                              />
                              <StatRow
                                icon={
                                  <StorageIcon
                                    sx={{ fontSize: 18 }}
                                    color="success"
                                  />
                                }
                                label="База данных"
                                value={formatSize(storageStats?.db || 0)}
                              />
                              <Button
                                fullWidth
                                variant="text"
                                size="small"
                                startIcon={<FolderOpenIcon />}
                                onClick={() => window.appAPI.openDataFolder()}
                                sx={{
                                  justifyContent: "flex-start",
                                  mt: 1,
                                  fontSize: "0.65rem",
                                  opacity: 0.7,
                                }}
                              >
                                Открыть директорию
                              </Button>
                            </List>
                          </Grid>
                        </Grid>

                        <Divider />

                        {/* 3. КНОПКИ ДЕЙСТВИЙ */}
                        <Stack direction="row" spacing={2}>
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleExportAll}
                            sx={{
                              borderRadius: 2,
                              py: 1,
                              boxShadow: "none",
                              fontWeight: "bold",
                            }}
                          >
                            Бэкап
                          </Button>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<RestoreIcon />}
                            onClick={handleImportAll}
                            sx={{ borderRadius: 2, py: 1, fontWeight: "bold" }}
                          >
                            Импорт
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  </Card>

                  {/* КАРТОЧКА: Настройки импорта */}
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      height: "100%", // Растягиваем по высоте родителя
                      width: "600px",
                      display: "flex",
                      flexDirection: "column",
                      bgcolor: alpha(theme.palette.background.paper, 0.4),
                    }}
                  >
                    <Box sx={{ p: 3, flexGrow: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 700,
                          mb: 3,
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <SettingsIcon color="primary" /> Параметры обработки
                        новых фото
                      </Typography>

                      <Stack spacing={5}>
                        {/* Секция: Оригиналы */}
                        <Box>
                          <FormControlLabel
                            sx={{
                              ml: 0,
                              mb: 1,
                              width: "100%",
                              justifyContent: "space-between",
                              flexDirection: "row-reverse",
                            }}
                            control={
                              <Switch
                                checked={importSettings.keepOriginals}
                                onChange={(e) =>
                                  handleSettingChange({
                                    keepOriginals: e.target.checked,
                                  })
                                }
                              />
                            }
                            label={
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 700 }}
                              >
                                Сохранять исходные файлы
                              </Typography>
                            }
                          />
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.5,
                              p: 2,
                              borderRadius: 2,
                              bgcolor: alpha(theme.palette.info.main, 0.05),
                              border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                            }}
                          >
                            <InfoOutlinedIcon
                              sx={{ fontSize: 18, color: "info.main", mt: 0.3 }}
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ lineHeight: 1.4 }}
                            >
                              При включении система создаст копию в папке{" "}
                              <b>"originals"</b>. Это гарантирует, что вы всегда
                              сможете вернуться к исходному качеству, но требует
                              в 2-3 раза больше дискового пространства.
                            </Typography>
                          </Box>
                        </Box>

                        {/* Секция: Качество WebP */}
                        <Box>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 2 }}
                          >
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 700 }}
                              >
                                Степень сжатия WebP
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Баланс между размером файла и четкостью
                              </Typography>
                            </Box>
                            <Chip
                              label={`${importSettings.quality}%`}
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 800, borderRadius: "6px" }}
                            />
                          </Stack>

                          <Box sx={{ px: 1, mb: 3 }}>
                            <Slider
                              value={importSettings.quality}
                              min={10}
                              max={100}
                              step={5}
                              marks={[
                                { value: 10, label: "Min" },
                                { value: 80, label: "Рекомендуется" },
                                { value: 100, label: "Max" },
                              ]}
                              onChange={(_, v) =>
                                setImportSettings((p) => ({ ...p, quality: v }))
                              }
                              onChangeCommitted={(_, v) =>
                                handleSettingChange({ quality: v })
                              }
                              sx={{
                                "& .MuiSlider-markLabel": {
                                  fontSize: "0.65rem",
                                  fontWeight: 600,
                                },
                              }}
                            />
                          </Box>

                          <Box
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              bgcolor: alpha(theme.palette.warning.main, 0.05),
                              border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block", lineHeight: 1.4 }}
                            >
                              <b>80%</b> — золотая середина. Фото визуально
                              неотличимы от оригинала, но весят на 60% меньше.
                              При <b>100%</b> сжатие почти отсутствует, что
                              увеличит нагрузку на сеть.
                            </Typography>
                          </Box>
                        </Box>
                      </Stack>
                    </Box>
                  </Card>
                </Stack>
              </Grid>

              {/* ПРАВАЯ КОЛОНКА (например, 5 из 12) */}
              <Grid item xs={12} md={5}>
                <Stack spacing={3}>
                  {/* Мастер оптимизации (оставляем без изменений) */}
                  <Card
                    sx={{
                      width: "600px",
                      p: 0,
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: "divider",
                      height: "530px",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                      bgcolor: "background.paper",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                    }}
                  >
                    {/* ШАПКА */}
                    <Box
                      sx={{
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        bgcolor: "action.hover",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <AutoFixHighIcon color="primary" sx={{ fontSize: 18 }} />
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                          textTransform: "uppercase",
                          fontSize: "0.7rem",
                          letterSpacing: 1,
                        }}
                      >
                        Интеллектуальный помощник
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        p: 3,
                        flexGrow: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      {/* ЦЕНТРАЛЬНЫЙ БЛОК: Иконка и Описание */}
                      <Box sx={{ textAlign: "center", mb: 3 }}>
                        <Box
                          sx={{
                            position: "relative",
                            display: "inline-flex",
                            mb: 2,
                            "&::after": {
                              content: '""',
                              position: "absolute",
                              // width: "100%",
                              height: "100%",
                              bgcolor: "primary.main",
                              filter: "blur(35px)",
                              opacity: 0.15,
                              zIndex: 0,
                            },
                          }}
                        >
                          <AutoFixHighIcon
                            sx={{
                              fontSize: 80,
                              color: "primary.main",
                              position: "relative",
                              zIndex: 1,
                            }}
                          />
                        </Box>

                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 900, mb: 1 }}
                        >
                          Мастер оптимизации
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                            lineHeight: 1.5,
                            px: 1,
                          }}
                        >
                          Автоматизированная система подготовки медиа-файлов для
                          быстрой работы архива.
                        </Typography>
                      </Box>

                      {/* СПИСОК ФУНКЦИЙ: Заполняет пространство */}
                      <Stack spacing={1} sx={{ mb: "auto" }}>
                        {[
                          {
                            title: "Конвертация в WebP",
                            desc: "Уменьшение веса фото до 70% без потери четкости",
                            icon: (
                              <SdStorageIcon
                                sx={{ fontSize: 18 }}
                                color="primary"
                              />
                            ),
                          },
                          {
                            title: "Генерация миниатюр",
                            desc: "Мгновенная загрузка превью в дереве и списках",
                            icon: (
                              <CollectionsIcon
                                sx={{ fontSize: 18 }}
                                color="primary"
                              />
                            ),
                          },
                          {
                            title: "Умное хранение",
                            desc: "Разделение оригиналов и оптимизированных копий",
                            icon: (
                              <AccountTreeIcon
                                sx={{ fontSize: 18 }}
                                color="primary"
                              />
                            ),
                          },
                        ].map((item, i) => (
                          <Box
                            key={i}
                            sx={{
                              display: "flex",
                              gap: 2,
                              px: 1.5,
                              pt: 1,
                              pb: 0.5,
                              borderRadius: 2,
                              bgcolor: alpha(theme.palette.action.hover, 0.4),
                            }}
                          >
                            <Box sx={{ mt: 0.5 }}>{item.icon}</Box>
                            <Box>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 800,
                                  display: "block",
                                  color: "text.primary",
                                  lineHeight: 1,
                                }}
                              >
                                {item.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: "0.65rem",
                                  color: "text.secondary",
                                }}
                              >
                                {item.desc}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Stack>

                      {/* НИЖНИЙ БЛОК */}
                      <Box sx={{ mt: 3 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          // size="large"
                          startIcon={<SettingsSuggestIcon />}
                          onClick={() => setConverterOpen(true)}
                          sx={{
                            // py: 2,
                            borderRadius: 3,
                            fontWeight: 800,
                            fontSize: "0.9rem",
                            textTransform: "none",
                            boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.25)}`,
                            "&:hover": {
                              bgcolor: "primary.dark",
                              transform: "translateY(-2px)",
                            },
                            transition: "all 0.2s",
                          }}
                        >
                          Настроить и запустить
                        </Button>
                      </Box>
                    </Box>
                  </Card>

                  {/* Опасная зона */}
                  <Card
                    variant="outlined"
                    sx={{
                      // width: "100%",
                      width: "600px",
                      p: 2.5,
                      borderRadius: 3,
                      border: "1px dashed",
                      borderColor: "error.main",
                      bgcolor: alpha(theme.palette.error.main, 0.02),
                      flexGrow: 1,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 800,
                        color: "error.main",
                        mb: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      <WarningAmberIcon fontSize="small" /> Опасная зона
                    </Typography>

                    <Stack spacing={2.5}>
                      {/* Блок Оригиналы */}
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: isDark ? alpha("#000", 0.2) : "#fff",
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: "text.primary",
                            display: "block",
                            mb: 0.5,
                          }}
                        >
                          ОРИГИНАЛЬНЫЕ ФОТО
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            display: "block",
                            mb: 1.5,
                            lineHeight: 1.3,
                          }}
                        >
                          Занимают много места, но хранят исходное качество.
                          <Box
                            component="span"
                            sx={{ color: "error.main", fontWeight: 600 }}
                          >
                            {" "}
                            Удаление необратимо
                          </Box>{" "}
                          — вернуть качество после будет невозможно.
                        </Typography>
                        <Button
                          fullWidth
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => handleClearData("originals")}
                          sx={{
                            borderRadius: "8px",
                            fontWeight: 700,
                            textTransform: "none",
                          }}
                        >
                          Удалить оригиналы
                        </Button>
                      </Box>

                      {/* Блок Кэш */}
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: isDark ? alpha("#000", 0.2) : "#fff",
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: "text.primary",
                            display: "block",
                            mb: 0.5,
                          }}
                        >
                          ВРЕМЕННЫЙ КЭШ (WEB-ВЕРСИИ)
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            display: "block",
                            mb: 1.5,
                            lineHeight: 1.3,
                          }}
                        >
                          Используется для быстрой загрузки превью в браузере.
                          Можно безопасно удалить для очистки места, кэш
                          пересоберется автоматически при просмотре.
                        </Typography>
                        <Button
                          fullWidth
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => handleClearData("cache")}
                          sx={{
                            borderRadius: "8px",
                            fontWeight: 700,
                            textTransform: "none",
                          }}
                        >
                          Удалить кэш
                        </Button>
                      </Box>

                      {/* Финальное предупреждение и Сброс */}
                      <Stack spacing={1}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1,
                            px: 1,
                            color: "error.main",
                          }}
                        >
                          <InfoOutlinedIcon sx={{ fontSize: 16, mt: 0.2 }} />
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              fontStyle: "italic",
                              lineHeight: 1.2,
                            }}
                          >
                            Перед удалением убедитесь, что у вас создана
                            резервная копия данных на внешнем носителе!
                          </Typography>
                        </Box>

                        <Button
                          fullWidth
                          color="error"
                          variant="contained"
                          startIcon={<DeleteForeverIcon />}
                          onClick={() => setResetDialogOpen(true)}
                          sx={{
                            py: 1.5,
                            borderRadius: 2,
                            fontWeight: 800,
                            boxShadow: "none",
                            "&:hover": {
                              bgcolor: "error.dark",
                              boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
                            },
                          }}
                        >
                          Полный сброс базы данных
                        </Button>
                      </Stack>
                    </Stack>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          </>

          <PhotoConverterModal
            open={converterOpen}
            onClose={() => setConverterOpen(false)}
          />
          <Dialog
            open={storageModalOpen}
            onClose={() => setStorageModalOpen(false)}
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle
              sx={{ pb: 1, display: "flex", alignItems: "center", gap: 1 }}
            >
              <PieChartIcon /> Состояние хранилища
            </DialogTitle>
            <DialogContent>
              <Typography
                variant="caption"
                color="text.secondary"
                gutterBottom
                display="block"
              >
                Путь: {storageStats?.path}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                gutterBottom
                display="block"
              >
                Общий объём: {totalSize ? `${totalSize} MB` : "..."}
              </Typography>

              <List sx={{ mt: 1 }}>
                <Typography
                  variant="overline"
                  color="primary"
                  sx={{ fontWeight: "bold", pl: 2 }}
                >
                  Фотографии
                </Typography>
                <ListItem>
                  <ListItemAvatar>
                    <CameraAltIcon color="primary" />
                  </ListItemAvatar>
                  <ListItemText
                    primary="Оригиналы"
                    secondary={formatSize(storageStats?.original || 0)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <PhotoSizeSelectLargeIcon color="action" />
                  </ListItemAvatar>
                  <ListItemText
                    primary="Сжатые (WebP)"
                    secondary={formatSize(storageStats?.webp || 0)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <PhotoLibraryIcon color="disabled" />
                  </ListItemAvatar>
                  <ListItemText
                    primary="Превью (Thumbs)"
                    secondary={formatSize(storageStats?.thumbs || 0)}
                  />
                </ListItem>

                <Divider sx={{ my: 1 }} />

                <Typography
                  variant="overline"
                  color="secondary"
                  sx={{ fontWeight: "bold", pl: 2 }}
                >
                  Данные
                </Typography>
                <ListItem>
                  <ListItemAvatar>
                    <DescriptionIcon color="secondary" />
                  </ListItemAvatar>
                  <ListItemText
                    primary="Биографии (BIO)"
                    secondary={`${formatSize(storageStats?.bio || 0)} (вкл. прикрепленные фото)`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <StorageIcon color="success" />
                  </ListItemAvatar>
                  <ListItemText
                    primary="Базы данных (JSON)"
                    secondary={formatSize(storageStats?.db || 0)}
                  />
                </ListItem>
              </List>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: "action.hover" }}>
              <Button
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                // onClick={() => window.appAPI.openFolder(storageStats.path)}
                onClick={() => window.appAPI.openDataFolder()}
              >
                В папку данных
              </Button>
              <Button
                onClick={() => setStorageModalOpen(false)}
                variant="contained"
                color="primary"
              >
                ОК
              </Button>
            </DialogActions>
          </Dialog>
          {/* Диалог подтверждения полного удаления */}
          <Dialog
            open={resetDialogOpen}
            onClose={() => setResetDialogOpen(false)}
            PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
          >
            <DialogTitle sx={{ color: "error.main", fontWeight: "bold" }}>
              ⚠️ Полная очистка данных
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Это действие безвозвратно удалит <strong>всех людей</strong> и{" "}
                <strong>все фотографии</strong> из папки Genealogy. Приложение
                станет абсолютно чистым.
              </DialogContentText>
              <TextField
                fullWidth
                label="Введите слово УДАЛИТЬ"
                variant="outlined"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                autoFocus
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setResetDialogOpen(false)} color="inherit">
                Отмена
              </Button>
              <Button
                onClick={handleFullReset}
                color="error"
                variant="contained"
                disabled={resetConfirmText !== "УДАЛИТЬ"}
              >
                Удалить всё навсегда
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      )}
      {/* Export confirmation */}
      <ExportConfirmModal
        open={confirmOpen}
        people={selectedPeople}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmExport}
      />
      {/* Backdrop */}
      <Backdrop
        open={isSaving}
        sx={{ zIndex: 3000, color: "#fff", flexDirection: "column", p: 3 }}
      >
        {exportError ? (
          <Box sx={{ textAlign: "center" }}>
            <ErrorIcon sx={{ fontSize: 60, color: "red", mb: 2 }} />
            <Typography variant="h6">{exportStatus}</Typography>
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={() => setIsSaving(false)}
            >
              Закрыть
            </Button>
          </Box>
        ) : saveDone ? (
          <Box sx={{ textAlign: "center" }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: "limegreen", mb: 2 }} />
            <Typography variant="h6">Успешно выполнено!</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
              {exportPath}
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={() => setIsSaving(false)}
            >
              Закрыть
            </Button>
          </Box>
        ) : (
          <Box sx={{ width: "100%", maxWidth: 450, textAlign: "center" }}>
            <CircularProgress color="inherit" sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {exportStatus}
            </Typography>

            <LinearProgress
              variant="determinate"
              value={percentValue}
              sx={{ height: 10, borderRadius: 5 }}
            />

            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ mt: 1 }}
            >
              <Typography variant="caption">
                {archiveProgress.phase.startsWith("writing")
                  ? `Сжатие и упаковка: ${archiveProgress.processedFiles || 0} из ${archiveProgress.totalFiles || 0}`
                  : `${archiveProgress.currentOwner} `}
              </Typography>

              <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                {percentValue}%
              </Typography>
            </Stack>

            {archiveProgress.currentFile && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 1,
                  opacity: 0.6,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {archiveProgress.currentFile}
              </Typography>
            )}
          </Box>
        )}
      </Backdrop>

      <Backdrop
        // ОТКРЫВАЕМ только если идет импорт И НЕ открыто окно подтверждения конфликтов
        open={isImportingOpen && !importConfirmOpen}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
          p: 3,
          backdropFilter: "blur(4px)",
        }}
      >
        {isImporting ? (
          <>
            <CircularProgress color="inherit" sx={{ mb: 2 }} />
            <Typography variant="h6">{importStatus}</Typography>
            <Box sx={{ width: "100%", maxWidth: 400, mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={Math.round(
                  (importProgress.current / Math.max(1, importProgress.total)) *
                    100,
                )}
              />
              <Typography
                variant="caption"
                sx={{ mt: 1, display: "block", textAlign: "center" }}
              >
                Обработано: {importProgress.current} из {importProgress.total}
              </Typography>
            </Box>
          </>
        ) : (
          // Это состояние покажется, когда импорт полностью завершен (isImporting: false)
          <Box sx={{ textAlign: "center" }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: "limegreen", mb: 2 }} />
            <Typography variant="h6">Архив успешно восстановлен!</Typography>
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={() => setIsImportingOpen(false)}
            >
              Закрыть
            </Button>
          </Box>
        )}
      </Backdrop>

      <ButtonScrollTop />
    </Box>
  );
}
