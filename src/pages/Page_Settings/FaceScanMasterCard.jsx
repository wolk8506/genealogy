import React, { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  Card,
  Slider,
  Alert,
  LinearProgress,
  FormControlLabel,
  Checkbox,
  Autocomplete,
  TextField,
  Chip,
} from "@mui/material";
import { useSnackbar } from "notistack";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import PauseIcon from "@mui/icons-material/Pause";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RateReviewIcon from "@mui/icons-material/RateReview";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useNotificationStore } from "../../store/useNotificationStore";
import { useFaceReviewStore } from "../../store/useFaceReviewStore";
import { DEFAULT_MATCH_THRESHOLD } from "../../services/faceRecognition";
import {
  runFaceScan,
  requestFaceScanCancel,
  requestFaceScanPause,
  resumeFaceScanPause,
  rebuildReferencesFromDatabase,
  ensureFaceReferencesReady,
} from "../../services/faceScanService";
import {
  countPendingReviewFaces,
  countNoFacePhotos,
  buildReviewQueue,
  buildNoFacesQueue,
  dismissPendingReviewOnFaces,
  normalizeFaces,
  syncPeopleFromFaces,
  syncExternalPeopleFromFaces,
} from "../../utils/photoFaces";
import { syncReferencesAfterPhotoSave } from "../../utils/faceIndex";
import CustomSwitch from "../../components/CustomSwitch";

async function persistPhotoFaces(
  currentItem,
  nextFaces,
  allPhotos,
  { dismissFromQueue = false } = {},
) {
  const normalized = normalizeFaces(nextFaces);
  const existing = allPhotos.find(
    (p) => p.id === currentItem.photoId && p.owner === currentItem.owner,
  );

  const updatedEntry = {
    ...existing,
    id: currentItem.photoId,
    filename: currentItem.filename,
    title: currentItem.title,
    owner: currentItem.owner,
    imageSize: currentItem.imageSize,
    faces: normalized,
    people: syncPeopleFromFaces(normalized, existing?.people || []),
    externalPeople: syncExternalPeopleFromFaces(
      normalized,
      existing?.externalPeople || [],
    ),
    faceScanNoFaces: dismissFromQueue
      ? false
      : normalized.length === 0
        ? existing?.faceScanNoFaces
        : false,
  };

  await window.photoAPI.addOrUpdateOwnerJson(currentItem.owner, updatedEntry);
  if (normalized.length > 0) {
    await syncReferencesAfterPhotoSave(
      { owner: currentItem.owner, id: currentItem.photoId },
      normalized,
    );
  }

  return updatedEntry;
}

