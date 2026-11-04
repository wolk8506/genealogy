// layout/GenealogyTreeInspector.jsx
import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Stack,
  Typography,
  Avatar,
  IconButton,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  inspectorDrawerTransitionProps,
  inspectorPaperSx,
} from "./inspectorPanelTransition";
import {
  groupSx,
  RowDivider,
  RowIcon,
  SettingsRow,
  sectionLabelSx,
} from "../pages/Page_Settings/settingsUi";

function PersonRowAvatar({ personId, initials }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    window.avatarAPI
      ?.getPath(personId)
      .then((path) => setSrc(path ? `${path}?t=${Date.now()}` : null))
      .catch(() => {});
  }, [personId]);
  return (
    <Avatar src={src} sx={{ width: 32, height: 32, fontSize: "0.8rem" }}>
      {!src && (initials || "?")}
    </Avatar>
  );
}

export default function GenealogyTreeInspector({
  open,
  onClose,
  personId,
  allPeople,
  onFocusPerson,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  const [avatarSrc, setAvatarSrc] = useState(null);

  const person = (allPeople || []).find(
    (p) => String(p.id) === String(personId),
  );

  useEffect(() => {
    if (personId) {
      window.avatarAPI
        ?.getPath(personId)
        .then((path) => setAvatarSrc(path ? `${path}?t=${Date.now()}` : null))
        .catch(() => setAvatarSrc(null));
    }
  }, [personId]);

  if (!person) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        variant="persistent"
        {...inspectorDrawerTransitionProps}
        PaperProps={{
          sx: {
            top: 50,
            height: "calc(100% - 50px)",
            ...inspectorPaperSx,
            borderLeft: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <Box
          sx={{
            width: 340,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            p: 2,
          }}
        >
          <Typography color="text.secondary" variant="body2">
            Выберите человека в дереве для просмотра информации
          </Typography>
        </Box>
      </Drawer>
    );
  }

  const initials = `${person.firstName?.[0] || ""}${
    person.lastName?.[0] || person.maidenName?.[0] || ""
  }`.toUpperCase();

  const personName = (p) =>
    [p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") ||
    "Без имени";

  const byId = new Map((allPeople || []).map((p) => [String(p.id), p]));
  const pick = (ids) =>
    (Array.isArray(ids) ? ids : [ids])
      .filter((id) => id != null && id !== "")
      .map((id) => byId.get(String(id)))
      .filter(Boolean);

  const parents = pick([person.father, person.mother]);
  const spouses = pick(person.spouse);
  const children = pick(person.children);
  const siblings = pick(person.siblings);

  const genderIcon =
    person.gender === "male" ? (
      <MaleIcon sx={{ fontSize: 18 }} />
    ) : person.gender === "female" ? (
      <FemaleIcon sx={{ fontSize: 18 }} />
    ) : (
      <PersonIcon sx={{ fontSize: 18 }} />
    );

  const genderColor =
    person.gender === "male"
      ? "cyan"
      : person.gender === "female"
        ? "pink"
        : "gray";

  const formatDate = (date) => {
    if (!date) return "—";
    return date;
  };

  // Пустые категории родственников не показываем: человек без детей
  // не должен видеть заглушку «Не указано».
  const renderRelationGroup = (title, people) => {
    if (!people.length) return null;
    return (
      <Box>
        <Typography sx={sectionLabelSx}>{title}</Typography>
        <Box sx={groupSx}>
          <Stack divider={<RowDivider />}>
            {people.map((p) => (
              <SettingsRow
                key={p.id}
                icon={
                  <PersonRowAvatar
                    personId={p.id}
                    initials={`${p.firstName?.[0] || ""}${
                      p.lastName?.[0] || p.maidenName?.[0] || ""
                    }`}
                  />
                }
                title={personName(p)}
                onClick={() =>
                  onFocusPerson
                    ? onFocusPerson(p.id)
                    : navigate(`/person/${p.id}`)
                }
              />
            ))}
          </Stack>
        </Box>
      </Box>
    );
  };

  const hasRelatives =
    parents.length > 0 ||
    spouses.length > 0 ||
    children.length > 0 ||
    siblings.length > 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="persistent"
      {...inspectorDrawerTransitionProps}
      PaperProps={{
        sx: {
          top: 50,
          height: "calc(100% - 50px)",
          ...inspectorPaperSx,
          borderLeft: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <Box
        sx={{
          width: 340,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Контент */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
          {/* Карточка человека */}
          <Box sx={groupSx}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
              }}
            >
              <Avatar
                src={avatarSrc}
                sx={{ width: 56, height: 56, fontSize: "1.25rem" }}
              >
                {!avatarSrc && initials}
              </Avatar>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {personName(person)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.25 }}
                >
                  Поколение {person.generation ?? "—"}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Stack spacing={1.5}>
              <SettingsRow
                icon={<RowIcon bg={genderColor}>{genderIcon}</RowIcon>}
                title="Пол"
                trailing={
                  <Typography variant="body2" color="text.secondary">
                    {person.gender === "male"
                      ? "Мужской"
                      : person.gender === "female"
                        ? "Женский"
                        : "Не указан"}
                  </Typography>
                }
              />

              <SettingsRow
                icon={
                  <RowIcon bg="blue">
                    <CalendarIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Дата рождения"
                trailing={
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(person.birthday)}
                  </Typography>
                }
              />

              {person.death && (
                <SettingsRow
                  icon={
                    <RowIcon bg="gray">
                      <CalendarIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Дата смерти"
                  trailing={
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(person.death)}
                    </Typography>
                  }
                />
              )}
            </Stack>
          </Box>

          {/* Родственники */}
          {hasRelatives && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              {renderRelationGroup("Родители", parents)}
              {renderRelationGroup("Супруги", spouses)}
              {renderRelationGroup("Дети", children)}
              {renderRelationGroup("Братья и сёстры", siblings)}
            </Stack>
          )}
        </Box>

        {/* Кнопка перехода на страницу */}
        <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <SettingsRow
            icon={
              <RowIcon bg="indigo">
                <PersonIcon sx={{ fontSize: 18 }} />
              </RowIcon>
            }
            title="Открыть полную карточку"
            onClick={() => navigate(`/person/${person.id}`)}
            trailing={
              <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
            }
          />
        </Box>
      </Box>
    </Drawer>
  );
}
