import React, { useEffect, useState } from "react";
import { Avatar, Box, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

import GitHubIcon from "@mui/icons-material/GitHub";
import InfoIcon from "@mui/icons-material/Info";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ComputerIcon from "@mui/icons-material/Computer";
import LaunchIcon from "@mui/icons-material/Launch";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PeopleIcon from "@mui/icons-material/People";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import EventIcon from "@mui/icons-material/Event";
import ContactsIcon from "@mui/icons-material/Contacts";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import MenuBookIcon from "@mui/icons-material/MenuBook";

import AppDiagnostic from "./AppInfo";

import appIcon from "../../img/app_icon.png";
import developer from "../../img/developer.png";
import {
  groupSx,
  RowDivider,
  RowIcon,
  SettingsRow,
  sectionLabelSx,
} from "../Page_Settings/settingsUi";

const valueSx = {
  fontWeight: 600,
  fontSize: "0.8125rem",
  color: "text.secondary",
  fontFamily: "monospace",
};

const chevron = (
  <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
);

export default function AboutPage() {
  const navigate = useNavigate();
  const [version, setVersion] = useState("");
  const [platform, setPlatform] = useState("");
  const [buildDate, setBuildDate] = useState("");
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    window.appAPI.getVersion().then(setVersion);
    window.appAPI.getPlatform().then(setPlatform);
    window.appAPI.getBuildDate?.().then(setBuildDate);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      window.peopleAPI?.getAll?.() ?? [],
      window.photoAPI?.getAllGlobal?.() ?? [],
      window.externalAPI?.getAll?.() ?? [],
    ]).then(([people, photos, external]) => {
      if (!mounted) return;
      setCounts({
        people: (people || []).length,
        photos: (photos || []).length,
        events: (people || []).reduce(
          (acc, person) => acc + (person.events?.length || 0),
          0,
        ),
        external: (external || []).length,
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  const countValue = (key) =>
    counts ? String(counts[key]) : "…";

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", px: 2, py: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2.5} alignItems="center">
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "primary.main",
                filter: "blur(25px)",
                opacity: 0.18,
                borderRadius: "50%",
              }}
            />
            <Avatar
              src={appIcon}
              variant="rounded"
              sx={{
                width: 88,
                height: 88,
                borderRadius: "20px",
                boxShadow: 4,
                position: "relative",
              }}
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, lineHeight: 1.1 }}
            >
              Генеалогия
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Хранитель вашей семейной истории
            </Typography>
          </Box>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.7 }}
        >
          Приложение для хранения семейной истории: люди, события, фотографии
          и связи. Работает автономно — ваши данные не покидают компьютер.
        </Typography>

        <Box>
          <Typography sx={sectionLabelSx}>Ваша библиотека</Typography>
          <Box sx={groupSx}>
            <Stack divider={<RowDivider />}>
              <SettingsRow
                icon={
                  <RowIcon bg="blue">
                    <PeopleIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Люди"
                onClick={() => navigate("/")}
                trailing={
                  <>
                    <Typography variant="body2" sx={valueSx}>
                      {countValue("people")}
                    </Typography>
                    {chevron}
                  </>
                }
              />
              <SettingsRow
                icon={
                  <RowIcon bg="purple">
                    <PhotoLibraryIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Фотографии"
                onClick={() => navigate("/globalPhotoGallery")}
                trailing={
                  <>
                    <Typography variant="body2" sx={valueSx}>
                      {countValue("photos")}
                    </Typography>
                    {chevron}
                  </>
                }
              />
              <SettingsRow
                icon={
                  <RowIcon bg="orange">
                    <EventIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="События"
                onClick={() => navigate("/timeline")}
                trailing={
                  <>
                    <Typography variant="body2" sx={valueSx}>
                      {countValue("events")}
                    </Typography>
                    {chevron}
                  </>
                }
              />
              <SettingsRow
                icon={
                  <RowIcon bg="green">
                    <ContactsIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Справочник"
                onClick={() => navigate("/external")}
                trailing={
                  <>
                    <Typography variant="body2" sx={valueSx}>
                      {countValue("external")}
                    </Typography>
                    {chevron}
                  </>
                }
              />
            </Stack>
          </Box>
        </Box>

        <Box>
          <Typography sx={sectionLabelSx}>Приложение</Typography>
          <Box sx={groupSx}>
            <Stack divider={<RowDivider />}>
              <SettingsRow
                icon={
                  <RowIcon bg="blue">
                    <InfoIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Версия"
                trailing={
                  <Typography variant="body2" sx={valueSx}>
                    {version || "—"}
                  </Typography>
                }
              />
              <SettingsRow
                icon={
                  <RowIcon bg="orange">
                    <CalendarTodayIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Сборка"
                trailing={
                  <Typography variant="body2" sx={valueSx}>
                    {buildDate || "—"}
                  </Typography>
                }
              />
              <SettingsRow
                icon={
                  <RowIcon bg="indigo">
                    <ComputerIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Платформа"
                trailing={
                  <Typography variant="body2" sx={valueSx}>
                    {platform || "—"}
                  </Typography>
                }
              />
              <SettingsRow
                icon={
                  <Avatar
                    src={developer}
                    sx={{ width: 30, height: 30, fontSize: "0.75rem" }}
                  />
                }
                title="Разработчик"
                trailing={
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, fontSize: "0.8125rem" }}
                  >
                    nebula.9371
                  </Typography>
                }
              />
            </Stack>
          </Box>
        </Box>

        <AppDiagnostic />

        <Box>
          <Typography sx={sectionLabelSx}>Разделы</Typography>
          <Box sx={groupSx}>
            <Stack divider={<RowDivider />}>
              <SettingsRow
                icon={
                  <RowIcon bg="purple">
                    <NewReleasesIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Что нового"
                subtitle="История изменений"
                onClick={() =>
                  window.dispatchEvent(new Event("app:open-changelog"))
                }
                trailing={chevron}
              />
              <SettingsRow
                icon={
                  <RowIcon bg="indigo">
                    <MenuBookIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Руководство"
                subtitle="Как пользоваться приложением"
                onClick={() =>
                  window.userGuideAPI?.openWindow?.()
                }
                trailing={chevron}
              />
            </Stack>
          </Box>
        </Box>

        <Box>
          <Typography sx={sectionLabelSx}>Ссылки</Typography>
          <Box sx={groupSx}>
            <SettingsRow
              icon={
                <RowIcon bg="gray">
                  <GitHubIcon sx={{ fontSize: 18 }} />
                </RowIcon>
              }
              title="Исходный код"
              subtitle="github.com/wolk8506/genealogy"
              onClick={() =>
                window.open(
                  "https://github.com/wolk8506/genealogy",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              trailing={
                <LaunchIcon sx={{ fontSize: 16, color: "text.disabled" }} />
              }
            />
          </Box>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: "center", pb: 1 }}
        >
          Сделано с уважением к прошлому ради будущего
        </Typography>
      </Stack>
    </Box>
  );
}
