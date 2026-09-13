import React, { useEffect, useRef, useState } from "react";
import {
  Drawer,
  Box,
  Stack,
  Typography,
  Chip,
  Avatar,
  IconButton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
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
          <Typography color="text.secondary" variant="body2">
            В этот день в прошлые годы ничего не отмечено. Загляните
            завтра — вдруг там свадьба?
          </Typography>
        )}
        <Stack spacing={2.5}>
          {groups.map((g) => (
            <Box key={g.year}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {formatYearsAgo(g.yearsAgo)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {g.year}
                </Typography>
                <Chip
                  label={`Фото: ${g.photos.length}`}
                  size="small"
                  variant="outlined"
                />
                {g.events.length > 0 && (
                  <Chip
                    label={`События: ${g.events.length}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>

              {g.photos.length > 0 && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 1,
                    mb: g.events.length > 0 ? 1 : 0,
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
                          borderRadius: 2,
                          bgcolor: "action.hover",
                          cursor: "pointer",
                        }}
                      />
                    );
                  })}
                </Box>
              )}

              {g.events.map((ev, i) => (
                <Box
                  key={i}
                  onClick={() =>
                    ev.personId && navigate(`/person/${ev.personId}`)
                  }
                  sx={{
                    p: 1.25,
                    mb: 1,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: (t) =>
                      alpha(t.palette.background.paper, 0.6),
                    cursor: ev.personId ? "pointer" : "default",
                    "&:hover": ev.personId
                      ? { borderColor: "primary.main" }
                      : undefined,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {ev.type || "Событие"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ownerNameOf(allPeople, ev.personId)}
                    {ev.place ? ` · ${ev.place}` : ""}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Stack>
      </Box>

      {total > 0 && (
        <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" color="text.secondary">
            Всего воспоминаний: {total}
          </Typography>
        </Box>
      )}

      <PhotoFullscreenViewer
        open={fullscreen}
        index={fullIndex}
        photos={flatPhotos}
        photoPaths={Object.fromEntries(
          flatPhotos.map((p) => [p.id, fullPaths[`${p.id}`]]),
        )}
        thumbPaths={thumbs}
        direction={0}
        hideLabels={false}
        onClose={() => setFullscreen(false)}
        onNext={() =>
          setFullIndex((idx) => (idx + 1 < flatPhotos.length ? idx + 1 : idx))
        }
        onPrev={() => setFullIndex((idx) => (idx - 1 >= 0 ? idx - 1 : idx))}
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
    { label: "всего человек", icon: <PeopleIcon />, iconColor: "primary", value: String(people.length) },
    { label: "мужчины", icon: <MaleIcon />, iconColor: "info", value: String(men) },
    { label: "женщины", icon: <FemaleIcon />, iconColor: "secondary", value: String(women) },
    { label: "биографий заполнено", icon: <DescriptionIcon />, iconColor: "action", value: bioFilled == null ? "…" : String(bioFilled) },
    { label: "фотографий", icon: <PhotoLibraryIcon />, iconColor: "action", value: String((photos || []).length) },
    { label: "событий", icon: <EventIcon />, iconColor: "action", value: String(eventCount) },
    { label: "в справочнике", icon: <ContactsIcon />, iconColor: "action", value: String(externalCount) },
  ];

  return (
    <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
      <Stack spacing={1}>
        {rows.map((r) => (
          <Box
            key={r.label}
            sx={{
              display: "flex",
              alignItems: "center",
              px: 1.5,
              py: 1,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", color: `${r.iconColor}.main` }}>
              {r.icon}
            </Box>
            <Typography variant="body2" sx={{ ml: 0.5 }}>
              {r.label}:
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, ml: "auto", fontSize: "1rem" }}
            >
              {r.value}
            </Typography>
          </Box>
        ))}
      </Stack>
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

  const renderPersonRow = (p, sub) => (
    <Box
      key={p.id}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1,
        py: 0.75,
        borderRadius: 2,
      }}
    >
      <PersonRowAvatar personId={p.id} initials={`${p.firstName?.[0] || ""}${p.lastName?.[0] || p.maidenName?.[0] || ""}`} />
      <Box
        sx={{ minWidth: 0, flexGrow: 1, cursor: "pointer" }}
        onClick={() => onFocusPerson?.(p.id)}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {personName(p)}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </Box>
      <IconButton
        size="small"
        title="Открыть страницу человека"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/person/${p.id}`);
        }}
        sx={{ color: "text.secondary" }}
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
      <PersonHeader
        personId={personId}
        allPeople={allPeople}
        onFocusPerson={onFocusPerson}
      />
      <Box sx={{ display: "flex", justifyContent: "center", my: 1 }}>
        <Box
          sx={{
            width: 48,
            height: 4,
            borderRadius: 2,
            bgcolor: "divider",
            opacity: 0.7,
          }}
        />
      </Box>

      <Stack spacing={2} sx={{ mt: 1 }}>
        {sections.map(
          (s) =>
            s.people.length > 0 && (
              <Box key={s.title}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700, display: "block", mb: 0.5 }}
                >
                  {s.title.toUpperCase()} · {s.people.length}
                </Typography>
                {s.people.map((p) => renderPersonRow(p))}
              </Box>
            ),
        )}

        {extRels.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, display: "block", mb: 0.5 }}
            >
              СПРАВОЧНИК · {extRels.length}
            </Typography>
            {extRels.map(({ entity, rel }) => (
              <Box
                key={entity.id + rel.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  px: 1,
                  py: 0.75,
                }}
              >
                <Avatar sx={{ width: 32, height: 32, fontSize: "0.8rem" }}>
                  {(entity.name?.[0] || "E").toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {entity.name || entity.id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[rel.relationType, rel.dates].filter(Boolean).join(" · ")}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {sections.every((s) => s.people.length === 0) &&
          extRels.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              Связи не указаны. Добавьте родителей, супруга или детей в
              карточке человека.
            </Typography>
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

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="persistent"
      transitionDuration={0}
      PaperProps={{
        sx: { top: 50, height: "calc(100% - 50px)" },
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
            borderBottom: "1px solid",
            borderColor: "divider",
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
              bgcolor: "action.hover",
              p: 0.25,
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
                    py: 0.75,
                    borderRadius: "8px",
                    cursor: "pointer",
                    color: selected ? "#fff" : "text.secondary",
                    bgcolor: selected ? "primary.main" : "transparent",
                    fontSize: "0.78rem",
                    fontWeight: selected ? 700 : 500,
                    "&:hover": selected
                      ? undefined
                      : { bgcolor: "action.selected" },
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
                          bgcolor: selected
                            ? "rgba(255,255,255,0.25)"
                            : "primary.main",
                          color: "#fff",
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
