import React, { useEffect, useRef, useState } from "react";
import {
  Drawer,
  Box,
  Stack,
  Typography,
  Avatar,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CelebrationIcon from "@mui/icons-material/Celebration";
import BarChartIcon from "@mui/icons-material/BarChart";
import GroupsIcon from "@mui/icons-material/Groups";
import PeopleIcon from "@mui/icons-material/People";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DescriptionIcon from "@mui/icons-material/Description";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import EventIcon from "@mui/icons-material/Event";
import ContactsIcon from "@mui/icons-material/Contacts";
import { useNavigate } from "react-router-dom";
import usePhotoThumbs from "../hooks/usePhotoThumbs";
import PhotoFullscreenViewer from "../components/PhotoFullscreenViewer";
import { formatYearsAgo } from "../hooks/useMemories";
import {
  groupSx,
  RowDivider,
  RowIcon,
  SettingsRow,
  sectionLabelSx,
} from "../pages/Page_Settings/settingsUi";
import {
  inspectorDrawerTransitionProps,
  inspectorPaperSx,
} from "./inspectorPanelTransition";

function PersonHeader({ personId, allPeople, onFocusPerson }) {
  const navigate = useNavigate();
  const [src, setSrc] = useState(null);
  const person = (allPeople || []).find(
    (p) => String(p.id) === String(personId),
  );
  useEffect(() => {
    window.avatarAPI
      ?.getPath(personId)
      .then((path) => setSrc(path ? `${path}?t=${Date.now()}` : null))
      .catch(() => {});
  }, [personId]);
  if (!person) return null;
  const initials = `${person.firstName?.[0] || ""}${person.lastName?.[0] || person.maidenName?.[0] || ""}`
    .toUpperCase();
  return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 1.5,
          py: 1.25,
        }}
      >
      <Avatar src={src} sx={{ width: 44, height: 44, fontSize: "1rem" }}>
        {!src && (initials || "?")}
      </Avatar>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          variant="body1"
          sx={{ fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {`${[person.firstName, person.lastName || person.maidenName].filter(Boolean).join(" ")}`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Поколение {person.generation ?? "—"}
        </Typography>
      </Box>
      <IconButton
        size="small"
        title="Открыть страницу человека"
        onClick={() => navigate(`/person/${personId}`)}
        sx={{ color: "text.secondary" }}
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

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

function ownerNameOf(allPeople, ownerId) {  const u = (allPeople || []).find((x) => x.id === ownerId);
  return u
    ? `${u.lastName || u.maidenName || ""} ${u.firstName || ""}`.trim() ||
        "Неизвестно"
    : "Неизвестно";
}

function MemoriesTab({ groups, allPeople }) {
  const navigate = useNavigate();
  const { thumbs, fetchThumb } = usePhotoThumbs();
  const [fullscreen, setFullscreen] = useState(false);
  const [fullIndex, setFullIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(0);
  const [fullPaths, setFullPaths] = useState({});
  const pendingFull = useRef(new Set());

  const flatPhotos = React.useMemo(
    () => groups.flatMap((g) => g.photos),
    [groups],
  );

  useEffect(() => {
    if (!fullscreen || !flatPhotos[fullIndex]) return;
    const p = flatPhotos[fullIndex];
    const key = `${p.id}`;
    if (!fullPaths[key] && !pendingFull.current.has(key)) {
      pendingFull.current.add(key);
      window.photoAPI
        ?.getPath(p.owner, p.filename, "webp")
        .then((path) => {
          if (path) setFullPaths((prev) => ({ ...prev, [key]: path }));
        })
        .finally(() => pendingFull.current.delete(key));
    }
  }, [fullscreen, fullIndex, flatPhotos, fullPaths]);

  const openPhoto = (photo) => {
    const idx = flatPhotos.findIndex((p) => p.id === photo.id);
    setSlideDirection(0);
    setFullIndex(Math.max(0, idx));
    setFullscreen(true);
  };

  const total = groups.reduce(
    (acc, g) => acc + g.photos.length + g.events.length,
    0,
  );

  return (
    <>
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
        {groups.length === 0 && (
          <Box sx={groupSx}>
            <SettingsRow
              icon={
                <RowIcon bg="gray">
                  <CelebrationIcon sx={{ fontSize: 18 }} />
                </RowIcon>
              }
              title="В этот день пусто"
              subtitle="Загляните завтра — вдруг там свадьба?"
            />
          </Box>
        )}

        <Stack spacing={2}>
          {groups.map((g) => (
            <Box key={g.year}>
              <Stack
                direction="row"
                alignItems="baseline"
                spacing={1}
                sx={{ mb: 1, ml: 0.5 }}
              >
                <Typography
                  sx={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "text.secondary",
                  }}
                >
                  {formatYearsAgo(g.yearsAgo)}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.7rem", color: "text.disabled" }}
                >
                  {g.year}
                </Typography>
                <Typography
                  sx={{
                    ml: "auto",
                    fontSize: "0.7rem",
                    color: "text.secondary",
                  }}
                >
                  {[
                    g.photos.length > 0 ? `Фото ${g.photos.length}` : null,
                    g.events.length > 0 ? `События ${g.events.length}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
              </Stack>

              <Box sx={groupSx}>
                {g.photos.length > 0 && (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 1,
                      p: 1,
                    }}
                  >
                    {g.photos.map((p) => {
                      if (!thumbs[p.id]) fetchThumb(p);
                      return (
                        <Box
                          key={p.id}
                          component="img"
                          src={thumbs[p.id]}
                          alt={p.title || ""}
                          title={p.title || p.filename || ""}
                          onClick={() => openPhoto(p)}
                          sx={{
                            width: "100%",
                            aspectRatio: "1",
                            objectFit: "cover",
                            borderRadius: "10px",
                            bgcolor: "action.hover",
                            cursor: "pointer",
                            transition: "opacity 0.15s",
                            "&:hover": { opacity: 0.9 },
                          }}
                        />
                      );
                    })}
                  </Box>
                )}

                {g.photos.length > 0 && g.events.length > 0 && (
                  <RowDivider inset={0} />
                )}

                {g.events.length > 0 && (
                  <Stack divider={<RowDivider />}>
                    {g.events.map((ev, i) => (
                      <SettingsRow
                        key={i}
                        icon={
                          <RowIcon bg="orange">
                            <EventIcon sx={{ fontSize: 18 }} />
                          </RowIcon>
                        }
                        title={ev.type || "Событие"}
                        subtitle={`${ownerNameOf(allPeople, ev.personId)}${
                          ev.place ? ` · ${ev.place}` : ""
                        }`}
                        onClick={
                          ev.personId
                            ? () => navigate(`/person/${ev.personId}`)
                            : undefined
                        }
                        trailing={
                          ev.personId ? (
                            <ChevronRightIcon
                              sx={{ fontSize: 16, color: "text.disabled" }}
                            />
                          ) : undefined
                        }
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>
          ))}
        </Stack>

        {total > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 2, ml: 0.5 }}
          >
            Всего воспоминаний: {total}
          </Typography>
        )}
      </Box>

      <PhotoFullscreenViewer
        open={fullscreen}
        index={fullIndex}
        photos={flatPhotos}
        photoPaths={Object.fromEntries(
          flatPhotos.map((p) => [p.id, fullPaths[`${p.id}`]]),
        )}
        thumbPaths={thumbs}
        direction={slideDirection}
        hideLabels={false}
        onClose={() => setFullscreen(false)}
        onNext={() => {
          setSlideDirection(1);
          setFullIndex((idx) =>
            idx + 1 < flatPhotos.length ? idx + 1 : idx,
          );
        }}
        onPrev={() => {
          setSlideDirection(-1);
          setFullIndex((idx) => (idx - 1 >= 0 ? idx - 1 : idx));
        }}
        onToggleMaximize={() => {}}
        currentPhotoInfo={flatPhotos[fullIndex] || null}
        allPeople={allPeople}
        allExternal={[]}
      />
    </>
  );
}

function StatsTab({ photos, allPeople }) {
  const [bioFilled, setBioFilled] = useState(null);
  const [externalCount, setExternalCount] = useState(0);

  useEffect(() => {
    window.externalAPI
      ?.getAll()
      .then((list) => setExternalCount((list || []).length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ids = (allPeople || []).map((p) => p.id);
    if (ids.length === 0) {
      setBioFilled(0);
      return;
    }
    window.bioAPI
      ?.filledCount(ids)
      .then((n) => setBioFilled(n))
      .catch(() => setBioFilled(null));
  }, [allPeople]);

  const people = allPeople || [];
  const men = people.filter((p) => p.gender === "male").length;
  const women = people.filter((p) => p.gender === "female").length;
  let eventCount = 0;
  for (const p of people) eventCount += (p.events || []).length;

  const rows = [
    {
      label: "всего человек",
      icon: <PeopleIcon sx={{ fontSize: 18 }} />,
      color: "blue",
      value: String(people.length),
    },
    {
      label: "мужчины",
      icon: <MaleIcon sx={{ fontSize: 18 }} />,
      color: "cyan",
      value: String(men),
    },
    {
      label: "женщины",
      icon: <FemaleIcon sx={{ fontSize: 18 }} />,
      color: "pink",
      value: String(women),
    },
    {
      label: "биографий заполнено",
      icon: <DescriptionIcon sx={{ fontSize: 18 }} />,
      color: "indigo",
      value: bioFilled == null ? "…" : String(bioFilled),
    },
    {
      label: "фотографий",
      icon: <PhotoLibraryIcon sx={{ fontSize: 18 }} />,
      color: "purple",
      value: String((photos || []).length),
    },
    {
      label: "событий",
      icon: <EventIcon sx={{ fontSize: 18 }} />,
      color: "orange",
      value: String(eventCount),
    },
    {
      label: "в справочнике",
      icon: <ContactsIcon sx={{ fontSize: 18 }} />,
      color: "green",
      value: String(externalCount),
    },
  ];

  return (
    <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
      <Box sx={groupSx}>
        <Stack divider={<RowDivider />}>
          {rows.map((r) => (
            <SettingsRow
              key={r.label}
              icon={<RowIcon bg={r.color}>{r.icon}</RowIcon>}
              title={r.label}
              trailing={
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    color: "text.primary",
                  }}
                >
                  {r.value}
                </Typography>
              }
            />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

const TABS = [
  { id: "memories", label: "В этот день", icon: CelebrationIcon },
  { id: "relations", label: "Связи", icon: GroupsIcon },
  { id: "stats", label: "Статистика", icon: BarChartIcon, iconOnly: true },
];

// Таб связей фокусного человека: описание + родственники + справочник.
function RelationsTab({ personId, allPeople, onFocusPerson }) {
  const navigate = useNavigate();
  const [external, setExternal] = useState([]);

  useEffect(() => {
    if (personId == null) return;
    window.externalAPI
      ?.getAll()
      .then((list) => setExternal(list || []))
      .catch(() => setExternal([]));
  }, [personId]);

  const person = (allPeople || []).find(
    (p) => String(p.id) === String(personId),
  );

  if (!person) {
    return (
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
        <Typography color="text.secondary" variant="body2">
          Нажмите кнопку «Связи» на карточке человека в списке — здесь
          появятся его описание и родственники.
        </Typography>
      </Box>
    );
  }

  const byId = new Map((allPeople || []).map((p) => [String(p.id), p]));
  const pick = (ids) =>
    (Array.isArray(ids) ? ids : [ids])
      .filter((id) => id != null && id !== "")
      .map((id) => byId.get(String(id)))
      .filter(Boolean);

  const personName = (p) =>
    [p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") ||
    "Без имени";

  const sections = [
    { title: "Родители", people: pick([person.father, person.mother]) },
    { title: "Супруги", people: pick(person.spouse) },
    { title: "Дети", people: pick(person.children) },
    { title: "Братья и сёстры", people: pick(person.siblings) },
  ];

  const extRels = [];
  for (const entity of external) {
    for (const rel of entity.relations || []) {
      if (
        rel?.targetKind === "person" &&
        String(rel.mainPersonId) === String(person.id)
      ) {
        extRels.push({ entity, rel });
      }
    }
  }

  const renderRelationGroup = (title, people) => (
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
                  initials={`${p.firstName?.[0] || ""}${p.lastName?.[0] || p.maidenName?.[0] || ""}`}
                />
              }
              title={personName(p)}
              onClick={() => onFocusPerson?.(p.id)}
              trailing={
                <IconButton
                  size="small"
                  title="Открыть страницу человека"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/person/${p.id}`);
                  }}
                  sx={{ color: "text.secondary", p: 0.5 }}
                >
                  <ChevronRightIcon sx={{ fontSize: 16 }} />
                </IconButton>
              }
            />
          ))}
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
      <PersonHeader
        personId={personId}
        allPeople={allPeople}
        onFocusPerson={onFocusPerson}
      />

      <Stack spacing={2} sx={{ mt: 2 }}>
        {sections.map((s) =>
          s.people.length > 0 ? renderRelationGroup(s.title, s.people) : null,
        )}

        {extRels.length > 0 && (
          <Box>
            <Typography sx={sectionLabelSx}>Справочник</Typography>
            <Box sx={groupSx}>
              <Stack divider={<RowDivider />}>
                {extRels.map(({ entity, rel }) => (
                  <SettingsRow
                    key={entity.id + rel.id}
                    icon={
                      <Avatar
                        sx={{ width: 32, height: 32, fontSize: "0.8rem" }}
                      >
                        {(entity.name?.[0] || "E").toUpperCase()}
                      </Avatar>
                    }
                    title={entity.name || entity.id}
                    subtitle={[rel.relationType, rel.dates]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                ))}
              </Stack>
            </Box>
          </Box>
        )}

        {sections.every((s) => s.people.length === 0) &&
          extRels.length === 0 && (
            <Box sx={groupSx}>
              <SettingsRow
                icon={
                  <RowIcon bg="gray">
                    <ContactsIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Связи не указаны"
                subtitle="Добавьте родителей, супруга или детей в карточке человека."
              />
            </Box>
          )}
      </Stack>
    </Box>
  );
}
export default function InspectorPanel({
  open,
  onClose,
  groups,
  allPeople,
  photos,
  memoriesTotal,
  tab,
  setTab,
  relationPersonId,
  onFocusPerson,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

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
        <Box
          sx={{
            p: 2,
            pb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              borderRadius: "10px",
              bgcolor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
              border: "1px solid",
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
              p: "3px",
              gap: "4px",
            }}
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const selected = tab === t.id;
              return (
                <Box
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  title={t.label}
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    height: 24,
                    minHeight: 24,
                    py: 0,
                    px: 1,
                    borderRadius: "7px",
                    cursor: "pointer",
                    color: selected ? "text.primary" : "text.secondary",
                    bgcolor: selected
                      ? isDark
                        ? "rgba(255,255,255,0.14)"
                        : "background.paper"
                      : "transparent",
                    border: "1px solid",
                    borderColor: selected
                      ? isDark
                        ? "rgba(255,255,255,0.14)"
                        : "rgba(0,0,0,0.1)"
                      : isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.06)",
                    boxShadow: selected
                      ? isDark
                        ? "0 1px 2px rgba(0,0,0,0.35)"
                        : "0 1px 2px rgba(0,0,0,0.12)"
                      : "none",
                    fontSize: "0.78rem",
                    fontWeight: selected ? 700 : 500,
                    "&:hover": selected
                      ? undefined
                      : {
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                        },
                  }}
                >
                  <Icon sx={{ fontSize: 16 }} />
                  {!t.iconOnly &&
                    (t.id === "memories" && memoriesTotal > 0 ? (
                      <Box
                        sx={{
                          minWidth: 18,
                          height: 18,
                          borderRadius: 9,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.22)"
                            : "rgba(0,0,0,0.08)",
                          color: "text.primary",
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          px: 0.5,
                        }}
                      >
                        {memoriesTotal > 99 ? "99+" : memoriesTotal}
                      </Box>
                    ) : (
                      t.label
                    ))}
                </Box>
              );
            })}
          </Box>
        </Box>

        {tab === "memories" ? (
          <MemoriesTab groups={groups} allPeople={allPeople} />
        ) : tab === "relations" ? (
          <RelationsTab
            personId={relationPersonId}
            allPeople={allPeople}
            onFocusPerson={onFocusPerson}
          />
        ) : (
          <StatsTab photos={photos} allPeople={allPeople} />
        )}
      </Box>
    </Drawer>
  );
}
