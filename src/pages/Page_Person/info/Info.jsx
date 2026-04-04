import React, { useState, useEffect } from "react";
// MUI
import { Typography, Button, Stack, Divider, Box, Paper } from "@mui/material";

import PersonIcon from "@mui/icons-material/Person";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

import FingerprintIcon from "@mui/icons-material/Fingerprint"; // Или Fingerprint, или Dna
import PersonAvatar from "../../../components/PersonAvatar";
import AvatarEditorDialog from "../AvatarEditorDialog";
import PersonEditDialog from "../PersonEditDialog";
// Info
import { RenderSectionParent } from "../info/RenderSectionParent";
import { RenderSectionChildren } from "../info/RenderSectionChildren";
import { RenderSectionFamilies } from "../info/RenderSectionFamilies";
// Facts
import PersonFacts from "../Facts/PersonFacts";
import FactsEditorDialog from "../Facts/FactsEditorDialog";
// Event
import PersonEvents from "../Event/PersonEvents";
import EventEditorDialog from "../Event/EventEditorDialog";
import EventCopyDialog from "../Event/EventCopyDialog";
// Function
import { getSiblingsButtonLabel } from "../function/Function_getSiblingsButtonLabel";
import { formatAge } from "../function/HowOldIsThePerson";
import { buildFamiliesForPerson } from "../function/Function_buildFamiliesForPerson";

import { getSiblingsModalLabel } from "../function/Function_getSiblingsButtonLabel";
import { RenderPersonItem } from "./RenderPersonItem";

