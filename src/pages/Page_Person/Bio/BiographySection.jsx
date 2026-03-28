import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  Box,
  Button,
  IconButton,
  Slide,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import FeedIcon from "@mui/icons-material/Feed";

import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewCtx,
  serializerCtx,
  parserCtx,
  editorViewOptionsCtx,
  commandsCtx,
} from "@milkdown/core";
import { nord } from "@milkdown/theme-nord";
import { commonmark } from "@milkdown/preset-commonmark";
import { history } from "@milkdown/plugin-history";
import { ButtonScrollTop } from "../../../components/ButtonScrollTop";

const MilkdownEditor = ({
  content,
  isEditing,
  personDir,
  personId,
  onSaveRef,
  execRef,
  setIsDirty,
  onImageClick,
  onImageAdded,
}) => {
  const editorRef = useRef(null);
  const isEditingRef = useRef(isEditing);
  const containerRef = useRef(null);

  // Синхронизация режима редактирования без пересоздания редактора
  useEffect(() => {
    isEditingRef.current = isEditing;
    editorRef.current?.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      if (view) {
        view.setProps({ editable: () => isEditingRef.current });
        // Принудительно обновляем состояние вида
        view.dispatch(view.state.tr.setMeta("refreshedatable", true));
      }
    });
  }, [isEditing]);

  const { loading } = useEditor(
    (root) => {
      const editor = Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, content || " ");
          ctx.set(editorViewOptionsCtx, {
            editable: () => isEditingRef.current,
          });
        })
        .config(nord)
        .use(commonmark)
        .use(history);
      editorRef.current = editor;
      return editor;
    },
    [personId],
  );

  // Фикс путей изображений (оставляем твой рабочий код)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || loading) return;
    const fixImages = () => {
      container.querySelectorAll("img").forEach((img) => {
        const src = img.getAttribute("src");
        if (
          src &&
          !src.startsWith("http") &&
          !src.startsWith("file") &&
          personDir
        ) {
          const cleanDir = personDir.replace(/\\/g, "/");
          const cleanSrc = src.replace(/\\/g, "/");
          img.src = `${cleanDir}/${cleanSrc}`;
        }
      });
    };
    const handleImgClick = (e) => {
      if (e.target.tagName === "IMG") onImageClick(e.target.src);
    };
    container.addEventListener("click", handleImgClick);
    const observer = new MutationObserver(fixImages);
    observer.observe(container, { childList: true, subtree: true });
    fixImages();
    return () => {
      container.removeEventListener("click", handleImgClick);
      observer.disconnect();
    };
  }, [personDir, loading, onImageClick]);

  // Мониторинг изменений
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      editorRef.current?.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        if (view) setIsDirty(view.state.history$?.done?.items?.length > 0);
      });
    }, 300);
    return () => clearInterval(interval);
  }, [loading, setIsDirty]);

  // Команды для кнопок
  useEffect(() => {
    if (loading) return;
    onSaveRef.current = () =>
      editorRef.current?.action((ctx) =>
        ctx.get(serializerCtx)(ctx.get(editorViewCtx).state.doc),
      );
    execRef.current = {
      exec: (key, payload) =>
        editorRef.current?.action((ctx) =>
          ctx.get(commandsCtx).call(key, payload),
        ),
      wrapInTag: (tag) =>
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state, dispatch } = view;
          const { from, to } = state.selection;
          if (from === to) return;
          const text = state.doc.textBetween(from, to);
          const newNode = ctx.get(parserCtx)(`<${tag}>${text}</${tag}>`);
          dispatch(state.tr.replaceSelectionWith(newNode.content.firstChild));
        }),
      insertImage: async () => {
        const file = await window.bioAPI.addImage(personId);
        if (file) {
          // Сообщаем BiographySection, что в папку упал новый файл
          onImageAdded?.(file);

          editorRef.current?.action((ctx) => {
            const view = ctx.get(editorViewCtx);
            const node = ctx.get(parserCtx)(`![img](${file})`).content
              .firstChild;
            view.dispatch(view.state.tr.replaceSelectionWith(node));
          });
        }
      },
    };
  }, [personId, loading, onSaveRef, execRef]);

  return (
    <Box
      ref={containerRef}
      sx={{
        mt: 2,
        "& .milkdown": {
          backgroundColor: "transparent",
          color: (theme) =>
            theme.palette.mode === "dark" ? "#e0e0e0" : "#1a1a1a",
        },
        "& .milkdown .editor": {
          minHeight: "500px",
          outline: "none",
          pb: "100px",
          // color: "#eee",
          color: (theme) =>
            theme.palette.mode === "dark" ? "#e0e0e0" : "#1a1a1a",
          fontSize: "1.05rem",
          lineHeight: 1.7,
          // ВАЖНО: сохраняем переносы строк
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        },
        // Стилизация параграфов (чтобы Enter создавал видимый отступ)
        "& .ProseMirror p": {
          marginBottom: "1.2em",
          marginTop: 0,
          minHeight: "1.2em", // <--- добавочка для стабильности пустых строк
        },
        // КРАСИВЫЕ И УМЕНЬШЕННЫЕ СТИЛИ ДЛЯ РИСУНКА
        "& .ProseMirror p:has(img)": {
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          justifyContent: "center",
          alignItems: "flex-start",
          // Убираем отступы, которые могут создавать фантомные блоки
          minHeight: "auto",
        },

        // ГЛАВНЫЙ ФИКС: Скрываем всё, что не является картинкой внутри такого параграфа
        "& .ProseMirror p:has(img) > *:not(img)": {
          display: "none !important",
        },

        // Дополнительно скрываем системные элементы ProseMirror
        "& img.ProseMirror-separator": {
          display: "none !important",
        },

        "& img": {
          display: "inline-block",
          width: "calc(33.33% - 12px)",
          minWidth: "220px", // Чуть увеличим для стабильности
          height: "250px",
          objectFit: "cover",
          borderRadius: "8px",
          cursor: "pointer",
          border: "1px solid #444",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          transition: "transform 0.2s, box-shadow 0.2s",

          "&:hover": {
            transform: "scale(1.05)",
            boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
            zIndex: 10,
          },
        },

        "& u": { textDecoration: "underline" },
        "& blockquote": { borderLeft: "4px solid #666", pl: 2, color: "#aaa" },
      }}
    >
      <Milkdown />
    </Box>
  );
};

