import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { useParams } from "react-router-dom";

import { Typography, Stack, Box, Fade } from "@mui/material";
import { useNotificationStore } from "../../store/useNotificationStore";
import Info from "./info/Info";
import PhotoGallery from "./PhotoGallery/PhotoGallery";
import BiographySection from "./Bio/BiographySection";
import Component_FamilyTree from "./FamilyTree/Component_FamilyTree";
import Editor from "./Editor/Editor";

const PersonPage = forwardRef(
  ({ activeElement, galleryProps, bioProps, treeProps, infoProps }, ref) => {
    const { id } = useParams();
    const addNotification = useNotificationStore(
      (state) => state.addNotification,
    );
    const [person, setPerson] = useState(null);
    const [allPeople, setAllPeople] = useState([]);
    const [editOpen, setEditOpen] = useState(false);

    // Реф для самого компонента Editor, чтобы спросить у него, изменились ли данные
    const editorRef = useRef(null);

    // Факты: состояния диалога
    const [factsEditorOpen, setFactsEditorOpen] = useState(false);
    const [editingFactIndex, setEditingFactIndex] = useState(null);
    // События: состояния диалога
    const [eventEditorOpen, setEventEditorOpen] = useState(false);
    const [editingEventIndex, setEditingEventIndex] = useState(null);

    const [eventToCopy, setEventToCopy] = useState(null);

    // --- 🛠 СВЯЗКА С MAIN LAYOUT (Через infoProps) ---
    useEffect(() => {
      if (infoProps?.requestToggleRef) {
        infoProps.requestToggleRef.current = {
          // Вызывается тулбаром при нажатии на "Редактировать"
          toggle: () => {
            // 1. Проверяем: мы сейчас в режиме редактирования?
            if (infoProps.isEditing) {
              // 2. Спрашиваем у Эдитора: "Есть ли изменения?"
              const isDirty = editorRef.current?.isDirty?.() || false;

              if (isDirty) {
                // 3. ЕСЛИ ИЗМЕНЕНИЯ ЕСТЬ — ПОКАЗЫВАЕМ АЛЕРТ
                const confirmLeave = window.confirm(
                  "Данные изменены. Выйти без сохранения?",
                );

                // Если нажал "Отмена" — прерываем функцию, setIsEditing(false) не сработает
                if (!confirmLeave) return;

                // Если нажал "ОК" — сбрасываем форму к исходному состоянию
                editorRef.current?.handleInternalCancel();
              }

              // Закрываем редактор (только если не прервали функцию выше)
              infoProps.setIsEditing(false);
            } else {
              // Если редактор был закрыт — просто открываем
              infoProps.setIsEditing(true);
            }
          },
          // Проверка: есть ли несохраненные изменения? (вызывается при попытке уйти со страницы)
          // checkDirty: () => {
          //   return editorRef.current?.isDirty() || false;
          // },
          checkDirty: () => {
            const isDirty = editorRef.current?.isDirty?.() || false;

            return isDirty;
          },
          // Вызывается тулбаром при нажатии "Сохранить"
          save: () => {
            editorRef.current?.handleInternalSave();
          },
          // Вызывается тулбаром при нажатии "Отмена"
          cancel: () => {
            if (editorRef.current) {
              editorRef.current.handleInternalCancel();
            } else {
              infoProps.setIsEditing(false);
            }
          },
          // Функция вызова модалки (если нужно реализовать сложный перехват)
          askSave: (action) => {
            editorRef.current?.showSaveConfirm(action);
          },
        };
      }
    }, [infoProps, person]);

    useImperativeHandle(ref, () => ({
      // Метод для кнопки "Профиль"
      // handleEditProfile: () => {
      //   setEditOpen(!editOpen);
      // },
      // handleEditProfile: () => {
      //   // Теперь используем глобальный стейт из Layout вместо локального editOpen
      //   infoProps.setIsEditing(!infoProps.isEditing);
      // },
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

    // -----  ⭐️ ФАКТЫ  ||  ℹ️ СОБЫТИЯ   -------------------

    const handleSave = async () => {
      const updated = await window.peopleAPI.getById(person.id);
      setPerson({
        ...updated,
        facts: Array.isArray(updated?.facts) ? updated.facts : [],
        events: Array.isArray(updated?.events) ? updated.events : [], // 👈
      });

      // 👇 ДОБАВИТЬ ЭТИ ДВЕ СТРОКИ 👇
      // Обновляем глобальный список, чтобы новые люди не пропадали из списков
      const freshAllPeople = await window.peopleAPI.getAll();
      setAllPeople(freshAllPeople || []);
    };
    // ---  ⭐️ ФАКТЫ  - - - - - - - - - - - - - - - - - - -

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
      const isNew = editingFactIndex == null;
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
      // 🔔 Уведомление
      addNotification({
        title: isNew ? "Факт добавлен" : "Факт обновлен",
        message: `${isNew ? "Добавлен" : "Изменен"} факт: ${fact.type}: ${fact.value}. У ${person.firstName}`,
        type: "success",
        link: `/person/${person.id}`,
      });
      await handleSave();
    };

    //  * 🗑 УДАЛЕНИЕ ФАКТА
    const deleteFact = async (index) => {
      const factToDelete = safeFacts[index];
      const now = new Date().toISOString();
      const updatedFacts = safeFacts.filter((_, i) => i !== index);
      const updatedPerson = { ...person, facts: updatedFacts, editedAt: now };

      await window.peopleAPI.saveAll(
        (allPeople || []).map((p) => (p.id === person.id ? updatedPerson : p)),
      );

      // 🔔 Уведомление
      addNotification({
        title: "Факт удален",
        message: `Удален факт: "${factToDelete.type}: ${factToDelete.value}" у ${person.firstName}`,
        type: "info",
        link: `/person/${person.id}`,
      });

      await handleSave();
    };

    // ---  ℹ️ СОБЫТИЯ   - - - - - - - - - - - - - - - - - - -
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
      const isNew = editingEventIndex == null;
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

      // 🔔 Уведомление
      addNotification({
        title: isNew ? "Событие добавлено" : "Событие обновлено",
        message: `${isNew ? "Создано" : "Обновлено"} событие: ${ev.type?.name || ev.type}. Персона: ${person.firstName}`,
        type: "success",
        link: `/person/${person.id}`,
      });

      await handleSave();
    };

    //  * 🗑 УДАЛЕНИЕ СОБЫТИЯ
    const deleteEvent = async (index) => {
      const eventToDelete = safeEvents[index];
      const now = new Date().toISOString();
      const updatedEvents = safeEvents.filter((_, i) => i !== index);
      const updatedPerson = { ...person, events: updatedEvents, editedAt: now };

      await window.peopleAPI.saveAll(
        (allPeople || []).map((p) => (p.id === person.id ? updatedPerson : p)),
      );

      // 🔔 Уведомление
      addNotification({
        title: "Событие удалено",
        message: `Удалено событие "${eventToDelete?.type}" у ${person.firstName}`,
        type: "info",
        link: `/person/${person.id}`,
      });

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

      // 🔔 Уведомление (вместо alert)
      addNotification({
        title: "Событие скопировано",
        message: `Событие "${cleanEvent.type?.name || "Событие"}" успешно передано ${target.firstName}`,
        type: "success",
        link: `/person/${target.id}`,
      });

      alert(`Событие успешно скопировано для ${target.firstName}`);
    };

    return (
      <Stack spacing={2}>
        {/* Секция Инфо */}
        <Fade
          in={activeElement === "info" && !infoProps.isEditing}
          unmountOnExit
          timeout={500}
        >
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
        {/* Секция Инфо */}
        <Fade
          in={activeElement === "info" && infoProps.isEditing}
          unmountOnExit
          timeout={500}
        >
          <Box>
            <Editor
              ref={editorRef}
              person={person}
              editOpen={infoProps.isEditing}
              handleSave={handleSave}
              allPeople={allPeople}
              setEditOpen={infoProps.setIsEditing}
              // ---
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
