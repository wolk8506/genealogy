import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  Divider,
  Grid,
  Button,
  Stack,
  Chip,
  Paper,
} from "@mui/material";

import GitHubIcon from "@mui/icons-material/GitHub";
import InfoIcon from "@mui/icons-material/Info";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ComputerIcon from "@mui/icons-material/Computer";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";

import AppDiagnostic from "./AppInfo";

import appIcon from "../../img/app_icon.png";
import developer from "../../img/developer.png";

export default function AboutPage() {
  const [version, setVersion] = useState("");
  const [platform, setPlatform] = useState("");
  const [buildDate, setBuildDate] = useState("");

  useEffect(() => {
    window.appAPI.getVersion().then(setVersion);
    window.appAPI.getPlatform().then(setPlatform);
    window.appAPI.getBuildDate?.().then(setBuildDate);
  }, []);

  return (
    <Box sx={{ display: "flex", justifyContent: "center", pb: 1, mt: 4 }}>
      <Card
        sx={{
          width: "100%",
          maxWidth: 1839, // <--- Увеличили до целевой ширины
          borderRadius: 4,
          boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
          overflow: "visible",
          position: "relative",
        }}
      >
        <Chip
          icon={<VerifiedUserIcon style={{ fontSize: 16, color: "#2e7d32" }} />}
          label="100% Offline & Private"
          sx={{
            position: "absolute",
            top: -16,
            right: 32,
            bgcolor: "background.paper",
            boxShadow: 2,
            fontWeight: "bold",
            px: 1,
          }}
          color="success"
          variant="outlined"
        />

        <CardContent sx={{ p: { xs: 4, xl: 6 } }}>
          <Grid container spacing={{ xs: 6, xl: 10 }}>
            {/* ЛЕВАЯ КОЛОНКА */}
            {/* На больших экранах делаем её у́же (3 или 4 доли из 12), чтобы текст не растягивался */}
            <Grid item size={{ xs: 12, md: 5, lg: 4, xl: 3 }}>
              <Stack spacing={4}>
                <Stack direction="row" spacing={3} alignItems="center">
                  <Avatar
                    src={appIcon}
                    sx={{
                      width: 100,
                      height: 100,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      bgcolor: "transparent",
                    }}
                    variant="rounded"
                  />
                  <Box>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 800,
                        letterSpacing: -0.5,
                        // fontSize: "2.46rem",
                        fontSize: "clamp(2.46rem, 2.3vw, 3.5rem)",
                      }}
                    >
                      Генеалогия
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      color="text.secondary"
                      sx={{ fontStyle: "italic", mt: 0.5 }}
                    >
                      Хранитель вашей семейной истории
                    </Typography>
                  </Box>
                </Stack>

                <Typography
                  variant="body1"
                  sx={{
                    color: "text.primary",
                    lineHeight: 1.8,
                    textAlign: "left",
                  }}
                >
                  Это приложение создано для того, чтобы зафиксировать тонкие
                  нити памяти. Мы верим, что история каждой семьи уникальна,
                  поэтому сделали упор на
                  <b> автономность</b>: ваши данные не покидают вашего
                  компьютера.
                </Typography>

                <Divider sx={{ borderStyle: "dashed" }} />

                <Box sx={{ width: "100%", maxWidth: 375 }}>
                  <Grid container spacing={1.5}>
                    {/* Верхний ряд: Две маленькие карточки */}
                    <Grid item size={{ xs: 6 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: "action.hover",
                          borderRadius: 4,
                          textAlign: "center",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <InfoIcon
                          sx={{ color: "primary.main", mb: 1, fontSize: 20 }}
                        />
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.disabled"
                          sx={{
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: 10,
                          }}
                        >
                          Версия
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {version}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item size={{ xs: 6 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: "action.hover",
                          borderRadius: 4,
                          textAlign: "center",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <CalendarTodayIcon
                          sx={{ color: "secondary.main", mb: 1, fontSize: 20 }}
                        />
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.disabled"
                          sx={{
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: 10,
                          }}
                        >
                          Сборка
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {buildDate}
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Средний ряд: Разработчик */}
                    <Grid item size={{ xs: 12 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          borderRadius: 4,
                          border: "1px solid",
                          // В темной теме делаем границу чуть заметнее
                          borderColor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255,255,255,0.08)"
                              : "divider",

                          // ИЗЮМИНКА: Mesh-градиент на фоне
                          position: "relative",
                          overflow: "hidden", // Чтобы градиенты не вылезали за скругления
                          background: (theme) =>
                            theme.palette.mode === "dark"
                              ? `
          linear-gradient(135deg, #1a1a1a 0%, #121212 100%),
          radial-gradient(at 0% 0%, rgba(33, 150, 243, 0.15) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(156, 39, 176, 0.15) 0px, transparent 50%)
        `
                              : "background.paper", // Для светлой темы оставляем обычный фон
                        }}
                      >
                        {/* Дополнительный блик поверх всего для объема */}
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: "50%",
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)",
                            pointerEvents: "none",
                          }}
                        />

                        <Avatar
                          src={developer}
                          sx={{
                            width: 42, // Чуть увеличили для веса
                            height: 42,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.3)", // Тень глубже
                            border: "2px solid rgba(255,255,255,0.1)", // Ободок для аватара
                            zIndex: 1, // Чтобы быть поверх фона
                          }}
                        />
                        <Box sx={{ zIndex: 1 }}>
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                              fontSize: "0.65rem",
                            }}
                          >
                            Main Developer
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 800,
                              lineHeight: 1.2,
                              fontSize: "1rem",
                            }}
                          >
                            nebula.9371
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                    {/* Нижний ряд: Система (на всю ширину) */}
                    <Grid item size={{ xs: 12 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: 4,
                          background:
                            "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                          color: "white",
                          boxShadow: "0 4px 20px rgba(33, 150, 243, 0.3)",
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <ComputerIcon />
                          <Box sx={{ overflow: "hidden" }}>
                            <Typography
                              variant="caption"
                              sx={{
                                opacity: 0.8,
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
                              Рабочее окружение
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                fontFamily: "monospace",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {platform}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ pt: 2 }}>
                  <Button
                    startIcon={<GitHubIcon />}
                    href="https://github.com/wolk8506/genealogy"
                    target="_blank"
                    // variant="contained"
                    disableElevation
                    fullWidth
                    sx={{
                      borderRadius: 3,
                      py: 1.5,
                      textTransform: "none",
                      fontWeight: "bold",
                      fontSize: "1rem",
                    }}
                  >
                    Исходный код проекта
                  </Button>
                </Box>
              </Stack>
            </Grid>

            {/* ПРАВАЯ КОЛОНКА (Остальное пространство) */}
            <Grid item size={{ xs: 12, md: 7, lg: 8, xl: 9 }}>
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <AppDiagnostic />

                <Typography
                  variant="caption"
                  sx={{
                    color: "text.disabled",
                    textAlign: "right",
                    mt: "auto",
                    pt: 4,
                  }}
                >
                  Сделано с уважением к прошлому ради будущего{" "}
                  <span style={{ fontSize: "1.2rem", marginLeft: "4px" }}>
                    🌿
                  </span>
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box sx={{ color: "action.active", display: "flex" }}>{icon}</Box>
      <Box>
        <Typography
          variant="caption"
          display="block"
          color="text.disabled"
          sx={{ lineHeight: 1 }}
        >
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {value || "—"}
        </Typography>
      </Box>
    </Box>
  );
}
