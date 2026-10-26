import React, { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Card,
  Slider,
  LinearProgress,
  Autocomplete,
  TextField,
  Divider,
  CircularProgress,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import PauseIcon from "@mui/icons-material/Pause";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RateReviewIcon from "@mui/icons-material/RateReview";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import RefreshIcon from "@mui/icons-material/Refresh";
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
import AppButton from "../../components/AppButton";
import {
  groupSx,
  sectionLabelSx,
  RowIcon,
  RowDivider,
  SettingsRow,
  SegmentedControl,
  CountBadge,
  chevron,
} from "./settingsUi";

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
  const navigate = useNavigate();
  const addNotification = useNotificationStore((s) => s.addNotification);
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

  const title =
    view === "info"
      ? "Распознавание лиц"
      : view === "settings"
      ? "Настройки сканирования"
      : "Сканирование…";

  const subtitle =
    view === "info"
      ? "Локальный поиск и подписи лиц на фото"
      : view === "settings"
      ? "Параметры поиска лиц"
      : "Идёт обработка фотографий";

  return (
    <Card
      variant="outlined"
      sx={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: "18px",
        border: "none",
        bgcolor: "transparent",
        boxShadow: "none",
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <RowIcon bg="blue">
          <FaceRetouchingNaturalIcon sx={{ fontSize: 18 }} />
        </RowIcon>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            noWrap
          >
            {subtitle}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2, flexGrow: 1, overflowY: "auto" }}>
        {view === "info" && (
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={sectionLabelSx}>Очереди</Typography>
              <Box sx={groupSx}>
                <Stack divider={<RowDivider />}>
                  <SettingsRow
                    icon={
                      <RowIcon bg="blue">
                        <RateReviewIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title="Очередь проверки"
                    subtitle="Лица, ожидающие подтверждения"
                    trailing={
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                      >
                        <CountBadge value={pendingReview} />
                        {chevron}
                      </Stack>
                    }
                    onClick={() => navigate("/settings/faces/review")}
                  />
                  {pendingReview > 0 && (
                    <SettingsRow
                      danger
                      icon={
                        <RowIcon bg="red">
                          <DeleteSweepIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title="Очистить очередь проверки"
                      onClick={handleClearQueue}
                    />
                  )}
                  <SettingsRow
                    icon={
                      <RowIcon bg="orange">
                        <FaceRetouchingNaturalIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title="Фото без лиц"
                    subtitle="Снимки, где лица не найдены"
                    trailing={
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                      >
                        <CountBadge value={noFacePhotos} />
                        {chevron}
                      </Stack>
                    }
                    onClick={() => navigate("/settings/faces/no-faces")}
                  />
                  {noFacePhotos > 0 && (
                    <SettingsRow
                      danger
                      icon={
                        <RowIcon bg="red">
                          <DeleteSweepIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title="Очистить фото без лиц"
                      onClick={handleClearNoFacesQueue}
                    />
                  )}
                </Stack>
              </Box>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Действия</Typography>
              <Box sx={groupSx}>
                <Stack divider={<RowDivider />}>
                  <SettingsRow
                    icon={
                      <RowIcon bg="green">
                        <PlayArrowIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title="Настроить сканирование"
                    subtitle="Режим, порог и область поиска"
                    trailing={chevron}
                    onClick={() => setView("settings")}
                  />
                  <SettingsRow
                    icon={
                      <RowIcon bg="gray">
                        <RefreshIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title="Пересобрать face references"
                    subtitle="Обновить эталонные дескрипторы"
                    disabled={rebuildingReferences}
                    onClick={handleRebuildReferences}
                    trailing={
                      rebuildingReferences ? (
                        <CircularProgress size={16} />
                      ) : (
                        chevron
                      )
                    }
                  />
                </Stack>
              </Box>
            </Box>
          </Stack>
        )}

        {view === "settings" && (
          <Stack spacing={2.5}>
            <AppButton
              preset="ghost"
              startIcon={<ArrowBackIcon />}
              onClick={() => setView("info")}
              sx={{ alignSelf: "flex-start", ml: -0.5, color: "text.secondary" }}
            >
              Назад
            </AppButton>

            <Box>
              <Typography sx={sectionLabelSx}>Режим</Typography>
              <Box sx={groupSx}>
                <Box sx={{ p: 1 }}>
                  <SegmentedControl
                    value={mode}
                    onChange={setMode}
                    options={[
                      { value: "detect", label: "Только рамки" },
                      { value: "identify", label: "Рамки + подпись" },
                    ]}
                  />
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Параметры</Typography>
              <Box sx={groupSx}>
                <Stack divider={<Divider sx={{ ml: 2 }} />}>
                  <Box
                    sx={{
                      px: 2,
                      py: 1.4,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ flexGrow: 1, lineHeight: 1.35 }}
                    >
                      Повторно сканировать только фото с неподтвержденными
                      лицами
                    </Typography>
                    <CustomSwitch
                      checked={skipWithFaces}
                      onChange={(e) => setSkipWithFaces(e.target.checked)}
                    />
                  </Box>
                  {mode === "identify" && (
                    <Box sx={{ px: 2, py: 1.4 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="baseline"
                      >
                        <Typography variant="body2" fontWeight={600}>
                          Порог совпадения
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {matchThreshold.toFixed(2)}
                        </Typography>
                      </Stack>
                      <Slider
                        value={matchThreshold}
                        min={0.3}
                        max={0.8}
                        step={0.05}
                        onChange={(_, v) => setMatchThreshold(v)}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  )}
                </Stack>
              </Box>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Область поиска</Typography>
              <Box sx={groupSx}>
                <Box sx={{ p: 1.5 }}>
                  <Autocomplete
                    multiple
                    options={allPeople}
                    value={selectedOwners}
                    onChange={(_, v) => setSelectedOwners(v)}
                    getOptionLabel={(p) =>
                      `${p.id} :: ${[p.firstName, p.lastName]
                        .filter(Boolean)
                        .join(" ")}`
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Только у выбранных людей"
                        size="small"
                        sx={{
                          "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                        }}
                      />
                    )}
                  />
                </Box>
              </Box>
            </Box>

            <AppButton
              preset="primary"
              startIcon={<PlayArrowIcon />}
              onClick={() => handleStartScan(0)}
              sx={{ fontWeight: 600 }}
            >
              Запустить сканирование
            </AppButton>
          </Stack>
        )}

        {view === "processing" && (
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={sectionLabelSx}>Прогресс</Typography>
              <Box sx={groupSx}>
                <Box sx={{ p: 2 }}>
                  <LinearProgress
                    variant={
                      progress.total > 0 ? "determinate" : "indeterminate"
                    }
                    value={progress.percent}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mt: 1.5 }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {progress.current} / {progress.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {progress.percent}%
                    </Typography>
                  </Stack>
                  {progress.currentFile && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      display="block"
                      sx={{ mt: 0.5 }}
                    >
                      {progress.currentFile}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 1 }}
                  >
                    Найдено лиц: {progress.facesFound}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Stack direction="row" spacing={1}>
              {progress.status === "paused" ? (
                <AppButton
                  preset="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleResume}
                  sx={{ flex: 1 }}
                >
                  Продолжить
                </AppButton>
              ) : (
                <AppButton
                  preset="secondary"
                  startIcon={<PauseIcon />}
                  onClick={requestFaceScanPause}
                  disabled={progress.status !== "running"}
                  sx={{ flex: 1 }}
                >
                  Пауза
                </AppButton>
              )}
              <AppButton
                preset="dangerOutlined"
                startIcon={<StopIcon />}
                onClick={requestFaceScanCancel}
                sx={{ flex: 1 }}
              >
                Стоп
              </AppButton>
            </Stack>
          </Stack>
        )}
      </Box>
    </Card>
  );
};
