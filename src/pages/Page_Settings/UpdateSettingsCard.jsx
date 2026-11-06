import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Box,
  Typography,
  Stack,
  LinearProgress,
  Collapse,
  ButtonBase,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AppButton from "../../components/AppButton";
import { useUpdateStore } from "../../store/useUpdateStore";
import { parseReleaseNotes } from "./releaseNotes";
import { ReleaseNotesList } from "./ReleaseNotesList";
import {
  groupSx,
  sectionLabelSx,
  RowIcon,
  SettingsRow,
} from "./settingsUi";

export const UpdateSettingsCard = ({ cardStyle }) => {
  const version = useUpdateStore((s) => s.currentVersion);
  const platform = useUpdateStore((s) => s.platform);
  const updateInfo = useUpdateStore((s) => s.latest);
  const checking = useUpdateStore((s) => s.checking);
  const progress = useUpdateStore((s) => s.progress);
  const downloaded = useUpdateStore((s) => s.downloaded);
  const installing = useUpdateStore((s) => s.installing);
  const error = useUpdateStore((s) => s.error);
  const check = useUpdateStore((s) => s.check);
  const download = useUpdateStore((s) => s.download);
  const install = useUpdateStore((s) => s.install);

  useEffect(() => {
    const store = useUpdateStore.getState();
    store.bind();
    store.loadMeta();
    store.check();
    // Подписки живут в сторе и остаются живыми при размонтировании карточки,
    // иначе диалог обновления и другие страницы теряют прогресс.
  }, []);

  const [notesOpen, setNotesOpen] = useState(false);

  const hasUpdate =
    !!updateInfo && !!version && updateInfo.version !== version;

  const notes = useMemo(
    () => (hasUpdate ? parseReleaseNotes(updateInfo?.releaseNotes) : []),
    [hasUpdate, updateInfo],
  );

  return (
    <Card
      variant="outlined"
      sx={{
        ...cardStyle,
        borderRadius: "16px",
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
          <SystemUpdateAltIcon sx={{ fontSize: 18 }} />
        </RowIcon>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            Обновление системы
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            noWrap
          >
            Проверка и установка новых версий
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={sectionLabelSx}>Версия</Typography>
            <Box sx={groupSx}>
              <SettingsRow
                icon={
                  <RowIcon bg="blue">
                    <InfoIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title={`Версия ПО: ${version || "загрузка…"}`}
                subtitle={`Платформа: ${platform || "—"}`}
                trailing={
                  <Box
                    sx={{
                      px: 1,
                      height: 22,
                      borderRadius: "999px",
                      bgcolor: "action.hover",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="text.secondary"
                    >
                      Стабильная
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Box>

          <Box>
            <Typography sx={sectionLabelSx}>Обновления</Typography>
            <Box sx={groupSx}>
              {error ? (
                <Box sx={{ px: 2, py: 1.6 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <RowIcon bg="red">
                      <ErrorOutlineIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="error.main"
                      >
                        Ошибка обновления
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        noWrap
                      >
                        {error}
                      </Typography>
                    </Box>
                    <AppButton preset="secondary" onClick={check}>
                      Повторить
                    </AppButton>
                  </Stack>
                </Box>
              ) : !updateInfo || checking ? (
                <Box sx={{ px: 2, py: 2 }}>
                  <LinearProgress sx={{ height: 6, borderRadius: 3 }} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 1 }}
                  >
                    Проверка обновлений…
                  </Typography>
                </Box>
              ) : !hasUpdate ? (
                <SettingsRow
                  icon={
                    <RowIcon bg="green">
                      <CheckCircleIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Установлена последняя версия"
                  subtitle={`Версия ${version}`}
                />
              ) : (
                <Box sx={{ px: 2, py: 2 }}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ mb: notes.length > 0 ? 0.75 : 2 }}
                  >
                    <RowIcon bg="blue">
                      <CloudDownloadIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        Доступна версия {updateInfo.version}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Загрузите и перезапустите приложение
                      </Typography>
                    </Box>
                  </Stack>

                  {notes.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <ButtonBase
                        onClick={() => setNotesOpen((value) => !value)}
                        aria-expanded={notesOpen}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          px: 1,
                          py: 0.5,
                          ml: -1,
                          borderRadius: "10px",
                          transition: "background-color 140ms ease",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <ExpandMoreIcon
                          aria-hidden
                          sx={{
                            fontSize: 18,
                            color: "text.secondary",
                            transform: notesOpen
                              ? "rotate(0deg)"
                              : "rotate(-90deg)",
                            transition: "transform 160ms ease",
                          }}
                        />
                        <Typography variant="body2" fontWeight={600}>
                          Что нового в {updateInfo.version}
                        </Typography>
                      </ButtonBase>
                      <Collapse in={notesOpen} timeout={180} unmountOnExit>
                        <Box sx={{ mt: 1 }}>
                          <ReleaseNotesList
                            groups={notes}
                            sx={{ maxHeight: 260, overflowY: "auto" }}
                          />
                        </Box>
                      </Collapse>
                    </Box>
                  )}

                  {progress > 0 && !downloaded ? (
                    <Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mt: 1 }}
                      >
                        Загрузка: {progress}%
                      </Typography>
                    </Box>
                  ) : downloaded ? (
                    <AppButton
                      preset="primary"
                      startIcon={<SystemUpdateAltIcon />}
                      onClick={install}
                      disabled={installing}
                      sx={{ width: "100%" }}
                    >
                      {installing
                        ? "Запуск установщика…"
                        : "Установить и перезапустить"}
                    </AppButton>
                  ) : (
                    <AppButton
                      preset="primary"
                      startIcon={<CloudDownloadIcon />}
                      onClick={download}
                      sx={{ width: "100%" }}
                    >
                      Скачать обновление
                    </AppButton>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Stack>
      </Box>
    </Card>
  );
};
