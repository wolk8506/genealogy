import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  Divider,
  Grid,
  Button,
  Stack,
} from "@mui/material";

import GitHubIcon from "@mui/icons-material/GitHub";

import InfoIcon from "@mui/icons-material/Info";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ComputerIcon from "@mui/icons-material/Computer";
import BuildIcon from "@mui/icons-material/Build";
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
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        p: 2,
        mt: 6,
      }}
    >
      <Card sx={{ maxWidth: 600, borderRadius: 3, boxShadow: 4 }}>
        <Stack spacing={2} alignItems="center">
          {" "}
          <CardHeader
            avatar={
              <Avatar
                src={appIcon}
                sx={{ width: 64, height: 64 }}
                variant="rounded"
              />
            }
            title={
              <Typography variant="h5" component="div">
                Генеалогия
              </Typography>
            }
            subheader={
              <Typography variant="subtitle2" color="text.secondary">
                Ведение и визуализация семейной истории
              </Typography>
            }
          />
        </Stack>

        <CardContent>
          <Typography
            variant="body1"
            color="text.secondary"
            paragraph
            sx={{ lineHeight: 1.6 }}
          >
            Приложение создано для того, чтобы сохранить память о ваших
            родственниках: хранить фото, даты и истории поколений. Построено на
            базе Electron + React с упором на автономность и приватность.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Сделано с уважением к памяти и истории{" "}
            <span style={{ fontSize: "3em" }}>🕊️</span>
          </Typography>
        </CardContent>

        <Divider />

        <CardContent>
          <Grid container direction="column" spacing={2}>
            <Grid item>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <InfoIcon color="action" />
                <Typography variant="body2">
                  <strong>Версия:</strong> {version || "—"}
                </Typography>
              </Box>
            </Grid>

            <Grid item>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ComputerIcon color="action" />
                <Typography variant="body2">
                  <strong>Платформа:</strong> {platform || "—"}
                </Typography>
              </Box>
            </Grid>

            {buildDate && (
              <Grid item>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CalendarTodayIcon color="action" />
                  <Typography variant="body2">
                    <strong>Сборка:</strong> {buildDate}
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid item>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BuildIcon color="action" />
                <Typography variant="body2">
                  <strong>Разработчик:</strong>
                </Typography>
                <Box
                  component="img"
                  src={developer}
                  alt="developer"
                  sx={{ width: 24, height: 24, mr: 0 }}
                />
                <Typography variant="body2">nebula.9371</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>

        <Divider />

        <CardActions sx={{ justifyContent: "center", py: 2 }}>
          <Button
            startIcon={<GitHubIcon />}
            href="https://github.com/wolk8506/genealogy"
            target="_blank"
            rel="noopener"
            variant="outlined"
          >
            GitHub
          </Button>
          {/* <Button
              startIcon={<LanguageIcon />}
              href="https://your-website.com"
              target="_blank"
              rel="noopener"
              variant="outlined"
            >
              Сайт
            </Button> */}
        </CardActions>
      </Card>
    </Box>
  );
}
