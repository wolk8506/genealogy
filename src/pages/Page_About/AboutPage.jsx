import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  Divider,
  Grid,
  Button,
  Stack,
  Chip,
} from "@mui/material";

// Иконки
import GitHubIcon from "@mui/icons-material/GitHub";
import InfoIcon from "@mui/icons-material/Info";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ComputerIcon from "@mui/icons-material/Computer";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { Tooltip } from "@mui/material";

// Твой новый компонент технологий (предположим, он тут)
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
    <Box sx={{ display: "flex", justifyContent: "center", p: 3, mt: 4 }}>
      <Card
        sx={{
          maxWidth: 650,
          borderRadius: 4,
          boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
          overflow: "visible", // Чтобы декоративные элементы могли выходить за края
          position: "relative",
        }}
      >
        {/* Декоративный бейдж приватности */}
        <Chip
          icon={<VerifiedUserIcon style={{ fontSize: 16, color: "#2e7d32" }} />}
          label="100% Offline & Private"
          sx={{
            position: "absolute",
            top: -12,
            right: 20,
            bgcolor: "background.paper",
            boxShadow: 2,
            fontWeight: "bold",
          }}
          color="success"
          variant="outlined"
        />

        <CardContent sx={{ pt: 4 }}>
          <Stack spacing={3} alignItems="center" sx={{ width: "100%" }}>
            {/* Лого и Заголовок */}
            <Stack
              direction="row"
              spacing={3}
              alignItems="center"
              sx={{ width: "100%" }}
            >
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
                  variant="h4"
                  sx={{ fontWeight: 800, letterSpacing: -0.5 }}
                >
                  Генеалогия
                </Typography>
                <Typography
                  variant="subtitle1"
                  color="text.secondary"
                  sx={{ fontStyle: "italic" }}
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
                textAlign: "justify",
              }}
            >
              Это приложение создано для того, чтобы зафиксировать тонкие нити
              памяти. Мы верим, что история каждой семьи уникальна, поэтому
              сделали упор на
              <b> автономность</b>: ваши данные не покидают вашего компьютера.
            </Typography>

            <Divider sx={{ width: "100%", borderStyle: "dashed" }} />

            {/* Технические детали в виде сетки */}
            <Grid container spacing={3} sx={{ width: "570px" }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Stack spacing={2}>
                  <DetailItem
                    icon={<InfoIcon fontSize="small" />}
                    label="Версия"
                    value={version}
                  />
                  <DetailItem
                    icon={<CalendarTodayIcon fontSize="small" />}
                    label="Сборка"
                    value={buildDate}
                  />
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      src={developer}
                      sx={{ width: 24, height: 24, border: "1px solid #ddd" }}
                    />
                    <Box>
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.disabled"
                        sx={{ lineHeight: 1 }}
                      >
                        Разработчик
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        nebula.9371
                      </Typography>
                    </Box>
                  </Box>
                  <DetailItem
                    icon={<ComputerIcon fontSize="small" />}
                    label="Система"
                    value={platform}
                  />
                </Stack>
              </Grid>
            </Grid>

            {/* Вставляем наш новый блок технологий в упрощенном виде или под спойлер */}
            <Box sx={{ width: "100%", mt: 2 }}>
              <AppDiagnostic />
            </Box>

            <Typography
              variant="caption"
              sx={{ color: "text.disabled", textAlign: "center", mt: 2 }}
            >
              Сделано с уважением к прошлому ради будущего <br />
              <span style={{ fontSize: "1.5rem" }}>🌿</span>
            </Typography>
          </Stack>
        </CardContent>

        <CardActions sx={{ justifyContent: "center", pb: 3, pt: 0 }}>
          <Button
            startIcon={<GitHubIcon />}
            href="https://github.com/wolk8506/genealogy"
            target="_blank"
            variant="contained"
            disableElevation
            sx={{
              borderRadius: 10,
              px: 4,
              textTransform: "none",
              fontWeight: "bold",
            }}
          >
            Исходный код проекта
          </Button>
        </CardActions>
      </Card>
    </Box>
  );
}

// Вспомогательный компонент для строк деталей
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
