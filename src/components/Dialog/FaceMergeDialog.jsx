import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  Autocomplete,
  TextField,
  CircularProgress,
  IconButton,
  Alert,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import { findDuplicatePersonClusters } from "../../utils/faceIndex";
import { rebuildReferencesFromDatabase } from "../../services/faceScanService";
import { getPersonLabel } from "../../utils/photoFaces";
import { DEFAULT_MATCH_THRESHOLD } from "../../services/faceRecognition";
import { useNotificationStore } from "../../store/useNotificationStore";

export default function FaceMergeDialog({
  open,
  onClose,
  allPeople = [],
  onMerged,
}) {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [selectedKeep, setSelectedKeep] = useState(null);
  const [activeCluster, setActiveCluster] = useState(null);

  const loadClusters = async () => {
    setLoading(true);
    try {
      const photos = await window.photoAPI.getAllGlobal();
      const found = findDuplicatePersonClusters(photos, DEFAULT_MATCH_THRESHOLD);
      setClusters(found);
      setActiveCluster(found[0] || null);
      if (found[0]) {
        const firstPerson = allPeople.find((p) => p.id === found[0].personIds[0]);
        setSelectedKeep(firstPerson || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadClusters();
    else {
      setClusters([]);
      setActiveCluster(null);
      setSelectedKeep(null);
    }
  }, [open]);

  const handleMerge = async () => {
    if (!activeCluster || !selectedKeep) return;

    setMerging(true);
    try {
      const removeIds = activeCluster.personIds.filter(
        (id) => id !== selectedKeep.id,
      );

      const result = await window.faceAPI.mergePersonIds(
        selectedKeep.id,
        removeIds,
      );

      await rebuildReferencesFromDatabase(allPeople);

      addNotification({
        title: "Объединение лиц",
        message: `Обновлено фото: ${result.updatedPhotos}, лиц: ${result.updatedFaces}`,
        type: "success",
        category: "faceReview",
      });

      onMerged?.();
      await loadClusters();
    } catch (e) {
      console.error(e);
    } finally {
      setMerging(false);
    }
  };

  const clusterPeople = activeCluster
    ? activeCluster.personIds
        .map((id) => allPeople.find((p) => p.id === id))
        .filter(Boolean)
    : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        <MergeTypeIcon sx={{ mr: 1 }} />
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
          Похожие лица — разные люди
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : clusters.length === 0 ? (
          <Alert severity="success">
            Кластеров с похожими лицами и разными подписями не найдено.
          </Alert>
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Найдено групп: {clusters.length}. Выберите правильного человека —
              остальные подписи будут заменены.
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {clusters.map((cluster) => (
                <Chip
                  key={cluster.id}
                  label={`${cluster.personIds.length} людей · ${cluster.entries.length} лиц`}
                  color={activeCluster?.id === cluster.id ? "primary" : "default"}
                  onClick={() => {
                    setActiveCluster(cluster);
                    const first = allPeople.find((p) => p.id === cluster.personIds[0]);
                    setSelectedKeep(first || null);
                  }}
                  variant={activeCluster?.id === cluster.id ? "filled" : "outlined"}
                />
              ))}
            </Stack>

            {activeCluster && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Текущие подписи в группе:
                </Typography>
                <Stack spacing={0.5}>
                  {clusterPeople.map((p) => (
                    <Typography key={p.id} variant="body2">
                      {p.id} — {getPersonLabel(p)} ({activeCluster.entries.filter((e) => e.personId === p.id).length} лиц)
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            <Autocomplete
              options={clusterPeople}
              value={selectedKeep}
              onChange={(_, v) => setSelectedKeep(v)}
              getOptionLabel={(p) => `${p.id} :: ${getPersonLabel(p)}`}
              renderInput={(params) => (
                <TextField {...params} label="Оставить этого человека" size="small" />
              )}
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
        <Button
          variant="contained"
          startIcon={<MergeTypeIcon />}
          disabled={!activeCluster || !selectedKeep || merging}
          onClick={handleMerge}
        >
          {merging ? "Объединение…" : "Объединить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