export default function Info({
  person,
  editOpen,
  handleSave,
  allPeople,
  safeEvents,
  openAddEvent,
  openEditEvent,
  eventEditorOpen,
  editingEventIndex,
  saveEvent,
  eventToCopy,
  handleConfirmCopy,
  safeFacts,
  openAddFact,
  openEditFact,
  factsEditorOpen,
  editingFactIndex,
  saveFact,
  setEventEditorOpen,
  setFactsEditorOpen,
  deleteEvent,
  deleteFact,
  setEventToCopy,
  setEditOpen,
}) {
  const [refreshPhotos, setRefreshPhotos] = useState(0);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  // Сбрасываем переворот при смене персоны
  useEffect(() => setIsFlipped(false), [person.id]);

  const findById = (id) => allPeople.find((p) => p.id === id);

  const families = buildFamiliesForPerson(person, allPeople);
  const father = person.father ? findById(person.father) : null;
  const mother = person.mother ? findById(person.mother) : null;
  // const siblings = person.siblings?.map(findById).filter(Boolean);
  const initials = (person.firstName?.[0] || "") + (person.lastName?.[0] || "");
  const children = person.children?.map(findById).filter(Boolean);
  const soloChildren = children.filter(
    (c) =>
      !person.spouse?.includes(c.mother) && !person.spouse?.includes(c.father),
  );
  // 1. Вытаскиваем массивы ID детей отца и матери (если родители неизвестны, берем пустой массив)
  const fatherChildrenIds = father?.children || [];
  const motherChildrenIds = mother?.children || [];

  // 2. Объединяем списки, убираем дубликаты через Set и исключаем ID самого человека
  const siblingIds = Array.from(
    new Set([...fatherChildrenIds, ...motherChildrenIds]),
  ).filter((id) => String(id) !== String(person.id));

  // 3. Мапим полученные ID в объекты и вычисляем тип родства
  const siblings = siblingIds
    .map((id) => {
      const s = findById(id);
      if (!s) return null;

      // Проверяем совпадение родителей
      const sameFather =
        s.father && person.father && String(s.father) === String(person.father);
      const sameMother =
        s.mother && person.mother && String(s.mother) === String(person.mother);

      let kinship = "";
      if (sameFather && sameMother) {
        kinship = "Общие родители"; // Полнородные братья/сестры
      } else if (sameFather) {
        kinship = "Общий отец"; // Единокровные
      } else if (sameMother) {
        kinship = "Общая мать"; // Единоутробные
      } else {
        kinship = "Сводное родство"; // Резервный вариант, если связи запутаны
      }

      return { ...s, kinship };
    })
    .filter(Boolean);

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        bgcolor: "background.default",
        minWidth: "1134px", // Electron limit // ! 1300
        containerType: "inline-size", // ДОБАВИТЬ ЭТО
        pt: 1,
      }}
    >
      <Stack
        direction="row"
        sx={{
          height: "calc(100vh - 68px)",
          // maxWidth: "1920px",
          // width: "1210px",
          width: "clamp(1220px, (100cqi - 1300px) * 9999, 1920px)",
          /* 1430px - 1511px: Равномерные отступы по бокам за счет justifyContent */
          justifyContent: "space-around",
          // px: 2, // Минимальный внутренний отступ
          boxSizing: "border-box",
          overflow: "hidden",
          transition: "all 0.3s ease", // Плавное сжатие при открытии меню
        }}
      >
        {/* ЛЕВЫЙ БЛОК (Инфо) - Фиксированный 802px */}
        <Stack
          spacing={0.3}
          alignItems="center"
          sx={{
            width: 785, // Чуть шире, чтобы компенсировать отступ для скролла
            flexShrink: 0,
            height: "100%",
            overflowY: "auto",
            pr: 0.5, // Отступ справа, чтобы скроллбар не "прилипал" к карточкам
            // pt: 1, // Небольшой отступ сверху
            pb: 4, // Отступ снизу, чтобы контент не упирался в край
            // pr: 0.5,

            /* Стилизация скроллбара для левого блока */
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: (theme) => theme.palette.divider,
              borderRadius: "10px",
            },
            scrollbarWidth: "thin", // Для Firefox
          }}
        >
          <RenderSectionParent
            title={"Родители"}
            people={[father, mother].filter(Boolean)}
          />

          <Box
            sx={{
              perspective: "1500px", // Глубина 3D-эффекта
              width: 770,
              minHeight: 380, // Фиксируем высоту, чтобы при перевороте не прыгало
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: "100%",
                transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* --- ЛИЦЕВАЯ СТОРОНА (АНКЕТА) --- */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  backfaceVisibility: "hidden", // Скрываем заднюю сторону при повороте
                  borderRadius: "24px",
                  border: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  overflow: "hidden",
                  background: (theme) =>
                    theme.palette.mode === "dark"
                      ? "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)"
                      : "linear-gradient(180deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0) 100%)",
                }}
              >
                <FingerprintIcon
                  sx={{
                    position: "absolute",
                    right: -20,
                    bottom: -30,
                    fontSize: "250px", // Делаем её огромной
                    color: "text.primary",
                    opacity: 0.03, // Почти прозрачная (3%)
                    pointerEvents: "none", // Чтобы не мешала кликам
                    zIndex: 0,
                  }}
                />
                <Stack
                  direction="row"
                  spacing={5}
                  alignItems="flex-start"
                  sx={{ px: 2 }}
                >
                  <Box sx={{ position: "relative" }}>
                    <Box
                      onClick={() => setAvatarEditorOpen(true)}
                      sx={{
                        cursor: "pointer",
                        transition:
                          "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        "&:hover": { transform: "scale(1.05)" },
                      }}
                    >
                      <PersonAvatar
                        personId={person.id}
                        initials={initials}
                        size={180}
                        refresh={refreshPhotos}
                      />
                    </Box>
                  </Box>

                  <Stack spacing={2} flex={1}>
                    <Stack spacing={0.5}>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}
                      >
                        {[person.firstName, person.lastName]
                          .filter(Boolean)
                          .join(" ") || "Без имени"}
                      </Typography>
                      <Stack direction="row" flexDirection={"column"}>
                        {person.patronymic && (
                          <Typography
                            variant="subtitle1"
                            color="text.secondary"
                          >
                            Отчество: {person.patronymic}
                          </Typography>
                        )}

                        {person.maidenName && (
                          <Typography
                            variant="subtitle1"
                            color="text.secondary"
                          >
                            Девичья фамилия: {person.maidenName}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>

                    <Divider sx={{ borderStyle: "dashed" }} />

                    {(person.birthday || person.died) && (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {person.birthday ? `📅 ${person.birthday}` : ""}
                          {person.died ? ` – ✝ ${person.died}` : ""}
                        </Typography>
                        {person.birthday && (
                          <Typography
                            variant="caption"
                            sx={{
                              px: 1,
                              py: 0.3,
                              borderRadius: "6px",
                              bgcolor: "action.hover",
                              color: "text.secondary",
                              fontWeight: 600,
                            }}
                          >
                            {person.died &&
                            person.died.trim().toLowerCase() !== "неизвестно"
                              ? `${person.gender === "male" ? "прожил" : "прожила"} ${formatAge(person.birthday, person.died)}`
                              : `${formatAge(person.birthday, null)}`}
                          </Typography>
                        )}
                      </Box>
                    )}

                    <Stack direction="row" spacing={3}>
                      <Typography variant="caption" color="text.disabled">
                        <b>ID:</b> {person.id}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        <b>Поколение:</b> {person.generation}
                      </Typography>
                    </Stack>

                    {/* КНОПКА ПЕРЕВОРОТА */}
                    {Array.isArray(siblings) && siblings.length > 0 && (
                      <Button
                        onClick={() => setIsFlipped(true)}
                        variant="contained"
                        size="small"
                        sx={{
                          alignSelf: "flex-start",
                          mt: 1,
                          borderRadius: "12px",
                          bgcolor: "action.selected",
                          color: "text.primary",
                        }}
                        startIcon={<PeopleAltIcon />}
                      >
                        {getSiblingsButtonLabel(siblings)} ({siblings.length})
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Paper>

              {/* --- ОБРАТНАЯ СТОРОНА (СИБЛИНГИ) --- */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)", // Изначально развернута
                  borderRadius: "24px",
                  border: "1px solid",
                  borderColor: "primary.main",
                  display: "flex",
                  flexDirection: "column",
                  bgcolor: "background.paper",
                }}
              >
                {/* Шапка обратной стороны */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <PeopleAltIcon color="primary" />{" "}
                    {getSiblingsModalLabel(siblings)}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setIsFlipped(false)}
                    startIcon={<ArrowBackIcon />}
                    sx={{ borderRadius: "10px" }}
                  >
                    Назад
                  </Button>
                </Stack>

                {/* Список сиблингов */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)", // В два столбца
                    gap: 2,
                    overflowY: "auto",
                    pr: 1,
                    maxHeight: "300px",
                    "&::-webkit-scrollbar": { width: "5px" },
                    "&::-webkit-scrollbar-thumb": {
                      bgcolor: "divider",
                      borderRadius: "10px",
                    },
                  }}
                >
                  {siblings.map((s) => (
                    <Box key={s.id} sx={{ transform: "scale(0.95)" }}>
                      <RenderPersonItem p={s} link={true} />
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Box>
          </Box>

          <Stack spacing={1} alignItems={"center"} sx={{ width: 736 }}>
            <RenderSectionFamilies
              title={person.gender === "male" ? "Супруга" : "Супруг"}
              people={families}
              soloChildren={soloChildren}
            />
          </Stack>
        </Stack>
        <Divider orientation="vertical" flexItem sx={{ borderRightWidth: 1 }} />
        {/* ПРАВЫЙ БЛОК (События и Факты) - Динамическая ширина */}
        <Stack
          sx={{
            /* Логика ширины:
               1. Базовая 500px
               2. После 1511px растет: 500 + (текущая ширина - 1511)
               3. Максимум 600px (рост не более 100px)
            */
            width: "clamp(386px, calc(370px + (100cqi - 1247px)), 650px)",
            flexShrink: 0,
            height: "100%",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "20px",
            ml: 1,
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.01)"
                : "rgba(0,0,0,0.01)",
            transition: "width 0.3s ease", // Плавный ресайз
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              p: 1.5,
            }}
          >
            <Typography
              variant="overline"
              color="primary"
              sx={{ fontWeight: 700, mb: 1, px: 1 }}
            >
              Хронология событий
            </Typography>
            <Box sx={{ flex: 1, overflowY: "auto" }}>
              <PersonEvents
                allPeople={allPeople}
                birthday={person.birthday}
                events={safeEvents}
                onAdd={openAddEvent}
                onEdit={openEditEvent}
              />
            </Box>
          </Box>

          <Divider />

          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              p: 1.5,
            }}
          >
            <Typography
              variant="overline"
              color="secondary"
              sx={{ fontWeight: 700, mb: 1, px: 1 }}
            >
              Интересные факты
            </Typography>
            <Box sx={{ flex: 1, overflowY: "auto" }}>
              <PersonFacts
                person={person}
                facts={safeFacts}
                onAdd={openAddFact}
                onEdit={openEditFact}
              />
            </Box>
          </Box>
        </Stack>
      </Stack>

      {/* Диалоги остаются без изменений */}
      <AvatarEditorDialog
        open={avatarEditorOpen}
        onClose={() => setAvatarEditorOpen(false)}
        personId={person.id}
        currentAvatarPath={initials}
        onSaved={() => setRefreshPhotos((r) => r + 1)}
      />
      {/* <PersonEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        person={person}
        onSave={handleSave}
        allPeople={allPeople}
      /> */}
      <EventEditorDialog
        allPeople={allPeople}
        open={eventEditorOpen}
        onClose={() => setEventEditorOpen(false)}
        initialEvent={
          editingEventIndex != null ? safeEvents[editingEventIndex] : null
        }
        onSave={saveEvent}
        onDelete={() => deleteEvent(editingEventIndex)}
        onCopyRequest={(data) => {
          setEventToCopy(data);
          setCopyDialogOpen(true);
        }}
      />
      <EventCopyDialog
        open={copyDialogOpen}
        onClose={() => setCopyDialogOpen(false)}
        allPeople={allPeople}
        eventData={eventToCopy}
        onConfirmCopy={handleConfirmCopy}
      />
      <FactsEditorDialog
        person={person}
        open={factsEditorOpen}
        onClose={() => setFactsEditorOpen(false)}
        initialFact={
          editingFactIndex != null ? safeFacts[editingFactIndex] : null
        }
        onSave={saveFact}
        onDelete={() => deleteFact(editingFactIndex)}
      />
    </Box>
  );
}
