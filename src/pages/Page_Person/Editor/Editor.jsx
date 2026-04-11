import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
// MUI
import {
  Typography,
  Button,
  Stack,
  Divider,
  Box,
  Paper,
  Grid,
  TextField,
  MenuItem,
  InputAdornment,
  IconButton,
  Chip,
} from "@mui/material";
// ! Иконка для строки поиска
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import FemaleIcon from "@mui/icons-material/Female";
import MaleIcon from "@mui/icons-material/Male";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import FingerprintIcon from "@mui/icons-material/Fingerprint"; // Или Fingerprint, или Dna
import PersonAvatar from "../../../components/PersonAvatar";
import AvatarEditorDialog from "../AvatarEditorDialog";

// Info
import { RenderSectionParent } from "./RenderSectionParent";
import { RenderSectionFamilies } from "./RenderSectionFamilies";

// Function
import { buildFamiliesForPerson } from "../function/Function_buildFamiliesForPerson";
import { RenderPersonItem } from "../info/RenderPersonItem";

import { alpha, useTheme } from "@mui/material/styles";
import { useNotificationStore } from "../../../store/useNotificationStore";
import CustomDatePickerDialog from "../../../components/CustomDatePickerDialog";
import { ClearIcon } from "@mui/x-date-pickers";

import PersonAddIcon from "@mui/icons-material/PersonAdd"; // Если еще не импортирован
import QuickAddRelativeModal from "./QuickAddRelativeModal"; // Проверьте путь

// Вспомогательный компонент для Drag
const DraggablePersonItem = React.memo(
  ({ p, type, onDragStart, onDragEnd }) => {
    const handleDragStart = (e) => {
      // 1. Устанавливаем данные немедленно
      e.dataTransfer.setData("personId", p.id);
      e.dataTransfer.setData("personType", type);
      e.dataTransfer.effectAllowed = "link";

      // 2. Визуальную подсветку включаем чуть позже, чтобы браузер успел создать "фантом" карточки
      requestAnimationFrame(() => {
        onDragStart(type);
      });
    };

    return (
      <Box
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        sx={{
          cursor: "grab",
          mb: 1,
          userSelect: "none",
          "&:active": { cursor: "grabbing" },
          width: "100%",
        }}
      >
        <RenderPersonItem p={p} />
      </Box>
    );
  },
);

