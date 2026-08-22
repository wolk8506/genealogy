import { Box, Paper } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { ButtonScrollTop } from "../../components/ButtonScrollTop";
import { StatisticCard } from "./StatisticCard";
import { GeneralSettingsCard } from "./GeneralSettingsCard";
import { UpdateSettingsCard } from "./UpdateSettingsCard";
import { NewPhotoProcessingOptionsCard } from "./NewPhotoProcessingOptionsCard";
import { OptimizationMasterCard } from "./OptimizationMasterCard";
import { FaceScanMasterCard } from "./FaceScanMasterCard";
import { DangerZoneCard } from "./DangerZoneCard";

export default function ArchivePage() {
  const theme = useTheme();

  const cardStyle = {
    borderRadius: 5,
    width: "100%",
    minHeight: "525px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    bgcolor: alpha(theme.palette.background.paper, 0.4),
  };

  return (
    <Box sx={{ p: 1 }}>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
            },
            gap: 3,
            alignItems: "stretch",
            "@media (min-width: 1490px)": {
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            },
            "@media (min-width: 1985px)": {
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            },
          }}
        >
          <GeneralSettingsCard cardStyle={cardStyle} />
          <StatisticCard cardStyle={cardStyle} />
          <NewPhotoProcessingOptionsCard cardStyle={cardStyle} />
          <UpdateSettingsCard cardStyle={cardStyle} />
          <OptimizationMasterCard cardStyle={cardStyle} />
          <FaceScanMasterCard cardStyle={cardStyle} />
          <DangerZoneCard cardStyle={cardStyle} />
        </Box>
  

      <ButtonScrollTop />
    </Box>
  );
}
