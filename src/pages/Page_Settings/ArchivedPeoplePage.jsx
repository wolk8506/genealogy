import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Box, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TuneIcon from "@mui/icons-material/Tune";
import PersonPinCircleIcon from "@mui/icons-material/PersonPinCircle";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import StorageIcon from "@mui/icons-material/Storage";
import PieChartIcon from "@mui/icons-material/PieChart";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoIcon from "@mui/icons-material/Info";
import SpellcheckIcon from "@mui/icons-material/Spellcheck";
import { StatisticCard } from "./StatisticCard";
import { BackupRestoreCard } from "./BackupRestoreCard";
import { GeneralSettingsCard } from "./GeneralSettingsCard";
import { SpellcheckCard } from "./SpellcheckCard";
import { HomePersonCard } from "./HomePersonCard";
import { StorageCard } from "./StorageCard";
import { UpdateSettingsCard } from "./UpdateSettingsCard";
import { NewPhotoProcessingOptionsCard } from "./NewPhotoProcessingOptionsCard";
import { OptimizationMasterCard } from "./OptimizationMasterCard";
import { FaceScanMasterCard } from "./FaceScanMasterCard";
import { DangerZoneCard } from "./DangerZoneCard";
import SettingsSidebar from "./SettingsSidebar";
import AboutPage from "../Page_About/AboutPage";

const SECTIONS = [
  {
    id: "general",
    title: "Общие параметры",
    keywords: "тема внешний вид лимит метки общие",
    icon: TuneIcon,
    color: "gray",
    cards: ["general"],
  },
  {
    id: "spelling",
    title: "Орфография",
    keywords:
      "орфография правописание словарь язык проверка подчёркивание ошибки",
    icon: SpellcheckIcon,
    color: "teal",
    cards: ["spelling"],
  },
  {
    id: "home",
    title: "Это я",
    keywords: "это я домашний человек кто я пользователь корень дерево моя карточка",
    icon: PersonPinCircleIcon,
    color: "indigo",
    cards: ["home"],
  },
  {
    id: "updates",
    title: "Обновление системы",
    keywords: "обновление версия апдейт установка",
    icon: SystemUpdateAltIcon,
    color: "green",
    cards: ["updates"],
  },
  {
    id: "photos",
    title: "Фотографии",
    keywords: "обработка конвертация кэш превью оптимизация загрузка",
    icon: PhotoLibraryIcon,
    color: "orange",
    cards: ["photoProcessing", "optimization"],
  },
  {
    id: "faces",
    title: "Распознавание лиц",
    keywords: "лица сканирование совпадения",
    icon: FaceRetouchingNaturalIcon,
    color: "purple",
    cards: ["faceScan"],
  },
  {
    id: "storage",
    title: "Места хранения данных",
    keywords: "папка диск место путь библиотека расположение хранилище данные импорт экспорт бэкап резервная копия",
    icon: StorageIcon,
    color: "blue",
    cards: ["storage", "backup"],
  },
  {
    id: "statistics",
    title: "Статистика хранилища",
    keywords: "статистика размер файлы обслуживание место",
    icon: PieChartIcon,
    color: "indigo",
    cards: ["stats"],
  },
  {
    id: "danger",
    title: "Удаление данных",
    keywords: "удалить сброс очистить опасная зона",
    icon: WarningAmberIcon,
    color: "red",
    danger: true,
    cards: ["danger"],
  },
  {
    id: "about",
    title: "О приложении",
    keywords:
      "о приложении версия сборка разработчик руководство ссылки исходный код что нового",
    icon: InfoIcon,
    color: "blue",
    separate: true,
    cards: ["about"],
  },
];

const STORAGE_KEY = "settings-active-section";

export default function SettingsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get("section");
  const [activeId, setActiveId] = useState(
    () => sectionParam || localStorage.getItem(STORAGE_KEY) || "general",
  );
  const [query, setQuery] = useState("");
  const [backupSubpage, setBackupSubpage] = useState(false);
  const [mediaSubpage, setMediaSubpage] = useState(false);

  // Прямая ссылка на раздел, например из стартового уведомления:
  // /settings?section=home.
  useEffect(() => {
    if (sectionParam) setActiveId(sectionParam);
  }, [sectionParam]);

  useEffect(() => {
    if (backupSubpage || mediaSubpage) window.scrollTo({ top: 0 });
  }, [backupSubpage, mediaSubpage]);

  const cardStyle = {
    borderRadius: 4,
    width: "100%",
    bgcolor: alpha(theme.palette.background.paper, 0.4),
  };

  const cards = {
    general: <GeneralSettingsCard cardStyle={cardStyle} />,
    spelling: <SpellcheckCard cardStyle={cardStyle} />,
    home: <HomePersonCard cardStyle={cardStyle} />,
    updates: <UpdateSettingsCard cardStyle={cardStyle} />,
    photoProcessing: (
      <NewPhotoProcessingOptionsCard cardStyle={cardStyle} />
    ),
    optimization: (
      <OptimizationMasterCard
        cardStyle={cardStyle}
        onSubpageChange={setMediaSubpage}
      />
    ),
    faceScan: <FaceScanMasterCard cardStyle={cardStyle} />,
    storage: <StorageCard cardStyle={cardStyle} />,
    backup: (
      <BackupRestoreCard
        cardStyle={cardStyle}
        onSubpageChange={setBackupSubpage}
      />
    ),
    stats: <StatisticCard cardStyle={cardStyle} />,
    about: <AboutPage cardStyle={cardStyle} />,
    danger: <DangerZoneCard cardStyle={cardStyle} />,
  };

  const q = query.trim().toLowerCase();
  const visibleSections = SECTIONS.filter((s) => {
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.keywords.toLowerCase().includes(q)
    );
  });

  const active =
    visibleSections.find((s) => s.id === activeId) || visibleSections[0];

  const selectSection = (id) => {
    setActiveId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // приватный режим — игнорируем
    }
    // Убираем ?section=, чтобы после ручного выбора ссылка снова вела
    // на сохранённый раздел.
    if (sectionParam) {
      const next = new URLSearchParams(searchParams);
      next.delete("section");
      navigate(
        { pathname: location.pathname, search: next.toString() },
        { replace: true },
      );
    }
  };

  let cardKeys = active?.cards || [];
  if (active?.id === "storage" && backupSubpage) {
    // Во время бэкапа/восстановления оставляем только карточку импорта-экспорта.
    cardKeys = cardKeys.filter((key) => key === "backup");
  } else if (active?.id === "photos" && mediaSubpage) {
    cardKeys = cardKeys.filter((key) => key === "optimization");
  }

  return (
    <Box sx={{ p: 1, display: "flex", gap: 2, alignItems: "flex-start" }}>
      <SettingsSidebar
        sections={visibleSections}
        activeId={active?.id}
        query={query}
        onQueryChange={setQuery}
        onSelect={selectSection}
      />

      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          maxWidth: 980,
        }}
      >
        {cardKeys.map((key) => (
          <Box key={key}>{cards[key]}</Box>
        ))}
      </Box>

    </Box>
  );
}