const Editor = forwardRef(
  ({ person, allPeople, handleSave, setEditOpen }, ref) => {
    const [refreshPhotos, setRefreshPhotos] = useState(0);
    const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
    // const [isFlipped, setIsFlipped] = React.useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [lookupType, setLookupType] = useState("father"); // 'father', 'mother', 'spouse', 'child'
    // !!!------------ E D I T O R ------------------------------------
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const addNotification = useNotificationStore(
      (state) => state.addNotification,
    );
    const [form, setForm] = useState({});
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const prevGen = useRef();
    const [birthdayPickerOpen, setBirthdayPickerOpen] = useState(false);
    const [diedPickerOpen, setDiedPickerOpen] = useState(false);

    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [quickAddRole, setQuickAddRole] = useState("child");
    // ----------------------------------------------------------------
    // В начале функции Editor
    const [localPeople, setLocalPeople] = useState(allPeople);

    useEffect(() => {
      setLocalPeople(allPeople);
    }, [allPeople]);
    // Внутри компонента Editor
    const [activeDragType, setActiveDragType] = useState(null); // 'father', 'mother' или null
    const [draggedPersonData, setDraggedPersonData] = useState(null); // Новое!

    const filteredGroups = useMemo(() => {
      const currentGen = Number(form.generation || 1);
      const currentId = String(form.id);
      const currentGender = form.gender; // Ориентируемся на пол в форме
      const searchLower = searchQuery.toLowerCase().trim();

      // 1. Исключаем тех, кто уже вписан в любые поля формы
      const existingIds = new Set(
        [
          currentId,
          form.father,
          form.mother,
          ...(form.spouse || []),
          ...(form.children || []),
          ...(form.siblings || []),
        ]
          .map((id) => String(id))
          .filter(Boolean),
      );

      const baseList = localPeople.filter((p) => {
        if (existingIds.has(String(p.id))) return false;
        const fullName =
          `${p.lastName || ""} ${p.firstName || ""} ${p.patronymic || ""}`.toLowerCase();
        return (
          !searchLower ||
          fullName.includes(searchLower) ||
          String(p.id).includes(searchLower)
        );
      });

      const result = {
        parents: [],
        peers: [],
        children: [],
        others: [],
      };

      baseList.forEach((p) => {
        const pGen = Number(p.generation);

        // ЛОГИКА ДЛЯ ДЕТЕЙ:
        // Мы можем добавить ребенка из списка (справа) в форму (слева), если:
        // 1. У ребенка в БД поле родителя нашего пола ПУСТО (null)
        // 2. ИЛИ у ребенка в БД родителем уже записаны МЫ (чтобы он не пропадал при пересохранении)
        const canBeAddedAsChild =
          currentGender === "male"
            ? !p.father || String(p.father) === currentId
            : !p.mother || String(p.mother) === currentId;

        // Вкладка: РОДИТЕЛИ
        if (
          (lookupType === "father" &&
            p.gender === "male" &&
            pGen === currentGen - 1) ||
          (lookupType === "mother" &&
            p.gender === "female" &&
            pGen === currentGen - 1)
        ) {
          result.parents.push(p);
        }
        // Вкладка: СУПРУГИ
        else if (lookupType === "spouse" && pGen === currentGen) {
          const targetGender = currentGender === "male" ? "female" : "male";
          if (p.gender === targetGender) result.peers.push(p);
        }
        // Вкладка: ДЕТИ (Строгая фильтрация по свободным местам)
        else if (lookupType === "child" && pGen === currentGen + 1) {
          if (canBeAddedAsChild) {
            result.children.push(p);
          }
        }
        // Вкладка: ВСЕ
        else if (lookupType === "all") {
          if (pGen === currentGen - 1) {
            // Родители (любого пола, подходящие по поколению)
            result.parents.push(p);
          } else if (lookupType === "spouse" && pGen === currentGen) {
            const targetGender = currentGender === "male" ? "female" : "male";
            if (p.gender === targetGender) result.peers.push(p);
          } else if (pGen === currentGen + 1) {
            // Дети (только если место родителя нашего пола у них свободно)
            if (canBeAddedAsChild) {
              result.children.push(p);
            }
          } else {
            // result.others.push(p);
          }
        }
      });

      return result;
    }, [localPeople, form, searchQuery, lookupType]);

    const handleDragStart = (p, type) => {
      setActiveDragType(type); // Это строка 'child', всё работает как раньше
      setDraggedPersonData(p); // А это объект для сложной логики
    };

    const handleDragEnd = React.useCallback(() => {
      setActiveDragType(null);
      setDraggedPersonData(null);
    }, []);

    // ----------------------------------------------------------------

    // Сбрасываем переворот при смене персоны
    // useEffect(() => setIsFlipped(false), [person.id]);

    // const findById = (id) => allPeople.find((p) => p.id === id);
    const findById = (id) =>
      localPeople.find((p) => String(p.id) === String(id));

    // --- БЛОК: РАСЧЕТ ОТ СОСТОЯНИЯ ФОРМЫ ---

    // 1. Находим родителей по ID из формы
    const currentFatherId = form.father ?? null;
    const currentMotherId = form.mother ?? null;
    const father = currentFatherId ? findById(currentFatherId) : null;
    const mother = currentMotherId ? findById(currentMotherId) : null;

    // 2. Дети (используем IDs из form.children, которые меняются при удалении/добавлении)
    const children = useMemo(() => {
      const ids = form.children || [];
      return ids.map(findById).filter(Boolean);
      // Добавляем localPeople в зависимости
    }, [form.children, localPeople]);

    // 3. Семьи (супруги и их общие дети)
    // Мы создаем "виртуальный" объект, объединяя исходные данные и текущую форму
    // Список семей на UI
    const families = useMemo(() => {
      const virtualPerson = { ...person, ...form };
      // Передаем localPeople внутрь функции построения семей
      let fams = buildFamiliesForPerson(virtualPerson, localPeople);

      const hasNoPartnerBlock = fams.some((f) => f.partner === null);
      if (!hasNoPartnerBlock) {
        fams.push({ partner: null, children: [], relation: null });
      }

      return fams;
      // Добавляем localPeople в зависимости
    }, [form.spouse, form.children, localPeople, person]);

    const initials = (form.firstName?.[0] || "") + (form.lastName?.[0] || "");
    // ---------------------------------------------------------------------------

    // --- ФУНКЦИИ ДЛЯ РАЗРЫВА СВЯЗЕЙ ---

    const handleUnlinkSpouse = (id) => {
      const targetId = isNaN(id) ? id : Number(id);
      setForm((prev) => ({
        ...prev,
        spouse: (prev.spouse || []).filter(
          (sid) => (isNaN(sid) ? sid : Number(sid)) !== targetId,
        ),
      }));
    };

    const handleUnlinkChild = (childId) => {
      const targetId = String(childId);

      // 1. Убираем ID из формы родителя
      setForm((prev) => ({
        ...prev,
        children: (prev.children || []).filter((id) => String(id) !== targetId),
      }));

      // 2. Убираем ссылку на родителя у самого ребенка через setLocalPeople
      setLocalPeople((prev) =>
        prev.map((p) => {
          if (String(p.id) === targetId) {
            return {
              ...p,
              [person.gender === "male" ? "father" : "mother"]: null,
            };
          }
          return p;
        }),
      );
    };

    // --- ФУНКЦИИ ДЛЯ ДОБАВЛЕНИЯ СВЯЗЕЙ (проверьте, есть ли они) ---

    const handleLinkSpouse = (personId) => {
      const finalId = isNaN(personId) ? personId : Number(personId);
      setForm((prev) => {
        const current = prev.spouse || [];
        if (current.includes(finalId)) return prev;
        return { ...prev, spouse: [...current, finalId] };
      });
    };

    const handleLinkChild = (childId, partnerId = null) => {
      const cId = isNaN(childId) ? childId : Number(childId);
      const pId = partnerId
        ? isNaN(partnerId)
          ? partnerId
          : Number(partnerId)
        : null;

      const childInAll = localPeople.find((p) => String(p.id) === String(cId));
      if (!childInAll) return;

      // Проверка на конфликт родителей
      if (pId) {
        if (form.gender === "male") {
          if (childInAll.mother && String(childInAll.mother) !== String(pId)) {
            alert("У этого ребенка уже есть другая мать.");
            return;
          }
        } else {
          if (childInAll.father && String(childInAll.father) !== String(pId)) {
            alert("У этого ребенка уже есть другой отец.");
            return;
          }
        }
      }

      // 1. Обновляем список детей в текущей форме
      setForm((prev) => ({
        ...prev,
        children: Array.from(new Set([...(prev.children || []), cId])),
      }));

      // 2. Обновляем локальный стейт людей (чтобы UI слева перерисовал связи)
      setLocalPeople((prev) =>
        prev.map((p) => {
          if (String(p.id) === String(cId)) {
            return {
              ...p,
              father: form.gender === "male" ? form.id : pId || p.father,
              mother: form.gender === "female" ? form.id : pId || p.mother,
            };
          }
          return p;
        }),
      );
    };

    const handleQuickAdded = (newPerson) => {
      // Добавляем человека в локальный список, чтобы он сразу появился в интерфейсе
      setLocalPeople((prev) => [...prev, newPerson]);

      // Автоматически привязываем его к текущей форме Editor'а
      // setForm((prev) => {
      //   if (quickAddRole === "father") return { ...prev, father: newPerson.id };
      //   if (quickAddRole === "mother") return { ...prev, mother: newPerson.id };
      //   if (quickAddRole === "spouse") {
      //     return { ...prev, spouse: [...(prev.spouse || []), newPerson.id] };
      //   }
      //   if (quickAddRole === "child") {
      //     return {
      //       ...prev,
      //       children: [...(prev.children || []), newPerson.id],
      //     };
      //   }
      //   return prev;
      // });

      addNotification({
        title: "Человек создан",
        message: `${newPerson.firstName || ""} ${newPerson.lastName || ""} успешно добавлен и привязан.`,
        type: "success",
        category: "people",
      });
    };

    // -------  E D I T O R --------------------------

    // Заполняем форму и запоминаем старое поколение
    useEffect(() => {
      if (person) {
        setForm(person);
        prevGen.current = person.generation;
      }
    }, [person]);

    // Универсальные контролы
    const handleChange = (field) => (e) => {
      let v = e.target.value;
      if (field === "generation") {
        v = Math.max(1, Number(v)); // минимум 1
        if (prevGen.current != null && v !== prevGen.current) {
          alert("Изменение поколения может нарушить связи.");
          prevGen.current = v;
        }
      }
      setForm((f) => ({ ...f, [field]: v }));
    };
    // Смена порядка семей
    const moveSpouse = (index, direction) => {
      const newSpouses = [...(form.spouse || [])];
      const targetIndex = index + direction;

      // Проверка границ массива
      if (targetIndex < 0 || targetIndex >= newSpouses.length) return;

      // Меняем местами
      const temp = newSpouses[index];
      newSpouses[index] = newSpouses[targetIndex];
      newSpouses[targetIndex] = temp;

      setForm((prev) => ({
        ...prev,
        spouse: newSpouses,
      }));
    };

    // Полная логика диффа связей
    const handleSubmit = async (e) => {
      e?.preventDefault();
      setError("");

      // валидация имени
      const hasName =
        form.firstName?.trim() ||
        form.lastName?.trim() ||
        form.patronymic?.trim() ||
        form.maidenName?.trim();

      if (!hasName) {
        setError("Укажите хотя бы имя, фамилию, отчество или девичью фамилию");
        return;
      }

      // 1) взять свежие данные
      let all = await window.peopleAPI.getAll();

      const updated = { ...form };
      const now = new Date().toISOString();

      // 2) найти текущего человека по свежим данным
      const personIdx = all.findIndex((x) => x.id === person.id);
      const current = personIdx !== -1 ? all[personIdx] : person;

      // Старые связи
      const oldFather = current.father ?? null;
      const oldMother = current.mother ?? null;
      const oldChildren = current.children || [];
      const oldSpouse = current.spouse || [];
      const oldSiblings = current.siblings || [];

      // Новые связи
      const newFather = form.father ?? null;
      const newMother = form.mother ?? null;
      const newChildren = form.children || [];
      const newSpouse = form.spouse || [];
      const newSiblings = form.siblings || [];

      // === РОДИТЕЛИ ===
      if (oldFather && oldFather !== newFather) {
        const par = all.find((x) => x.id === oldFather);
        if (par) {
          par.children = (par.children || []).filter((id) => id !== person.id);
          par.editedAt = now;
        }
      }
      if (newFather && newFather !== oldFather) {
        const par = all.find((x) => x.id === newFather);
        if (par && !(par.children || []).includes(person.id)) {
          par.children = [...(par.children || []), person.id];
          par.editedAt = now;
        }
      }

      if (oldMother && oldMother !== newMother) {
        const par = all.find((x) => x.id === oldMother);
        if (par) {
          par.children = (par.children || []).filter((id) => id !== person.id);
          par.editedAt = now;
        }
      }
      if (newMother && newMother !== oldMother) {
        const par = all.find((x) => x.id === newMother);
        if (par && !(par.children || []).includes(person.id)) {
          par.children = [...(par.children || []), person.id];
          par.editedAt = now;
        }
      }

      // === ДЕТИ ===
      console.group("ОБРАБОТКА ДЕТЕЙ (УДАЛЕНИЕ И ДОБАВЛЕНИЕ)");

      const virtualPerson = { ...person, ...form };
      const nowISO = new Date().toISOString();

      // 1) Логика УДАЛЕНИЯ (те, кто был в oldChildren, но их нет в newChildren)
      oldChildren
        .filter((cid) => !newChildren.includes(cid))
        .forEach((cid) => {
          const chIdx = all.findIndex((x) => String(x.id) === String(cid));
          if (chIdx === -1) return;

          let childObj = { ...all[chIdx] };

          // ПРАВИЛО 5: Удаляем связь ТОЛЬКО с текущим отцом/матерью
          if (form.gender === "male") {
            childObj.father = null;
          } else {
            childObj.mother = null;
          }

          // Мы НЕ трогаем второго родителя и не лезем в его список детей при удалении,
          // так как связь с тем родителем может быть актуальна для другой семьи.

          childObj.editedAt = nowISO;
          all[chIdx] = childObj;
        });

      // 2) Логика ДОБАВЛЕНИЯ И ОБНОВЛЕНИЯ
      newChildren.forEach((cid) => {
        const chIdx = all.findIndex((x) => String(x.id) === String(cid));
        if (chIdx === -1) return;

        let childObj = { ...all[chIdx] };
        let isChanged = false;

        // Привязываем текущего редактируемого родителя
        if (form.gender === "male") {
          if (String(childObj.father) !== String(person.id)) {
            childObj.father = person.id;
            isChanged = true;
          }
        } else {
          if (String(childObj.mother) !== String(person.id)) {
            childObj.mother = person.id;
            isChanged = true;
          }
        }

        // Определяем, в каком блоке (семье) находится ребенок на UI
        // Для этого используем структуру, которую строит билд-функция
        const currentFamilies = buildFamiliesForPerson(
          virtualPerson,
          allPeople,
        );
        const targetFamily = currentFamilies.find((f) =>
          f.children.some((c) => String(c.id) === String(cid)),
        );

        const newPartnerId = targetFamily?.partner?.id || null;

        // ОЧИСТКА СПИСКОВ ДЕТЕЙ У ВСЕХ СУПРУГОВ
        // Если ребенок перемещается между женами, его нужно вычеркнуть у старой
        (form.spouse || []).forEach((spouseId) => {
          const sIdx = all.findIndex((x) => String(x.id) === String(spouseId));
          if (sIdx !== -1) {
            const isTargetPartner =
              newPartnerId && String(spouseId) === String(newPartnerId);
            const hasChildInArray = (all[sIdx].children || [])
              .map(String)
              .includes(String(cid));

            if (!isTargetPartner && hasChildInArray) {
              all[sIdx].children = all[sIdx].children.filter(
                (id) => String(id) !== String(cid),
              );
              all[sIdx].editedAt = nowISO;
            }
          }
        });

        // ПРАВИЛО: Если ребенок в блоке конкретной семьи (есть партнер)
        if (newPartnerId) {
          if (form.gender === "male") {
            if (String(childObj.mother) !== String(newPartnerId)) {
              childObj.mother = newPartnerId; // Присваиваем мать
              isChanged = true;
            }
          } else {
            if (String(childObj.father) !== String(newPartnerId)) {
              childObj.father = newPartnerId; // Присваиваем отца
              isChanged = true;
            }
          }

          // Синхронизируем массив детей у этого партнера
          const partnerIdx = all.findIndex(
            (x) => String(x.id) === String(newPartnerId),
          );
          if (partnerIdx !== -1) {
            const pChildren = all[partnerIdx].children || [];
            if (!pChildren.map(String).includes(String(cid))) {
              all[partnerIdx].children = [...pChildren, cid];
              all[partnerIdx].editedAt = nowISO;
            }
          }
        } else {
          // ПРАВИЛО 4: Ребенок в блоке "Без брака".
          // Если мы отец, и у ребенка уже была какая-то мать (не из текущих супругов),
          // мы её НЕ ТРОГАЕМ (согласно правилу 5), просто оставляем как есть.
          // Если же матерью была одна из текущих жен — затираем, так как блок "вне брака".
          const currentSpouses = (form.spouse || []).map(String);
          if (form.gender === "male") {
            if (
              childObj.mother &&
              currentSpouses.includes(String(childObj.mother))
            ) {
              childObj.mother = null;
              isChanged = true;
            }
          } else {
            if (
              childObj.father &&
              currentSpouses.includes(String(childObj.father))
            ) {
              childObj.father = null;
              isChanged = true;
            }
          }
        }

        if (isChanged) {
          childObj.editedAt = nowISO;
          all[chIdx] = childObj;
        }
      });

      console.groupEnd();

      // === СУПРУГИ ===
      oldSpouse
        .filter((sid) => !newSpouse.includes(sid))
        .forEach((sid) => {
          const sp = all.find((x) => x.id === sid);
          if (sp) {
            sp.spouse = (sp.spouse || []).filter((id) => id !== person.id);
            sp.editedAt = now;
          }
        });

      newSpouse
        .filter((sid) => !oldSpouse.includes(sid))
        .forEach((sid) => {
          const sp = all.find((x) => x.id === sid);
          if (sp && !(sp.spouse || []).includes(person.id)) {
            sp.spouse = [...(sp.spouse || []), person.id];
            sp.editedAt = now;
          }
        });

      // === БРАТЬЯ/СЁСТРЫ ===
      oldSiblings
        .filter((sid) => !newSiblings.includes(sid))
        .forEach((sid) => {
          const sib = all.find((x) => x.id === sid);
          if (sib) {
            sib.siblings = (sib.siblings || []).filter(
              (id) => id !== person.id,
            );
            sib.editedAt = now;
          }
        });

      newSiblings
        .filter((sid) => !oldSiblings.includes(sid))
        .forEach((sid) => {
          const sib = all.find((x) => x.id === sid);
          if (sib && !(sib.siblings || []).includes(person.id)) {
            sib.siblings = [...(sib.siblings || []), person.id];
            sib.editedAt = now;
          }
        });

      // === Сам объект человека ===
      if (personIdx !== -1) {
        all[personIdx] = {
          ...all[personIdx], // сохраняем служебные поля
          ...updated, // накладываем изменения из формы
          editedAt: now, // обновляем дату редактирования
        };
      }

      // 3) сохранить и ре‑фетч
      await window.peopleAPI.saveAll(all);
      const fresh = await window.peopleAPI.getAll();
      setSaved(true);
      // onSave?.(fresh); // можно передать свежие данные наверх
      // onClose();

      // 1. Исправленная функция разницы массивов
      const getDiff = (oldArr = [], newArr = []) => {
        // Находим тех, кто добавился
        const added = newArr.filter((x) => !oldArr.includes(x));
        // Находим тех, кто был удален
        const removed = oldArr.filter((x) => !newArr.includes(x));

        let parts = [];
        if (added.length > 0) parts.push(`+${added.join(",")}`);
        if (removed.length > 0) parts.push(`-${removed.join(",")}`);

        return parts.join(" ");
      };

      // 2. Сбор логов (убедись, что переменные определены)
      const logs = [];

      if (oldFather !== newFather)
        logs.push(`Отец: ${oldFather || "нет"} → ${newFather || "нет"}`);
      if (oldMother !== newMother)
        logs.push(`Мать: ${oldMother || "нет"} → ${newMother || "нет"}`);

      const spouseDiff = getDiff(oldSpouse, newSpouse);
      if (spouseDiff) logs.push(`Супруги: ${spouseDiff}`);

      const childDiff = getDiff(oldChildren, newChildren);
      if (childDiff) logs.push(`Дети: ${childDiff}`);

      const sibDiff = getDiff(oldSiblings, newSiblings);
      if (sibDiff) logs.push(`Сиблинги: ${sibDiff}`);

      // 3. Финальный текст
      // Если твой компонент уведомлений не понимает \n, оставь пробел или ;
      const details = logs.length > 0 ? `\nДетали: ${logs.join("; ")}` : "";

      addNotification({
        timestamp: new Date().toISOString(),
        title: "Человек обновлен",
        message: `Обновлены данные: ${person.firstName} ${person.lastName}${details}`,
        type: "success",
        link: `/person/${person.id}`,
        category: "people",
      });
    };

    useImperativeHandle(ref, () => ({
      // 1. Проверка на наличие изменений
      isDirty: () => {
        // Важно: сравниваем именно с тем person, который пришел как пропс

        return JSON.stringify(form) !== JSON.stringify(person);
      },

      // 2. Метод сохранения (для кнопки "Сохранить")
      handleInternalSave: async () => {
        await handleSubmit();
        setEditOpen(false); // Закрываем редактор
        handleSave();
      },

      // 3. Метод отмены (для кнопки "Отмена")
      handleInternalCancel: () => {
        // setFormData(person); // Сбрасываем поля формы к исходным значениям
        // setEditOpen(false); // Просто закрываем режим редактирования
        setForm(person);
      },
    }));

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
            height: "calc(100vh - 60px)",
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
              pr: 0.7, // Отступ справа, чтобы скроллбар не "прилипал" к карточкам
              // pt: 1, // Небольшой отступ сверху
              pb: 4, // Отступ снизу, чтобы контент не упирался в край

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
              father={father}
              mother={mother}
              onUnlink={(role) => {
                // role придет как 'father' или 'mother'
                setForm((prev) => ({ ...prev, [role]: null }));

                // Опционально: уведомление о несохраненном изменении
                addNotification({
                  title: "Связь удалена",
                  message: "Не забудьте сохранить изменения",
                  type: "info",
                  category: "people",
                });
              }}
              onLink={(personId, role) => {
                // Важно: если ID в базе данных числовой, а из drag-drop пришла строка,
                // лучше привести к типу данных вашего проекта
                const finalId = isNaN(personId) ? personId : Number(personId);
                setForm((prev) => ({ ...prev, [role]: finalId }));
              }}
              activeDragType={activeDragType}
              onDragEnd={handleDragEnd}
            />

            <Box
              sx={{
                perspective: "1500px", // Глубина 3D-эффекта
                width: 770,
                minHeight: 380, // Фиксируем высоту, чтобы при перевороте не прыгало
              }}
            >
              {/* Декоративный бейдж приватности */}
              <Chip
                icon={<EditIcon />}
                label="Редактирование профиля"
                sx={{
                  position: "absolute",
                  top: -11,
                  right: 25,
                  // bgcolor: "background.paper",
                  boxShadow: 2,
                  fontWeight: "bold",
                  zIndex: 1,
                  // backdropFilter: "blur(14px)",
                  // "&MuiChip-root": { bgcolor: "background.paper" },
                }}
                color="warning"
                size="small"
                // variant="outlined"
                variant="filled"
              />
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  transformStyle: "preserve-3d",
                  // transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* --- ЛИЦЕВАЯ СТОРОНА (АНКЕТА) --- */}
                <Paper
                  elevation={0}
                  component="form" // Делаем бумагу формой
                  // onSubmit={handleSubmit}
                  sx={{
                    p: 3,
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                    backfaceVisibility: "hidden",
                    borderRadius: "24px",
                    border: "1px solid",
                    // borderColor: isFlipped ? "transparent" : "primary.main", // Подсветка границ в режиме правки
                    borderColor: "divider", // Подсветка границ в режиме правки
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    overflow: "hidden",
                    background: (theme) =>
                      theme.palette.mode === "dark"
                        ? "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)"
                        : "#fff",
                  }}
                >
                  {/* Фоновая иконка остается */}
                  <FingerprintIcon
                    sx={{
                      position: "absolute",
                      right: -20,
                      bottom: -30,
                      fontSize: "250px",
                      color: "primary.main",
                      opacity: 0.05,
                      pointerEvents: "none",
                    }}
                  />

                  <Stack
                    direction="row"
                    spacing={5}
                    alignItems="center"
                    sx={{ px: 1, zIndex: 1 }}
                  >
                    {/* ЛЕВАЯ КОЛОНКА: Аватар и технические поля */}
                    <Stack spacing={2} height={230} alignItems="center">
                      <Box
                        onClick={() => setAvatarEditorOpen(true)}
                        sx={{
                          position: "relative",
                          cursor: "pointer",
                          transition: "transform 0.2s",
                          "&:hover": { transform: "scale(1.02)" },
                        }}
                      >
                        <PersonAvatar
                          personId={person.id}
                          initials={initials}
                          size={180}
                          refresh={refreshPhotos}
                        />
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: 10,
                            right: 10,
                            bgcolor: "primary.main",
                            borderRadius: "50%",
                            p: 0.5,
                            display: "flex",
                            boxShadow: 3,
                          }}
                        >
                          <PersonIcon sx={{ color: "#fff", fontSize: 16 }} />
                        </Box>
                      </Box>
                    </Stack>

                    {/* ПРАВАЯ КОЛОНКА: Инпуты данных */}
                    <Stack spacing={1} flex={1}>
                      <Box
                        display={"flex"}
                        width={468}
                        flexDirection={"column"}
                        gap={2}
                      >
                        <Box display={"flex"} gap={2}>
                          <TextField
                            label="Имя"
                            variant="standard"
                            // size="medium"
                            fullWidth
                            value={form.firstName || ""}
                            onChange={handleChange("firstName")}
                            InputProps={{
                              sx: {
                                fontSize: "2.1rem",
                                fontWeight: 700,

                                "&.MuiInput-root::before ": {
                                  borderColor: "rgb(255 255 255 / 19%)",
                                },
                              },
                            }}
                          />
                          <TextField
                            label="Фамилия"
                            variant="standard"
                            fullWidth
                            value={form.lastName || ""}
                            onChange={handleChange("lastName")}
                            InputProps={{
                              sx: {
                                fontSize: "2.1rem",
                                fontWeight: 700,
                                "&.MuiInput-root::before ": {
                                  borderColor: "rgb(255 255 255 / 19%)",
                                },
                              },
                            }}
                          />
                        </Box>
                        <Stack direction="row" flexDirection={"column"}>
                          <Box display={"flex"} gap={1}>
                            <Typography
                              variant="subtitle1"
                              color="text.secondary"
                            >
                              Отчество:
                            </Typography>
                            <TextField
                              variant="standard"
                              size="small"
                              fullWidth
                              value={form.patronymic || ""}
                              onChange={handleChange("patronymic")}
                              InputProps={{
                                sx: {
                                  fontSize: "0.9rem",
                                  fontWeight: 700,
                                  "&.MuiInput-root::before ": {
                                    borderColor: "rgb(255 255 255 / 19%)",
                                  },
                                },
                              }}
                            />
                          </Box>

                          {form.gender === "female" && (
                            <Box display={"flex"} gap={1}>
                              <Typography
                                variant="subtitle1"
                                color="text.secondary"
                              >
                                Девичья фамилия:
                              </Typography>
                              <TextField
                                sx={{
                                  // opacity: form.gender === "male" ? 0 : 1,
                                  width: "315px",
                                }}
                                // label="Девичья фамилия"
                                variant="standard"
                                size="small"
                                fullWidth
                                disabled={form.gender === "male"}
                                value={form.maidenName || ""}
                                onChange={handleChange("maidenName")}
                                InputProps={{
                                  sx: {
                                    fontSize: "0.9rem",
                                    fontWeight: 700,
                                    "&.MuiInput-root::before ": {
                                      borderColor: "rgb(255 255 255 / 19%)",
                                    },
                                  },
                                }}
                              />
                            </Box>
                          )}
                        </Stack>

                        <Box display={"flex"} gap={2}></Box>
                      </Box>

                      <Divider sx={{ borderStyle: "dashed" }} />

                      {/* Даты */}
                      <Stack
                        width={340}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <TextField
                          label="Рождение"
                          size="small"
                          fullWidth
                          value={form.birthday || ""}
                          onClick={() => setBirthdayPickerOpen(true)}
                          InputProps={{
                            readOnly: true,
                            sx: { borderRadius: "10px" },
                          }}
                        />
                        <Typography color="text.disabled">—</Typography>
                        <TextField
                          label="Смерть"
                          size="small"
                          fullWidth
                          value={form.died || ""}
                          onClick={() => setDiedPickerOpen(true)}
                          InputProps={{
                            readOnly: true,
                            sx: { borderRadius: "10px" },
                          }}
                        />
                      </Stack>
                      <Stack direction="row" spacing={3}>
                        <Typography variant="caption" color="text.disabled">
                          <b>ID:</b> {person.id}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          <b>Поколение:</b> {person.generation}
                        </Typography>
                      </Stack>

                      {/* Кнопки управления */}
                      <Stack
                        direction="row"
                        spacing={2}
                        justifyContent="flex-end"
                        alignItems="center"
                      >
                        {/* <TextField
                          select
                          label="Пол"
                          value={form.gender || ""}
                          onChange={handleChange("gender")}
                          size="small"
                          variant="standard"
                          sx={{ minWidth: 100 }}
                        >
                          <MenuItem value="male">Мужской</MenuItem>
                          <MenuItem value="female">Женский</MenuItem>
                        </TextField> */}
                        <TextField
                          label="Пол"
                          select
                          size="small"
                          fullWidth
                          sx={{ width: "150px" }}
                          value={form.gender || ""}
                          onChange={handleChange("gender")}
                          InputProps={{
                            startAdornment: form.gender && (
                              <Box
                                sx={{
                                  mr: 1,
                                  display: "flex",
                                  color: "action.active",
                                }}
                              >
                                {form.gender === "male" ? (
                                  <MaleIcon fontSize="small" />
                                ) : (
                                  <FemaleIcon fontSize="small" />
                                )}
                              </Box>
                            ),
                          }}
                        >
                          <MenuItem value="male">Мужской</MenuItem>
                          <MenuItem value="female">Женский</MenuItem>
                        </TextField>
                      </Stack>
                    </Stack>
                  </Stack>
                </Paper>

                {/* --- ОБРАТНАЯ СТОРОНА (СИБЛИНГИ) --- */}
              </Box>
            </Box>

            <Stack spacing={1} alignItems={"center"} sx={{ width: 736 }}>
              <RenderSectionFamilies
                person={form}
                people={families} // Твои сгруппированные семьи
                soloChildren={children.filter(
                  (c) =>
                    !form.spouse?.includes(c.mother) &&
                    !form.spouse?.includes(c.father),
                )}
                onUnlinkChild={handleUnlinkChild}
                onUnlinkSpouse={handleUnlinkSpouse}
                onLinkSpouse={handleLinkSpouse}
                onLinkChild={handleLinkChild}
                activeDragType={activeDragType}
                onDragEnd={handleDragEnd}
                onMoveSpouse={moveSpouse}
                draggedPersonData={draggedPersonData} // Добавил новое setDraggedPersonData(p); // А это объект для сложной логики
              />
            </Stack>
          </Stack>
          <Divider
            orientation="vertical"
            flexItem
            sx={{ borderRightWidth: 1 }}
          />
          {/* ПРАВЫЙ БЛОК (События и Факты) - Динамическая ширина */}
          <Stack
            sx={{
              width: "clamp(386px, calc(370px + (100cqi - 1247px)), 650px)",
              flexShrink: 0,
              height: "100%",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "20px",
              bgcolor: theme.palette.background.paper,
              overflow: "hidden",
              ml: 1.3,
            }}
          >
            {/* ХЕДЕР ПАНЕЛИ */}

            <Box
              sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Поиск по имени или ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                }}
                InputProps={{
                  // Иконка поиска слева
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonSearchIcon />
                    </InputAdornment>
                  ),
                  // Кнопка очистки справа (показывается только если есть текст)
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Очистить поиск"
                        onClick={() => setSearchQuery("")} // Сбрасываем стейт
                        edge="end"
                        size="small"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />

              <Stack
                direction="row"
                spacing={0.5}
                flexWrap="wrap"
                useFlexGap
                justifyContent={"space-between"}
              >
                {[
                  { id: "all", label: "Все" },
                  { id: "father", label: "Отец" },
                  { id: "mother", label: "Мать" },

                  {
                    id: "spouse",
                    label: form.gender === "male" ? "Супруга" : "Супруг",
                  },
                  { id: "child", label: "Дети" },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    size="small"
                    variant={lookupType === tab.id ? "contained" : "outlined"}
                    onClick={() => setLookupType(tab.id)}
                    sx={{
                      borderRadius: "8px",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      textTransform: "none",
                      py: 0.3,
                    }}
                  >
                    {tab.label}
                  </Button>
                ))}
              </Stack>
            </Box>

            {/* СПИСОК С ГРУППИРОВКОЙ */}
            <Box
              sx={{
                overflowY: "auto",
                flex: 1,
                p: 2,
                "&::-webkit-scrollbar": { width: "5px" },
              }}
            >
              <Stack spacing={2}>
                {Object.entries(filteredGroups).map(([groupKey, people]) => {
                  if (people.length === 0) return null;

                  const labels = {
                    parents: "СТАРШЕЕ ПОКОЛЕНИЕ (РОДИТЕЛИ)",
                    peers: "ТЕКУЩЕЕ ПОКОЛЕНИЕ (РОВЕСНИКИ)",
                    children: "МЛАДШЕЕ ПОКОЛЕНИЕ (ДЕТИ)",
                    others: "ПРОЧИЕ",
                  };

                  return (
                    <Box key={groupKey}>
                      <Divider textAlign="left" sx={{ mb: 1.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            opacity: 0.5,
                            letterSpacing: 1,
                          }}
                        >
                          {labels[groupKey]} [{people.length}]
                        </Typography>
                      </Divider>
                      <Stack spacing={1}>
                        {people.map((p) => {
                          // 1. Вычисляем тип для Drag-and-Drop
                          let dragType = lookupType;

                          if (lookupType === "all") {
                            const currentGen = Number(
                              form.generation || person.generation || 1,
                            );
                            const pGen = Number(p.generation);
                            const diff = pGen - currentGen;

                            if (diff === -1) {
                              dragType =
                                p.gender === "male" ? "father" : "mother";
                            } else if (diff === 0) {
                              dragType = "spouse";
                            } else if (diff === 1) {
                              dragType = "child";
                            }
                          }

                          return (
                            <DraggablePersonItem
                              key={p.id}
                              p={p}
                              type={dragType}
                              // ИСПРАВЛЕНИЕ: явно передаем объект 'p' в функцию handleDragStart
                              onDragStart={() => handleDragStart(p, dragType)}
                              onDragEnd={handleDragEnd}
                            />
                          );
                        })}
                      </Stack>
                    </Box>
                  );
                })}

                {/* Состояние "Пусто" */}
                {Object.values(filteredGroups).every((g) => g.length === 0) && (
                  <Typography
                    variant="caption"
                    align="center"
                    sx={{ mt: 5, opacity: 0.5 }}
                  >
                    Нет подходящих кандидатов
                  </Typography>
                )}
                {/* --- Кнопка быстрого создания --- */}
                {lookupType !== "all" && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    startIcon={<PersonAddIcon />}
                    sx={{
                      mb: 2,
                      borderRadius: "16px",
                      height: "64px",
                      borderStyle: "dashed",
                    }}
                    onClick={() => {
                      setQuickAddRole(lookupType);
                      setQuickAddOpen(true);
                    }}
                  >
                    {lookupType === "father"
                      ? "Создать нового Отца"
                      : lookupType === "mother"
                        ? "Создать новую Мать"
                        : lookupType === "spouse"
                          ? form.gender === "male"
                            ? "Создать новую Супругу"
                            : "Создать нового Супруга"
                          : "Создать нового Ребенка"}
                  </Button>
                )}
              </Stack>
            </Box>
          </Stack>
        </Stack>

        {/* Д И А Л О Г И */}

        <QuickAddRelativeModal
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          onAdded={handleQuickAdded}
          currentPerson={form} // Передаем текущее состояние формы
          role={quickAddRole}
          allPeople={localPeople}
        />

        <AvatarEditorDialog
          open={avatarEditorOpen}
          onClose={() => setAvatarEditorOpen(false)}
          personId={person.id}
          currentAvatarPath={initials}
          onSaved={() => setRefreshPhotos((r) => r + 1)}
        />

        <CustomDatePickerDialog
          open={birthdayPickerOpen}
          onClose={() => setBirthdayPickerOpen(false)}
          initialDate={form.birthday}
          showTime={true} // включить выбор времени
          onSave={(newDate) =>
            handleChange("birthday")({ target: { value: newDate } })
          }
        />
        <CustomDatePickerDialog
          open={diedPickerOpen}
          onClose={() => setDiedPickerOpen(false)}
          initialDate={form.died}
          showTime={true} // включить выбор времени
          onSave={(newDate) =>
            handleChange("died")({ target: { value: newDate } })
          }
        />
      </Box>
    );
  },
);

export default Editor;
