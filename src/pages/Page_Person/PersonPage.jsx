import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  Typography,
  Button,
  Stack,
  Divider,
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import PersonIcon from "@mui/icons-material/Person";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import { useTheme } from "@mui/material/styles";
import CreateIcon from "@mui/icons-material/Create";

import PersonAvatar from "../../components/PersonAvatar";

import PhotoGallery from "./PhotoGallery/PhotoGallery";
import BiographySection from "./Bio/BiographySection";
import Component_FamilyTree from "./FamilyTree/Component_FamilyTree";
import PersonFacts from "./PersonFacts";
import FactsEditorDialog from "./FactsEditorDialog";
import AvatarEditorDialog from "./AvatarEditorDialog";
import PersonEditDialog from "./PersonEditDialog";
import PersonEvents from "./PersonEvents";
import EventEditorDialog from "./EventEditorDialog";
import {
  getSiblingsButtonLabel,
  getSiblingsModalLabel,
} from "./Function_getSiblingsButtonLabel";

import { formatAge } from "./HowOldIsThePerson";
import { buildFamiliesForPerson } from "./Function_buildFamiliesForPerson";

export default function PersonPage() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [allPeople, setAllPeople] = useState([]);
  const [refreshPhotos, setRefreshPhotos] = useState(0);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const navigate = useNavigate();
  // Факты: состояния диалога
  const [factsEditorOpen, setFactsEditorOpen] = useState(false);
  const [editingFactIndex, setEditingFactIndex] = useState(null);

  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [editingEventIndex, setEditingEventIndex] = useState(null);
  const [siblingsOpen, setSiblingsOpen] = useState(false);

  useEffect(() => {
    const numericId = parseInt(id, 10);
    Promise.all([
      window.peopleAPI.getById(numericId),
      window.peopleAPI.getAll(),
    ]).then(([personData, people]) => {
      const normalized = {
        ...personData,
        facts: Array.isArray(personData?.facts) ? personData.facts : [],
        events: Array.isArray(personData?.events) ? personData.events : [], // 👈
      };
      setPerson(normalized);
      setAllPeople(people || []);
    });
  }, [id]);

  if (!person) return <Typography>Человек не найден</Typography>;
  const safeFacts = Array.isArray(person?.facts) ? person.facts : [];
  const safeEvents = Array.isArray(person?.events) ? person.events : [];

  const initials = (person.firstName?.[0] || "") + (person.lastName?.[0] || "");

  const findById = (id) => allPeople.find((p) => p.id === id);

  const children = person.children?.map(findById).filter(Boolean);
  const families = buildFamiliesForPerson(person, allPeople);
  const father = person.father ? findById(person.father) : null;
  const mother = person.mother ? findById(person.mother) : null;
  const siblings = person.siblings?.map(findById).filter(Boolean);

  const renderPersonItem = (p) => {
    const name =
      [p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") ||
      "Без имени";
    const initials =
      (p.firstName?.[0] || "") +
      (p.lastName?.[0] || (p.maidenName?.[0] ? p.maidenName?.[1] : ""));

    return (
      <Box
        key={p.id}
        onClick={() => navigate(`/person/${p.id}`)}
        sx={{
          cursor: "pointer",
          border: "1px solid",
          borderColor: theme.palette.divider,
          borderRadius: 3,
          p: 1,
          width: "100%",

          transition: "background-color 0.2s",
          "&:hover": {
            backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
          },
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <PersonAvatar personId={p.id} initials={initials} size={40} />
          <Stack>
            <Typography variant="subtitle1">{name}</Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {p.id}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    );
  };
  const renderFamiliesItem = (el) => {
    const p = el.partner;
    const children = el.children;
    const title = p.gender === "male" ? "Супруг" : "Супругa";

    const name =
      [p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") ||
      "Без имени";
    const initials =
      (p.firstName?.[0] || "") +
      (p.lastName?.[0] || (p.maidenName?.[0] ? p.maidenName?.[1] : ""));

    return (
      <Stack key={p.id}>
        <Divider
          orientation="vertical"
          sx={{
            height: "60px",
            "& .MuiDivider-wrapper": {
              padding: "0 8px",
            },
          }}
        >
          {title}
        </Divider>
        <Box
          key={p.id}
          onClick={() => navigate(`/person/${p.id}`)}
          sx={{
            cursor: "pointer",
            border: "1px solid",
            borderColor: theme.palette.divider,
            borderRadius: 3,
            p: 1,
            width: "100%",

            transition: "background-color 0.2s",
            "&:hover": {
              backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
            },
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <PersonAvatar personId={p.id} initials={initials} size={40} />
            <Stack>
              <Typography variant="subtitle1">{name}</Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {p.id}
              </Typography>
            </Stack>
          </Stack>
        </Box>
        {renderSectionChildren("Дети", children)}
      </Stack>
    );
  };

  // ------------------------

  const renderSectionChildren = (title, people) => {
    if (!people || people.length === 0) return null;

    return (
      <Stack
        sx={{
          width: "290px",
          mt: "0px !important",
        }}
      >
        <Divider
          orientation="vertical"
          sx={{
            height: "60px",
            "& .MuiDivider-wrapper": {
              padding: "0 8px",
            },
          }}
        >
          {title}
        </Divider>
        <Paper
          sx={{
            display: "grid",
            width: "290px",
            gap: 2,
            borderRadius: 3,
            p: 1,
          }}
        >
          {people.map(renderPersonItem)}
        </Paper>
      </Stack>
    );
  };

  const renderSectionFamilies = (title, people) => {
    if (!people || people.length === 0) return null;

    return (
      <>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, 290px)",
            gap: 2,
            borderRadius: 3,
            marginTop: "0 !important",
          }}
        >
          {people.map(renderFamiliesItem)}
        </Box>
      </>
    );
  };
  const renderSectionParent = (title, people) => {
    if (!people || people.length === 0) return null;

    return (
      <>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: people.length > 1 ? "720px" : "400px",
            ml: "auto !important",
            mr: "auto !important",
            mb: "-20px",
          }}
        >
          {/* первый элемент */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: "260px",
            }}
          >
            <Divider
              orientation="vertical"
              sx={{
                height: "30px",
                "& .MuiDivider-wrapper": {
                  padding: "0 8px",
                },
              }}
            >
              {people[0].gender === "male" ? "Отец" : "Мать"}
            </Divider>
            {renderPersonItem(people[0])}

            <Divider
              orientation="vertical"
              sx={{
                height: "30px",
                "& .MuiDivider-wrapper": {
                  padding: "0 8px",
                },
              }}
            ></Divider>
          </Box>

          {/* если есть второй — вставляем линию и второй элемент */}
          {people.length > 1 && (
            <>
              <Box width={1}>
                <Box height={30}></Box>
                <Divider></Divider>
                <Box height={30}></Box>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: "260px",
                }}
              >
                <Divider
                  orientation="vertical"
                  sx={{
                    height: "30px",
                    "& .MuiDivider-wrapper": {
                      padding: "0 8px",
                    },
                  }}
                >
                  {people[1].gender === "male" ? "Отец" : "Мать"}
                </Divider>
                {renderPersonItem(people[1])}

                <Divider
                  orientation="vertical"
                  sx={{
                    height: "30px",
                  }}
                ></Divider>
              </Box>
            </>
          )}
        </Box>
      </>
    );
  };

  // ------------------------

  const handleSave = async () => {
    const updated = await window.peopleAPI.getById(person.id);
    setPerson({
      ...updated,
      facts: Array.isArray(updated?.facts) ? updated.facts : [],
      events: Array.isArray(updated?.events) ? updated.events : [], // 👈
    });
  };

  // Хендлеры фактов
  const openAddFact = () => {
    setEditingFactIndex(null);
    setFactsEditorOpen(true);
  };

  const openEditFact = (index) => {
    setEditingFactIndex(index);
    setFactsEditorOpen(true);
  };

  const saveFact = async (fact) => {
    const now = new Date().toISOString();

    // генерируем новый id
    const maxId =
      safeFacts.length > 0 ? Math.max(...safeFacts.map((f) => f.id || 0)) : 0;
    const newId = maxId + 1;

    const updatedFacts =
      editingFactIndex == null
        ? [...safeFacts, { ...fact, id: newId, createdAt: now, editedAt: now }]
        : safeFacts.map((f, i) =>
            i === editingFactIndex
              ? {
                  ...f,
                  ...fact,
                  id: f.id,
                  createdAt: f.createdAt || now,
                  editedAt: now,
                }
              : f
          );

    const updatedPerson = { ...person, facts: updatedFacts, editedAt: now };

    await window.peopleAPI.saveAll(
      (allPeople || []).map((p) => (p.id === person.id ? updatedPerson : p))
    );
    await handleSave();
  };

  const deleteFact = async (index) => {
    const now = new Date().toISOString();
    const updatedFacts = safeFacts.filter((_, i) => i !== index);
    const updatedPerson = { ...person, facts: updatedFacts, editedAt: now };

    await window.peopleAPI.saveAll(
      (allPeople || []).map((p) => (p.id === person.id ? updatedPerson : p))
    );
    await handleSave();
  };

  // События: состояния у тебя уже есть (eventEditorOpen, editingEventIndex)

  // Открытие диалогов
  const openAddEvent = () => {
    setEditingEventIndex(null);
    setEventEditorOpen(true);
  };

  const openEditEvent = (index) => {
    setEditingEventIndex(index);
    setEventEditorOpen(true);
  };

  // Сохранение
  const saveEvent = async (ev) => {
    const now = new Date().toISOString();

    // генерируем новый id
    const maxId =
      safeEvents.length > 0 ? Math.max(...safeEvents.map((e) => e.id || 0)) : 0;
    const newId = maxId + 1;

    const updatedEvents =
      editingEventIndex == null
        ? [...safeEvents, { ...ev, id: newId, createdAt: now, editedAt: now }]
        : safeEvents.map((e, i) =>
            i === editingEventIndex
              ? {
                  ...e,
                  ...ev,
                  id: e.id,
                  createdAt: e.createdAt || now,
                  editedAt: now,
                }
              : e
          );

    const updatedPerson = { ...person, events: updatedEvents, editedAt: now };

    await window.peopleAPI.saveAll(
      (allPeople || []).map((p) => (p.id === person.id ? updatedPerson : p))
    );
    await handleSave();
  };

  // Удаление
  const deleteEvent = async (index) => {
    const now = new Date().toISOString();
    const updatedEvents = safeEvents.filter((_, i) => i !== index);
    const updatedPerson = { ...person, events: updatedEvents, editedAt: now };

    await window.peopleAPI.saveAll(
      (allPeople || []).map((p) => (p.id === person.id ? updatedPerson : p))
    );
    await handleSave();
  };

  // Компонент модалки для братьев и сестёр
  function SiblingsDialog({ open, onClose, siblings = [] }) {
    const renderSiblingsItem = (p) => {
      const name =
        [p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") ||
        "Без имени";
      const initials =
        (p.firstName?.[0] || "") +
        (p.lastName?.[0] || (p.maidenName?.[0] ? p.maidenName?.[1] : ""));

      return (
        <Box
          key={p.id}
          onClick={() => {
            navigate(`/person/${p.id}`);
            onClose();
          }}
          sx={{
            cursor: "pointer",
            border: "1px solid",
            borderColor: theme.palette.divider,
            borderRadius: 3,
            p: 1,
            width: "100%",

            transition: "background-color 0.2s",
            "&:hover": {
              backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
            },
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <PersonAvatar personId={p.id} initials={initials} size={40} />
            <Stack>
              <Typography variant="subtitle1">{name}</Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {p.id}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      );
    };
    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: "15px" } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {getSiblingsModalLabel(siblings)}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {siblings.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Братья и сёстры не найдены.
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 2,
                borderRadius: 3,
              }}
            >
              {siblings.map(renderSiblingsItem)}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={2} id="person" sx={{ minHeight: "80vh" }}>
        {renderSectionParent("Родители", [father, mother].filter(Boolean))}

        <Paper
          sx={{
            mt: "0 !important",
            p: 2,
            borderRadius: "15px",
            border: "1px solid",
            borderColor: "divider",
            maxHeight: 350,
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="top"
            justifyContent="space-between"
          >
            <Stack
              direction="row"
              spacing={3}
              alignItems="flex-start"
              minWidth={"450px"}
            >
              <Box
                onClick={() => setAvatarEditorOpen(true)}
                sx={{ cursor: "pointer" }}
              >
                <PersonAvatar
                  personId={person.id}
                  initials={initials}
                  size={160}
                  refresh={refreshPhotos} // 👈 передаём сюда
                />
              </Box>
              <AvatarEditorDialog
                open={avatarEditorOpen}
                onClose={() => setAvatarEditorOpen(false)}
                personId={person.id}
                currentAvatarPath={initials}
                onSaved={() => setRefreshPhotos((r) => r + 1)} // 👈 триггерим обновление
              />
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={2}>
                  <Typography variant="h5">
                    {[person.firstName, person.lastName]
                      .filter(Boolean)
                      .join(" ") || "Без имени"}
                  </Typography>
                  <IconButton
                    onClick={() => setEditOpen(true)}
                    variant="outlined"
                    size="small"
                  >
                    <CreateIcon size="small" />
                  </IconButton>
                </Stack>

                {person.patronymic && (
                  <Typography variant="body2" color="text.secondary">
                    Отчество: {person.patronymic}
                  </Typography>
                )}

                {person.maidenName && (
                  <Typography variant="body2" color="text.secondary">
                    Девичья фамилия: {person.maidenName}
                  </Typography>
                )}
                {(person.birthday || person.died) && (
                  <Typography variant="body2" color="text.secondary">
                    {person.birthday ? `📅 ${person.birthday}` : ""}
                    {person.died ? ` – ✝ ${person.died}` : ""}
                    {person.birthday && (
                      <span>
                        {" "}
                        {person.died &&
                        person.died.trim().toLowerCase() !== "неизвестно"
                          ? `(${
                              person.gender === "male" ? "прожил " : "прожила "
                            } ${formatAge(person.birthday, person.died)})`
                          : !person.died ||
                            person.died.trim().toLowerCase() === ""
                          ? `(${formatAge(person.birthday, null)})`
                          : ""}
                      </span>
                    )}
                  </Typography>
                )}
                <Typography variant="caption" color="text.disabled">
                  Поколение: {person.generation}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  ID: {person.id}
                </Typography>

                {/* Кнопка открытия модалки с братьями и сёстрами — показываем только если есть siblings */}
                {Array.isArray(siblings) && siblings.length > 0 && (
                  <Button
                    onClick={() => setSiblingsOpen(true)}
                    variant="text"
                    size="small"
                    sx={{ mt: 1, textTransform: "none" }}
                    startIcon={
                      siblings.length > 1 ? <PeopleAltIcon /> : <PersonIcon />
                    }
                  >
                    {getSiblingsButtonLabel(siblings)} ({siblings.length})
                  </Button>
                )}

                <PersonEditDialog
                  open={editOpen}
                  onClose={() => setEditOpen(false)}
                  person={person}
                  onSave={handleSave}
                  allPeople={allPeople}
                />
              </Stack>{" "}
            </Stack>

            <Divider orientation="vertical" flexItem></Divider>
            <Stack spacing={0.5} sx={{ ml: "auto", display: "flex" }}>
              <PersonEvents
                allPeople={allPeople}
                birthday={person.birthday}
                events={safeEvents}
                onAdd={openAddEvent}
                onEdit={openEditEvent}
              />

              <EventEditorDialog
                allPeople={allPeople}
                open={eventEditorOpen}
                onClose={() => setEventEditorOpen(false)}
                initialEvent={
                  editingEventIndex != null
                    ? safeEvents[editingEventIndex]
                    : null
                }
                onSave={saveEvent}
                onDelete={() => deleteEvent(editingEventIndex)}
              />
            </Stack>
            <Divider orientation="vertical" flexItem></Divider>
            <Stack
              spacing={0.5}
              alignItems={"flex-start"}
              flexDirection={"row"}
              sx={{ ml: "auto" }}
            >
              <PersonFacts
                facts={safeFacts}
                onAdd={openAddFact}
                onEdit={openEditFact}
              />

              <FactsEditorDialog
                open={factsEditorOpen}
                onClose={() => setFactsEditorOpen(false)}
                initialFact={
                  editingFactIndex != null ? safeFacts[editingFactIndex] : null
                }
                onSave={saveFact}
                onDelete={() => deleteFact(editingFactIndex)} // 👈 удаление из модалки
              />
            </Stack>
          </Stack>
        </Paper>

        {renderSectionFamilies(
          person.gender === "male" ? "Супруга" : "Супруг",
          families
        )}

        {/* {families.length < 1 && renderSection("Дети", children)} */}
        {families.length < 1 && renderSectionChildren("Дети", children)}
        {/* Модалка для братьев и сестёр */}
        <SiblingsDialog
          open={siblingsOpen}
          onClose={() => setSiblingsOpen(false)}
          siblings={siblings}
        />
      </Stack>

      <div id="biographySection" style={{ height: "90vh", overflowY: "auto" }}>
        <BiographySection personId={person.id} />
      </div>

      <div id="photoGallery">
        <PhotoGallery personId={person.id} allPeople={allPeople} />
      </div>

      <div id="familyTree" style={{ height: "90vh" }}>
        <Component_FamilyTree allPeople={allPeople} person_id={person.id} />
      </div>
    </Stack>
  );
}
