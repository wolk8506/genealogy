import React, { useEffect, useState, useMemo } from "react";
import {
  Avatar,
  Typography,
  CircularProgress,
  Stack,
  Button,
  Grid,
  useTheme,
  Box,
  alpha,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useSearchParams } from "react-router-dom";
import { ExternalEntityCard } from "./ExternalEntityCard";
import { filterActiveExternal } from "../../utils/externalEntities";
import { usePeopleListStore } from "../../store/usePeopleListStore";
import AddExternalEntityDialog from "../../components/Dialog/AddExternalEntityDialog";
import appIcon from "../../img/app_icon.png";

export default function ExternalPeoplePage({
  externalSearch = "",
  setExternalSearch = () => {},
  externalTypeFilter = "all",
  setExternalTypeFilter = () => {},
  selectedId = null,
  onSelect = () => {},
  listRefreshKey = 0,
}) {
  const theme = useTheme();
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
    usePeopleListStore.getState().refreshArchiveStatus();
  }, [listRefreshKey]);

  const handleCloseModal = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("action");
      return next;
    });
  };

  const handleSaved = (savedId) => {
    loadData();
    if (savedId) onSelect(savedId);
  };

  const handleOpenAdd = () => {
    setSearchParams({ action: "add" });
  };

  const filtered = useMemo(() => {
    let list = filterActiveExternal(entities);
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

  const hasEntities = filterActiveExternal(entities).length > 0;

  useEffect(() => {
    if (loading) return;
    if (filtered.length === 0) {
      if (selectedId) onSelect(null);
      return;
    }
    const stillVisible = filtered.some((e) => e.id === selectedId);
    if (!selectedId || !stillVisible) {
      onSelect(filtered[0].id);
    }
  }, [loading, filtered, selectedId, onSelect]);

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, width: "100%", mx: "auto" }}>
      {loading ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : filtered.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 130px)",
            px: 3,
            textAlign: "center",
            animation: "fadeIn 0.8s ease-out",
            "@keyframes fadeIn": {
              from: { opacity: 0, transform: "translateY(20px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Box
            sx={{
              p: { xs: 4, md: 6 },
              width: "100%",
              maxWidth: 500,
              borderRadius: "24px",
              bgcolor: alpha(theme.palette.background.paper, 0.4),
              border: "1px solid",
              borderColor: "divider",
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            <Stack spacing={3} alignItems="center">
              <Box sx={{ position: "relative" }}>
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    bgcolor: theme.palette.primary.main,
                    filter: "blur(25px)",
                    opacity: 0.15,
                    borderRadius: "50%",
                  }}
                />
                <Avatar
                  src={appIcon}
                  sx={{
                    width: 100,
                    height: 100,
                    border: "4px solid",
                    borderColor: "background.paper",
                    boxShadow: theme.shadows[4],
                  }}
                />
              </Box>

              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                  Справочник
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", maxWidth: 350, mx: "auto" }}
                >
                  {!hasEntities
                    ? "Справочник пока пуст. Добавьте крёстных, друзей или питомцев."
                    : "Ничего не найдено по фильтру."}
                </Typography>
              </Box>

              {!hasEntities && (
                <Stack spacing={2} sx={{ width: "100%", mt: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAdd}
                    sx={{
                      height: 32,
                      borderRadius: "999px",
                      px: 2,
                      py: 0,
                      textTransform: "none",
                      fontSize: "0.8125rem",
                      lineHeight: 1.2,
                      fontWeight: 700,
                      boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)",
                      "& .MuiButton-startIcon": {
                        mr: 0.5,
                        ml: 0,
                        "& > *:nth-of-type(1)": { fontSize: 16 },
                      },
                    }}
                  >
                    Добавить первую запись
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ width: "100%" }}>
          {filtered.map((entity) => (
            <Grid size={{ xs: 12 }} key={entity.id} sx={{ width: "100%" }}>
              <ExternalEntityCard
                entity={entity}
                allPeople={allPeople}
                allExternal={entities}
                selected={selectedId === entity.id}
                onSelect={onSelect}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <AddExternalEntityDialog
        open={isModalOpen}
        onClose={handleCloseModal}
        onSaved={handleSaved}
      />

    </Box>
  );
}
