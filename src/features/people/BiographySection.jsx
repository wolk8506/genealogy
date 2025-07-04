// import React, { useState, useEffect } from "react";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   Typography,
//   IconButton,
//   Stack,
//   DialogContentText,
//   useTheme,
//   Paper,
// } from "@mui/material";
// import EditIcon from "@mui/icons-material/Edit";
// import MDEditor from "@uiw/react-md-editor";
// import BioEditor from "./BioEditor";

// export default function BiographySection({ personId }) {
//   const [open, setOpen] = useState(false);
//   const [bio, setBio] = useState("");
//   const [original, setOriginal] = useState("");
//   const [confirmOpen, setConfirmOpen] = useState(false);

//   const theme = useTheme();
//   const isDark = theme.palette.mode === "dark";

//   useEffect(() => {
//     if (personId) {
//       window.bioAPI.load(personId).then((text) => {
//         setBio(text || "");
//         setOriginal(text || "");
//       });
//     }
//   }, [personId]);

//   const handleClose = () => {
//     if (bio !== original) {
//       setConfirmOpen(true);
//     } else {
//       setOpen(false);
//     }
//   };

//   const handleDiscard = () => {
//     setConfirmOpen(false);
//     setOpen(false);
//   };

//   const handleConfirmSave = async () => {
//     await window.bioAPI.save(personId, bio);
//     setOriginal(bio);
//     setConfirmOpen(false);
//     setOpen(false);
//   };

//   return (
//     <>
//       <Stack direction="row" alignItems="center" spacing={1}>
//         <Typography variant="h6">Биография</Typography>
//         <IconButton size="small" onClick={() => setOpen(true)}>
//           <EditIcon fontSize="small" />
//         </IconButton>
//       </Stack>

//       <Paper
//         elevation={0}
//         sx={{
//           p: 2,
//           backgroundColor: isDark ? "#1e1e1e" : "#f9f9f9",
//           color: isDark ? "#e0e0e0" : "inherit",
//           border: `1px solid ${theme.palette.divider}`,
//           borderRadius: 2,
//         }}
//       >
//         <div data-color-mode={isDark ? "dark" : "light"}>
//           <MDEditor.Markdown
//             source={bio}
//             style={{
//               backgroundColor: "transparent",
//               color: "inherit",
//             }}
//           />
//         </div>
//       </Paper>

//       <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
//         <DialogTitle>Редактировать биографию</DialogTitle>
//         <DialogContent>
//           <BioEditor personId={personId} value={bio} onChange={setBio} />
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={handleClose}>Закрыть</Button>
//         </DialogActions>
//       </Dialog>

//       <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
//         <DialogTitle>Сохранить изменения?</DialogTitle>
//         <DialogContent>
//           <DialogContentText>
//             Вы внесли изменения в биографию. Сохранить перед выходом?
//           </DialogContentText>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={handleDiscard}>Не сохранять</Button>
//           <Button onClick={handleConfirmSave} variant="contained">
//             Сохранить
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </>
//   );
// }
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import MDEditor from "@uiw/react-md-editor";
import BioEditor from "./BioEditor";
import path from "path";

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

      // Получаем путь к папке человека через preload
      window.bioAPI.getFullImagePath(personId, "").then((dirPath) => {
        setPersonDir(dirPath); // file:///.../people/ID/
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
  };

  const handleConfirmSave = async () => {
    await window.bioAPI.save(personId, bio);
    setOriginal(bio);
    setConfirmOpen(false);
    setOpen(false);
  };

  // 🔧 Подменяем пути к изображениям
  const transformImageUri = (uri) => {
    if (!uri || uri.startsWith("http") || uri.startsWith("file://")) return uri;
    if (!personDir) return uri;
    const fullPath = path.join(personDir, uri);
    return `file://${fullPath}`;
  };

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h6">Биография</Typography>
        <IconButton size="small" onClick={() => setOpen(true)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: isDark ? "#1e1e1e" : "#f9f9f9",
          color: isDark ? "#e0e0e0" : "inherit",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
        }}
      >
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

              // Гарантируем, что между путями есть слэш
              return `${personDir.replace(/\/$/, "")}/${url.replace(
                /^\//,
                ""
              )}`;
            }}
          />
        </div>
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Редактировать биографию</DialogTitle>
        <DialogContent>
          <BioEditor personId={personId} value={bio} onChange={setBio} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Сохранить изменения?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы внесли изменения в биографию. Сохранить перед выходом?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDiscard}>Не сохранять</Button>
          <Button onClick={handleConfirmSave} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
