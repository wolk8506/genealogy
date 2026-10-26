import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Box,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  Divider,
  CircularProgress,
  TextField,
  Tooltip,
} from "@mui/material";
import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { CloudUploadOutlined as UploadIcon } from "@mui/icons-material";
import DialogActionButton, {
  DialogActionsBar,
} from "../../../components/Dialog/DialogActionButton";
import {
  AudioFile as AudioIcon,
  Description as DocIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  DriveFileRenameOutline as RenameIcon,
  FolderOpen as FolderOpenIcon,
  OpenInNew as OpenInNewIcon,
  KeyboardArrowDown as SortArrowIcon,
} from "@mui/icons-material";
import { alpha, useTheme } from "@mui/material/styles";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import CustomAudioPlayer from "./CustomAudioPlayer";
import { useSettingsStore } from "../../../store/useSettingsStore";
import { usePersonStore } from "../../../store/usePersonStore";
import { useNotificationStore } from "../../../store/useNotificationStore";

const ALLOWED_TYPES = {
  "video/mp4": "video",
  "video/webm": "video",
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/mp4": "audio",
  "audio/ogg": "audio",
  "audio/aac": "audio",
  "text/plain": "doc",
  "application/pdf": "doc",
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
};

const ACCEPT =
  ".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mp3,.wav,.m4a,.ogg,.aac,.txt,.pdf";

const EXT_FALLBACK = {
  mp3: "audio",
  wav: "audio",
  m4a: "audio",
  ogg: "audio",
  aac: "audio",
  mp4: "video",
  webm: "video",
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  txt: "doc",
  pdf: "doc",
};

