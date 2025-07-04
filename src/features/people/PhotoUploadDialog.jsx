// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   TextField,
//   Autocomplete,
//   Stack,
// } from "@mui/material";
// import { useEffect, useState } from "react";

// export default function PhotoUploadDialog({
//   open,
//   onClose,
//   personId,
//   currentUserId,
//   onPhotoAdded,
// }) {
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [people, setPeople] = useState([]);
//   const [allPeople, setAllPeople] = useState([]);

//   useEffect(() => {
//     if (open) {
//       window.peopleAPI.getAll().then(setAllPeople);
//       setPeople([]);
//       setTitle("");
//       setDescription("");
//     }
//   }, [open]);

//   //   useEffect(() => {
//   //     const person = allPeople.find((p) => p.id === personId);
//   //     if (person) setPeople([person]);
//   //   }, [allPeople, personId]);
//   useEffect(() => {
//     setPeople([]); // не добавляем никого автоматически
//   }, [allPeople, personId]);

//   const handleSave = async () => {
//     const meta = {
//       title,
//       description,
//       people: people.map((p) => p.id),
//       owner: currentUserId,
//       date: new Date().toISOString().split("T")[0],
//     };

//     // 🔍 Запрос выбора файла
//     const result = await window.photoAPI.save(meta);

//     if (result) {
//       onPhotoAdded?.(result);
//       onClose(); // Закрыть окно после добавления
//     } else {
//       alert("Файл не выбран или произошла ошибка.");
//     }
//   };

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
//       <DialogTitle>Добавить фотографию</DialogTitle>
//       <DialogContent>
//         <Stack spacing={2} mt={1}>
//           <TextField
//             label="Заголовок"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//           />
//           <TextField
//             label="Описание"
//             multiline
//             rows={3}
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//           />
//           <Autocomplete
//             multiple
//             options={allPeople}
//             getOptionLabel={(p) =>
//               `${p.firstName || ""} ${p.lastName || ""}`.trim()
//             }
//             value={people}
//             onChange={(e, newValue) => setPeople(newValue)}
//             renderInput={(params) => (
//               <TextField {...params} label="Кто на фото" />
//             )}
//           />
//         </Stack>
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose}>Отмена</Button>
//         <Button variant="contained" onClick={handleSave}>
//           Выбрать файл и сохранить
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// }
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Stack,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

export default function PhotoUploadDialog({
  open,
  onClose,
  personId,
  currentUserId,
  onPhotoAdded,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState([]);
  const [allPeople, setAllPeople] = useState([]);

  const [preview, setPreview] = useState(null);
  const [filename, setFilename] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("4/3");

  useEffect(() => {
    if (open) {
      window.peopleAPI.getAll().then(setAllPeople);
      setTitle("");
      setDescription("");
      setPeople([]);
      setPreview(null);
      setFilename(null);
      setAspectRatio("4/3");
    }
  }, [open]);

  const handleFileSelect = async () => {
    const result = await window.photoAPI.selectFile();
    if (result?.path) {
      setPreview(result.path);
      setFilename(result.filename);

      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        if (ratio < 0.9) setAspectRatio("3/4");
        else if (ratio > 1.3) setAspectRatio("4/3");
        else setAspectRatio("1/1");
      };
      img.src = result.path;
    }
  };

  const handleSave = async () => {
    if (!filename || !preview) {
      alert("Сначала выберите файл.");
      return;
    }

    const meta = {
      title,
      description,
      people: [...new Set([...people.map((p) => p.id), personId])],
      owner: currentUserId,
      date: new Date().toISOString().split("T")[0],
      aspectRatio,
    };

    const result = await window.photoAPI.saveWithFilename(
      meta,
      preview.replace("file://", "")
    );
    if (result) {
      onPhotoAdded?.(result);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Добавить фотографию</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Button variant="outlined" onClick={handleFileSelect}>
            Выбрать файл
          </Button>

          {preview && (
            <>
              <img
                src={preview}
                alt="Предпросмотр"
                style={{
                  maxWidth: "100%",
                  maxHeight: 300,
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
              <FormControl fullWidth>
                <InputLabel>Отображение</InputLabel>
                <Select
                  value={aspectRatio}
                  label="Отображение"
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  <MenuItem value="4/3">Горизонтальное (4:3)</MenuItem>
                  <MenuItem value="1/1">Квадратное (1:1)</MenuItem>
                  <MenuItem value="3/4">Вертикальное (3:4)</MenuItem>
                </Select>
              </FormControl>
            </>
          )}

          <TextField
            label="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Описание"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Autocomplete
            multiple
            options={allPeople}
            getOptionLabel={(p) =>
              `${p.firstName || ""} ${p.lastName || ""}`.trim()
            }
            value={people}
            onChange={(e, newValue) => setPeople(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Кто на фото" />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleSave}>
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
