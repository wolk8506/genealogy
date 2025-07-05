import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  Button,
  Stack,
  ListItemButton,
  Checkbox,
  Tabs,
  Tab,
  Box,
} from "@mui/material";
import { FormControlLabel } from "@mui/material";

import { useEffect, useState } from "react";
import PersonAvatar from "./PersonAvatar";
import JSZip from "jszip";
import ExportConfirmModal from "./ExportConfirmModal";
import { exportPeopleToZip } from "./utils/exportToZip";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import Box from "@mui/material/Box";

export default function ArchivePage() {
  const [people, setPeople] = useState([]);
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    window.peopleAPI.getAll().then((data) => {
      setPeople(data || []);
    });
  }, []);

  const handleToggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBackup = async () => {
    setIsSaving(true);
    setProgress(0);

    try {
      const people = await window.peopleAPI.getAll();
      await exportPeopleToZip({
        people,
        onProgress: setProgress,
        filename: `Genealogy_backup_${Date.now()}.zip`,
      });

      setSaveDone(true);
      setTimeout(() => {
        setIsSaving(false);
        setSaveDone(false);
        setProgress(0);
      }, 1500);
    } catch (err) {
      console.error("❌ Ошибка при создании архива:", err);
      setIsSaving(false);
    }
  };

  const archived = people.filter((p) => p.archived);
  const active = people.filter((p) => !p.archived);

  return (
    <Stack spacing={2}>
      <Backdrop
        open={isSaving}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
        }}
      >
        {saveDone ? (
          <>
            <CheckCircleIcon sx={{ fontSize: 60, color: "limegreen" }} />
            <Box mt={2}>
              <Typography variant="h6" color="inherit">
                Архив сохранён!
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <CircularProgress color="inherit" />
            <Box mt={2}>
              <Typography variant="h6" color="inherit">
                Сохраняем архив... {progress}%
              </Typography>
            </Box>
          </>
        )}
      </Backdrop>
      <Typography variant="h5">Корзина</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Не в архиве" />
        <Tab label="В архиве" />
      </Tabs>

      {tab === 0 && (
        <>
          <Button
            variant="contained"
            disabled={selected.length === 0}
            onClick={async () => {
              const all = await window.peopleAPI.getAll();
              const selectedData = all.filter((p) => selected.includes(p.id));
              setSelectedPeople(selectedData);
              setConfirmOpen(true);
            }}
          >
            📦 Создать архив из выбранных
          </Button>

          <List dense>
            {active.map((person) => {
              const fullName = [person.firstName, person.lastName]
                .filter(Boolean)
                .join(" ");
              const initials =
                (person.firstName?.[0] || "") + (person.lastName?.[0] || "");

              return (
                <ListItem
                  key={person.id}
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        color="warning"
                        onClick={async () => {
                          await window.peopleAPI.update(person.id, {
                            archived: true,
                          });
                          const updated = await window.peopleAPI.getAll();
                          setPeople(updated);
                          setSelected((prev) =>
                            prev.filter((id) => id !== person.id)
                          );
                        }}
                      >
                        Архивировать
                      </Button>
                      <FormControlLabel
                        control={
                          <Checkbox
                            edge="end"
                            checked={selected.includes(person.id)}
                            onChange={() => handleToggle(person.id)}
                          />
                        }
                        label="&nbsp;в .zip  "
                      />
                    </Stack>
                  }
                >
                  <ListItemAvatar>
                    <PersonAvatar
                      foto={person.id}
                      initials={initials}
                      size={40}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={fullName || "Без имени"}
                    secondary={`ID: ${person.id}`}
                  />
                </ListItem>
              );
            })}
          </List>
        </>
      )}

      {tab === 1 && (
        <List dense>
          {archived.map((person) => {
            const fullName = [person.firstName, person.lastName]
              .filter(Boolean)
              .join(" ");
            const initials =
              (person.firstName?.[0] || "") + (person.lastName?.[0] || "");

            return (
              <ListItem
                key={person.id}
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      color="success"
                      onClick={async () => {
                        await window.peopleAPI.update(person.id, {
                          archived: false,
                        });
                        const updated = await window.peopleAPI.getAll();
                        setPeople(updated);
                      }}
                    >
                      Восстановить
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={async () => {
                        await window.peopleAPI.delete(person.id);
                        const updated = await window.peopleAPI.getAll();
                        setPeople(updated);
                      }}
                    >
                      Удалить навсегда
                    </Button>
                  </Stack>
                }
              >
                <ListItemAvatar>
                  <PersonAvatar
                    foto={person.id}
                    initials={initials}
                    size={40}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={fullName || "Без имени"}
                  secondary={`ID: ${person.id}`}
                />
              </ListItem>
            );
          })}
        </List>
      )}
      <ExportConfirmModal
        open={confirmOpen}
        people={selectedPeople}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setIsSaving(true);
          setProgress(0);
          setConfirmOpen(false); // ⬅️ Закрываем модалку

          try {
            await exportPeopleToZip({
              people: selectedPeople,
              filename: `Genealogy_selected_${Date.now()}.zip`,
              onProgress: setProgress,
            });

            setSaveDone(true);
            setSelected([]);
            setTimeout(() => {
              setIsSaving(false);
              setSaveDone(false);
              setProgress(0);
            }, 1500);
          } catch (err) {
            console.error("❌ Ошибка при экспорте:", err);
            setIsSaving(false);
          }
        }}
      />
    </Stack>
  );
}
