import React, { useState } from "react";
import { Box, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TuneIcon from "@mui/icons-material/Tune";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import StorageIcon from "@mui/icons-material/Storage";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { ButtonScrollTop } from "../../components/ButtonScrollTop";
import { StatisticCard } from "./StatisticCard";
import { GeneralSettingsCard } from "./GeneralSettingsCard";
import { StorageCard } from "./StorageCard";
import { UpdateSettingsCard } from "./UpdateSettingsCard";
import { NewPhotoProcessingOptionsCard } from "./NewPhotoProcessingOptionsCard";
import { OptimizationMasterCard } from "./OptimizationMasterCard";
import { FaceScanMasterCard } from "./FaceScanMasterCard";
import { DangerZoneCard } from "./DangerZoneCard";
import SettingsSidebar from "./SettingsSidebar";

const SECTIONS = [
  {
    id: "general",
    title: "Общие",
    keywords: "тема внешний вид обновления лимит метки",
    icon: TuneIcon,
    cards: ["general", "updates"],
  },
  {
    id: "photos",
    title: "Фотографии",
    keywords: "обработка конвертация кэш превью оптимизация загрузка",
    icon: PhotoLibraryIcon,
    cards: ["photoProcessing", "optimization"],
  },
  {
    id: "faces",
    title: "Распознавание лиц",
    keywords: "лица сканирование совпадения",
    icon: FaceRetouchingNaturalIcon,
    cards: ["faceScan"],
  },
  {
    id: "storage",
    title: "Хранилище и данные",
    keywords: "папка диск место статистика импорт экспорт архив места",
    icon: StorageIcon,
    cards: ["storage", "stats"],
  },
  {
    id: "danger",
    title: "Опасная зона",
    keywords: "удалить сброс очистить",
    icon: WarningAmberIcon,
    danger: true,
    cards: ["danger"],
  },
];

const STORAGE_KEY = "settings-active-section";

export default function ArchivePage() {
  const theme = useTheme();
  const [activeId, setActiveId] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "general",
  );
  const [query, setQuery] = useState("");

  const cardStyle = {
    borderRadius: 5,
    width: "100%",
    bgcolor: alpha(theme.palette.background.paper, 0.4),
  };

  const cards = {
    general: <GeneralSettingsCard cardStyle={cardStyle} />,
    updates: <UpdateSettingsCard cardStyle={cardStyle} />,
    photoProcessing: (
      <NewPhotoProcessingOptionsCard cardStyle={cardStyle} />
    ),
    optimization: <OptimizationMasterCard cardStyle={cardStyle} />,
    faceScan: <FaceScanMasterCard cardStyle={cardStyle} />,
    storage: <StorageCard cardStyle={cardStyle} />,
    stats: <StatisticCard cardStyle={cardStyle} />,
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
  };

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
        {active?.cards.map((key) => (
          <Box key={key}>{cards[key]}</Box>
        ))}
      </Box>

      <ButtonScrollTop />
    </Box>
  );
}
