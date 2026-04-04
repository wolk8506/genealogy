import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  Grid,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Divider,
} from "@mui/material";
import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";

import { CloudUploadOutlined as UploadIcon } from "@mui/icons-material";
import {
  UploadFile as UploadFileIcon,
  AudioFile as AudioIcon,
  Description as DocIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { alpha, useTheme } from "@mui/material/styles";
import VideoFileIcon from "@mui/icons-material/VideoFile";

// import { useNotificationStore } from "../../../store/useNotificationStore"; // Раскомментируйте, если используете
import NameSection from "../../../components/NameSection";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
// import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

import SvgIcon from "@mui/material/SvgIcon";
import CustomAudioPlayer from "./CustomAudioPlayer";
import { useSettingsStore } from "../../../store/useSettingsStore";
import { usePersonStore } from "../../../store/usePersonStore";

function DocumentWithMountainsIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <g fill="currentColor">
        {/* Шаг 1: Сначала рисуем ПОЛНОСТЬЮ ЗАПОЛНЕННЫЙ лист */}
        <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm7 7V3.5L18.5 9z" />

        {/* Шаг 2: Потом рисуем ГОРЫ, но БЕЛЫМ цветом ( fill="#fff"), чтобы они просвечивали */}
        <path fill="#000" d="M7 18l2.38-3.17L11 17l2.62-3.5L17 18z" />
      </g>
    </SvgIcon>
  );
}

const ALLOWED_TYPES = {
  "video/mp4": "video",
  "audio/mpeg": "audio",
  "text/plain": "doc",
  "application/pdf": "doc",
  "image/jpeg": "image",
  "image/jpg": "image",
};

