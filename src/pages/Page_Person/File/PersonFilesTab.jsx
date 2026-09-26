import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  CircularProgress,
  TextField,
  Tooltip,
} from "@mui/material";
import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { CloudUploadOutlined as UploadIcon } from "@mui/icons-material";
import {
  AudioFile as AudioIcon,
  Description as DocIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  DriveFileRenameOutline as RenameIcon,
  FolderOpen as FolderOpenIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { alpha, useTheme } from "@mui/material/styles";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import NameSection from "../../../components/NameSection";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import SvgIcon from "@mui/material/SvgIcon";
import CustomAudioPlayer from "./CustomAudioPlayer";
import { useSettingsStore } from "../../../store/useSettingsStore";
import { usePersonStore } from "../../../store/usePersonStore";
import { useNotificationStore } from "../../../store/useNotificationStore";

function DocumentWithMountainsIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <g fill="currentColor">
        <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm7 7V3.5L18.5 9z" />
        <path fill="#000" d="M7 18l2.38-3.17L11 17l2.62-3.5L17 18z" />
      </g>
    </SvgIcon>
  );
}

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
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

export default function PersonFilesTab({ personId }) {
  const appSettings = useSettingsStore((state) => state.appSettings);
  const MAX_FILE_SIZE = appSettings.maxUploadSize * 1024 * 1024 * 1024;
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);

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

  const menuScrollYRef = useRef(0);
  const fileInputRef = useRef(null);

  const setUploadHandler = usePersonStore((state) => state.setUploadHandler);
  const setOpenFolderHandler = usePersonStore((state) => state.setOpenFolderHandler);

  const isFilesEmpty =
    files.audio.length === 0 &&
    files.video.length === 0 &&
    files.image.length === 0 &&
    files.doc.length === 0;

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

  const renderFileRow = (file, fileIcon) => (
    <Box
      key={file.name}
      display="flex"
      gap={1.5}
      alignItems="center"
      onClick={() => handleFileClick(file)}
      onContextMenu={(e) => handleContextMenu(e, file)}
      sx={{
        cursor: "pointer",
        p: 1,
        borderRadius: "12px",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      {file.type === "image" ? (
        <Box
          component="img"
          src={file.path}
          alt={file.name}
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1,
            objectFit: "cover",
            flexShrink: 0,
            bgcolor: "action.selected",
          }}
        />
      ) : (
        fileIcon
      )}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography noWrap>{file.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {[formatFileSize(file.size), formatDate(file.mtime)]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
      </Box>
    </Box>
  );

  const renderSection = (title, items, icon, fileIcon) => (
    <Box sx={{ mb: 4 }}>
      <NameSection title={title} icon={icon} />
      <Grid container spacing={0} direction="column">
        {items.map((file) => renderFileRow(file, fileIcon))}
      </Grid>
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
    <Box sx={{ p: 2, position: "relative" }}>
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

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 4 }}
      >
        <Typography variant="h5" fontWeight="bold">
          Файлы
        </Typography>
      </Stack>

      {files.image.length > 0 &&
        renderSection(
          "Изображения",
          files.image,
          <PhotoLibraryIcon color="primary" />,
          <DocumentWithMountainsIcon />,
        )}
      {files.video.length > 0 &&
        renderSection(
          "Видео",
          files.video,
          <VideoLibraryIcon color="error" />,
          <VideoFileIcon />,
        )}
      {files.audio.length > 0 &&
        renderSection(
          "Аудио",
          files.audio,
          <LibraryMusicIcon color="info" />,
          <AudioIcon />,
        )}
      {files.doc.length > 0 &&
        renderSection(
          "Документы",
          files.doc,
          <LibraryBooksIcon color="success" />,
          <DocIcon />,
        )}

      {isFilesEmpty && !loading && (
        <Stack
          spacing={2}
          alignItems="center"
          justifyContent="center"
          sx={{
            py: 8,
            px: 2,
            border: "2px dashed",
            borderColor: (t) => alpha(t.palette.divider, 0.1),
            borderRadius: 4,
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRenameDialog(null)}>Отмена</Button>
          <Button variant="contained" onClick={handleRenameSubmit}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
