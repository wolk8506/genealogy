import React, { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  Card,
  Chip,
  IconButton,
  Divider,
} from "@mui/material";
import { useSnackbar } from "notistack";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import StorageIcon from "@mui/icons-material/Storage";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

export const StorageCard = ({ cardStyle }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const apiAvailable = typeof window !== "undefined" && !!window.storageAPI;

  const refresh = async () => {
    if (!apiAvailable) return;
    try {
      const data = await window.storageAPI.get();
      setInfo(data);
    } catch (err) {
      enqueueSnackbar("Не удалось получить места хранения: " + err.message, {
        variant: "error",
      });
    }
  };

  useEffect(() => {
    refresh();
    if (!apiAvailable || !window.storageAPI.onFallback) return undefined;
    const off = window.storageAPI.onFallback((fb) => {
      enqueueSnackbar(
        `Папка недоступна, включён стандартный путь: ${fb?.to ?? ""}`,
        { variant: "warning", autoHideDuration: 8000 },
      );
      refresh();
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    try {
      const dir = await window.storageAPI.choose();
      if (!dir) return;
      const res = await window.storageAPI.add(dir);
      setInfo((prev) => (prev ? { ...prev, roots: res.roots } : prev));
      enqueueSnackbar("Папка добавлена в список", { variant: "success" });
    } catch (err) {
      enqueueSnackbar("Не удалось добавить папку: " + err.message, {
        variant: "error",
      });
    }
  };

  const handleSwitch = async (dirPath) => {
    if (
      !window.confirm(
        `Переключиться на папку:\n${dirPath}\n\nПриложение перезапустится. Продолжить?`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await window.storageAPI.switch(dirPath);
      if (res?.alreadyActive) {
        enqueueSnackbar("Эта папка уже активна", { variant: "info" });
      } else {
        enqueueSnackbar("Переключено. Приложение перезапускается…", {
          variant: "success",
        });
      }
    } catch (err) {
      enqueueSnackbar("Не удалось переключиться: " + err.message, {
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (root) => {
    const isActive = info && root.path === info.activeRoot;
    if (
      !window.confirm(
        isActive
          ? `Удалить из списка активную папку:\n${root.path}\n\nПриложение вернётся на стандартную папку и перезапустится. Файлы на диске удалены НЕ будут. Продолжить?`
          : `Удалить из списка:\n${root.path}\n\nФайлы на диске удалены НЕ будут. Продолжить?`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await window.storageAPI.remove(root.path);
      if (res?.restart) {
        enqueueSnackbar("Возврат на стандартную папку. Перезапуск…", {
          variant: "success",
        });
      } else {
        setInfo((prev) =>
          prev ? { ...prev, roots: res.roots } : prev,
        );
        enqueueSnackbar("Удалено из списка", { variant: "success" });
      }
    } catch (err) {
      enqueueSnackbar("Не удалось удалить: " + err.message, {
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const roots = info?.roots ?? [];

  return (
    <Card variant="outlined" sx={{ ...cardStyle }}>
      {/* ШАПКА */}
      <Box
        sx={{
          p: 2,
          bgcolor: "action.hover",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          gap: 1.5,
        }}
      >
        <StorageIcon color="primary" sx={{ fontSize: 20 }} />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: 1,
          }}
        >
          Места хранения данных
        </Typography>
      </Box>

      <Box sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          {!apiAvailable && (
            <Typography variant="caption" color="error">
              Мост storageAPI недоступен (preload).
            </Typography>
          )}

          {roots.map((root) => {
            const isActive = info && root.path === info.activeRoot;
            return (
              <Box key={root.path}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ width: "100%" }}
                >
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        wordBreak: "break-all",
                        fontFamily: "monospace",
                        display: "block",
                      }}
                    >
                      {root.path}
                    </Typography>
                    <Box sx={{ mt: 0.5, display: "flex", gap: 0.5 }}>
                      {root.isDefault ? (
                        <Chip
                          icon={<LockOutlinedIcon />}
                          label="Стандартная"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Chip label="Внешняя" size="small" variant="outlined" />
                      )}
                      {isActive && (
                        <Chip
                          icon={<CheckCircleOutlineIcon />}
                          label="Активна"
                          size="small"
                          color="primary"
                        />
                      )}
                    </Box>
                  </Box>
                  {!isActive && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleSwitch(root.path)}
                      disabled={!apiAvailable || busy}
                      sx={{ textTransform: "none", flexShrink: 0 }}
                    >
                      Перейти
                    </Button>
                  )}
                  {!root.isDefault && (
                    <IconButton
                      size="small"
                      color="error"
                      title="Удалить из списка (файлы останутся)"
                      onClick={() => handleRemove(root)}
                      disabled={!apiAvailable || busy}
                      sx={{ flexShrink: 0 }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
                <Divider sx={{ mt: 1.5 }} />
              </Box>
            );
          })}

          <Typography variant="caption" color="text.secondary">
            Стандартную папку удалить нельзя. Удаление из списка не трогает файлы
            на диске. После смены активной папки приложение перезапускается.
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<FolderOpenIcon />}
              onClick={handleAdd}
              disabled={!apiAvailable || busy}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Добавить папку…
            </Button>
            <Button
              fullWidth
              size="small"
              variant="text"
              onClick={() => window.appAPI?.openDataFolder()}
              disabled={!apiAvailable}
              sx={{ textTransform: "none" }}
            >
              Открыть активную
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Card>
  );
};
