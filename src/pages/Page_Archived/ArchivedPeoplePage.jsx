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
} from "@mui/material";
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
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Fab, Zoom } from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PieChartIcon from "@mui/icons-material/PieChart";
import PersonIcon from "@mui/icons-material/Person";
import PhotoConverterModal from "./PhotoConverterModal";
import SettingsIcon from "@mui/icons-material/Settings";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import SaveIcon from "@mui/icons-material/Save";
import PhotoSizeSelectLargeIcon from "@mui/icons-material/PhotoSizeSelectLarge";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import DescriptionIcon from "@mui/icons-material/Description";
import StorageIcon from "@mui/icons-material/Storage";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { ImportDecisionModal } from "../Page_Settings/ImportDecisionModal";

export default function ArchivePage() {
  const [people, setPeople] = useState([]);
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [search, setSearch] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isSmall = useMediaQuery(theme.breakpoints.down("md"));
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
          console.log(payload.message);
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
        return; // Прерываем выполнение, чтобы не сработал setSaveDone(true)
      }

      // ЕСЛИ ВСЕ ОК
      setExportPath(archivePath);
      setSaveDone(true);
      setArchiveProgress((prev) => ({ ...prev, phase: "done", percent: 100 }));
      setExportStatus("✅ Полный архив сохранён");
      fetchTotalSize();
    } catch (e) {
      setExportError(true);
      setExportStatus("Ошибка: " + e.message);
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
    } catch (err) {
      setImportStatus(`❌ Ошибка: ${err.message}`);
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

  // Вычисляем общий размер выбранных людей (сумма МБ)
  const totalSelectedSize = useMemo(() => {
    return selected
      .reduce((acc, id) => {
        const personData = sizes[id];
        const sizeValue = personData ? parseFloat(personData.size) : 0;
        return acc + sizeValue;
      }, 0)
      .toFixed(2);
  }, [selected, sizes]);

  // Вычисляем общее количество фото выбранных (по оригиналам)
  const totalSelectedPhotos = useMemo(() => {
    return selected.reduce((acc, id) => {
      const personData = sizes[id];
      return acc + (personData ? parseInt(personData.count, 10) : 0);
    }, 0);
  }, [selected, sizes]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
      } else {
        enqueueSnackbar(`Не удалось удалить ${label}`, { variant: "error" });
      }
    } catch (error) {
      console.error("Ошибка при удалении:", error);
      enqueueSnackbar("Произошла системная ошибка при удалении", {
        variant: "error",
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
        loadAll(); // Обновляем список (станет пустым)
        fetchTotalSize(); // Обновляем размер папки
      }
    } catch (err) {
      enqueueSnackbar("Ошибка при очистке: " + err.message, {
        variant: "error",
      });
    }
  };

  const handleOpenStorageInfo = async () => {
    const data = await window.appAPI.getDetailedStorageStats();
    setStorageStats(data);
    setStorageModalOpen(true);
  };

  // Функция для форматирования размера
  const formatSize = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + " МБ";

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
                  {/* <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <FolderIcon sx={{ fontSize: 16 }} /> {totalSelectedSize} МБ
                  </span> */}
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
          {archived.map((p) => (
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
          ))}
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

          <Grid container spacing={3}>
            {/* ЛЕВАЯ КОЛОНКА: Основные инструменты */}
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                {/* КАРТОЧКА: Резервное копирование */}
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "action.hover",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        fontSize: "0.75rem",
                        letterSpacing: 1,
                      }}
                    >
                      Инструменты архива
                    </Typography>
                    <Chip
                      label={totalSize ? `${totalSize} MB` : "..."}
                      size="small"
                      color="primary"
                      variant="outlined"
                      icon={<FolderSharedIcon />}
                      onClick={handleOpenStorageInfo}
                      sx={{
                        fontWeight: "bold",
                        cursor: "pointer",
                        "&:hover": { bgcolor: "primary.light", color: "white" },
                        p: 1.7,
                      }}
                    />
                  </Box>
                  <Box sx={{ p: 2.5 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={handleExportAll}
                          sx={{ borderRadius: 2, py: 1.2, boxShadow: "none" }}
                        >
                          Создать бэкап
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<RestoreIcon />}
                          onClick={handleImportAll}
                          sx={{ borderRadius: 2, py: 1.2 }}
                        >
                          Восстановить
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Card>

                {/* КАРТОЧКА: Настройки импорта */}
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <Box sx={{ p: 2.5 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        mb: 2.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <SettingsIcon fontSize="small" color="action" /> Параметры
                      обработки для новых фото
                    </Typography>

                    <Stack spacing={4}>
                      <FormControlLabel
                        sx={{
                          ml: 0,
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
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              Сохранять оригиналы
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Хранить исходники в папке "original"
                            </Typography>
                          </Box>
                        }
                      />

                      <Box>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Качество WebP
                          </Typography>
                          <Chip
                            label={`${importSettings.quality}%`}
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 800 }}
                          />
                        </Stack>
                        <Slider
                          value={importSettings.quality}
                          min={10}
                          max={100}
                          step={5}
                          marks={[
                            { value: 10, label: "10" },
                            { value: 80, label: "80" },
                            { value: 100, label: "100" },
                          ]}
                          onChange={(_, v) =>
                            setImportSettings((p) => ({ ...p, quality: v }))
                          }
                          onChangeCommitted={(_, v) =>
                            handleSettingChange({ quality: v })
                          }
                        />
                      </Box>
                    </Stack>
                  </Box>
                </Card>
              </Stack>
            </Grid>

            {/* ПРАВАЯ КОЛОНКА: Оптимизация и Опасная зона */}
            <Grid item xs={12} md={5}>
              <Stack spacing={3} sx={{ height: "100%" }}>
                {/* Оптимизация */}
                <Card
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, mb: 1 }}
                  >
                    Мастер оптимизации
                  </Typography>
                  <Typography variant="caption" sx={{ mb: 2, opacity: 0.9 }}>
                    Автоматическое создание WebP версий и миниатюр для всей
                    библиотеки
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<AutoFixHighIcon />}
                    onClick={() => setConverterOpen(true)}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 700,
                      bgcolor: "white",
                      color: "primary.main",
                      "&:hover": { bgcolor: "#f0f0f0" },
                    }}
                  >
                    Запустить анализ
                  </Button>
                </Card>

                {/* Опасная зона */}
                <Card
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: "1px dashed",
                    borderColor: "error.main",
                    bgcolor: "rgba(211, 47, 47, 0.03)",
                    flexGrow: 1,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      color: "error.main",
                      mb: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <WarningAmberIcon fontSize="small" /> Опасная зона
                  </Typography>

                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        fullWidth
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => handleClearData("originals")}
                        sx={{ fontSize: "0.7rem", fontWeight: 700 }}
                      >
                        Очистить оригиналы
                      </Button>
                      <Button
                        fullWidth
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => handleClearData("cache")}
                        sx={{ fontSize: "0.7rem", fontWeight: 700 }}
                      >
                        Очистить кэш
                      </Button>
                    </Stack>

                    <Button
                      fullWidth
                      color="error"
                      variant="contained"
                      startIcon={<DeleteForeverIcon />}
                      onClick={() => setResetDialogOpen(true)}
                      sx={{ py: 1.5, fontWeight: 700, boxShadow: "none" }}
                    >
                      Полный сброс базы
                    </Button>
                  </Stack>
                </Card>
              </Stack>
            </Grid>
          </Grid>

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
      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="small"
          onClick={scrollToTop}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>
    </Box>
  );
}
