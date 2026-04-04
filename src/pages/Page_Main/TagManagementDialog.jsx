import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  IconButton,
  Button,
  TextField,
  Box,
  Stack,
  Typography,
  alpha,
  useTheme,
  CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SellIcon from "@mui/icons-material/Sell";

import { useTagsStore, DEFAULT_PALETTE } from "../../store/useTagsStore";

const EMPTY_ARRAY = [];

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
      setIsCreating(false);
    }
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation(); // Останавливаем клик при закрытии
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
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Метки человека</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <List sx={{ pt: 0 }}>
            {tags.map((tag) => {
              const isChecked = myTagIds.includes(tag.id);
              return (
                <ListItem
                  key={tag.id}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation(); // На всякий случай
                        deleteTag(tag.id);
                      }}
                      size="small"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText
                    sx={{ pl: 2, m: 0, cursor: "pointer" }}
                    onClick={() => togglePersonTag(personId, tag.id)}
                    primary={
                      <Box display="flex" alignItems="center" gap={1.5} py={1}>
                        <Checkbox
                          checked={isChecked}
                          size="small"
                          sx={{
                            p: 0,
                            color: tag.color,
                            "&.Mui-checked": { color: tag.color },
                          }}
                        />
                        <SellIcon
                          sx={{
                            color: tag.color,
                          }}
                        />
                        <Typography variant="body2">{tag.name}</Typography>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>

          <Box
            sx={{
              p: 2,
              bgcolor: alpha(theme.palette.divider, 0.05),
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            {!isCreating ? (
              <Button
                fullWidth
                startIcon={<AddIcon />}
                disabled={!canAddNew}
                onClick={() => setIsCreating(true)}
                sx={{ textTransform: "none" }}
              >
                {canAddNew
                  ? "Создать новую метку"
                  : "Достигнут лимит меток (8)"}
              </Button>
            ) : (
              <Stack spacing={2}>
                <TextField
                  size="small"
                  placeholder="Название метки..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  autoFocus
                />
                <Stack direction="row" spacing={1} justifyContent="center">
                  {DEFAULT_PALETTE.map((color) => (
                    <Box
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        bgcolor: color,
                        cursor: "pointer",
                        border: "2px solid",
                        borderColor:
                          newTagColor === color
                            ? theme.palette.text.primary
                            : "transparent",
                        transition: "0.2s",
                      }}
                    />
                  ))}
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button fullWidth variant="contained" onClick={handleAddTag}>
                    Добавить
                  </Button>
                  <Button fullWidth onClick={() => setIsCreating(false)}>
                    Отмена
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
