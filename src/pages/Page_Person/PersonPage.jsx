import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useParams } from "react-router-dom";

import { Typography, Stack, Box, Fade } from "@mui/material";

import Info from "./info/Info";
import PhotoGallery from "./PhotoGallery/PhotoGallery";
import BiographySection from "./Bio/BiographySection";
import Component_FamilyTree from "./FamilyTree/Component_FamilyTree";

const PersonPage = forwardRef(
  ({ activeElement, galleryProps, bioProps, treeProps }, ref) => {
    const { id } = useParams();
    const [person, setPerson] = useState(null);
    const [allPeople, setAllPeople] = useState([]);
    const [editOpen, setEditOpen] = useState(false);

    // Факты: состояния диалога
    const [factsEditorOpen, setFactsEditorOpen] = useState(false);
    const [editingFactIndex, setEditingFactIndex] = useState(null);
    // События: состояния диалога
    const [eventEditorOpen, setEventEditorOpen] = useState(false);
    const [editingEventIndex, setEditingEventIndex] = useState(null);

    const [eventToCopy, setEventToCopy] = useState(null);

    useImperativeHandle(ref, () => ({
      // Метод для кнопки "Профиль"
      handleEditProfile: () => {
        setEditOpen(true);
      },
      // Метод для кнопки "Событие"
      handleAddEvent: () => {
        setEditingEventIndex(null);
        setEventEditorOpen(true);
      },
      // Метод для кнопки "Факт"
      handleAddFact: () => {
        setEditingFactIndex(null);
        setFactsEditorOpen(true);
      },
    }));

    //  --- 🔄 ЗАГРУЗКА ДАННЫХ  - - - - - - - - - - - - - - -

    useEffect(() => {
      let isMounted = true;
      const numericId = parseInt(id, 10);
      Promise.all([
        window.peopleAPI.getById(numericId),
        window.peopleAPI.getAll(),
      ]).then(([personData, people]) => {
        if (!isMounted) return;
        // Нормализация массивов, чтобы избежать ошибок .map()
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

    // ------------------------

    const handleSave = async () => {
      const updated = await window.peopleAPI.getById(person.id);
      setPerson({
        ...updated,
        facts: Array.isArray(updated?.facts) ? updated.facts : [],
        events: Array.isArray(updated?.events) ? updated.events : [], // 👈
      });
    };
    // ---  ⭐️ ФАКТЫ - - - - - - - - - - - - - - - - - - -

    //  * Открытие диалога добавления
    const openAddFact = () => {
      setEditingFactIndex(null);
      setFactsEditorOpen(true);
    };

    //  * Открытие диалога редактирования
    const openEditFact = (index) => {
      setEditingFactIndex(index);
      setFactsEditorOpen(true);
    };

    // * 💾 СОХРАНЕНИЕ ФАКТА (Обновленная версия)
    const saveFact = async (fact) => {
      const now = new Date().toISOString();

      // генерируем новый id
      const maxId =
        safeFacts.length > 0 ? Math.max(...safeFacts.map((f) => f.id || 0)) : 0;
      const newId = maxId + 1;

      const updatedFacts =
        editingFactIndex == null
          ? [
              ...safeFacts,
              { ...fact, id: newId, createdAt: now, editedAt: now },
            ]
          : safeFacts.map((f, i) =>
              i === editingFactIndex
                ? {
                    ...f,
                    ...fact,
                    id: f.id,
                    createdAt: f.createdAt || now,
                    editedAt: now,
                  }
                : f,
            );

      const updatedPerson = { ...person, facts: updatedFacts, editedAt: now };

      await window.peopleAPI.saveAll(
        (allPeople || []).map((p) => (p.id === person.id ? updatedPerson : p)),
      );
      await handleSave();
    };

    //  * 🗑 УДАЛЕНИЕ ФАКТА
    const deleteFact = async (index) => {
      const now = new Date().toISOString();
      const updatedFacts = safeFacts.filter((_, i) => i !== index);
      const updatedPerson = { ...person, facts: updatedFacts, editedAt: now };

      await window.peopleAPI.saveAll(
        (allPeople || []).map((p) => (p.id === person.id ? updatedPerson : p)),
      );
      await handleSave();
    };

    // ---  ⭐️ СОБЫТИЯ - - - - - - - - - - - - - - - - - - -
    //  * Открытие диалога добавления
    const openAddEvent = () => {
      setEditingEventIndex(null);
      setEventEditorOpen(true);
    };

    //  * Открытие диалога редактирования
    const openEditEvent = (index) => {
      setEditingEventIndex(index);
      setEventEditorOpen(true);
    };

    //  * 💾 СОХРАНЕНИЕ СОБЫТИЯ (Обновленная версия)
    const saveEvent = async (ev) => {
      const now = new Date().toISOString();

      // генерируем новый id
      const maxId =
        safeEvents.length > 0
          ? Math.max(...safeEvents.map((e) => e.id || 0))
          : 0;
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
                : e,
            );

      const updatedPerson = { ...person, events: updatedEvents, editedAt: now };

      await window.peopleAPI.saveAll(
        (allPeople || []).map((p) => (p.id === person.id ? updatedPerson : p)),
      );
      await handleSave();
    };

    //  * 🗑 УДАЛЕНИЕ СОБЫТИЯ
    const deleteEvent = async (index) => {
      const now = new Date().toISOString();
      const updatedEvents = safeEvents.filter((_, i) => i !== index);
      const updatedPerson = { ...person, events: updatedEvents, editedAt: now };

      await window.peopleAPI.saveAll(
        (allPeople || []).map((p) => (p.id === person.id ? updatedPerson : p)),
      );
      await handleSave();
    };

    // * © КОПИРОВАНИЕ ДРУГОМУ ЧЕЛОВЕКУ
    const handleConfirmCopy = async (targetPersonId, mode, eventIndex) => {
      const now = new Date().toISOString();

      // 1. Подготавливаем "чистые" данные участников
      const updatedParticipants = (eventToCopy.participants || []).map((id) => {
        // Если в списке участников есть тот, кому мы копируем событие,
        // заменяем его на текущего человека (автора события)
        if (id === targetPersonId) {
          return person.id;
        }
        return id;
      });

      // Если текущего человека (от кого копируем) еще нет в списке,
      // и мы заменили целевого человека, то логика выше уже сработала.
      // Но если целевого человека не было в участниках, возможно стоит его добавить?
      // Обычно замена — это именно то, что нужно для парных событий.

      const cleanEvent = {
        ...eventToCopy,
        type:
          typeof eventToCopy.type === "object"
            ? { name: eventToCopy.type.name }
            : eventToCopy.type,
        participants: updatedParticipants, // 👈 Обновленный список участников
      };

      const all = await window.peopleAPI.getAll();
      const target = all.find((p) => p.id === targetPersonId);
      if (!target) return;

      let updatedEvents = Array.isArray(target.events)
        ? [...target.events]
        : [];

      if (mode === "new") {
        const maxId =
          updatedEvents.length > 0
            ? Math.max(...updatedEvents.map((e) => e.id || 0))
            : 0;
        updatedEvents.push({
          ...cleanEvent,
          id: maxId + 1,
          createdAt: now,
          editedAt: now,
        });
      } else if (mode === "replace") {
        updatedEvents = updatedEvents.map((ev, idx) =>
          idx === eventIndex
            ? {
                ...cleanEvent,
                id: ev.id,
                createdAt: ev.createdAt,
                editedAt: now,
              }
            : ev,
        );
      }

      const updatedTarget = { ...target, events: updatedEvents, editedAt: now };
      const newAllPeople = all.map((p) =>
        p.id === targetPersonId ? updatedTarget : p,
      );

      await window.peopleAPI.saveAll(newAllPeople);
      setAllPeople(newAllPeople);
      setEventEditorOpen(false);
      alert(`Событие успешно скопировано для ${target.firstName}`);
    };

    return (
      <Stack spacing={2}>
        {/* Секция Инфо */}
        <Fade in={activeElement === "info"} unmountOnExit timeout={500}>
          <Box>
            <Info
              person={person}
              editOpen={editOpen}
              handleSave={handleSave}
              allPeople={allPeople}
              safeEvents={safeEvents}
              openAddEvent={openAddEvent}
              openEditEvent={openEditEvent}
              eventEditorOpen={eventEditorOpen}
              editingEventIndex={editingEventIndex}
              saveEvent={saveEvent}
              eventToCopy={eventToCopy}
              handleConfirmCopy={handleConfirmCopy}
              safeFacts={safeFacts}
              openAddFact={openAddFact}
              openEditFact={openEditFact}
              factsEditorOpen={factsEditorOpen}
              editingFactIndex={editingFactIndex}
              saveFact={saveFact}
              setEventEditorOpen={setEventEditorOpen}
              setFactsEditorOpen={setFactsEditorOpen}
              deleteEvent={deleteEvent}
              deleteFact={deleteFact}
              setEventToCopy={setEventToCopy}
              setEditOpen={setEditOpen}
            />
          </Box>
        </Fade>

        {/* Секция Фото */}
        <Fade in={activeElement === "photo"} unmountOnExit timeout={500}>
          <Box>
            <PhotoGallery
              personId={person.id}
              allPeople={allPeople}
              search={galleryProps.search}
              groupBy={galleryProps.groupBy}
              sortDir={galleryProps.sortDir}
              uploadTrigger={galleryProps.uploadTrigger}
            />
          </Box>
        </Fade>

        {/* Секция биографии */}
        <Fade in={activeElement === "bio"} unmountOnExit timeout={500}>
          <Box>
            <BiographySection
              personId={person.id}
              activeElement={activeElement}
              // Прямая передача пропсов из Layout
              isEditing={bioProps.isEditing}
              setIsEditing={bioProps.setIsEditing}
              execRef={bioProps.execRef}
              requestToggleRef={bioProps.requestToggleRef}
            />
          </Box>
        </Fade>

        {/* Секция древо */}
        <Fade in={activeElement === "tree"} unmountOnExit timeout={500}>
          <Box>
            <Component_FamilyTree
              allPeople={allPeople}
              person_id={person.id}
              treeMode={treeProps.mode}
              ref={treeProps.treePageRef}
            />
          </Box>
        </Fade>
      </Stack>
    );
  },
);

export default PersonPage;
