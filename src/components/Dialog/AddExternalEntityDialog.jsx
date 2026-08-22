import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  Autocomplete,
  Typography,
  Divider,
  Box,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import PetsIcon from "@mui/icons-material/Pets";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LinkIcon from "@mui/icons-material/Link";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import HomeIcon from "@mui/icons-material/Home";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CustomDatePickerDialog from "../CustomDatePickerDialog";
import { useNotificationStore } from "../../store/useNotificationStore";
import {
  ENTITY_TYPES,
  RELATION_TYPES,
  getRelationTypeLabel,
  getExternalEntityLabel,
  findPersonById,
  findExternalById,
  normalizeRelations,
  collectRelationsForSave,
} from "../../utils/externalEntities";
import useDialogSaveHotkey from "../../hooks/useDialogSaveHotkey";

export default function AddExternalEntityDialog({
  open,
  onClose,
  entity = null,
  onSaved,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isEdit = Boolean(entity?.id);
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const [type, setType] = useState("person");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [birthday, setBirthday] = useState("");
  const [birthdayPickerOpen, setBirthdayPickerOpen] = useState(false);
  const [allPeople, setAllPeople] = useState([]);
  const [allExternal, setAllExternal] = useState([]);
  const [relations, setRelations] = useState([]);
  const [saving, setSaving] = useState(false);
  const isPet = type === "pet";

  const [newRelation, setNewRelation] = useState({
    targetKind: "person",
    mainPersonId: null,
    mainExternalEntityId: null,
    relationType: "friend",
    dates: "",
    notes: "",
  });

  const relationTypeOptions = Object.entries(RELATION_TYPES).filter(
    ([key]) => (isPet ? key === "pet_owner" : key !== "pet_owner"),
  );

  useEffect(() => {
    if (!open) return;

    window.peopleAPI.getAll().then(setAllPeople);
    window.externalAPI.getAll().then((list) => setAllExternal(list || []));

    if (entity?.id) {
      setType(entity.type || "person");
      setName(entity.name || "");
      setNotes(entity.notes || "");
      setPhone(entity.phone || "");
      setEmail(entity.email || "");
      setAddress(entity.address || "");
      setBirthday(entity.birthday || "");
      setRelations(normalizeRelations(entity.relations || []));
    } else {
      setType("person");
      setName("");
      setNotes("");
      setPhone("");
      setEmail("");
      setAddress("");
      setBirthday("");
      setRelations([]);
    }

    setNewRelation({
      targetKind: "person",
      mainPersonId: null,
      mainExternalEntityId: null,
      relationType: entity?.type === "pet" ? "pet_owner" : "friend",
      dates: "",
      notes: "",
    });
  }, [open, entity?.id]);

  const getPersonLabel = (p) =>
    [`${p.id} ::`, p.firstName, p.patronymic, p.lastName || p.maidenName]
      .filter(Boolean)
      .join(" ") || `ID ${p.id}`;

  const relationTargetOptions = [
    ...allPeople
      .filter((p) => !p.archived)
      .map((p) => ({
        kind: "person",
        id: Number(p.id),
        label: `${getPersonLabel(p)} (дерево)`,
      })),
    ...allExternal
      .filter((e) => e?.id && e.id !== entity?.id)
      .map((e) => ({
        kind: "external",
        id: String(e.id),
        label: `${e.id} :: ${getExternalEntityLabel(e)} (справочник)`,
      })),
  ];

  const selectedRelationTarget = relationTargetOptions.find((opt) => {
    if (newRelation.targetKind === "person") {
      return opt.kind === "person" && Number(opt.id) === Number(newRelation.mainPersonId);
    }
    return (
      opt.kind === "external" && String(opt.id) === String(newRelation.mainExternalEntityId || "")
    );
  }) || null;

  const handleAddRelation = () => {
    if (
      (newRelation.targetKind === "person" && !newRelation.mainPersonId) ||
      (newRelation.targetKind === "external" && !newRelation.mainExternalEntityId)
    ) {
      return;
    }

    const safeRelation = isPet
      ? { ...newRelation, relationType: "pet_owner" }
      : newRelation;
    const normalized = normalizeRelations([
      {
        id: `R${Date.now()}`,
        ...safeRelation,
      },
    ]);
    if (!normalized.length) return;

    setRelations((prev) => [...prev, ...normalized]);
    setNewRelation({
      targetKind: "person",
      mainPersonId: null,
      mainExternalEntityId: null,
      relationType: isPet ? "pet_owner" : "friend",
      dates: "",
      notes: "",
    });
  };

  const handleRemoveRelation = (relId) => {
    setRelations((prev) => prev.filter((r) => r.id !== relId));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      addNotification({
        title: "Справочник",
        message: "Укажите имя",
        type: "warning",
        category: "people",
      });
      return;
    }

    setSaving(true);
    try {
      const relationsToSave = collectRelationsForSave(relations, newRelation);

      if (isEdit) {
        await window.externalAPI.update(entity.id, {
          type,
          name: name.trim(),
          notes: notes.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          birthday: birthday.trim(),
          relations: relationsToSave,
        });
        addNotification({
          title: "Справочник",
          message: "Запись обновлена",
          type: "success",
          category: "people",
          link: `/external/${entity.id}`,
        });
      } else {
        const created = await window.externalAPI.add({
          type,
          name: name.trim(),
          notes: notes.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          birthday: birthday.trim(),
          relations: relationsToSave,
        });
        addNotification({
          title: "Справочник",
          message: `Добавлено: ${created.name} (${created.id})`,
          type: "success",
          category: "people",
          link: `/external/${created.id}`,
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      addNotification({
        title: "Справочник",
        message: "Ошибка сохранения",
        type: "error",
        category: "people",
      });
    } finally {
      setSaving(false);
    }
  };

  useDialogSaveHotkey({ open, onSave: handleSave, disabled: saving });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "24px",
          backgroundImage: "none",
          bgcolor: isDark ? alpha(theme.palette.background.paper, 0.94) : "#fff",
          border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          boxShadow: theme.shadows[18],
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.25, fontWeight: 700, pb: 1 }}>
        {isPet ? (
          <PetsIcon color="primary" />
        ) : (
          <PersonOutlineIcon color="primary" />
        )}
        {isEdit ? "Редактировать запись" : "Новая запись в справочнике"}
        <IconButton onClick={onClose} sx={{ ml: "auto" }} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          <TextField
            select
            label="Тип"
            value={type}
            onChange={(e) => {
              const nextType = e.target.value;
              setType(nextType);
              setNewRelation((s) => ({
                ...s,
                relationType: nextType === "pet" ? "pet_owner" : "friend",
                dates: "",
                notes: "",
              }));
            }}
            fullWidth
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          >
            {Object.entries(ENTITY_TYPES).map(([key, { label }]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={type === "pet" ? "Кличка" : "Имя / ФИО"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />

          <TextField
            label="Описание / справка"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />

          {!isPet && (
            <>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  label="Телефон"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: <PhoneIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />,
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
                <TextField
                  label="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: <EmailIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />,
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Stack>

              <TextField
                label="Адрес"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                InputProps={{
                  startAdornment: <HomeIcon fontSize="small" sx={{ mr: 1, opacity: 0.7, alignSelf: "flex-start", mt: 0.8 }} />,
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
            </>
          )}

          <TextField
            label="Дата рождения"
            value={birthday}
            onClick={() => setBirthdayPickerOpen(true)}
            fullWidth
            InputProps={{
              readOnly: true,
              startAdornment: <CalendarTodayIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />,
              sx: { borderRadius: "12px", cursor: "pointer" },
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />

          <Divider />

          <Stack direction="row" alignItems="center" spacing={1}>
            <LinkIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={700}>
              Связи с людьми и справочником
            </Typography>
          </Stack>

          {relations.length > 0 && (
            <Stack spacing={1}>
              {relations.map((rel) => {
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
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {rel.targetKind === "external"
                          ? external
                            ? `${external.id} :: ${getExternalEntityLabel(external)}`
                            : `ID ${rel.mainExternalEntityId}`
                          : person
                            ? getPersonLabel(person)
                            : `ID ${rel.mainPersonId}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getRelationTypeLabel(rel.relationType)}
                        {rel.dates ? ` · ${rel.dates}` : ""}
                        {rel.notes ? ` — ${rel.notes}` : ""}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveRelation(rel.id)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
            </Stack>
          )}

          <Stack spacing={1.5}>
            <Autocomplete
              options={relationTargetOptions}
              getOptionLabel={(o) => o.label}
              isOptionEqualToValue={(a, b) =>
                a?.kind === b?.kind && String(a?.id) === String(b?.id)
              }
              value={selectedRelationTarget}
              onChange={(_, v) =>
                setNewRelation((s) => ({
                  ...s,
                  targetKind: v?.kind || "person",
                  mainPersonId:
                    v?.kind === "person" && v?.id != null
                      ? Number(v.id)
                      : null,
                  mainExternalEntityId:
                    v?.kind === "external" && v?.id
                      ? String(v.id)
                      : null,
                }))
              }
              slotProps={{
                popper: {
                  sx: { zIndex: (t) => t.zIndex.modal + 2 },
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Связь из дерева или справочника"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              )}
            />

            <Stack direction="row" spacing={1}>
              <TextField
                select
                label="Тип связи"
                value={isPet ? "pet_owner" : newRelation.relationType}
                onChange={(e) =>
                  setNewRelation((s) => ({
                    ...s,
                    relationType: e.target.value,
                  }))
                }
                fullWidth
                disabled={isPet}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              >
                {relationTypeOptions.map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Период"
                placeholder="1985–1990"
                value={newRelation.dates}
                onChange={(e) =>
                  setNewRelation((s) => ({ ...s, dates: e.target.value }))
                }
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
            </Stack>

            <Button
              variant="outlined"
              onClick={handleAddRelation}
              disabled={
                (newRelation.targetKind === "person" &&
                  !newRelation.mainPersonId) ||
                (newRelation.targetKind === "external" &&
                  !newRelation.mainExternalEntityId)
              }
              sx={{ borderRadius: "12px" }}
            >
              + Добавить связь
            </Button>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{
                      height: 24,
                      borderRadius: "6px",
                      px: 2.5,
                      fontWeight: "bold",
                    }}>
          Отмена
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{
                      height: 24,
                      borderRadius: "6px",
                      px: 2.5,
                      fontWeight: "bold",
                    }}>
          {isEdit ? "Сохранить" : "Добавить"}
        </Button>
      </DialogActions>

      <CustomDatePickerDialog
        open={birthdayPickerOpen}
        onClose={() => setBirthdayPickerOpen(false)}
        initialDate={birthday}
        onSave={(newDate) => {
          setBirthday(newDate);
          setBirthdayPickerOpen(false);
        }}
      />
    </Dialog>
  );
}
