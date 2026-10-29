import React, { useState } from "react";
import {
  Dialog,
  Checkbox,
  IconButton,
  TextField,
  Box,
  Stack,
  Typography,
  Tooltip,
  alpha,
  useTheme,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SellIcon from "@mui/icons-material/Sell";
import DialogActionButton, {
  DialogActionsBar,
} from "../../components/Dialog/DialogActionButton";

import { useTagsStore, DEFAULT_PALETTE } from "../../store/useTagsStore";

const EMPTY_ARRAY = [];

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "12px" },
};

const sectionLabelSx = {
  display: "block",
  mb: 1,
  fontWeight: 700,
  color: "text.secondary",
};

export default function TagManagementDialog({ personId }) {
  const theme = useTheme();
  const addTag = useTagsStore((state) => state.addTag);
  const deleteTag = useTagsStore((state) => state.deleteTag);
  const togglePersonTag = useTagsStore((state) => state.togglePersonTag);
  const tags = useTagsStore((state) => state.tags);

  // 3. Используем константу вместо создания нового [] в селекторе
  const myTagIds = useTagsStore(
    (state) => state.personTags[personId] || EMPTY_ARRAY,
  );

  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_PALETTE[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [openTags, setOpenTags] = useState(false);

  const canAddNew = tags.length < 8;

  const handleAddTag = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (newTagName.trim()) {
      addTag(newTagName.trim(), newTagColor);
      setNewTagName("");
      setNewTagColor(DEFAULT_PALETTE[0]);
      setIsCreating(false);
    }
  };

  const handleCancelCreate = (e) => {
    if (e) e.stopPropagation();
    setNewTagName("");
    setNewTagColor(DEFAULT_PALETTE[0]);
    setIsCreating(false);
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation(); // Останавливаем клик при закрытии
    setNewTagName("");
    setNewTagColor(DEFAULT_PALETTE[0]);
    setIsCreating(false);
    setOpenTags(false);
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpenTags(true);
        }}
        sx={{
          ml: 0.5,
          width: 20,
          height: 20,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.2) },
        }}
      >
        <AddIcon sx={{ fontSize: 14 }} />
      </IconButton>

      <Dialog
        open={openTags}
        onClose={handleClose}
        // ГЛАВНОЕ ТУТ: останавливаем всплытие всех кликов из модалки к карточке
        onClick={(e) => e.stopPropagation()}
        maxWidth={false}
        transitionDuration={{ enter: 180, exit: 140 }}
        PaperProps={{
          sx: {
            width: 440,
            maxWidth: "94vw",
            maxHeight: "calc(100vh - 64px)",
            borderRadius: "24px",
            backgroundImage: "none",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ p: 3, pb: 2, overflowY: "auto" }}>
          <Typography
            variant="h6"
            sx={{ textAlign: "center", fontWeight: 700, mb: 2.5 }}
          >
            Метки человека
          </Typography>

          {isCreating ? (
            <Box component="form" onSubmit={handleAddTag}>
              <Typography variant="overline" sx={sectionLabelSx}>
                Новая метка
              </Typography>
              <TextField
                size="small"
                fullWidth
                autoFocus
                placeholder="Название метки"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                sx={fieldSx}
                inputProps={{ maxLength: 24 }}
              />

              <Typography
                variant="overline"
                sx={{ ...sectionLabelSx, mt: 2.5 }}
              >
                Цвет
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                sx={{ mt: 0.5 }}
              >
                {DEFAULT_PALETTE.map((color) => (
                  <Box
                    component="button"
                    type="button"
                    key={color}
                    aria-label={`Выбрать цвет ${color}`}
                    onClick={() => setNewTagColor(color)}
                    sx={{
                      width: 30,
                      height: 30,
                      p: 0,
                      borderRadius: "50%",
                      bgcolor: color,
                      cursor: "pointer",
                      border: "2px solid",
                      borderColor:
                        newTagColor === color
                          ? theme.palette.text.primary
                          : "transparent",
                      outline: "none",
                      transition: "0.2s",
                      "&:hover": { transform: "scale(1.08)" },
                    }}
                  />
                ))}
              </Stack>

              <Stack
                direction="row"
                alignItems="center"
                gap={1.5}
                sx={{
                  mt: 2.5,
                  px: 1.5,
                  py: 1,
                  borderRadius: "12px",
                  bgcolor: "action.hover",
                  minHeight: 40,
                }}
              >
                <SellIcon sx={{ fontSize: 18, color: newTagColor }} />
                <Typography variant="body2" color="text.secondary" noWrap>
                  {newTagName.trim() || "Предпросмотр метки"}
                </Typography>
              </Stack>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                {tags.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: "center", px: 2, py: 3 }}
                  >
                    Меток пока нет
                  </Typography>
                ) : (
                  tags.map((tag, index) => {
                    const isChecked = myTagIds.includes(tag.id);
                    return (
                      <Box
                        key={tag.id}
                        onClick={() => togglePersonTag(personId, tag.id)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          minHeight: 44,
                          px: 1.5,
                          py: 0.75,
                          cursor: "pointer",
                          borderTop: index === 0 ? "none" : "1px solid",
                          borderColor: "divider",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={isChecked}
                          onChange={() => togglePersonTag(personId, tag.id)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            p: 0,
                            color: tag.color,
                            "&.Mui-checked": { color: tag.color },
                          }}
                        />
                        <SellIcon sx={{ fontSize: 18, color: tag.color }} />
                        <Typography
                          variant="body2"
                          fontWeight={isChecked ? 600 : 400}
                          sx={{
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tag.name}
                        </Typography>
                        <Tooltip
                          title="Удалить метку у всех людей"
                          arrow
                          placement="top"
                        >
                          <IconButton
                            size="small"
                            aria-label={`Удалить метку «${tag.name}»`}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTag(tag.id);
                            }}
                            sx={{
                              color: "text.secondary",
                              "&:hover": {
                                color: "error.main",
                                bgcolor: alpha(theme.palette.error.main, 0.1),
                              },
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    );
                  })
                )}
              </Box>

              {tags.length > 0 ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1, px: 0.5 }}
                >
                  {canAddNew
                    ? "Удаление метки убирает её у всех людей."
                    : "Достигнут лимит: 8 меток."}
                </Typography>
              ) : (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1, px: 0.5 }}
                >
                  Метки помогают отмечать людей в списке.
                </Typography>
              )}
            </>
          )}
        </Box>

        <DialogActionsBar>
          {isCreating ? (
            <>
              <DialogActionButton onClick={handleCancelCreate}>
                Отмена
              </DialogActionButton>
              <DialogActionButton
                tone="primary"
                onClick={handleAddTag}
                disabled={!newTagName.trim()}
              >
                Добавить
              </DialogActionButton>
            </>
          ) : (
            <>
              <DialogActionButton
                startIcon={<AddIcon />}
                disabled={!canAddNew}
                onClick={() => setIsCreating(true)}
              >
                Создать метку
              </DialogActionButton>
              <DialogActionButton tone="primary" onClick={handleClose}>
                Готово
              </DialogActionButton>
            </>
          )}
        </DialogActionsBar>
      </Dialog>
    </>
  );
}
