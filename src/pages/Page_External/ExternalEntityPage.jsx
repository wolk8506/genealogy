import React, { useEffect, useState } from "react";
import {
  Typography,
  Stack,
  Button,
  Paper,
  Box,
  IconButton,
  Divider,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import HomeIcon from "@mui/icons-material/Home";
import CakeIcon from "@mui/icons-material/Cake";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PetsIcon from "@mui/icons-material/Pets";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LinkIcon from "@mui/icons-material/Link";
import ExternalEntityAvatar from "../../components/ExternalEntityAvatar";
import AvatarPreviewDialog from "../../components/Dialog/AvatarPreviewDialog";
import AddExternalEntityDialog from "../../components/Dialog/AddExternalEntityDialog";
import ExternalAvatarEditorDialog from "../../components/Dialog/ExternalAvatarEditorDialog";
import { useNotificationStore } from "../../store/useNotificationStore";
import {
  getEntityTypeLabel,
  getExternalEntityLabel,
  getRelationTypeLabel,
  findExternalById,
  findPersonById,
} from "../../utils/externalEntities";

export default function ExternalEntityPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [entity, setEntity] = useState(null);
  const [allPeople, setAllPeople] = useState([]);
  const [allExternal, setAllExternal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [avatarRefresh, setAvatarRefresh] = useState(0);

  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const loadData = async () => {
    setLoading(true);
    const [data, people, external] = await Promise.all([
      window.externalAPI.getById(id),
      window.peopleAPI.getAll(),
      window.externalAPI.getAll(),
    ]);
    setEntity(data);
    setAllPeople(people || []);
    setAllExternal(external || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (!avatarOpen || !entity?.id) return;

    let isMounted = true;
    window.externalAPI.avatar.getPath(entity.id).then((path) => {
      if (!isMounted) return;
      setAvatarPreviewUrl(path ? `${path}?t=${Date.now()}` : null);
    });

    return () => {
      isMounted = false;
    };
  }, [avatarOpen, entity?.id]);

  const getPersonLabel = (p) =>
    [p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") ||
    `ID ${p.id}`;

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Удалить «${entity?.name}» из справочника?`,
    );
    if (!confirmed) return;
    await window.externalAPI.delete(id);
    addNotification({
      title: "Справочник",
      message: "Запись удалена",
      type: "info",
      category: "people",
    });
    navigate("/external");
  };

  if (loading) {
    return (
      <Stack alignItems="center" py={8}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!entity) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography>Запись не найдена</Typography>
        <Button onClick={() => navigate("/external")} sx={{ mt: 2 }}>
          К справочнику
        </Button>
      </Box>
    );
  }

  const isPet = entity.type === "pet";

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 800, mx: "auto" }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/external")}
        sx={{ mb: 2, borderRadius: "10px" }}
      >
        К справочнику
      </Button>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "20px",
          bgcolor: isDark ? "rgba(42,42,42,0.6)" : "#fff",
          border: "1px solid",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
          <Box sx={{ position: "relative", alignSelf: "flex-start" }}>
            <Box
              onClick={() => setAvatarOpen(true)}
              sx={{
                cursor: "pointer",
                display: "inline-flex",
                borderRadius: "50%",
                overflow: "hidden",
              }}
            >
              <ExternalEntityAvatar
                entityId={entity.id}
                entity={entity}
                size={120}
                refresh={avatarRefresh}
              />
            </Box>
            <IconButton
              size="small"
              onClick={() => setAvatarOpen(true)}
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                bgcolor: "primary.main",
                color: "#fff",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              <PhotoCameraIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              {isPet ? (
                <PetsIcon color="secondary" />
              ) : (
                <PersonOutlineIcon color="primary" />
              )}
              <Typography variant="h4" fontWeight={800}>
                {entity.name}
              </Typography>
              <Chip label={getEntityTypeLabel(entity.type)} size="small" />
            </Stack>

            <Typography
              variant="caption"
              sx={{
                mt: 1,
                display: "inline-block",
                px: 1,
                py: 0.3,
                borderRadius: "6px",
                fontFamily: "monospace",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {entity.id}
            </Typography>

            <Stack direction="row" spacing={1} mt={2}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditOpen(true)}
                sx={{
                      height: 24,
                      borderRadius: "6px",
                      px: 2.5,
                      fontWeight: "bold",
                    }}
              >
                Редактировать
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<DeleteOutlineIcon />}
                onClick={handleDelete}
                sx={{
                      height: 24,
                      borderRadius: "6px",
                      px: 2.5,
                      fontWeight: "bold",
                    }}
              >
                Удалить
              </Button>
            </Stack>
          </Box>
        </Stack>

        {(entity.notes || entity.phone || entity.email || entity.address || entity.birthday) && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Контакты и информация
            </Typography>
            <Stack spacing={1.25}>
              {entity.notes && (
                <Typography
                  variant="body1"
                  sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}
                >
                  {entity.notes}
                </Typography>
              )}
              {!isPet && entity.phone && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography variant="body2">{entity.phone}</Typography>
                </Stack>
              )}
              {!isPet && entity.email && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <EmailIcon fontSize="small" color="action" />
                  <Typography variant="body2">{entity.email}</Typography>
                </Stack>
              )}
              {!isPet && entity.address && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <HomeIcon fontSize="small" color="action" />
                  <Typography variant="body2">{entity.address}</Typography>
                </Stack>
              )}
              {entity.birthday && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CakeIcon fontSize="small" color="action" />
                  <Typography variant="body2">{entity.birthday}</Typography>
                </Stack>
              )}
            </Stack>
          </>
        )}

        <Divider sx={{ my: 3 }} />

        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <LinkIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight={700}>
            Связи с родственниками
          </Typography>
        </Stack>

        {(entity.relations || []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Связи не указаны
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {entity.relations.map((rel) => {
              const person = findPersonById(allPeople, rel.mainPersonId);
              const external = findExternalById(
                allExternal,
                rel.mainExternalEntityId,
              );
              return (
                <Box
                  key={rel.id}
                  sx={{
                    p: 2,
                    borderRadius: "12px",
                    bgcolor: isDark
                      ? alpha(theme.palette.primary.main, 0.08)
                      : alpha(theme.palette.primary.main, 0.04),
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {getRelationTypeLabel(rel.relationType)}
                      </Typography>
                      {rel.targetKind === "external" ? (
                        external ? (
                          <Button
                            component={RouterLink}
                            to={`/external/${external.id}`}
                            size="small"
                            sx={{ p: 0, mt: 0.5, textTransform: "none" }}
                          >
                            {getExternalEntityLabel(external)} ({external.id})
                          </Button>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            ID {rel.mainExternalEntityId}
                          </Typography>
                        )
                      ) : person ? (
                        <Button
                          component={RouterLink}
                          to={`/person/${person.id}`}
                          size="small"
                          sx={{ p: 0, mt: 0.5, textTransform: "none" }}
                        >
                          {getPersonLabel(person)} (ID {person.id})
                        </Button>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          ID {rel.mainPersonId}
                        </Typography>
                      )}
                      {rel.dates && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Период: {rel.dates}
                        </Typography>
                      )}
                      {rel.notes && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {rel.notes}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>

      <AvatarPreviewDialog
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        imageUrl={avatarPreviewUrl}
        alt={entity.name || "Аватар"}
        onEdit={() => {
          setAvatarOpen(false);
          setAvatarEditorOpen(true);
        }}
      />

      <AddExternalEntityDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        entity={entity}
        onSaved={loadData}
      />

      <ExternalAvatarEditorDialog
        open={avatarEditorOpen}
        onClose={() => setAvatarEditorOpen(false)}
        entityId={entity.id}
        onSaved={() => {
          setAvatarEditorOpen(false);
          setAvatarRefresh((r) => r + 1);
        }}
      />
    </Box>
  );
}
