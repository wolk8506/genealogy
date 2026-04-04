import React, { useEffect, useState } from "react";
import {
  Avatar,
  ListItemAvatar,
  ListItemText,
  Typography,
  Stack,
  Button,
  ListItemButton,
  useTheme,
  Paper,
  Tooltip,
  Chip,
  alpha,
  Box,
} from "@mui/material";

import SellIcon from "@mui/icons-material/Sell";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import DescriptionIcon from "@mui/icons-material/Description";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import { Link } from "react-router-dom";
import { useSettingsStore } from "../../store/useSettingsStore";
// 1. Импортируем стор меток
import { useTagsStore } from "../../store/useTagsStore";
import TagManagementDialog from "./TagManagementDialog";

function PersonAvatar({ foto, initials }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (foto) window.avatarAPI.getPath(foto).then(setSrc);
  }, [foto]);
  return (
    <Avatar src={src}>{!src && initials?.slice(0, 2).toUpperCase()}</Avatar>
  );
}

export const PersonCard = ({
  person,
  stats,
  onDelete,
  onRestore,
  onDeleteForever,
  isArchived = false,
  size = "full",
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isSmall = size === "small";

  const appSettings = useSettingsStore((state) => state.appSettings);

  // 2. Достаем метки конкретно для этого человека
  const tagsDict = useTagsStore((state) => state.tags);
  // Забираем как есть (может быть undefined)
  const myTagIdsRaw = useTagsStore((state) => state.personTags[person.id]);
  // Подставляем массив уже ВНЕ селектора
  const myTagIds = myTagIdsRaw || [];

  // Собираем полные объекты меток для отрисовки
  const myTags = myTagIds
    .map((id) => tagsDict.find((t) => t.id === id))
    .filter(Boolean); // отсекаем null, если метка была удалена из справочника

  const isRecent = (dateStr) => {
    if (!dateStr) return false;
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    return diff >= 0 && diff < appSettings.newLabelDuration * 60 * 60 * 1000;
  };

  const name =
    [person.firstName, person.lastName || person.maidenName]
      .filter(Boolean)
      .join(" ") || "Без имени";
  const initials =
    (person.firstName?.[0] || "") +
    (person.lastName?.[0] || person.maidenName?.[1] || "");

  const createdToday = isRecent(person.createdAt);
  const editedToday = isRecent(person.editedAt);
  const showBadge = createdToday || editedToday;

  return (
    <ListItemButton
      component={Link}
      to={`/person/${person.id}`}
      // disableRipple
      sx={{
        p: 0,
        borderRadius: "16px",
        width: "100%",
        display: "flex",
        "&.MuiButtonBase-root": { alignItems: "stretch" },

        border: "1px solid",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        // borderColor: "transparent",
        transition: "transform 0.2s, box-shadow 0.2s, background-color 0.2s",
        "&:hover": {
          transform: isSmall ? "none" : "translateY(-4px)",
          boxShadow: isDark
            ? "0 12px 24px rgba(0,0,0,0.4)"
            : "0 8px 16px rgba(0,0,0,0.05)",
          borderColor: "primary.main",
          bgcolor: isDark ? "rgba(42, 42, 42, 0.8)" : "#fff",
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          flexGrow: 1,
          width: "100%",
          display: "flex",
          alignItems: "center",
          p: isSmall ? 1 : 1.5,
          borderRadius: "16px",
          bgcolor: isDark ? "rgba(42, 42, 42, 0.6)" : "#fff",
          // border: "1px solid",
          // borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          // transition: "all 0.3s",
          // transition: "transform 0.2s, box-shadow 0.2s, background-color 0.2s",
          // "&:hover": {
          //   transform: isSmall ? "none" : "translateY(-4px)",
          //   boxShadow: isDark
          //     ? "0 12px 24px rgba(0,0,0,0.4)"
          //     : "0 8px 16px rgba(0,0,0,0.05)",
          //   borderColor: "primary.main",
          //   bgcolor: isDark ? "rgba(42, 42, 42, 0.8)" : "#fff",
          // },
        }}
      >
        <ListItemAvatar sx={{ minWidth: isSmall ? 52 : 64 }}>
          <PersonAvatar foto={person.id} initials={initials} />
        </ListItemAvatar>

        <ListItemText
          primaryTypographyProps={{ component: "div" }}
          secondaryTypographyProps={{ component: "div" }}
          primary={
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              flexWrap="wrap"
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: isSmall ? "0.95rem" : "1.1rem",
                }}
              >
                {name}
              </Typography>

              {showBadge && (
                <Chip
                  size="small"
                  label={createdToday ? "Новый" : "Изменен"}
                  color={createdToday ? "success" : "info"}
                  sx={{ height: 18, fontSize: "9px", ml: 1 }}
                />
              )}
            </Stack>
          }
          secondary={
            <Stack
              direction="row"
              spacing={isSmall ? 1 : 2}
              mt={0.5}
              component="div"
              alignItems="center"
            >
              <Typography
                variant="caption"
                component="span"
                sx={{
                  px: 0.8,
                  py: 0.2,
                  borderRadius: "6px",
                  fontFamily: "monospace",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                ID {person.id}
              </Typography>
              {!isSmall && stats?.hasBio && (
                <DescriptionIcon
                  sx={{ fontSize: 16, color: "primary.main", opacity: 0.7 }}
                />
              )}
              {stats?.count > 0 && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ color: "info.main" }}
                  component="span"
                >
                  <PhotoLibraryIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                  {!isSmall && (
                    <Typography variant="caption" fontWeight="800">
                      {stats.count}
                    </Typography>
                  )}
                </Stack>
              )}
            </Stack>
          }
        />

        {/* Блок кнопок в зависимости от статуса (Корзина или Нет) */}
        <Box
          sx={{
            ml: "auto",
            display: "flex",
            gap: 3,
            alignItems: "center",
            position: "relative",
            zIndex: 10,
          }}
          // onClick={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation(); // КРИТИЧНО: чтобы ListItemButton не думал, что на него нажали
          }}
          onMouseDown={(e) => {
            e.stopPropagation(); // Это не даст карточке перейти в состояние :active
          }}
        >
          {/* ... твой код кнопок без изменений ... */}
          {/* 3. Отрисовка стопки меток */}
          {!isSmall && (
            <>
              {myTags.length > 0 && (
                <Stack direction="row" sx={{ ml: 1 }}>
                  {myTags.map((tag, index) => (
                    <Tooltip
                      key={tag.id}
                      title={tag.name}
                      arrow
                      placement="top"
                    >
                      <SellIcon
                        sx={{
                          color: tag.color,
                          marginLeft: index > 0 ? "-12px" : "0", // Наложение друг на друга
                          zIndex: myTags.length + index, // Чтобы левые были поверх правых
                        }}
                      />
                    </Tooltip>
                  ))}
                </Stack>
              )}
              <TagManagementDialog personId={person.id} />
            </>
          )}

          {!isArchived ? (
            <Button
              size="small"
              color="warning"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(person.id);
              }}
              startIcon={<DeleteIcon sx={{ fontSize: 18 }} />}
              sx={{
                px: isSmall ? 1 : 2,
                borderRadius: "10px",
                fontWeight: 700,
                opacity: isSmall ? 0.2 : 0.5,
                "&:hover": {
                  opacity: 1,
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                },
              }}
            >
              {!isSmall && "В корзину"}
            </Button>
          ) : (
            <>
              {/* Кнопки для корзины (оставил как было) */}
              <Button
                size="small"
                color="success"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRestore(person.id);
                }}
                startIcon={<RestoreFromTrashIcon sx={{ fontSize: 18 }} />}
                sx={{
                  borderRadius: "10px",
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.success.main, 0.05),
                  "&:hover": {
                    bgcolor: alpha(theme.palette.success.main, 0.15),
                  },
                }}
              >
                {!isSmall && "Восстановить"}
              </Button>
              <Button
                size="small"
                color="error"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeleteForever(person.id);
                }}
                startIcon={<DeleteForeverIcon sx={{ fontSize: 18 }} />}
                sx={{
                  borderRadius: "10px",
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.error.main, 0.05),
                  "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.15) },
                }}
              >
                {!isSmall && "Удалить"}
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </ListItemButton>
  );
};
