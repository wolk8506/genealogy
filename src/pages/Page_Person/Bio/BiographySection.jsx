import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogContentText,
  useTheme,
  Paper,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import UndoIcon from "@mui/icons-material/Undo";
import MDEditor from "@uiw/react-md-editor";
import rehypeRaw from "rehype-raw";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BioEditor from "./BioEditor";
import NameSection from "../../../components/NameSection";

export default function BiographySection({ personId }) {
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState("");
  const [original, setOriginal] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [personDir, setPersonDir] = useState("");
  const [openImg, setOpenImg] = useState(null);

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  useEffect(() => {
    if (personId) {
      window.bioAPI.load(personId).then((text) => {
        setBio(text || "");
        setOriginal(text || "");
      });

      window.bioAPI.getFullImagePath(personId, "").then((dirPath) => {
        setPersonDir(dirPath || "");
      });
    }
  }, [personId]);

  const handleClose = () => {
    if (bio !== original) {
      setConfirmOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleDiscard = () => {
    setConfirmOpen(false);
    setOpen(false);
    setBio(original);
  };

  const handleCancel = () => {
    setConfirmOpen(false);
  };

  const handleConfirmSave = async () => {
    await window.bioAPI.save(personId, bio);
    setOriginal(bio);
    setConfirmOpen(false);
    setOpen(false);
  };

  const toFileUri = (uri) => {
    if (!uri || uri.startsWith("http") || uri.startsWith("file://")) return uri;
    if (!personDir) return uri;
    // const fullPath = path.join(personDir, uri);
    const fullPath = `${personDir.replace(/[/\\]+$/, "")}/${uri.replace(
      /^[/\\]+/,
      ""
    )}`;

    return `${fullPath}`;
  };

  const processedBio = useMemo(() => {
    if (!bio) return bio;
    let text = bio;

    // 1) Markdown: ![alt](path) -> абсолютные пути
    text = text.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (_m, alt, src) => `![${alt}](${toFileUri(src)})`
    );

    // 2) HTML: <img ... src="..."> -> абсолютные пути
    text = text.replace(
      /<img\b([^>]*?)\s+src=(["'])([^"']+)\2([^>]*?)>/gi,
      (_m, pre, q, src, post) => `<img ${pre} src="${toFileUri(src)}" ${post}>`
    );

    // 3) Оборачивание "параграфов, внутри которых только изображения" в flex-контейнер
    //    <p><img ...><img ...>...</p> -> <div class="bio-images-container">...</div>
    text = text.replace(/<p>\s*(?:<img\b[^>]*>\s*){2,}\s*<\/p>/gi, (m) =>
      m
        .replace(/^<p>/i, '<div class="bio-images-container">')
        .replace(/<\/p>$/i, "</div>")
    );

    return text;
  }, [bio, personDir]);

  return (
    <>
      <NameSection title="Биография" icon={AssignmentIcon} />

      <Box display="flex" gap={1} justifyContent="flex-end" mb={2}>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => setOpen(true)}
        >
          Редактировать
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: isDark ? "#1e1e1e" : "#f9f9f9",
          color: isDark ? "#e0e0e0" : "inherit",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          height: "78vh",
          overflow: "auto",
        }}
      >
        <div
          data-color-mode={isDark ? "dark" : "light"}
          className="bio-images-container"
          onClick={(e) => {
            const t = e.target;
            if (t && t.tagName === "IMG") {
              const src = t.getAttribute("src");
              if (src) setOpenImg(src);
            }
          }}
        >
          <MDEditor.Markdown
            source={processedBio}
            style={{ backgroundColor: "transparent", color: "inherit" }}
            rehypePlugins={[rehypeRaw]}
            urlTransform={(url) => toFileUri(url)}
          />
        </div>
      </Paper>

      <style>
        {`[data-color-mode] p:has(img) {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
          }
          [data-color-mode] p:has(img) img {
            flex: 1 1 calc(33.333% - 12px);
            max-width: calc(33.333% - 12px);
            height: auto;
            max-height: 400px;
            object-fit: contain;
            cursor: pointer;
            display: block;
          }
          @media (max-width: 900px) {
            [data-color-mode] p:has(img) img {
              flex: 1 1 calc(50% - 12px);
              max-width: calc(50% - 12px);
            }
          }
          @media (max-width: 600px) {
            [data-color-mode] p:has(img) img {
              flex: 1 1 100%;
              max-width: 100%;
            }
          }`}
      </style>

      {/* Диалог просмотра картинки в полном размере */}
      <Dialog
        open={!!openImg}
        onClose={() => setOpenImg(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: "transparent", boxShadow: "none" },
        }}
      >
        {openImg && (
          <DialogContent
            onClick={() => setOpenImg(null)}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: 0,
              backgroundColor: "rgba(0,0,0,0.85)",
            }}
          >
            <img
              src={openImg}
              alt=""
              style={{
                maxWidth: "95vw",
                maxHeight: "90vh",
                width: "auto",
                height: "auto",
                display: "block",
              }}
              loading="lazy"
            />
          </DialogContent>
        )}
      </Dialog>

      {/* Редактор биографии */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullScreen
        PaperProps={{
          sx: {
            borderRadius: "15px",
          },
        }}
      >
        <DialogTitle>Редактировать биографию</DialogTitle>
        <DialogContent>
          <BioEditor
            personId={personId}
            value={bio}
            onChange={setBio}
            personDir={personDir}
          />
        </DialogContent>
        <DialogActions sx={{ pr: "24px", pl: "24px", pb: "16px" }}>
          <Button
            onClick={handleClose}
            startIcon={<CloseIcon />}
            color="inherit"
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Подтверждение сохранения */}
      <Dialog open={confirmOpen} onClose={handleCancel}>
        <DialogTitle>Сохранить изменения?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы внесли изменения в биографию. Сохранить перед выходом?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDiscard}
            color="error"
            startIcon={<UndoIcon />}
          >
            Не сохранять
          </Button>
          <Button
            onClick={handleCancel}
            color="inherit"
            startIcon={<CloseIcon />}
          >
            Вернуться
          </Button>
          <Button
            onClick={handleConfirmSave}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