export default function PersonFilesTab({ personId }) {
  const appSettings = useSettingsStore((state) => state.appSettings);
  const MAX_FILE_SIZE = appSettings.maxUploadSize * 1024 * 1024 * 1024; // 100 МБ
  const theme = useTheme();
  const [contextMenu, setContextMenu] = useState(null);
  // const addNotification = useNotificationStore((state) => state.addNotification);

  const [files, setFiles] = useState({
    image: [],
    video: [],
    audio: [],
    doc: [],
  });
  const [loading, setLoading] = useState(false);

  // previewFile для модалки (картинки, видео, доки)
  const [previewFile, setPreviewFile] = useState(null);

  // activeAudio для отдельного плеера
  const [activeAudio, setActiveAudio] = useState(null);
  const isFilesEmpty =
    files.audio.length === 0 &&
    files.video.length === 0 &&
    files.image.length === 0 &&
    files.doc.length === 0;

  const fileInputRef = useRef(null);
  // 1. Достаем метод установки через селектор
  const setUploadHandler = usePersonStore((state) => state.setUploadHandler);

  // 2. Оборачиваем функцию в useCallback, чтобы ссылка была стабильной
  const handleFileUploadBar = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []); // Пустой массив, так как ref стабилен

  // 3. Передаем функцию в стор
  useEffect(() => {
    setUploadHandler(handleFileUploadBar);

    // Убираем ссылку при размонтировании
    return () => setUploadHandler(null);
  }, [handleFileUploadBar, setUploadHandler]);

  // Хендлер клика по файлу
  const handleFileClick = (file) => {
    if (file.type === "audio") {
      setActiveAudio(file);
    } else {
      setPreviewFile(file);
    }
  };

  // 1. Обработка правого клика
  const handleContextMenu = (event, file) => {
    event.preventDefault(); // Выключаем стандартное меню браузера
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
            file: file,
          }
        : null,
    );
  };

  const handleClose = () => {
    setContextMenu(null);
  };

  // 2. Функция удаления
  const handleDeleteFile = async () => {
    const fileToDelete = contextMenu.file;
    handleClose();

    if (
      window.confirm(
        `Вы уверены, что хотите удалить файл "${fileToDelete.name}"?`,
      )
    ) {
      try {
        const result = await window.fileAPI.deletePersonFile(
          personId,
          fileToDelete.name,
        );
        if (result.success) {
          // addNotification({ title: "Удалено", message: "Файл успешно удален", type: "success" });
          loadFiles(); // Обновляем список файлов
        } else {
          alert("Ошибка: " + result.error);
        }
      } catch (error) {
        console.error("Ошибка удаления:", error);
      }
    }
  };

  // 1. Загрузка списка файлов при открытии
  const loadFiles = async () => {
    try {
      // Ожидаем, что API вернет массив объектов: { name: 'test.jpg', path: 'file://...', type: 'image' }
      const fetchedFiles = await window.fileAPI.getPersonFiles(personId);

      const categorized = { image: [], video: [], audio: [], doc: [] };
      fetchedFiles.forEach((f) => {
        if (categorized[f.type]) categorized[f.type].push(f);
      });
      setFiles(categorized);
    } catch (error) {
      console.error("Ошибка загрузки файлов:", error);
    }
  };

  useEffect(() => {
    if (personId) loadFiles();
  }, [personId]);

  // 2. Обработчик загрузки нового файла

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files); // Превращаем FileList в массив
    if (selectedFiles.length === 0) return;

    setLoading(true);

    try {
      // Обрабатываем каждый файл
      for (const file of selectedFiles) {
        // 1. Валидация размера
        if (file.size > MAX_FILE_SIZE) {
          console.error(`Файл ${file.name} слишком большой`);
          alert(`Файл слишком большой! Лимит: ${appSettings.maxUploadSize} ГБ`);
          continue; // Пропускаем этот файл и идем к следующему
        }

        // 2. Валидация типа
        const fileCategory =
          ALLOWED_TYPES[file.type] ||
          (file.name.endsWith(".mp3") ? "audio" : null);

        if (!fileCategory) {
          console.error(`Тип файла ${file.name} не поддерживается`);
          continue;
        }

        // 3. Загрузка
        const arrayBuffer = await file.arrayBuffer();
        await window.fileAPI.uploadPersonFile(
          personId,
          file.name,
          arrayBuffer,
          fileCategory,
        );
      }

      // После того как ВСЕ файлы загружены, обновляем список один раз
      loadFiles();
      // addNotification({ title: "Успех", message: "Файлы загружены", type: "success" });
    } catch (error) {
      console.error("Ошибка при сохранении:", error);
      alert("Произошла ошибка при загрузке одного или нескольких файлов");
    } finally {
      setLoading(false);
      e.target.value = null; // Очищаем input
    }
  };
  // 3. Рендер секции
  const renderSection = (title, items, icon, fileIcon) => (
    <Box sx={{ mb: 4 }}>
      <NameSection title={title} icon={icon} />

      {items.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          Файлы не загружены
        </Typography>
      ) : (
        <Grid container spacing={0} flexDirection={"column"}>
          {items.map((file, idx) => (
            <Box
              key={idx}
              display={"flex"}
              gap={1}
              alignItems={"center"}
              onClick={() => handleFileClick(file)}
              // onClick={() => setPreviewFile(file)}
              onContextMenu={(e) => handleContextMenu(e, file)}
              sx={{
                cursor: "pointer",
                p: 1,
                borderRadius: "12px",
                "&:hover": {
                  //   bgcolor: "rgba(255,255,255,0.25)",
                  bgcolor: "action.hover",
                },
              }}
            >
              {fileIcon}
              {file.name}
            </Box>
          ))}
        </Grid>
      )}
    </Box>
  );

  // 4. Рендер предпросмотра в зависимости от типа
  const renderPreviewContent = () => {
    if (!previewFile) return null;
    const { path, type } = previewFile;

    switch (type) {
      case "image":
        return (
          <Box
            component="img"
            src={path}
            sx={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
          />
        );
      case "video":
        return (
          <video
            src={path}
            controls
            style={{ maxWidth: "100%", maxHeight: "80vh" }}
            autoPlay
          />
        );
      //   case "audio":
      //     return (

      //       <CustomAudioPlayer
      //         src={previewFile.path}
      //         fileName={previewFile.name}
      //       />

      //     );
      case "doc":
        // Iframe отлично отображает и TXT, и PDF

        return (
          <iframe
            src={path}
            title="Preview"
            // sandbox="allow-scripts allow-same-origin"
            style={{ width: "100%", height: "80vh", border: "none" }}
          />
        );
      default:
        return <Typography>Невозможно отобразить этот файл.</Typography>;
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Шапка с кнопкой загрузки */}
      {/* Невидимый инпут, который делает всю работу */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 4 }}
      >
        <Typography variant="h5" fontWeight="bold">
          Файлы
        </Typography>

        {/* <Button
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
          disabled={loading}
          sx={{ borderRadius: "12px", textTransform: "none" }}
        >
          Загрузить файл
          <input
            type="file"
            multiple
            hidden
            accept=".jpg,.jpeg,.mp4,.mp3,.txt,.pdf"
            onChange={handleFileUpload}
          />
        </Button> */}
      </Stack>
      {/* Секции файлов */}
      {files.image.length > 0 &&
        renderSection(
          "Изображения",
          files.image,
          <PhotoLibraryIcon color="primary" />,
          <DocumentWithMountainsIcon />,
          // <InsertDriveFileIcon />,
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
      {isFilesEmpty && (
        <Stack
          spacing={2}
          alignItems="center"
          justifyContent="center"
          sx={{
            py: 8,
            px: 2,
            border: "2px dashed",
            borderColor: (theme) => alpha(theme.palette.divider, 0.1),
            borderRadius: 4,
            transition: "0.3s",
          }}
        >
          {/* Красивая фоновая иконка */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: "primary.main",
              mb: 1,
            }}
          >
            <UploadIcon sx={{ fontSize: 40 }} />
          </Box>

          <Box textAlign="center">
            <Typography
              variant="h6"
              fontWeight="600"
              color="text.primary"
              gutterBottom
            >
              Здесь пока пусто
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 300 }}
            >
              Добавьте важные документы, аудиозаписи или видео, связанные с этим
              человеком.
            </Typography>
          </Box>

          {/* Кнопка-подсказка (опционально) */}
          <Button
            variant="outlined"
            component="label"
            size="small"
            sx={{ mt: 1, borderRadius: 2, textTransform: "none" }}
          >
            Выбрать файл
            <input type="file" multiple hidden onChange={handleFileUpload} />
          </Button>
        </Stack>
      )}
      {/* Модальное окно предпросмотра */}
      <Dialog
        open={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        maxWidth={previewFile?.type === "doc" ? "xl" : "lg"} // Документам даем больше ширины
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: "blur(4px)", // Размытие заднего фона
              backgroundColor: "rgba(0, 0, 0, 0.6)",
            },
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: 3, // Мягкие углы (около 12-16px)
            overflow: "hidden",
            backgroundImage: "none",
            boxShadow: theme.shadows[24],
            // Темный фон для медиа, цвет темы для документов и аудио
            bgcolor: ["audio", "doc"].includes(previewFile?.type)
              ? "background.paper"
              : "#0a0a0a",
          },
        }}
      >
        {/* ЗАГОЛОВОК */}
        <DialogTitle
          component="div"
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,

            // Если это фото/видео - делаем плавающий заголовок поверх картинки
            ...(["image", "video"].includes(previewFile?.type) && {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)",
              color: "#fff",
            }),

            // Если это документ/аудио - обычный заголовок с разделителем
            ...(["audio", "doc"].includes(previewFile?.type) && {
              color: "text.primary",
              borderBottom: 1,
              borderColor: "divider",
            }),
          }}
        >
          <Typography
            variant="subtitle1"
            fontWeight="500"
            noWrap
            sx={{
              maxWidth: "80%",
              // Добавляем тень тексту на медиа файлах, чтобы читалось на белых фото
              textShadow: ["image", "video"].includes(previewFile?.type)
                ? "0px 1px 4px rgba(0,0,0,0.8)"
                : "none",
            }}
          >
            {previewFile?.name}
          </Typography>

          <IconButton
            onClick={() => setPreviewFile(null)}
            size="small"
            sx={{
              color: "inherit",
              // Полупрозрачный фон для крестика на фото/видео
              bgcolor: ["image", "video"].includes(previewFile?.type)
                ? "rgba(255,255,255,0.15)"
                : "transparent",
              "&:hover": {
                bgcolor: ["image", "video"].includes(previewFile?.type)
                  ? "rgba(255,255,255,0.25)"
                  : "action.hover",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        {/* КОНТЕНТ */}
        <DialogContent
          sx={{
            p: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "200px", // Минимальная высота, чтобы окно не было узкой полоской при загрузке
            height: previewFile?.type === "doc" ? "85vh" : "auto", // Документы растягиваем по высоте
            position: "relative",
            // Убираем скролл внутри контента для медиа
            overflow: ["image", "video"].includes(previewFile?.type)
              ? "hidden"
              : "auto",
          }}
        >
          {renderPreviewContent()}
        </DialogContent>
      </Dialog>

      {/* КАСТОМНЫЙ ПЛЕЕР (Плавающий внизу) */}
      {activeAudio && (
        <Box
          sx={{
            position: "fixed",
            bottom: 300,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            width: "auto",
            animation: "slideUp 0.4s ease-out",
            "@keyframes slideUp": {
              from: {
                transform: "translateX(-50%) translateY(200%)",
                opacity: 0,
              },
              to: { transform: "translateX(-50%) translateY(0)", opacity: 1 },
            },
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
            <CustomAudioPlayer
              src={activeAudio.path}
              fileName={activeAudio.name}
            />
          </Box>
        </Box>
      )}

      {/* КОНТЕКСТНОЕ МЕНЮ */}
      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            setPreviewFile(contextMenu.file);
            handleClose();
          }}
        >
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Открыть</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleDeleteFile} sx={{ color: "error.main" }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Удалить файл</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
