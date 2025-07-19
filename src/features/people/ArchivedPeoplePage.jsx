import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Stack,
  Typography,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Backdrop,
  CircularProgress,
  TextField,
} from "@mui/material";
import {
  Archive as ArchiveIcon,
  People as PeopleIcon,
  Delete as DeleteIcon,
  RestoreFromTrash as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import PersonAvatar from "./PersonAvatar";
import ExportConfirmModal from "./ExportConfirmModal";
import { exportPeopleToZip } from "./utils/exportToZip";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Fab, Zoom } from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";

export default function ArchivePage() {
  const [people, setPeople] = useState([]);
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [exportStatus, setExportStatus] = useState("Подготовка архива...");
  const [exportError, setExportError] = useState(false);

  useEffect(() => {
    window.archiveAPI?.onProgress(({ percent, phase }) => {
      setProgress(percent);
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const data = await window.peopleAPI.getAll();
    setPeople(data || []);
  };

  const archived = people.filter((p) => p.archived);
  const active = people.filter((p) => !p.archived);

  const filteredActive = useMemo(() => {
    const q = search.toLowerCase();
    return active.filter((p) => {
      const fullName = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase();
      return fullName.includes(q) || String(p.id).includes(q);
    });
  }, [active, search]);

  const allIds = filteredActive.map((p) => p.id);
  const allSelected = allIds.every((id) => selected.includes(id));
  const someSelected = allIds.some((id) => selected.includes(id));

  const handleToggleAll = () => {
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...allIds])]);
    }
  };

  const handleToggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleArchiveSelected = async () => {
    const all = await window.peopleAPI.getAll();
    setSelectedPeople(all.filter((p) => selected.includes(p.id)));
    setConfirmOpen(true);
  };

  const handleConfirmExport = async () => {
    setConfirmOpen(false);
    setIsSaving(true);
    setSaveDone(false);
    setProgress(0);
    setExportError(false); // если используешь для статуса ошибки
    setExportStatus("Подготовка архива...");

    try {
      const blob = await exportPeopleToZip({
        people: selectedPeople,
        filename: `Genealogy_selected_${Date.now()}.zip`,
        onProgress: setProgress,
        onStatus: (msg) => setExportStatus(msg),
        onError: (msg) => {
          setExportStatus(msg);
          setExportError(true);
        },
      });

      if (!blob) return; // экспорт прерван

      setSaveDone(true);
      setSelected([]);
      setExportStatus("✅ Архив сохранён");
      setTimeout(() => {
        setIsSaving(false);
        setSaveDone(false);
        setProgress(0);
      }, 1500);
    } catch (err) {
      setExportStatus(`❌ Ошибка: ${err.message || "Неизвестно"}`);
      setIsSaving(false);
      setExportError(true);
    }
  };

  const handleToggleArchive = async (id, toArchive) => {
    await window.peopleAPI.update(id, { archived: toArchive });
    await loadAll();
    setSelected((prev) => prev.filter((x) => x !== id));
  };

  const handleDeleteForever = async (id) => {
    await window.peopleAPI.delete(id);
    await loadAll();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <ArchiveIcon fontSize="large" color="primary" />
        <Typography variant="h4">Архив</Typography>
      </Stack>

      {/* Tabs */}
      <Paper elevation={1} sx={{ mb: 2, borderRadius: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab icon={<PeopleIcon />} iconPosition="start" label="Активные" />
          <Tab icon={<RestoreIcon />} iconPosition="start" label="В корзине" />
        </Tabs>
      </Paper>

      {/* Action buttons */}
      {tab === 0 && (
        <>
          <Paper
            elevation={1}
            sx={{
              position: "sticky",
              borderRadius: 3,
              top: { xs: 56, sm: 64 },
              marginBottom: 2,
              zIndex: 10,
              // backgroundColor: theme.palette.background.paper,
              p: 2,
              // borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Поиск по имени или ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                sx={{ flexGrow: 1 }}
              />

              <Button
                variant="contained"
                startIcon={<ArchiveIcon />}
                disabled={!selected.length}
                onClick={handleArchiveSelected}
                sx={{ mb: 2 }}
              >
                Экспорт выбранных ({selected.length})
              </Button>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allSelected}
                    indeterminate={!allSelected && someSelected}
                    onChange={handleToggleAll}
                  />
                }
                label="Выбрать все"
              />
            </Stack>
          </Paper>
        </>
      )}

      {/* Списки */}
      {tab === 0 ? (
        <List disablePadding>
          {filteredActive.map((p) => (
            <Paper
              key={p.id}
              elevation={1}
              sx={{
                mb: 1,
                "&:hover": { boxShadow: 4 },
                borderRadius: 3,
              }}
            >
              <ListItem
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      color="warning"
                      variant="outlined"
                      onClick={() => handleToggleArchive(p.id, true)}
                    >
                      В корзину
                      <DeleteIcon sx={{ ml: 0.5 }} />
                    </Button>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selected.includes(p.id)}
                          onChange={() => handleToggle(p.id)}
                        />
                      }
                      label="В ZIP"
                    />
                  </Stack>
                }
              >
                <ListItemAvatar>
                  <PersonAvatar
                    personId={p.id}
                    initials={p.firstName?.[0]}
                    size={40}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    `${p.firstName} ${p.lastName || ""}`.trim() || "Без имени"
                  }
                  secondary={`ID: ${p.id}`}
                />
              </ListItem>
            </Paper>
          ))}
        </List>
      ) : (
        <List disablePadding>
          {archived.map((p) => (
            <Paper
              key={p.id}
              elevation={1}
              sx={{
                mb: 1,
                "&:hover": { boxShadow: 4 },
                borderRadius: 3,
              }}
            >
              <ListItem
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      color="success"
                      variant="outlined"
                      onClick={() => handleToggleArchive(p.id, false)}
                    >
                      Восстановить
                      <RestoreIcon sx={{ ml: 0.5 }} />
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => handleDeleteForever(p.id)}
                    >
                      Удалить навсегда
                      <DeleteForeverIcon sx={{ ml: 0.5 }} />
                    </Button>
                  </Stack>
                }
              >
                <ListItemAvatar>
                  <PersonAvatar
                    personId={p.id}
                    initials={p.firstName?.[0]}
                    size={40}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    `${p.firstName} ${p.lastName || ""}`.trim() || "Без имени"
                  }
                  secondary={`ID: ${p.id}`}
                />
              </ListItem>
            </Paper>
          ))}
        </List>
      )}

      {/* Export confirmation */}
      <ExportConfirmModal
        open={confirmOpen}
        people={selectedPeople}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmExport}
      />

      {/* Backdrop */}
      <Backdrop
        open={isSaving}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
        }}
      >
        {exportError ? (
          <>
            <ErrorIcon sx={{ fontSize: 60, color: "red" }} />
            <Box mt={2}>
              <Typography variant="h6" color="inherit">
                {exportStatus}
              </Typography>
            </Box>
          </>
        ) : saveDone ? (
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
                {exportStatus} {progress > 0 && `${progress}%`}
              </Typography>
            </Box>
          </>
        )}
        {exportError && (
          <Button
            variant="contained"
            onClick={() => {
              setIsSaving(false);
              setExportError(false);
              setExportStatus("");
              setProgress(0);
            }}
            sx={{ mt: 2 }}
          >
            Закрыть
          </Button>
        )}
      </Backdrop>

      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="small"
          onClick={scrollToTop}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>
    </Box>
  );
}
