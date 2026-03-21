import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  Box,
  Button,
  IconButton,
  Slide,
  Stack,
  Typography,
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
        "& .milkdown": { backgroundColor: "transparent", color: "#eee" },
        "& .milkdown .editor": {
          minHeight: "500px",
          outline: "none",
          pb: "100px",
          color: "#eee",
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

  const saveRef = useRef(null);

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

    // Проверяем, что результат — это строка (даже если она пустая)
    if (typeof markdown === "string") {
      await window.bioAPI.save(personId, markdown);
      setIsDirty(false);
      setBio(markdown);
      executePending();
    }
  };

  const handleDiscardAndExecute = () => {
    setIsDirty(false);
    // Просто выполняем то, что хотели сделать до модалки
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
      <Box>
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            bgcolor: "#1e1e1e",
          }}
        >
          <Box
            sx={{
              maxWidth: "900px",

              mx: "auto",
              my: 4,
              p: 4,
              bgcolor: "#2c2c2c",
              minHeight: "100vh",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              borderRadius: "8px",
              border: "1px solid #333",
            }}
          >
            {activeElement === "bio" && bio === "" && !isEditing && (
              <Box sx={{ textAlign: "center", py: 10, color: "text.disabled" }}>
                <FeedIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                <Typography>Биография пока не заполнена</Typography>
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => setIsEditing(true)}
                  sx={{ mt: 2 }}
                >
                  Начать писать
                </Button>
              </Box>
            )}
            {activeElement === "bio" && bio !== null && (
              <MilkdownProvider key={personId + (isEditing ? "_ed" : "_vw")}>
                <MilkdownEditor
                  content={bio || " "} // Передаем пробел, чтобы Milkdown не ругался на null
                  isEditing={isEditing}
                  personDir={personDir}
                  personId={personId}
                  onSaveRef={saveRef}
                  execRef={execRef}
                  setIsDirty={setIsDirty}
                  onImageClick={setPreviewImg}
                />
              </MilkdownProvider>
            )}
            <ButtonScrollTop />
          </Box>
        </Box>
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        // Добавляем плавный переход
        TransitionComponent={Slide}
        TransitionProps={{ direction: "down" }}
        PaperProps={{
          sx: {
            bgcolor: "#242424", // Более глубокий темный
            color: "white",
            borderRadius: "16px",
            backgroundImage: "none", // Убираем стандартное осветление MUI
            border: "1px solid #444",
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          },
        }}
      >
        <Box sx={{ p: 4, minWidth: 320, textAlign: "center" }}>
          {/* Иконка для привлечения внимания */}
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "rgba(144, 202, 249, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <EditIcon sx={{ color: "#90caf9", fontSize: 32 }} />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Сохранить правки?
          </Typography>

          <Typography variant="body2" sx={{ color: "#aaa", mb: 3 }}>
            У вас есть несохраненные изменения в биографии.
          </Typography>

          <Stack spacing={1.5}>
            <Button
              variant="contained"
              size="small"
              fullWidth
              onClick={handleSaveAndExecute}
              sx={{
                borderRadius: "12px",
                py: 1.2,
                textTransform: "none",
                fontWeight: 600,
                bgcolor: "#1976d2",
                "&:hover": { bgcolor: "#1565c0" },
              }}
            >
              Сохранить и выйти
            </Button>

            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={handleDiscardAndExecute}
              sx={{
                borderRadius: "12px",
                py: 1.2,
                textTransform: "none",
                color: "#ff8a80",
                borderColor: "#ff8a80",
                "&:hover": {
                  borderColor: "#ff5252",
                  bgcolor: "rgba(255, 138, 128, 0.05)",
                },
              }}
            >
              Выйти без сохранения
            </Button>

            <Button
              variant="text"
              size="small"
              fullWidth
              onClick={() => setConfirmOpen(false)}
              sx={{
                borderRadius: "12px",
                py: 1,
                textTransform: "none",
                color: "#777",
                "&:hover": { color: "#eee" },
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
        // Добавляем прозрачный фон для Backdrop, чтобы клик по краям отрабатывал мягче
        PaperProps={{
          sx: { bgcolor: "transparent", boxShadow: "none" },
        }}
      >
        <Box
          onClick={() => setPreviewImg(null)} // ЗАКРЫТИЕ ПРИ КЛИКЕ В ЛЮБОМ МЕСТЕ BOX
          sx={{
            p: 1,
            position: "relative",
            bgcolor: "#000",
            lineHeight: 0,
            cursor: "pointer", // Курсор указывает, что клик сработает
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minWidth: "100px",
            minHeight: "100px",
          }}
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation(); // Предотвращаем двойной вызов, если нужно
              setPreviewImg(null);
            }}
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              color: "white",
              zIndex: 1,
              bgcolor: "rgba(0,0,0,0.5)",
              "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
            }}
          >
            <CloseIcon />
          </IconButton>
          <img
            src={previewImg}
            style={{
              maxWidth: "100%",
              maxHeight: "90vh",
              objectFit: "contain",
            }}
            alt="zoom"
          />
        </Box>
      </Dialog>
    </>
  );
}
