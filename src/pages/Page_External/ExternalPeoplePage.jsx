import React, { useEffect, useState, useMemo } from "react";
import {
  Typography,
  CircularProgress,
  Stack,
  Button,
  Grid,
  useTheme,
  Paper,
  Box,
  alpha,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { ButtonScrollTop } from "../../components/ButtonScrollTop";
import { useNotificationStore } from "../../store/useNotificationStore";
import { ExternalEntityCard } from "./ExternalEntityCard";
import AddExternalEntityDialog from "../../components/Dialog/AddExternalEntityDialog";

export default function ExternalPeoplePage({
  externalSearch = "",
  setExternalSearch = () => {},
  externalTypeFilter = "all",
  setExternalTypeFilter = () => {},
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [entities, setEntities] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(externalSearch);
  const [typeFilter, setTypeFilter] = useState(externalTypeFilter);
  const [searchParams, setSearchParams] = useSearchParams();
  const isModalOpen = searchParams.get("action") === "add";

  useEffect(() => {
    setSearch(externalSearch);
  }, [externalSearch]);

  useEffect(() => {
    setTypeFilter(externalTypeFilter);
  }, [externalTypeFilter]);

  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const loadData = async () => {
    setLoading(true);
    const [ext, people] = await Promise.all([
      window.externalAPI.getAll(),
      window.peopleAPI.getAll(),
    ]);
    setEntities(ext || []);
    setAllPeople(people || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCloseModal = () => {
    setSearchParams({});
    loadData();
  };

  const handleOpenAdd = () => {
    setSearchParams({ action: "add" });
  };

  const handleDelete = async (id) => {
    const entity = entities.find((e) => e.id === id);
    const confirmed = window.confirm(
      `Удалить «${entity?.name || id}» из справочника? Это действие необратимо.`,
    );
    if (!confirmed) return;

    await window.externalAPI.delete(id);
    addNotification({
      title: "Справочник",
      message: "Запись удалена",
      type: "info",
      category: "people",
    });
    loadData();
  };

  const filtered = useMemo(() => {
    let list = [...entities];
    if (typeFilter !== "all") {
      list = list.filter((e) => e.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.id?.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [entities, search, typeFilter]);

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, width: "100%", mx: "auto" }}>
      {loading ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : filtered.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: "20px",
            bgcolor: isDark
              ? alpha(theme.palette.primary.main, 0.05)
              : alpha(theme.palette.primary.main, 0.03),
          }}
        >
          <Typography color="text.secondary" mb={2}>
            {entities.length === 0
              ? "Справочник пуст. Добавьте крёстных, друзей или питомцев."
              : "Ничего не найдено по фильтру."}
          </Typography>
          {entities.length === 0 && (
            <Button variant="outlined" onClick={handleOpenAdd}>
              Добавить первую запись
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2} sx={{ width: "100%" }}>
          {filtered.map((entity) => (
            <Grid size={{ xs: 12 }} key={entity.id} sx={{ width: "100%" }}>
              <ExternalEntityCard
                entity={entity}
                allPeople={allPeople}
                allExternal={entities}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <AddExternalEntityDialog
        open={isModalOpen}
        onClose={handleCloseModal}
        onSaved={loadData}
      />

      <ButtonScrollTop />
    </Box>
  );
}
