import { Box, Paper, Grid } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { ButtonScrollTop } from "../../components/ButtonScrollTop";
import { StatisticCard } from "./StatisticCard";
import { GeneralSettingsCard } from "./GeneralSettingsCard";
import { UpdateSettingsCard } from "./UpdateSettingsCard";
import { NewPhotoProcessingOptionsCard } from "./NewPhotoProcessingOptionsCard";
import { OptimizationMasterCard } from "./OptimizationMasterCard";
import { DangerZoneCard } from "./DangerZoneCard";

export default function ArchivePage() {
  const theme = useTheme();

  const cardStyle = {
    borderRadius: 5,
    // height: "100%",
    height: "525px",
    display: "flex",
    flexDirection: "column",
    bgcolor: alpha(theme.palette.background.paper, 0.4),
    "@container settingsWrapper (max-width: 1856px)": {
      width: "calc((100% - 48px) / 3)",
    },
    "@container settingsWrapper (max-width: 1360px)": {
      width: "calc((100% - 24px) / 2)",
    },
  };

  return (
    <Box sx={{ p: 0 }}>
      <Paper
        sx={{
          p: 3,
          borderRadius: 4,
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        }}
      >
        <Grid
          container
          spacing={3}
          justifyContent={"space-between"}
          sx={{
            containerType: "inline-size",
            containerName: "settingsWrapper",
          }}
        >
          {/*  */}
          <GeneralSettingsCard cardStyle={cardStyle} />
          {/* КАРТОЧКА: Резервное копирование */}
          <StatisticCard cardStyle={cardStyle} />
          {/* КАРТОЧКА: Настройки импорта */}
          <NewPhotoProcessingOptionsCard cardStyle={cardStyle} />
          {/*  */}
          <UpdateSettingsCard cardStyle={cardStyle} />
          {/* Мастер оптимизации */}
          <OptimizationMasterCard cardStyle={cardStyle} />
          {/* Опасная зона */}
          <DangerZoneCard cardStyle={cardStyle} />
        </Grid>
      </Paper>

      <ButtonScrollTop />
    </Box>
  );
}