export const FaceScanMasterCard = ({ cardStyle }) => {
  const { enqueueSnackbar } = useSnackbar();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const openReview = useFaceReviewStore((s) => s.openReview);
  const openNoFacesReview = useFaceReviewStore((s) => s.openNoFacesReview);
  const isReviewOpen = useFaceReviewStore((s) => s.open);
  const isNoFacesOpen = useFaceReviewStore((s) => s.noFacesOpen);
  const setPendingCount = useFaceReviewStore((s) => s.setPendingCount);
  const setNoFacesCount = useFaceReviewStore((s) => s.setNoFacesCount);

  const [view, setView] = useState("info");
  const [mode, setMode] = useState("identify");
  const [skipWithFaces, setSkipWithFaces] = useState(true);
  const [matchThreshold, setMatchThreshold] = useState(DEFAULT_MATCH_THRESHOLD);
  const [allPeople, setAllPeople] = useState([]);
  const [selectedOwners, setSelectedOwners] = useState([]);
  const [scope, setScope] = useState("all");
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    percent: 0,
    currentFile: "",
    facesFound: 0,
    status: "idle",
  });
  const [pendingReview, setPendingReview] = useState(0);
  const [noFacePhotos, setNoFacePhotos] = useState(0);
  const [rebuildingReferences, setRebuildingReferences] = useState(false);

  const refreshPendingCount = async () => {
    try {
      const photos = await window.photoAPI.getAllGlobal();
      const count = countPendingReviewFaces(photos);
      const noFaces = countNoFacePhotos(photos);
      setPendingReview(count);
      setNoFacePhotos(noFaces);
      setPendingCount(count);
      setNoFacesCount(noFaces);
    } catch {
      setPendingReview(0);
      setNoFacePhotos(0);
      setPendingCount(0);
      setNoFacesCount(0);
    }
  };

  useEffect(() => {
    window.peopleAPI
      ?.getAll?.()
      .then(setAllPeople)
      .catch(() => {});
    refreshPendingCount();
  }, []);

  useEffect(() => {
    if (!isReviewOpen && !isNoFacesOpen) {
      refreshPendingCount();
    }
  }, [isReviewOpen, isNoFacesOpen]);

  const handleClearQueue = async () => {
    try {
      const photos = await window.photoAPI.getAllGlobal();
      const queue = buildReviewQueue(photos);
      if (queue.length === 0) return;

      const confirmed = window.confirm(
        `Очистить очередь проверки (${pendingReview} лиц на ${queue.length} фото)? Неподписанные рамки останутся, но исчезнут из очереди.`,
      );
      if (!confirmed) return;

      for (const item of queue) {
        const nextFaces = dismissPendingReviewOnFaces(item.faces);
        await persistPhotoFaces(item, nextFaces, photos);
      }

      await refreshPendingCount();
      addNotification({
        title: "Очередь проверки",
        message: "Очередь очищена",
        type: "info",
        category: "faceReview",
      });
      enqueueSnackbar("Очередь проверки успешно очищена", { variant: "info" });
    } catch (e) {
      console.error(e);
      enqueueSnackbar("Не удалось очистить очередь", { variant: "error" });
    }
  };

  const handleClearNoFacesQueue = async () => {
    try {
      const photos = await window.photoAPI.getAllGlobal();
      const queue = buildNoFacesQueue(photos);
      if (queue.length === 0) return;

      const confirmed = window.confirm(
        `Очистить очередь «Фото без лиц» (${queue.length} фото)? Пропущенные снимки не будут показываться снова.`,
      );
      if (!confirmed) return;

      for (const item of queue) {
        await persistPhotoFaces(item, item.faces || [], photos, {
          dismissFromQueue: true,
        });
      }

      await refreshPendingCount();
      addNotification({
        title: "Фото без лиц",
        message: "Очередь очищена",
        type: "info",
        category: "faceReview",
      });
      enqueueSnackbar("Очередь «Фото без лиц» очищена", { variant: "info" });
    } catch (e) {
      console.error(e);
      enqueueSnackbar("Не удалось очистить очередь", { variant: "error" });
    }
  };

  const handleStartScan = async (resumeFromIndex = 0) => {
    setView("processing");
    setProgress({
      current: 0,
      total: 0,
      percent: 0,
      currentFile: "",
      facesFound: 0,
      status: "running",
    });

    try {
      const prep = await ensureFaceReferencesReady(allPeople);
      if (prep?.rebuilt) {
        enqueueSnackbar("Face references были пустыми и пересобраны", {
          variant: "info",
        });
      }

      const result = await runFaceScan(
        {
          mode,
          matchThreshold,
          scope: selectedOwners.length > 0 ? "owners" : scope,
          ownerIds: selectedOwners.map((p) => p.id),
          skipWithFaces,
          resumeFromIndex,
        },
        setProgress,
      );

      if (result?.cancelled) {
        enqueueSnackbar("Сканирование прервано", { variant: "info" });
        setView("settings");
        return;
      }

      if (result?.paused) {
        enqueueSnackbar("Сканирование приостановлено", { variant: "info" });
        return;
      }

      await refreshPendingCount();

      addNotification({
        title: "Распознавание лиц",
        message: `Обработано фото: ${result.processed}. Найдено лиц: ${result.facesFound}.${
          result.noFacePhotos
            ? ` Без лиц: ${result.noFacePhotos} — см. «Фото без лиц».`
            : ""
        }`,
        type: "success",
        category: "faceReview",
      });

      enqueueSnackbar(`Сканирование завершено: ${result.processed} фото`, {
        variant: "success",
      });
      setView("info");
    } catch (e) {
      console.error(e);
      enqueueSnackbar(e.message || "Ошибка сканирования", { variant: "error" });
      setView("settings");
    }
  };

  const handleRebuildReferences = async () => {
    setRebuildingReferences(true);
    try {
      const index = await rebuildReferencesFromDatabase(allPeople);
      const refs = Array.isArray(index?.references) ? index.references : [];
      const avatarCount = refs.filter((r) => r?.source === "avatar").length;
      const taggedCount = refs.filter((r) => r?.source === "tagged").length;
      const externalCount = refs.filter((r) => r?.externalEntityId).length;

      enqueueSnackbar(
        `Готово: ${refs.length} refs (avatar: ${avatarCount}, tagged: ${taggedCount}, external: ${externalCount})`,
        { variant: "success" },
      );
      addNotification({
        title: "Face references",
        message: `Пересобрано: ${refs.length} (avatar: ${avatarCount}, tagged: ${taggedCount}, external: ${externalCount})`,
        type: "success",
        category: "faceReview",
      });
    } catch (e) {
      console.error(e);
      enqueueSnackbar("Не удалось пересобрать face references", {
        variant: "error",
      });
    } finally {
      setRebuildingReferences(false);
    }
  };

  const handleResume = async () => {
    const scanState = await window.faceAPI?.getScanState?.();
    if (scanState?.resumeFromIndex != null) {
      resumeFaceScanPause();
      await handleStartScan(scanState.resumeFromIndex);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <FaceRetouchingNaturalIcon
          color="primary"
          sx={{ fontSize: 20, mr: 1.5 }}
        />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: 1,
          }}
        >
          {view === "info" && "Распознавание лиц"}
          {view === "settings" && "Настройки сканирования"}
          {view === "processing" && "Сканирование…"}
        </Typography>
      </Box>

      <Box sx={{ p: 3, flexGrow: 1, overflowY: "auto" }}>
        {view === "info" && (
          <Stack spacing={2} sx={{ height: "100%" }}>
            <Typography variant="body2" color="text.secondary">
              Локальное пакетное сканирование фото: поиск лиц и предложение
              подписей. Подтверждение — в очереди проверки.
            </Typography>

            {pendingReview > 0 && (
              <Alert severity="info">
                В очереди проверки: {pendingReview} лиц
              </Alert>
            )}

            {noFacePhotos > 0 && (
              <Alert severity="warning">
                Фото без лиц после сканирования: {noFacePhotos}
              </Alert>
            )}

            <Stack spacing={1.5} sx={{ mt: "auto" }}>
              <Button
                variant="outlined"
                startIcon={<DeleteSweepIcon />}
                onClick={handleRebuildReferences}
                disabled={rebuildingReferences}
                sx={{
                  height: 24,
                  borderRadius: "6px",
                  px: 2,
                  py: 1,
                  fontWeight: "bold",
                }}
              >
                {rebuildingReferences
                  ? "Пересборка face references..."
                  : "Пересобрать face references"}
              </Button>

              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={() => setView("settings")}
                sx={{
                  height: 24,
                  borderRadius: "6px",
                  px: 3,
                  py: 1,
                  boxShadow: "none",
                  fontWeight: "bold",
                }}
              >
                Настроить сканирование
              </Button>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<RateReviewIcon />}
                  disabled={pendingReview === 0}
                  onClick={openReview}
                  fullWidth
                  sx={{
                    height: 24,
                    borderRadius: "6px",
                    px: 2,
                    py: 1,
                    boxShadow: "none",
                    fontWeight: "bold",
                  }}
                >
                  Очередь проверки ({pendingReview})
                </Button>

                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<DeleteSweepIcon />}
                  disabled={pendingReview === 0}
                  onClick={handleClearQueue}
                  sx={{
                    height: 24,
                    borderRadius: "6px",
                    px: 2,
                    py: 1,
                    boxShadow: "none",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  Очистить
                </Button>
              </Stack>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<FaceRetouchingNaturalIcon />}
                  disabled={noFacePhotos === 0}
                  onClick={openNoFacesReview}
                  fullWidth
                  sx={{
                    height: 24,
                    borderRadius: "6px",
                    px: 2,
                    py: 1,
                    boxShadow: "none",
                    fontWeight: "bold",
                  }}
                >
                  Фото без лиц ({noFacePhotos})
                </Button>

                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<DeleteSweepIcon />}
                  disabled={noFacePhotos === 0}
                  onClick={handleClearNoFacesQueue}
                  sx={{
                    height: 24,
                    borderRadius: "6px",
                    px: 2,
                    py: 1,
                    boxShadow: "none",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  Очистить
                </Button>
              </Stack>
            </Stack>
          </Stack>
        )}

        {view === "settings" && (
          <Stack spacing={2.5}>
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => setView("info")}
              sx={{
                alignSelf: "flex-start",
                height: 24,
                borderRadius: "6px",
                px: 3,
                py: 1,
                boxShadow: "none",
                fontWeight: "bold",
              }}
            >
              Назад
            </Button>

            <Stack direction="row" spacing={1}>
              <Chip
                label="Только рамки"
                color={mode === "detect" ? "primary" : "default"}
                onClick={() => setMode("detect")}
                variant={mode === "detect" ? "filled" : "outlined"}
              />
              <Chip
                label="Рамки + подпись"
                color={mode === "identify" ? "primary" : "default"}
                onClick={() => setMode("identify")}
                variant={mode === "identify" ? "filled" : "outlined"}
              />
            </Stack>

             <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="body2">
                      Повторно сканировать только фото с неподтвержденными лицами
                    </Typography>
                    <CustomSwitch
                      checked={skipWithFaces}
                  onChange={(e) => setSkipWithFaces(e.target.checked)}
                    />
                  </Stack>



            {mode === "identify" && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Порог совпадения: {matchThreshold.toFixed(2)}
                </Typography>
                <Slider
                  value={matchThreshold}
                  min={0.3}
                  max={0.8}
                  step={0.05}
                  onChange={(_, v) => setMatchThreshold(v)}
                />
              </Box>
            )}

            <Autocomplete
              multiple
              options={allPeople}
              value={selectedOwners}
              onChange={(_, v) => setSelectedOwners(v)}
              getOptionLabel={(p) =>
                `${p.id} :: ${[p.firstName, p.lastName].filter(Boolean).join(" ")}`
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Только у выбранных людей (необязательно)"
                  size="small"
                />
              )}
            />

            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => handleStartScan(0)}
              sx={{
                height: 24,
                borderRadius: "6px",
                px: 3,
                py: 1,
                boxShadow: "none",
                fontWeight: "bold",
              }}
            >
              Запустить
            </Button>
          </Stack>
        )}

        {view === "processing" && (
          <Stack spacing={2}>
            <LinearProgress
              variant={progress.total > 0 ? "determinate" : "indeterminate"}
              value={progress.percent}
            />
            <Typography variant="body2">
              {progress.current} / {progress.total} ({progress.percent}%)
            </Typography>
            {progress.currentFile && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {progress.currentFile}
              </Typography>
            )}
            <Typography variant="caption">
              Найдено лиц: {progress.facesFound}
            </Typography>

            <Stack direction="row" spacing={1}>
              {progress.status === "paused" ? (
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleResume}
                  sx={{
                    height: 24,
                    borderRadius: "6px",
                    px: 3,
                    py: 1,
                    boxShadow: "none",
                    fontWeight: "bold",
                  }}
                >
                  Продолжить
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<PauseIcon />}
                  onClick={requestFaceScanPause}
                  disabled={progress.status !== "running"}
                  sx={{
                    height: 24,
                    borderRadius: "6px",
                    px: 3,
                    py: 1,
                    boxShadow: "none",
                    fontWeight: "bold",
                  }}
                >
                  Пауза
                </Button>
              )}
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopIcon />}
                onClick={requestFaceScanCancel}
                sx={{
                  height: 24,
                  borderRadius: "6px",
                  px: 3,
                  py: 1,
                  boxShadow: "none",
                  fontWeight: "bold",
                }}
              >
                Стоп
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </Card>
  );
};
