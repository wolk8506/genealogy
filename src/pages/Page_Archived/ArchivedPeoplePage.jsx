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
  LinearProgress,
} from "@mui/material";
import {
  Archive as ArchiveIcon,
  People as PeopleIcon,
  Delete as DeleteIcon,
  RestoreFromTrash as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import PersonAvatar from "../../components/PersonAvatar";
import ExportConfirmModal from "../../components/ExportConfirmModal";
import { exportPeopleToZip } from "../utils/exportToZip";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Fab, Zoom } from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FolderIcon from "@mui/icons-material/Folder";
import PersonIcon from "@mui/icons-material/Person";

export default function ArchivePage() {
  const [people, setPeople] = useState([]);
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  // const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [exportStatus, setExportStatus] = useState("Подготовка архива...");
  const [exportError, setExportError] = useState(false);
  const [sizes, setSizes] = useState({});
  const [archiveProgress, setArchiveProgress] = useState({
    phase: "idle",
    percent: 0,
    processedFiles: 0,
    totalFiles: 0,
    currentFile: "",
    message: "",
    currentOwner: null, // Добавляем поле для имени текущего человека
  });

  // Логика расчета процентов как в SettingsPage
  const percentValue = (() => {
    const bytePct = archiveProgress?.percent ?? 0;
    if (typeof bytePct === "number" && bytePct > 0)
      return Math.max(0, Math.min(100, bytePct));

    if (archiveProgress?.totalFiles) {
      return Math.round(
        ((archiveProgress.processedFiles ?? 0) / archiveProgress.totalFiles) *
          100,
      );
    }
    return 0;
  })();

  // Вычисляем общий размер выбранных людей
  const totalSelectedSize = useMemo(() => {
    return selected
      .reduce((acc, id) => {
        // Извлекаем числовое значение размера из объекта sizes[id].data.size
        const personSize = parseFloat(sizes[id]?.size || 0);
        return acc + personSize;
      }, 0)
      .toFixed(2);
  }, [selected, sizes]);

  // Вычисляем общее количество фото выбранных людей
  const totalSelectedPhotos = useMemo(() => {
    return selected.reduce((acc, id) => {
      const personPhotos = parseInt(sizes[id]?.count || 0, 10);
      return acc + personPhotos;
    }, 0);
  }, [selected, sizes]);

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

  // --

  // Размер занимаемого места на диске человеком
  // 2. Функция для загрузки размеров всех отображаемых людей
  const loadSizes = async (peopleList) => {
    const newSizes = {};

    const sizePromises = peopleList.map(async (p) => {
      // Теперь здесь приходит объект { size, count }
      const data = await window.appAPI.getPersonFolderSize(p.id);
      return { id: p.id, data };
    });

    const results = await Promise.all(sizePromises);

    results.forEach(({ id, data }) => {
      newSizes[id] = data; // Сохраняем весь объект
      // console.log(id, data.size, data.count);
    });

    setSizes(newSizes);
  };

  const loadAll = async () => {
    const data = await window.peopleAPI.getAll();
    const sortedData = data || [];
    setPeople(sortedData);

    // 3. Запускаем подсчет размеров после загрузки списка людей
    loadSizes(sortedData);
  };
  // --

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
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleArchiveSelected = () => {
    // Не делайте getAll() здесь! У вас уже есть people в стейте.
    const toExport = people.filter((p) => selected.includes(p.id));
    setSelectedPeople(toExport);
    setConfirmOpen(true);
  };

  const handleConfirmExport = async () => {
    setConfirmOpen(false);
    setIsSaving(true); // Включили Backdrop
    setSaveDone(false);
    setExportError(false);
    setExportStatus("Подготовка архива...");

    try {
      const resultPath = await exportPeopleToZip({
        people: selectedPeople,
        filename: `Genealogy_selected_${Date.now()}.zip`,
        onProgress: (payload) => {
          if (typeof payload === "number") {
            setArchiveProgress((prev) => ({ ...prev, percent: payload }));
          } else {
            setArchiveProgress((prev) => ({ ...prev, ...payload }));
          }
        },
        onStatus: (msg) => setExportStatus(msg),
        onError: (errMsg) => {
          setExportStatus(errMsg);
          setExportError(true);
        },
      });

      // --- ВОТ ЭТОТ БЛОК ИСПРАВЛЯЕТ ПРОБЛЕМУ ---
      if (!resultPath) {
        // Если пользователь нажал "Отмена" в системном диалоге
        setIsSaving(false);
        setExportStatus("");
        return; // Просто выходим из функции
      }
      // -----------------------------------------

      setExportPath(resultPath);
      setSaveDone(true);
      setSelected([]);
      setExportStatus("✅ Архив сохранён");
    } catch (err) {
      console.error("Export error:", err);
      setExportStatus(`❌ Ошибка: ${err?.message || "Неизвестно"}`);
      setExportError(true);
      // В случае реальной ошибки Backdrop остается открытым,
      // чтобы пользователь нажал кнопку "Закрыть" сам.
    }
  };

  const handleToggleArchive = async (id, toArchive) => {
    await window.peopleAPI.update(id, { archived: toArchive });
    await loadAll();
    setSelected((prev) => prev.filter((x) => x !== id));
  };

  const handleDeleteForever = async (id) => {
    const now = new Date().toISOString();

    // 1) получить всех людей
    let all = await window.peopleAPI.getAll();
    const person = all.find((p) => p.id === id);
    if (!person) return;

    // 2) обновляем связи
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

    // 3) сохраняем обновлённые связи
    await window.peopleAPI.saveAll(all);

    // 4) удаляем самого человека
    await window.peopleAPI.delete(id);

    // 5) перезагружаем список
    await loadAll();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Tabs */}
      <Paper elevation={1} sx={{ mb: 2, borderRadius: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            icon={<PeopleIcon />}
            iconPosition="start"
            // label={`Активные ${search.length>0?(filteredActive.length || 0):''}:(${filteredActive.length || 0})`}
            label={`Активные ${
              search.length > 0
                ? `(${filteredActive.length || 0} из ${active.length})`
                : `(${active.length || 0})`
            } `}
          />
          <Tab
            icon={<RestoreIcon />}
            iconPosition="start"
            label={`В корзине (${archived.length || 0})`}
          />
        </Tabs>
      </Paper>

      {/* Action buttons */}
      {tab === 0 && (
        <Paper
          elevation={1}
          sx={{
            position: "sticky",
            borderRadius: 3,
            top: { xs: 56, sm: 64 },
            marginBottom: 2,
            zIndex: 10,
            p: 2,
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
          >
            <TextField
              label="Поиск по имени или ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ flexGrow: 1, minWidth: "200px" }}
            />

            {/* Статистика выбранного */}
            {selected.length > 0 && (
              <Box sx={{ textAlign: "right", px: 2, width: "210px" }}>
                <Typography
                  variant="caption"
                  display="block"
                  color="text.secondary"
                  sx={{
                    // fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  {selected.length > 1 ? (
                    <PeopleIcon sx={{ fontSize: "18px" }} />
                  ) : (
                    <PersonIcon sx={{ fontSize: "18px" }} />
                  )}
                  Выбрано: <b>{selected.length}</b>
                </Typography>
                <Typography
                  variant="caption"
                  display="block"
                  color="primary"
                  sx={{
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <FolderIcon sx={{ fontSize: 16 }} /> {totalSelectedSize} МБ
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <CameraAltIcon sx={{ fontSize: 16 }} />
                    {totalSelectedPhotos}
                  </span>
                </Typography>
              </Box>
            )}

            <Button
              variant="contained"
              startIcon={<ArchiveIcon />}
              disabled={!selected.length}
              onClick={handleArchiveSelected}
            >
              Экспорт выбранных
            </Button>

            <FormControlLabel
              control={
                <Checkbox
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onChange={handleToggleAll}
                />
              }
              label="Все"
            />
          </Stack>
        </Paper>
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
                  // primaryTypographyProps={{
                  //   fontSize: "1.2rem", // Увеличиваем размер (было примерно 1rem)
                  //   fontWeight: "bold", // Можно сделать жирным для акцента
                  //   color: "text.primary",
                  //   sx: { mb: 0.5 }, // Небольшой отступ снизу до вторичного текста
                  // }}
                  secondary={
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 3,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 18 }} />
                        ID: {p.id}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <CameraAltIcon sx={{ fontSize: 18 }} /> Фото в папке:{" "}
                        <b>{sizes[p.id]?.count ?? 0}</b>{" "}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <FolderIcon sx={{ fontSize: 18 }} /> Размер на диске:{" "}
                        <b>{sizes[p.id]?.size ?? "0.00"} МБ</b>
                      </span>
                    </Typography>
                  }
                  secondaryTypographyProps={{ component: "div" }}
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
          p: 3,
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(4px)",
        }}
      >
        {exportError ? (
          <Box sx={{ textAlign: "center" }}>
            <ErrorIcon sx={{ fontSize: 70, color: "#ff1744", mb: 2 }} />
            <Typography variant="h6">{exportStatus}</Typography>
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={() => setIsSaving(false)}
            >
              Закрыть
            </Button>
          </Box>
        ) : saveDone ? (
          <Box sx={{ textAlign: "center" }}>
            <CheckCircleIcon sx={{ fontSize: 70, color: "#4caf50", mb: 2 }} />
            <Typography variant="h6">Экспорт завершен!</Typography>
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={() => setIsSaving(false)}
            >
              Готово
            </Button>
          </Box>
        ) : (
          <Box sx={{ width: "100%", maxWidth: 500, textAlign: "center" }}>
            <CircularProgress color="inherit" sx={{ mb: 3 }} />

            <Typography variant="h6" sx={{ mb: 1 }}>
              {exportStatus}
            </Typography>

            {/* Имя текущего человека из прогресса */}
            {archiveProgress.currentOwner && (
              <Typography
                variant="subtitle1"
                sx={{ color: "#4fc3f7", fontWeight: "bold", mb: 2 }}
              >
                👤 Обработка: {archiveProgress.currentOwner}
              </Typography>
            )}

            <Box sx={{ width: "100%", mt: 1 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="body2">
                  Файлов: {archiveProgress.processedFiles || 0}
                  {archiveProgress.totalFiles
                    ? ` из ${archiveProgress.totalFiles}`
                    : ""}
                </Typography>
                <Typography variant="body2">{percentValue}%</Typography>
              </Stack>

              <LinearProgress
                variant="determinate"
                value={percentValue}
                sx={{ height: 10, borderRadius: 5, mb: 2 }}
              />

              <Typography
                variant="caption"
                sx={{ display: "block", opacity: 0.7, fontStyle: "italic" }}
              >
                {archiveProgress.currentFile ||
                  "Инициализация файловой системы..."}
              </Typography>
            </Box>
          </Box>
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