export default function BiographySection({
  personId,
  activeElement,
  isEditing,
  setIsEditing,
  execRef,
  requestToggleRef,
  setActiveElement, // <--- ВАЖНО: прокиньте этот сеттер из PersonPage/MainLayout
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [bio, setBio] = useState(null);
  const [personDir, setPersonDir] = useState("");
  const [previewImg, setPreviewImg] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [sessionImages, setSessionImages] = useState([]);

  const saveRef = useRef(null);

  // Очищаем список при входе в режим редактирования
  useEffect(() => {
    if (isEditing) setSessionImages([]);
  }, [isEditing]);

  // Регистрация методов в рефе для MainLayout
  useEffect(() => {
    if (requestToggleRef) {
      requestToggleRef.current = {
        toggle: () => {
          if (isEditing && isDirty) {
            setPendingAction("toggleEdit");
            setConfirmOpen(true);
          } else {
            setIsEditing(!isEditing);
          }
        },
        checkDirty: () => isDirty,
        askSave: (action) => {
          setPendingAction(action);
          setConfirmOpen(true);
        },
      };
    }
    return () => {
      if (requestToggleRef) requestToggleRef.current = null;
    };
  }, [isEditing, isDirty, setIsEditing, requestToggleRef]);

  // Загрузка данных и CLEANUP
  useEffect(() => {
    if (personId && activeElement === "bio") {
      window.bioAPI.load(personId).then(setBio);
      window.bioAPI.getFullImagePath(personId, "").then(setPersonDir);
    }

    // ЭТОТ КЛИНИНГ ЗАКРЫВАЕТ РЕДАКТИРОВАНИЕ ПРИ УХОДЕ
    return () => {
      setIsEditing(false);
    };
  }, [personId, activeElement, setIsEditing]);

  const handleSaveAndExecute = async () => {
    const markdown = saveRef.current?.();
    if (typeof markdown === "string") {
      await window.bioAPI.save(personId, markdown);
      setIsDirty(false);
      setBio(markdown);
      setSessionImages([]); // Очищаем, так как файлы теперь "закреплены" в MD
      executePending();
    }
  };

  const handleDiscardAndExecute = async () => {
    // Если были добавлены изображения, удаляем их физически из папки
    if (sessionImages.length > 0) {
      await window.bioAPI.deleteImages(personId, sessionImages);
    }

    setIsDirty(false);
    setSessionImages([]);
    executePending();
  };

  const executePending = () => {
    // 1. Если просто переключали кнопку "Карандаш"
    if (pendingAction === "toggleEdit") {
      setIsEditing(false);
    }

    // 2. Если переключали вкладку (например, changeTab:photo)
    if (
      typeof pendingAction === "string" &&
      pendingAction.startsWith("changeTab:")
    ) {
      const [, newTab] = pendingAction.split(":");
      setIsEditing(false);
      if (setActiveElement) setActiveElement(newTab);
    }

    // 3. Если уходили по ссылке в меню (например, navigate:/settings)
    if (
      typeof pendingAction === "string" &&
      pendingAction.startsWith("navigate:")
    ) {
      const [, path] = pendingAction.split(":");
      setIsEditing(false);
      window.location.hash = path; // Или используйте навигацию из пропсов
    }

    setConfirmOpen(false);
    setPendingAction(null);
  };

  return (
    <>
      <Box
        sx={{ display: "flex", height: "100%", bgcolor: "background.default" }}
      >
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            // Используем стандартный фон темы для подложки
            bgcolor: "background.default",
            py: { xs: 2, md: 4 },
            px: { xs: 2, md: 0 },
          }}
        >
          <Box
            sx={{
              maxWidth: "900px",
              mx: "auto",
              // Адаптивные отступы
              p: { xs: 2, md: 5 },

              // ЦВЕТ ЛИСТА
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "#1a1a1a" // Глубокий темный (чуть темнее прошлого, для благородства)
                  : "#ffffff",

              minHeight: "100vh",
              borderRadius: "24px",
              border: "1px solid",

              // ЦВЕТ ГРАНИЦЫ
              borderColor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.05)" // Почти невидимая в темноте
                  : "rgba(0, 0, 0, 0.08)",

              // ОБЪЕМНЫЕ ТЕНИ
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? `
          0 20px 40px rgba(0,0,0,0.8), 
          inset 0 0 0 1px rgba(255,255,255,0.05)
        ` // Внешняя тень + внутренний тонкий контур для объема
                  : "0 10px 40px rgba(0,0,0,0.06)",

              // ИСПРАВЛЕНИЕ ЦВЕТА ТЕКСТА
              color: (theme) =>
                theme.palette.mode === "dark" ? "#e0e0e0" : "#1a1a1a", // Насыщенный черный для светлой темы

              transition: "transform 0.3s ease, background-color 0.3s ease",
              "&:hover": {
                transform: "translateY(-2px)", // Легкий эффект парения при наведении
              },
            }}
          >
            {activeElement === "bio" && bio === "" && !isEditing && (
              <Box
                sx={{
                  textAlign: "center",
                  py: 15,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  "& .milkdown": {
                    color: (theme) =>
                      theme.palette.mode === "light"
                        ? "#1a1a1a !important"
                        : "inherit",
                    fontSize: "1.1rem",
                    lineHeight: 1.7,
                  },
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    borderRadius: "50%",
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                  }}
                >
                  <FeedIcon
                    sx={{ fontSize: 80, color: "text.disabled", opacity: 0.2 }}
                  />
                </Box>
                <Typography
                  variant="h6"
                  sx={{ color: "text.secondary", fontWeight: 500 }}
                >
                  Биография пока не заполнена
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => setIsEditing(true)}
                  sx={{
                    mt: 1,
                    borderRadius: "12px",
                    px: 3,
                    textTransform: "none",
                  }}
                >
                  Начать писать
                </Button>
              </Box>
            )}

            {activeElement === "bio" && bio !== null && (
              <Box sx={{ position: "relative" }}>
                <MilkdownProvider key={personId + (isEditing ? "_ed" : "_vw")}>
                  <MilkdownEditor
                    onImageAdded={(file) =>
                      setSessionImages((prev) => [...prev, file])
                    }
                    content={bio || " "}
                    isEditing={isEditing}
                    personDir={personDir}
                    personId={personId}
                    onSaveRef={saveRef}
                    execRef={execRef}
                    setIsDirty={setIsDirty}
                    onImageClick={setPreviewImg}
                  />
                </MilkdownProvider>
              </Box>
            )}
            <ButtonScrollTop />
          </Box>
        </Box>
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        TransitionComponent={Slide}
        TransitionProps={{ direction: "down" }}
        PaperProps={{
          sx: {
            // Адаптивный фон: в темной теме чуть прозрачный для блюра, в светлой — белый
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? alpha(theme.palette.background.paper, 0.8)
                : theme.palette.background.paper,
            backdropFilter: "blur(16px)",
            backgroundImage: "none",
            borderRadius: "24px", // Увеличил до 24px для единства стиля
            border: "1px solid",
            borderColor: "divider", // Системный цвет границы (адаптивный)
            boxShadow: (theme) => theme.shadows[24],
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ p: 4, minWidth: 320, textAlign: "center" }}>
          {/* Иконка */}
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "20px",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2.5,
            }}
          >
            <EditIcon sx={{ color: "primary.main", fontSize: 32 }} />
          </Box>

          <Typography
            variant="h6"
            sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}
          >
            Сохранить правки?
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mb: 4, px: 2 }}
          >
            У вас есть несохраненные изменения в биографии. Выберите действие.
          </Typography>

          <Stack spacing={1.5}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSaveAndExecute}
              sx={{
                borderRadius: "14px",
                py: 1.5,
                textTransform: "none",
                fontWeight: 700,
                boxShadow: (theme) =>
                  `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              Сохранить и выйти
            </Button>

            <Button
              variant="outlined"
              fullWidth
              onClick={handleDiscardAndExecute}
              sx={{
                borderRadius: "14px",
                py: 1.5,
                textTransform: "none",
                fontWeight: 600,
                color: "error.main",
                borderColor: (theme) => alpha(theme.palette.error.main, 0.5),
                "&:hover": {
                  borderColor: "error.main",
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.05),
                },
              }}
            >
              Выйти без сохранения
            </Button>

            <Button
              variant="text"
              fullWidth
              onClick={() => setConfirmOpen(false)}
              sx={{
                borderRadius: "14px",
                py: 1.2,
                textTransform: "none",
                color: "text.secondary",
                "&:hover": {
                  color: "text.primary",
                  bgcolor: (theme) => alpha(theme.palette.action.hover, 0.05),
                },
              }}
            >
              Продолжить редактирование
            </Button>
          </Stack>
        </Box>
      </Dialog>

      {/* Модалка превью картинки */}
      <Dialog
        open={Boolean(previewImg)}
        onClose={() => setPreviewImg(null)}
        maxWidth="xl"
        // Делаем сам фон Backdrop (затемнение вокруг) очень плотным
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              backdropFilter: "blur(8px)",
            },
          },
        }}
        PaperProps={{
          sx: {
            bgcolor: "transparent",
            boxShadow: "none",
            overflow: "hidden", // Убираем скроллы у самой бумаги
          },
        }}
      >
        <Box
          onClick={() => setPreviewImg(null)}
          sx={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "zoom-out", // Показывает, что клик уменьшит/закроет
            p: { xs: 1, md: 2 },
          }}
        >
          {/* Кнопка закрытия — более современная и заметная */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImg(null);
            }}
            sx={{
              position: "fixed", // Фиксируем относительно экрана, чтобы не прыгала
              top: 20,
              right: 20,
              color: "white",
              bgcolor: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              zIndex: 10,
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.2)",
                transform: "rotate(90deg)", // Легкая анимация для красоты
              },
              transition: "all 0.3s ease",
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box
            component="img"
            src={previewImg}
            alt="Preview"
            sx={{
              maxWidth: "95vw",
              maxHeight: "95vh",
              objectFit: "contain",
              borderRadius: "12px", // Мягкие углы у самого фото
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", // Тень под фото для объема
              // Плавное появление картинки
              animation: "fadeIn 0.3s ease-out",
              "@keyframes fadeIn": {
                from: { opacity: 0, transform: "scale(0.95)" },
                to: { opacity: 1, transform: "scale(1)" },
              },
            }}
          />
        </Box>
      </Dialog>
    </>
  );
}
