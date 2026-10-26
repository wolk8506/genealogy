import React, { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Card,
  IconButton,
  Dialog,
} from "@mui/material";
import AppButton from "../../components/AppButton";
import { useSnackbar } from "notistack";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import StorageIcon from "@mui/icons-material/Storage";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ConfirmDialog from "../../components/Dialog/ConfirmDialog";
import DialogActionButton, {
  DialogActionsBar,
} from "../../components/Dialog/DialogActionButton";
import {
  groupSx,
  sectionLabelSx,
  RowIcon,
  RowDivider,
  SettingsRow,
  chevron,
} from "./settingsUi";

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
    <Card
      variant="outlined"
      sx={{
        ...cardStyle,
        borderRadius: "18px",
        border: "none",
        bgcolor: "transparent",
        boxShadow: "none",
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <RowIcon bg="blue">
          <StorageIcon sx={{ fontSize: 18 }} />
        </RowIcon>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            Места хранения данных
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            noWrap
          >
            Папки библиотеки и активное хранилище
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Stack spacing={2.5}>
          {!apiAvailable && (
            <Typography variant="caption" color="error.main">
              Мост storageAPI недоступен (preload).
            </Typography>
          )}

          <Box>
            <Typography sx={sectionLabelSx}>Папки</Typography>
            <Box sx={groupSx}>
              <Stack divider={<RowDivider />}>
                {roots.map((root) => {
                  const isActive = info && root.path === info.activeRoot;
                  return (
                    <Box
                      key={root.path}
                      sx={{
                        px: 2,
                        py: 1.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <RowIcon
                        bg={
                          isActive
                            ? "green"
                            : root.isDefault
                              ? "gray"
                              : "indigo"
                        }
                      >
                        {root.isDefault ? (
                          <LockOutlinedIcon sx={{ fontSize: 18 }} />
                        ) : (
                          <FolderOpenIcon sx={{ fontSize: 18 }} />
                        )}
                      </RowIcon>
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                        >
                          <Typography
                            variant="body2"
                            fontWeight={400}
                            sx={{ fontSize: "0.8125rem" }}
                            noWrap
                          >
                            {root.isDefault
                              ? "Стандартная папка"
                              : "Внешняя папка"}
                          </Typography>
                          {isActive && (
                            <Box
                              sx={{
                                px: 0.8,
                                height: 20,
                                borderRadius: "10px",
                                bgcolor: "action.hover",
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              <Typography
                                variant="caption"
                                fontWeight={700}
                                color="primary.main"
                              >
                                Активна
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontFamily: "monospace",
                            wordBreak: "break-all",
                            display: "block",
                            mt: 0.2,
                          }}
                        >
                          {root.path}
                        </Typography>
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
                    </Box>
                  );
                })}
              </Stack>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1, ml: 0.5, lineHeight: 1.4 }}
            >
              Стандартную папку удалить нельзя. Удаление из списка не трогает
              файлы на диске. После смены активной папки приложение
              перезапускается.
            </Typography>
          </Box>

          <Box>
            <Typography sx={sectionLabelSx}>Действия</Typography>
            <Box sx={groupSx}>
              <Stack divider={<RowDivider />}>
                <SettingsRow
                  icon={
                    <RowIcon bg="green">
                      <FolderOpenIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Добавить папку…"
                  subtitle="Выбрать другое место для библиотеки"
                  trailing={chevron}
                  onClick={() => handleAdd(false)}
                  disabled={!apiAvailable || busy}
                />
                <SettingsRow
                  icon={
                    <RowIcon bg="gray">
                      <FolderOpenIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Открыть активную папку"
                  subtitle="Показать в Finder или Проводнике"
                  trailing={chevron}
                  onClick={() => window.appAPI?.openDataFolder()}
                  disabled={!apiAvailable}
                />
              </Stack>
            </Box>
          </Box>
        </Stack>
      </Box>

      {/* Подтверждение перехода / удаления */}
      <ConfirmDialog
        open={confirm != null}
        title={confirmIsRemove ? "Удалить из списка" : "Переключение папки"}
        message={
          confirmIsRemove
            ? confirmIsActive
              ? `Удалить из списка активную папку:\n${confirm.root.path}\n\nФайлы на диске удалены НЕ будут.`
              : `Удалить из списка:\n${confirm.root.path}\n\nФайлы на диске удалены НЕ будут.`
            : `Переключиться на папку:\n${confirm?.dirPath}`
        }
        warning={
          confirmIsRemove
            ? confirmIsActive
              ? "Приложение вернётся на стандартную папку и перезапустится."
              : ""
            : "Приложение перезапустится."
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
        PaperProps={{
          sx: { borderRadius: "20px", backgroundImage: "none" },
        }}
        maxWidth="xs"
        fullWidth
      >
        <Box sx={{ p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
            Папка не похожа на библиотеку
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1.5, lineHeight: 1.5 }}
          >
            В папке есть файлы, но нет признаков библиотеки Genealogy
            (<b>genealogy-data.json</b>, папки <b>people</b>):
          </Typography>
          <Typography
            variant="caption"
            sx={{
              wordBreak: "break-all",
              fontFamily: "monospace",
              display: "block",
              p: 1,
              borderRadius: "8px",
              bgcolor: "action.hover",
            }}
          >
            {libraryCandidate?.dir}
          </Typography>
        </Box>
        <DialogActionsBar
          sx={{
            px: 3,
            pb: 3,
            flexDirection: "column",
            alignItems: "stretch",
            "& > .MuiButton-root": {
              flex: "1 1 32px",
              maxWidth: "100%",
            },
          }}
        >
          <DialogActionButton onClick={() => setLibraryCandidate(null)}>
            Отмена
          </DialogActionButton>
          <DialogActionButton onClick={() => handleAdd(true)}>
            Всё равно использовать
          </DialogActionButton>
          <DialogActionButton tone="primary" onClick={() => handleAdd(true)}>
            Создать новую здесь
          </DialogActionButton>
        </DialogActionsBar>
      </Dialog>
    </Card>
  );
};
