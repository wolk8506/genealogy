import React, { useEffect, useState } from "react";
import { Typography, Stack, Paper, Avatar, Link, Divider } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import LanguageIcon from "@mui/icons-material/Language";
import appIcon from "../../img/app_icon.png";

export default function AboutPage() {
  const [version, setVersion] = useState("");
  const [platform, setPlatform] = useState("");
  const [buildDate, setBuildDate] = useState("");

  useEffect(() => {
    window.appAPI.getVersion().then(setVersion);
    window.appAPI.getPlatform().then(setPlatform);
    window.appAPI.getBuildDate?.().then(setBuildDate); // если реализовано
  }, []);

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 500, mx: "auto", mt: 6 }}>
      <Stack spacing={2} alignItems="center">
        <Avatar
          src={appIcon} // или путь к логотипу
          sx={{ width: 80, height: 80 }}
        />
        <Typography variant="h5">Генеалогия</Typography>
        <Typography variant="body2" color="text.secondary">
          Приложение для построения и редактирования семейного древа
        </Typography>

        <Divider flexItem sx={{ my: 2 }} />

        <Stack spacing={1} alignSelf="stretch">
          <Typography>
            <strong>Версия:</strong> {version}
          </Typography>
          <Typography>
            <strong>Платформа:</strong> {platform}
          </Typography>
          {buildDate && (
            <Typography>
              <strong>Сборка:</strong> {buildDate}
            </Typography>
          )}
          <Typography>
            <strong>Разработчик:</strong> Юрий 👨‍💻
          </Typography>
          <Typography></Typography>
        </Stack>

        <Divider flexItem sx={{ my: 2 }} />

        <Stack direction="row" spacing={2}>
          <Link
            href="https://github.com/your-username/your-repo"
            target="_blank"
            rel="noopener"
            underline="hover"
          >
            <GitHubIcon /> GitHub
          </Link>
          {/* <Link
            href="https://your-website.com"
            target="_blank"
            rel="noopener"
            underline="hover"
          >
            <LanguageIcon /> Сайт
          </Link> */}
        </Stack>
      </Stack>
    </Paper>
  );
}