function formatFileSize(bytes) {
  if (!bytes) return "";
  const number = (value) => value.toFixed(1).replace(".", ",");
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${number(bytes / 1024)} КБ`;
  if (bytes < 1024 * 1024 * 1024)
    return `${number(bytes / (1024 * 1024))} МБ`;
  return `${number(bytes / (1024 * 1024 * 1024))} ГБ`;
}

function formatFinderDate(ms) {
  if (!ms) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

function getFinderKindLabel(file) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (file.type) {
    case "image":
      return `Изображение ${ext === "jpg" ? "JPEG" : ext?.toUpperCase()}`;
    case "video":
      return ext === "mp4" ? "Фильм MPEG-4" : `Фильм ${ext?.toUpperCase()}`;
    case "audio":
      return ext === "m4a" ? "Аудио MPEG-4" : `Аудио ${ext?.toUpperCase()}`;
    case "doc":
      return file.name.toLowerCase().endsWith(".pdf")
        ? "Документ PDF"
        : "Текстовый документ";
    default:
      return "Файл";
  }
}

function isPdfFile(file) {
  return file?.name?.toLowerCase().endsWith(".pdf");
}

function isTxtFile(file) {
  return file?.name?.toLowerCase().endsWith(".txt");
}

function TxtPreview({ file }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(file.path);
        const content = await response.text();
        if (!cancelled) setText(content);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file.path]);

  if (error) {
    return (
      <Typography color="text.secondary" sx={{ p: 3 }}>
        Не удалось загрузить текстовый файл
      </Typography>
    );
  }

  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 2,
        width: "100%",
        height: "100%",
        overflow: "auto",
        fontFamily: "monospace",
        fontSize: "0.9rem",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text || "Загрузка…"}
    </Box>
  );
}

function PreviewOverlayBar({
  file,
  onClose,
  onOpenExternal,
  showOpenExternal,
  tone = "dark",
}) {
  if (!file) return null;

  const isDark = tone === "dark";

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{
        flexShrink: 0,
        height: 50,
        minHeight: 50,
        px: 1.5,
        bgcolor: isDark ? "#141414" : "background.paper",
        color: isDark ? "#fff" : "text.primary",
        borderBottom: 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "divider",
      }}
    >
      <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, pr: 1 }}>
        {file.name}
      </Typography>
      {showOpenExternal && (
        <Tooltip title="Открыть в системе">
          <IconButton size="small" onClick={onOpenExternal} sx={{ color: "inherit" }}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Закрыть (Esc)">
        <IconButton size="small" onClick={onClose} sx={{ color: "inherit" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

const contextMenuProps = {
  disableAutoFocus: true,
  disableEnforceFocus: true,
  disableRestoreFocus: true,
  disableScrollLock: true,
  MenuListProps: { autoFocusItem: false, dense: true },
};

const FINDER_GRID = "minmax(0, 1fr) 180px 100px 150px";
const FINDER_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', sans-serif";
const FINDER_COLUMNS = [
  { key: "name", label: "Имя" },
  { key: "mtime", label: "Дата изменения" },
  { key: "size", label: "Размер" },
  { key: "kind", label: "Тип" },
];

export default function PersonFilesTab({ personId }) {
  const appSettings = useSettingsStore((state) => state.appSettings);
  const MAX_FILE_SIZE = appSettings.maxUploadSize * 1024 * 1024 * 1024;
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const addNotification = useNotificationStore((state) => state.addNotification);

  const finderColors = {
    containerBg: isDark ? "#1c1c1e" : "#ffffff",
    containerBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)",
    headerBg: isDark ? "#2b2b2d" : "#f5f5f7",
    headerText: isDark ? "#9a9aa0" : "#6e6e73",
    headerSeparator: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.1)",
    rowEven: isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.035)",
    rowHover: isDark ? "rgba(255,255,255,0.11)" : "rgba(0,0,0,0.06)",
    primaryText: isDark ? "#e8e8ea" : "#1d1d1f",
    secondaryText: isDark ? "rgba(235,235,245,0.72)" : "rgba(60,60,67,0.65)",
    iconDoc: isDark ? "#b8c0c8" : "#7a7a80",
    iconVideo: isDark ? "#c07df0" : "#8944ab",
    iconAudio: isDark ? "#ff6482" : "#d6335c",
  };

  const [contextMenu, setContextMenu] = useState(null);
  const [renameDialog, setRenameDialog] = useState(null);
  const [files, setFiles] = useState({
    image: [],
    video: [],
    audio: [],
    doc: [],
  });
  const [loading, setLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [activeAudio, setActiveAudio] = useState(null);
  const [sort, setSort] = useState({ key: "kind", direction: "asc" });

  const menuScrollYRef = useRef(0);
  const fileInputRef = useRef(null);

  const setUploadHandler = usePersonStore((state) => state.setUploadHandler);
  const setOpenFolderHandler = usePersonStore((state) => state.setOpenFolderHandler);

  const preserveViewportScroll = useCallback((action) => {
    const windowY = menuScrollYRef.current;
    action();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: windowY, left: 0, behavior: "instant" });
      });
    });
  }, []);

  const handleFileUploadBar = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  useEffect(() => {
    setUploadHandler(handleFileUploadBar);
    setOpenFolderHandler(() => window.fileAPI.openPersonFilesFolder(personId));
    return () => {
      setUploadHandler(null);
      setOpenFolderHandler(null);
    };
  }, [handleFileUploadBar, setUploadHandler, setOpenFolderHandler, personId]);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedFiles = await window.fileAPI.getPersonFiles(personId);
      const categorized = { image: [], video: [], audio: [], doc: [] };
      fetchedFiles.forEach((f) => {
        if (categorized[f.type]) categorized[f.type].push(f);
      });
      setFiles(categorized);
    } catch (error) {
      console.error("Ошибка загрузки файлов:", error);
      addNotification({
        title: "Файлы",
        message: "Не удалось загрузить список файлов",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [personId, addNotification]);

  useEffect(() => {
    if (personId) loadFiles();
  }, [personId, loadFiles]);

  useEffect(() => {
    if (!previewFile && !activeAudio) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setPreviewFile(null);
        setActiveAudio(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewFile, activeAudio]);

  const detectCategory = (file) => {
    if (ALLOWED_TYPES[file.type]) return ALLOWED_TYPES[file.type];
    const ext = file.name.split(".").pop()?.toLowerCase();
    return EXT_FALLBACK[ext] || null;
  };

  const handleFileClick = async (file) => {
    if (file.type === "audio") {
      setActiveAudio(file);
      return;
    }

    if (isPdfFile(file)) {
      if (!file.localPath) return;
      const result = await window.fileAPI.openPersonPdfWindow?.(
        file.localPath,
        file.name,
      );
      if (!result?.success) {
        await window.appAPI.openPath?.(file.localPath);
      }
      return;
    }

    setPreviewFile(file);
  };

  const handleContextMenu = (event, file) => {
    event.preventDefault();
    menuScrollYRef.current = window.scrollY;
    setContextMenu({ mouseX: event.clientX + 2, mouseY: event.clientY - 6, file });
  };

  const handleCloseMenu = () =>
    preserveViewportScroll(() => setContextMenu(null));

  const handleDeleteFile = async () => {
    const fileToDelete = contextMenu?.file;
    if (!fileToDelete) return;
    handleCloseMenu();

    if (
      !window.confirm(`Удалить файл «${fileToDelete.name}»?`)
    ) {
      return;
    }

    try {
      const result = await window.fileAPI.deletePersonFile(
        personId,
        fileToDelete.name,
      );
      if (result.success) {
        addNotification({
          title: "Файлы",
          message: `«${fileToDelete.name}» удалён`,
          type: "success",
        });
        if (activeAudio?.name === fileToDelete.name) setActiveAudio(null);
        if (previewFile?.name === fileToDelete.name) setPreviewFile(null);
        loadFiles();
      } else {
        addNotification({
          title: "Файлы",
          message: result.error || "Не удалось удалить файл",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Ошибка удаления:", error);
    }
  };

  const handleRevealFile = async () => {
    const file = contextMenu?.file;
    if (!file?.localPath) return;
    handleCloseMenu();
    await window.appAPI.revealPath?.(file.localPath);
  };

  const handleOpenFromMenu = () => {
    const file = contextMenu?.file;
    if (!file) return;
    handleCloseMenu();
    handleFileClick(file);
  };

  const handleRenameStart = () => {
    const file = contextMenu?.file;
    if (!file) return;
    handleCloseMenu();
    setRenameDialog({ file, value: file.name });
  };

  const handleRenameSubmit = async () => {
    if (!renameDialog?.file) return;
    const result = await window.fileAPI.renamePersonFile(
      personId,
      renameDialog.file.name,
      renameDialog.value,
    );
    if (result.success) {
      addNotification({
        title: "Файлы",
        message: `Файл переименован в «${result.fileName}»`,
        type: "success",
      });
      setRenameDialog(null);
      loadFiles();
    } else {
      addNotification({
        title: "Файлы",
        message: result.error || "Не удалось переименовать",
        type: "error",
      });
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setLoading(true);
    let uploaded = 0;
    let skipped = 0;

    try {
      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          skipped += 1;
          addNotification({
            title: "Файлы",
            message: `«${file.name}» слишком большой (лимит ${appSettings.maxUploadSize} ГБ)`,
            type: "warning",
          });
          continue;
        }

        const fileCategory = detectCategory(file);
        if (!fileCategory) {
          skipped += 1;
          continue;
        }

        const arrayBuffer = await file.arrayBuffer();
        const result = await window.fileAPI.uploadPersonFile(
          personId,
          file.name,
          arrayBuffer,
          fileCategory,
        );

        if (result?.success) {
          uploaded += 1;
          if (result.fileName !== file.name) {
            addNotification({
              title: "Файлы",
              message: `«${file.name}» сохранён как «${result.fileName}»`,
              type: "info",
            });
          }
        }
      }

      if (uploaded > 0) {
        addNotification({
          title: "Файлы",
          message: `Загружено файлов: ${uploaded}`,
          type: "success",
        });
        loadFiles();
      } else if (skipped === selectedFiles.length) {
        addNotification({
          title: "Файлы",
          message: "Поддерживаются: изображения, видео, аудио, PDF и TXT",
          type: "warning",
        });
      }
    } catch (error) {
      console.error("Ошибка при сохранении:", error);
      addNotification({
        title: "Файлы",
        message: "Ошибка при загрузке файлов",
        type: "error",
      });
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const handleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const finderRows = useMemo(() => {
    const rows = [
      ...files.image,
      ...files.video,
      ...files.audio,
      ...files.doc,
    ];
    const direction = sort.direction === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      let result = 0;
      switch (sort.key) {
        case "mtime":
          result = (a.mtime || 0) - (b.mtime || 0);
          break;
        case "size":
          result = (a.size || 0) - (b.size || 0);
          break;
        case "kind":
          result = getFinderKindLabel(a).localeCompare(
            getFinderKindLabel(b),
            "ru",
            { sensitivity: "base" },
          );
          break;
        default:
          result = a.name.localeCompare(b.name, "ru", {
            numeric: true,
            sensitivity: "base",
          });
      }
      return result * direction;
    });
  }, [files, sort]);

  const renderFinderIcon = (file) => {
    if (file.type === "image") {
      return (
        <Box
          component="img"
          src={file.path}
          alt={file.name}
          sx={{
            width: 16,
            height: 16,
            objectFit: "cover",
            borderRadius: "3px",
            display: "block",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)",
          }}
        />
      );
    }

    if (file.type === "video") {
      return (
        <VideoFileIcon sx={{ fontSize: 17, color: finderColors.iconVideo }} />
      );
    }

    if (file.type === "audio") {
      return <AudioIcon sx={{ fontSize: 17, color: finderColors.iconAudio }} />;
    }

    return <DocIcon sx={{ fontSize: 17, color: finderColors.iconDoc }} />;
  };

  const finderCellSx = {
    minWidth: 0,
    pl: 1.25,
    pr: 1,
    display: "flex",
    alignItems: "center",
  };

  const renderFinderRow = (file, rowIndex = 0) => (
    <Box
      key={file.name}
      onClick={() => handleFileClick(file)}
      onContextMenu={(e) => handleContextMenu(e, file)}
      sx={{
        display: "grid",
        gridTemplateColumns: FINDER_GRID,
        alignItems: "center",
        height: 24,
        mx: "6px",
        borderRadius: "6px",
        color: finderColors.primaryText,
        bgcolor: rowIndex % 2 === 0 ? finderColors.rowEven : "transparent",
        cursor: "pointer",
        transition: "background-color 0.12s ease",
        "&:hover": { bgcolor: finderColors.rowHover },
        fontFamily: FINDER_FONT,
      }}
    >
      <Box sx={{ ...finderCellSx, gap: "6px", pl: "6px", pr: 1 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {renderFinderIcon(file)}
        </Box>
        <Typography
          noWrap
          sx={{
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1.2,
            letterSpacing: "-0.005em",
            minWidth: 0,
          }}
        >
          {file.name}
        </Typography>
      </Box>

      <Box sx={finderCellSx}>
        <Typography
          noWrap
          sx={{
            fontSize: 13,
            lineHeight: 1.2,
            color: finderColors.secondaryText,
          }}
        >
          {formatFinderDate(file.mtime)}
        </Typography>
      </Box>
      <Box sx={finderCellSx}>
        <Typography
          noWrap
          sx={{
            fontSize: 13,
            lineHeight: 1.2,
            color: finderColors.secondaryText,
          }}
        >
          {formatFileSize(file.size) || "—"}
        </Typography>
      </Box>
      <Box sx={finderCellSx}>
        <Typography
          noWrap
          sx={{
            fontSize: 13,
            lineHeight: 1.2,
            color: finderColors.secondaryText,
          }}
        >
          {getFinderKindLabel(file)}
        </Typography>
      </Box>
    </Box>
  );

  const isTxtPreview = previewFile && isTxtFile(previewFile);
  const isMediaPreview =
    previewFile && ["image", "video"].includes(previewFile.type);

  const handleOpenPreviewExternal = () => {
    if (previewFile?.localPath) {
      window.appAPI.openPath?.(previewFile.localPath);
    }
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;
    const { path, type } = previewFile;

    switch (type) {
      case "image":
        return (
          <Box
            component="img"
            src={path}
            alt={previewFile.name}
            sx={{
              maxWidth: "100%",
              maxHeight: isMediaPreview ? "100%" : "80vh",
              objectFit: "contain",
            }}
          />
        );
      case "video":
        return (
          <Box
            component="video"
            src={path}
            controls
            sx={{ maxWidth: "100%", maxHeight: "100%", outline: "none" }}
          />
        );
      case "doc":
        if (isTxtFile(previewFile)) return <TxtPreview file={previewFile} />;
        return (
          <Box
            component="iframe"
            src={path}
            title={previewFile.name}
            sx={{ width: "100%", height: "100%", border: 0 }}
          />
        );
      default:
        return <Typography>Невозможно отобразить этот файл.</Typography>;
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        mx: -1,
        height: "calc(100dvh - 50px)",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <input
        type="file"
        multiple
        accept={ACCEPT}
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {loading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: (t) => alpha(t.palette.background.default, 0.5),
            zIndex: 2,
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: `1px solid ${finderColors.containerBorder}`,
          background: finderColors.containerBg,
          fontFamily: FINDER_FONT,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
          }}
        >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            flexShrink: 0,
            background: finderColors.headerBg,
            borderBottom: `1px solid ${finderColors.containerBorder}`,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: FINDER_GRID,
              alignItems: "center",
              height: 24,
              mx: "6px",
              color: finderColors.headerText,
            }}
          >
            {FINDER_COLUMNS.map((column, index) => (
              <Box
                key={column.key}
                role="button"
                tabIndex={0}
                onClick={() => handleSort(column.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSort(column.key);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                  minWidth: 0,
                  height: "100%",
                  pl: index === 0 ? "28px" : 1.25,
                  pr: index === 0 ? 1.5 : 1,
                  borderLeft:
                    index === 0
                      ? "none"
                      : `1px solid ${finderColors.headerSeparator}`,
                  cursor: "pointer",
                  userSelect: "none",
                  outline: "none",
                }}
              >
                <Typography
                  noWrap
                  sx={{
                    fontSize: 11,
                    fontWeight: 500,
                    lineHeight: 1,
                    letterSpacing: 0,
                    color: "inherit",
                  }}
                >
                  {column.label}
                </Typography>
                {sort.key === column.key && (
                  <SortArrowIcon
                    sx={{
                      ml: "auto",
                      fontSize: 14,
                      opacity: 0.7,
                      transform:
                        sort.direction === "desc" ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s ease",
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {finderRows.length > 0 ? (
          <Box sx={{ flexShrink: 0, py: "2px" }}>
            {finderRows.map((file, idx) => renderFinderRow(file, idx))}
          </Box>
        ) : (
          <Stack
            spacing={2}
            alignItems="center"
            justifyContent="center"
            sx={{
              flex: 1,
              minHeight: 0,
              py: 8,
              px: 2,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                color: "primary.main",
              }}
            >
              <UploadIcon sx={{ fontSize: 40 }} />
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Здесь пока пусто
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                Добавьте документы, аудио, видео или изображения. Поддерживаются JPG,
                PNG, MP4, MP3, PDF, TXT и другие форматы.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 1, borderRadius: 2, textTransform: "none" }}
              onClick={handleFileUploadBar}
            >
              Выбрать файлы
            </Button>
          </Stack>
        )}
        </Box>
      </Box>

      <Dialog
        open={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        maxWidth={isTxtPreview ? "md" : isMediaPreview ? "lg" : "md"}
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: "blur(4px)",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
            },
          },
        }}
        PaperProps={{
          sx: {
            overflow: "hidden",
            backgroundImage: "none",
            boxShadow: theme.shadows[24],
            borderRadius: 3,
            bgcolor: isTxtPreview ? "background.paper" : "#0a0a0a",
          },
        }}
      >
        {previewFile && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              maxHeight: isTxtPreview ? "80vh" : "min(80vh, 900px)",
            }}
          >
            <PreviewOverlayBar
              file={previewFile}
              onClose={() => setPreviewFile(null)}
              onOpenExternal={handleOpenPreviewExternal}
              showOpenExternal={isTxtPreview}
              tone={isTxtPreview ? "light" : "dark"}
            />
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: isTxtPreview ? "stretch" : "center",
                overflow: "hidden",
              }}
            >
              {renderPreviewContent()}
            </Box>
          </Box>
        )}
      </Dialog>

      {activeAudio && (
        <Box
          sx={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
          }}
        >
          <Box sx={{ position: "relative" }}>
            <IconButton
              size="small"
              onClick={() => setActiveAudio(null)}
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                bgcolor: "background.paper",
                boxShadow: 2,
                zIndex: 1000,
                "&:hover": { bgcolor: "error.light", color: "white" },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <CustomAudioPlayer src={activeAudio.path} fileName={activeAudio.name} />
          </Box>
        </Box>
      )}

      <Menu
        open={contextMenu !== null}
        onClose={handleCloseMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        {...contextMenuProps}
        PaperProps={{
          sx: {
            bgcolor: "transparent",
            backgroundImage: "none",
            boxShadow: 24,
            borderRadius: "12px",
            minWidth: 220,
            px: "6px",
            border: "1px solid",
            borderColor: "divider",
            backdropFilter: "blur(6px)",
          },
        }}
      >
        <MenuItem onClick={handleOpenFromMenu} sx={{ px: 1, borderRadius: "8px" }}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Открыть" />
        </MenuItem>
        <MenuItem onClick={handleRevealFile} sx={{ px: 1, borderRadius: "8px" }}>
          <ListItemIcon>
            <FolderOpenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Показать в папке" />
        </MenuItem>
        <MenuItem onClick={handleRenameStart} sx={{ px: 1, borderRadius: "8px" }}>
          <ListItemIcon>
            <RenameIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Переименовать" />
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={handleDeleteFile}
          sx={{ color: "error.main", px: 1, borderRadius: "8px" }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Удалить" />
        </MenuItem>
      </Menu>

      <Dialog
        open={Boolean(renameDialog)}
        onClose={() => setRenameDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Переименовать файл</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Имя файла"
            value={renameDialog?.value || ""}
            onChange={(e) =>
              setRenameDialog((prev) => ({ ...prev, value: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
            }}
          />
        </DialogContent>
        <DialogActionsBar sx={{ px: 3 }}>
          <DialogActionButton onClick={() => setRenameDialog(null)}>
            Отмена
          </DialogActionButton>
          <DialogActionButton tone="primary" onClick={handleRenameSubmit}>
            Сохранить
          </DialogActionButton>
        </DialogActionsBar>
      </Dialog>
    </Box>
  );
}
