import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Stack,
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
import AssignmentIcon from "@mui/icons-material/Assignment";
import BioEditor from "./BioEditor";
import NameSection from "../../../components/NameSection";
// import path from "path";

export default function BiographySection({ personId }) {
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState("");
  const [original, setOriginal] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [personDir, setPersonDir] = useState("");

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  useEffect(() => {
    if (personId) {
      window.bioAPI.load(personId).then((text) => {
        setBio(text || "");
        setOriginal(text || "");
      });

      window.bioAPI.getFullImagePath(personId, "").then((dirPath) => {
        setPersonDir(dirPath);
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
    setBio(original); // откат изменений
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

  const transformImageUri = (uri) => {
    if (!uri || uri.startsWith("http") || uri.startsWith("file://")) return uri;
    if (!personDir) return uri;
    // const fullPath = path.join(personDir, uri);
    const fullPath = `${personDir.replace(/[/\\]+$/, "")}/${uri.replace(
      /^[/\\]+/,
      ""
    )}`;

    return `file://${fullPath}`;
  };

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
        {/* <IconButton size="small" onClick={() => setOpen(true)}>
          <EditIcon fontSize="small" />
        </IconButton> */}
        <div data-color-mode={isDark ? "dark" : "light"}>
          <MDEditor.Markdown
            source={bio}
            style={{
              backgroundColor: "transparent",
              color: "inherit",
            }}
            urlTransform={(url) => {
              if (!url || url.startsWith("http") || url.startsWith("file://"))
                return url;
              if (!personDir) return url;
              return `${personDir.replace(/\/$/, "")}/${url.replace(
                /^\//,
                ""
              )}`;
            }}
          />
        </div>
      </Paper>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "15px",
          },
        }}
      >
        <DialogTitle>Редактировать биографию</DialogTitle>
        <DialogContent>
          <BioEditor personId={personId} value={bio} onChange={setBio} />
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
