import React, { useEffect, useState, useCallback } from "react";
import {
  Typography,
  Stack,
  Button,
  Box,
  IconButton,
  Tooltip,
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
import { Link as RouterLink, useNavigate } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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
import { btnStyleBlue, btnStyleRed } from "../../components/ButtonStyle";
import {
  groupSx,
  RowDivider,
  RowIcon,
  SettingsRow,
  sectionLabelSx,
} from "../Page_Settings/settingsUi";

const panelIconBtnSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "8px",
};

export default function ExternalEntityDetail({
  entityId,
  onDeleted,
  onSelectExternal,
  onEntityChanged,
  compact = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  const [entity, setEntity] = useState(null);
  const [allPeople, setAllPeople] = useState([]);
  const [allExternal, setAllExternal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [avatarRefresh, setAvatarRefresh] = useState(0);

  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const loadData = useCallback(async () => {
    if (!entityId) {
      setEntity(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [data, people, external] = await Promise.all([
      window.externalAPI.getById(entityId),
      window.peopleAPI.getAll(),
      window.externalAPI.getAll(),
    ]);
    setEntity(data);
    setAllPeople(people || []);
    setAllExternal(external || []);
    setLoading(false);
  }, [entityId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleArchive = async () => {
    const confirmed = window.confirm(
      `Переместить «${entity?.name}» в корзину?`,
    );
    if (!confirmed) return;
    await window.externalAPI.update(entityId, {
      archived: true,
      editedAt: new Date().toISOString(),
    });
    addNotification({
      timestamp: new Date().toISOString(),
      title: "Справочник",
      message: `«${entity?.name || entityId}» перемещена в корзину`,
      type: "warning",
      category: "trash",
      link: "/trash?tab=external",
    });
    onEntityChanged?.();
    onDeleted?.();
  };

  const handleSaved = () => {
    loadData();
    onEntityChanged?.();
  };

  if (!entityId) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary" variant="body2">
          Выберите запись из списка слева — здесь появятся подробности.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Stack alignItems="center" py={6}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (!entity) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary" variant="body2">
          Запись не найдена
        </Typography>
      </Box>
    );
  }

  const isPet = entity.type === "pet";

  return (
    <Box sx={{ p: compact ? 2 : { xs: 1, sm: 2 } }}>
      <Stack direction={compact ? "column" : { xs: "column", sm: "row" }} spacing={2}>
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
              size={compact ? 88 : 120}
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

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
          >
            {isPet ? (
              <PetsIcon color="secondary" />
            ) : (
              <PersonOutlineIcon color="primary" />
            )}
            <Typography variant={compact ? "h6" : "h4"} fontWeight={800}>
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

          {!compact && (
            <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap">
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => setEditOpen(true)}
                sx={{ ...btnStyleBlue }}
              >
                Редактировать
              </Button>
              <Button
                size="small"
                color="warning"
                startIcon={<DeleteOutlineIcon />}
                onClick={handleArchive}
                sx={{ ...btnStyleRed }}
              >
                В корзину
              </Button>
            </Stack>
          )}
        </Box>
      </Stack>

      {compact && (
        <Stack direction="row" spacing={0.75} sx={{ mt: 2 }}>
          <Tooltip title="Открыть страницу">
            <IconButton
              size="small"
              onClick={() => navigate(`/external/${entity.id}`)}
              sx={{
                ...panelIconBtnSx,
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Редактировать">
            <IconButton
              size="small"
              color="primary"
              onClick={() => setEditOpen(true)}
              sx={{
                ...panelIconBtnSx,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                borderColor: alpha(theme.palette.primary.main, 0.4),
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="В корзину">
            <IconButton
              size="small"
              color="warning"
              onClick={handleArchive}
              sx={{
                ...panelIconBtnSx,
                borderColor: alpha(theme.palette.error.main, 0.4),
                "&:hover": {
                  borderColor: "error.main",
                  bgcolor: alpha(theme.palette.error.main, 0.08),
                },
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )}

      {!compact &&
        (entity.notes ||
          entity.phone ||
          entity.email ||
          entity.address ||
          entity.birthday) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Контакты и информация
            </Typography>
            <Stack spacing={1.25}>
              {entity.notes && (
                <Typography
                  variant="body2"
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

      {compact &&
        (entity.notes ||
          entity.phone ||
          entity.email ||
          entity.address ||
          entity.birthday) && (
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={sectionLabelSx}>
              Контакты и информация
            </Typography>
            <Box sx={groupSx}>
              <Stack divider={<RowDivider />}>
                {!isPet && entity.phone && (
                  <SettingsRow
                    icon={
                      <RowIcon bg="green">
                        <PhoneIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title={entity.phone}
                    subtitle="Телефон"
                  />
                )}
                {!isPet && entity.email && (
                  <SettingsRow
                    icon={
                      <RowIcon bg="blue">
                        <EmailIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title={entity.email}
                    subtitle="Email"
                  />
                )}
                {!isPet && entity.address && (
                  <SettingsRow
                    icon={
                      <RowIcon bg="orange">
                        <HomeIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title={entity.address}
                    subtitle="Адрес"
                  />
                )}
                {entity.birthday && (
                  <SettingsRow
                    icon={
                      <RowIcon bg="pink">
                        <CakeIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title={entity.birthday}
                    subtitle="День рождения"
                  />
                )}
                {entity.notes && (
                  <Box sx={{ px: 2, py: 1.25 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      Заметки
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap", mt: 0.25 }}
                    >
                      {entity.notes}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Box>
        )}

      {!compact && <Divider sx={{ my: 2 }} />}

      {!compact && (
      <>
      <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
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
        <Stack spacing={1.25}>
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
                  p: 1.5,
                  borderRadius: "12px",
                  bgcolor: isDark
                    ? alpha(theme.palette.primary.main, 0.08)
                    : alpha(theme.palette.primary.main, 0.04),
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {getRelationTypeLabel(rel.relationType)}
                </Typography>
                {rel.targetKind === "external" ? (
                  external ? (
                    <Button
                      size="small"
                      onClick={() => onSelectExternal?.(external.id)}
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
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Период: {rel.dates}
                  </Typography>
                )}
                {rel.notes && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    {rel.notes}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      )}

      </>
      )}

      {compact && (
        <Box sx={{ mt: 2.5 }}>
          <Typography sx={sectionLabelSx}>
            Связи с родственниками
          </Typography>
          <Box sx={groupSx}>
            {(entity.relations || []).length === 0 ? (
              <SettingsRow
                icon={
                  <RowIcon bg="gray">
                    <LinkIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Связи не указаны"
              />
            ) : (
              <Stack divider={<RowDivider />}>
                {entity.relations.map((rel) => {
                  const person = findPersonById(
                    allPeople,
                    rel.mainPersonId,
                  );
                  const external = findExternalById(
                    allExternal,
                    rel.mainExternalEntityId,
                  );
                  let label;
                  let onClick;
                  if (rel.targetKind === "external") {
                    label = external
                      ? `${getExternalEntityLabel(external)} (${external.id})`
                      : `ID ${rel.mainExternalEntityId}`;
                    onClick = external
                      ? () => onSelectExternal?.(external.id)
                      : undefined;
                  } else {
                    label = person
                      ? `${getPersonLabel(person)} (ID ${person.id})`
                      : `ID ${rel.mainPersonId}`;
                    onClick = person
                      ? () => navigate(`/person/${person.id}`)
                      : undefined;
                  }
                  return (
                    <SettingsRow
                      key={rel.id}
                      icon={
                        <RowIcon bg="indigo">
                          <LinkIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title={getRelationTypeLabel(rel.relationType)}
                      subtitle={[
                        label,
                        rel.dates ? `Период: ${rel.dates}` : null,
                        rel.notes,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      onClick={onClick}
                      trailing={
                        onClick ? (
                          <ChevronRightIcon
                            sx={{ fontSize: 16, color: "text.disabled" }}
                          />
                        ) : undefined
                      }
                    />
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>
      )}

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
        onSaved={handleSaved}
      />

      <ExternalAvatarEditorDialog
        open={avatarEditorOpen}
        onClose={() => setAvatarEditorOpen(false)}
        entityId={entity.id}
        onSaved={() => {
          setAvatarEditorOpen(false);
          setAvatarRefresh((r) => r + 1);
          onEntityChanged?.();
        }}
      />
    </Box>
  );
}
