import React, { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Card,
  Chip,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import AppButton from "../../components/AppButton";
import { useSnackbar } from "notistack";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import StorageIcon from "@mui/icons-material/Storage";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ConfirmDialog from "../../components/Dialog/ConfirmDialog";

export const StorageCard = ({ cardStyle }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // { kind: 'switch'|'remove', ... }
  const [libraryCandidate, setLibraryCandidate] = useState(null); // { dir }

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

  const applyRoots = (res) => {
    if (res?.roots) {
      setInfo((prev) => (prev ? { ...prev, roots: res.roots } : prev));
    }
  };

  const handleAdd = async (force = false) => {
    try {
      const dir = force ? libraryCandidate?.dir : await window.storageAPI.choose();
      if (!dir) return;
      const res = await window.storageAPI.add(dir, force ? { force: true } : undefined);
      if (res?.needsConfirm) {
        setLibraryCandidate({ dir: res.dirPath || dir });
        return;
      }
      setLibraryCandidate(null);
      applyRoots(res);
      enqueueSnackbar("Папка добавлена в список", { variant: "success" });
    } catch (err) {
      enqueueSnackbar("Не удалось добавить папку: " + err.message, {
        variant: "error",
      });
    }
  };

  const doSwitch = async (dirPath) => {
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
      setConfirm(null);
    }
  };

  const doRemove = async (rootPath) => {
    setBusy(true);
    try {
      const res = await window.storageAPI.remove(rootPath);
      if (res?.restart) {
        enqueueSnackbar("Возврат на стандартную папку. Перезапуск…", {
          variant: "success",
        });
      } else {
        applyRoots(res);
        enqueueSnackbar("Удалено из списка", { variant: "success" });
      }
    } catch (err) {
      enqueueSnackbar("Не удалось удалить: " + err.message, {
        variant: "error",
      });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const roots = info?.roots ?? [];
  const confirmIsRemove = confirm?.kind === "remove";
  const confirmIsActive =
    confirmIsRemove && info && confirm.root.path === info.activeRoot;

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
                    <AppButton
                      preset="secondary"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setConfirm({ kind: "switch", dirPath: root.path });
                      }}
                      disabled={!apiAvailable || busy}
                      sx={{ flexShrink: 0 }}
                    >
                      Перейти
                    </AppButton>
                  )}
                  {!root.isDefault && (
                    <IconButton
                      size="small"
                      color="error"
                      title="Удалить из списка (файлы останутся)"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setConfirm({ kind: "remove", root });
                      }}
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
            <AppButton
              preset="secondary"
              fullWidth
              startIcon={<FolderOpenIcon />}
              onClick={(e) => {
                e.currentTarget.blur();
                handleAdd(false);
              }}
              disabled={!apiAvailable || busy}
            >
              Добавить папку…
            </AppButton>
            <AppButton
              preset="ghost"
              fullWidth
              onClick={() => window.appAPI?.openDataFolder()}
              disabled={!apiAvailable}
            >
              Открыть активную
            </AppButton>
          </Stack>
        </Stack>
      </Box>

      {/* Подтверждение перехода / удаления */}
      <ConfirmDialog
        open={confirm != null}
        title={confirmIsRemove ? "Удалить из списка" : "Переключение папки"}
        message={
          confirmIsRemove
            ? confirmIsActive
              ? `Удалить из списка активную папку:\n${confirm.root.path}\n\nПриложение вернётся на стандартную папку и перезапустится. Файлы на диске удалены НЕ будут.`
              : `Удалить из списка:\n${confirm.root.path}\n\nФайлы на диске удалены НЕ будут.`
            : `Переключиться на папку:\n${confirm?.dirPath}\n\nПриложение перезапустится.`
        }
        confirmLabel={confirmIsRemove ? "Удалить" : "Переключиться"}
        confirmColor={confirmIsRemove ? "error" : "primary"}
        busy={busy}
        onClose={(ok) => {
          if (!ok) {
            setConfirm(null);
            return;
          }
          if (confirmIsRemove) doRemove(confirm.root.path);
          else doSwitch(confirm.dirPath);
        }}
      />

      {/* Папка не похожа на библиотеку */}
      <Dialog
        open={libraryCandidate != null}
        onClose={() => setLibraryCandidate(null)}
        PaperProps={{ sx: { borderRadius: 3 } }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Папка не похожа на библиотеку
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            В папке есть файлы, но нет признаков библиотеки Genealogy
            (`genealogy-data.json`, папки `people`):
          </DialogContentText>
          <Typography
            variant="caption"
            sx={{
              wordBreak: "break-all",
              fontFamily: "monospace",
              display: "block",
            }}
          >
            {libraryCandidate?.dir}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, flexDirection: "column", gap: 1, alignItems: "stretch" }}>
          <AppButton preset="primary" onClick={() => handleAdd(true)}>
            Создать новую здесь
          </AppButton>
          <AppButton preset="secondary" onClick={() => handleAdd(true)}>
            Всё равно использовать
          </AppButton>
          <AppButton preset="ghost" onClick={() => setLibraryCandidate(null)}>
            Отмена
          </AppButton>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
