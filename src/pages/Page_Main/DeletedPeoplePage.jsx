import React, { useEffect, useState } from "react";
import {
  Stack,
  Typography,
  CircularProgress,
  Box,
  Paper,
  Grid,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { PersonCard } from "./PersonCard"; // Укажи правильный путь
import { useNotificationStore } from "../../store/useNotificationStore";
import { usePeopleListStore } from "../../store/usePeopleListStore";

export default function DeletedPeoplePage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const setHasArchived = usePeopleListStore((state) => state.setHasArchived);
  const [archivedPeople, setArchivedPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const loadData = async () => {
    setLoading(true);
    const data = await window.peopleAPI.getAll();
    const deleted = (data || []).filter((p) => p.archived);
    setArchivedPeople(deleted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRestore = async (id) => {
    await window.peopleAPI.update(id, {
      archived: false,
      editedAt: new Date().toISOString(),
    });

    // Оптимистичное обновление UI
    const restoredPerson = archivedPeople.find((p) => p.id === id);
    setArchivedPeople((prev) => prev.filter((p) => p.id !== id));

    const all = await window.peopleAPI.getAll();
    setHasArchived(all.some((p) => p.archived));

    const name =
      [restoredPerson?.firstName, restoredPerson?.lastName]
        .filter(Boolean)
        .join(" ") || `ID ${id}`;

    addNotification({
      timestamp: new Date().toISOString(),
      title: "Восстановление",
      message: `${name} успешно восстановлен в основное древо`,
      type: "success",
    });
  };

  const handleDeleteForever = async (id) => {
    if (!window.confirm("Удалить человека навсегда? Это действие необратимо."))
      return;

    const now = new Date().toISOString();
    let all = await window.peopleAPI.getAll();
    const person = all.find((p) => p.id === id);
    if (!person) return;

    // Подчищаем связи (убираем ID удаляемого из массивов родственников)
    if (person.father) {
      const father = all.find((p) => p.id === person.father);
      if (father) {
        father.children = (father.children || []).filter((cid) => cid !== id);
        father.editedAt = now;
      }
    }
    if (person.mother) {
      const mother = all.find((p) => p.id === person.mother);
      if (mother) {
        mother.children = (mother.children || []).filter((cid) => cid !== id);
        mother.editedAt = now;
      }
    }
    (person.children || []).forEach((cid) => {
      const child = all.find((p) => p.id === cid);
      if (child) {
        if (child.father === id) child.father = null;
        if (child.mother === id) child.mother = null;
        child.editedAt = now;
      }
    });
    (person.spouse || []).forEach((sid) => {
      const sp = all.find((p) => p.id === sid);
      if (sp) {
        sp.spouse = (sp.spouse || []).filter((s) => s !== id);
        sp.editedAt = now;
      }
    });
    (person.siblings || []).forEach((sid) => {
      const sib = all.find((p) => p.id === sid);
      if (sib) {
        sib.siblings = (sib.siblings || []).filter((s) => s !== id);
        sib.editedAt = now;
      }
    });

    await window.peopleAPI.saveAll(all);
    await window.peopleAPI.delete(id);

    // Обновляем список на экране
    setArchivedPeople((prev) => prev.filter((p) => p.id !== id));

    addNotification({
      timestamp: new Date().toISOString(),
      title: "Полное удаление",
      message: `Запись полностью удалена из базы`,
      type: "error",
    });
  };

  if (loading) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ height: "60vh" }}
      >
        <CircularProgress />
      </Stack>
    );
  }

  if (archivedPeople.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 10,
          px: 3,
          borderRadius: 4,
          bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.02),
          border: "2px dashed",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            p: 2,
            borderRadius: "50%",
            // Используем нейтральный или зеленый цвет, т.к. пустая корзина — это хорошо
            bgcolor: alpha(theme.palette.success.main, 0.1),
            mb: 2,
          }}
        >
          <DeleteOutlineIcon
            sx={{
              fontSize: 50,
              width: "100px",
              height: "92px",
              color: "success.main",
              opacity: 0.5,
              // px: "19.5px",
            }}
          />
        </Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: "text.secondary" }}
        >
          Корзина пуста
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.disabled",
            mt: 1,
            textAlign: "center",
            maxWidth: 300,
          }}
        >
          Здесь будут временно храниться люди, которых вы решили удалить из
          основного списка.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography
        variant="h5"
        sx={{ mb: 3, fontWeight: 800, color: "error.main" }}
      >
        Корзина ({archivedPeople.length})
      </Typography>

      <Grid container spacing={2} flexDirection={"column"}>
        {archivedPeople.map((person) => (
          <Grid key={person.id} item xs={12}>
            <PersonCard
              person={person}
              isArchived={true} // Включаем режим корзины!
              onRestore={handleRestore}
              onDeleteForever={handleDeleteForever}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
