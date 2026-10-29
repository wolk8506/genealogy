// pages/Page_Families/FamiliesStates.jsx
// Служебные состояния страницы: загрузка, ошибка, «семья не найдена».

import React from "react";
import { Box, Button, Typography } from "@mui/material";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { FamiliesSkeleton } from "./catalog/FamiliesCatalog";
import { familyGlassSx, RADII } from "./familyTheme";

export function FamiliesLoading() {
  return <FamiliesSkeleton />;
}

const stateBoxSx = [
  familyGlassSx,
  {
    borderRadius: `${RADII.section}px`,
    p: 5,
    textAlign: "center",
    maxWidth: 560,
    mx: "auto",
    mt: 4,
  },
];

export function FamiliesError({ onRetry }) {
  return (
    <Box sx={stateBoxSx}>
      <ErrorOutlineRoundedIcon sx={{ fontSize: 40, color: "warning.main" }} />
      <Typography sx={{ fontSize: 15, fontWeight: 600, mt: 1 }}>
        Не удалось загрузить данные
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5 }}>
        Файл с людьми недоступен или повреждён. Попробуйте ещё раз.
      </Typography>
      <Button
        onClick={onRetry}
        variant="contained"
        disableElevation
        sx={{
          mt: 2,
          textTransform: "none",
          borderRadius: "10px",
          fontSize: 12.5,
        }}
      >
        Повторить
      </Button>
    </Box>
  );
}

export function FamilyNotFound({ onBack }) {
  return (
    <Box sx={stateBoxSx}>
      <SearchOffRoundedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
      <Typography sx={{ fontSize: 15, fontWeight: 600, mt: 1 }}>
        Семья не найдена
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5 }}>
        Возможно, связи изменились или ссылка устарела.
      </Typography>
      <Button
        onClick={onBack}
        variant="contained"
        disableElevation
        sx={{
          mt: 2,
          textTransform: "none",
          borderRadius: "10px",
          fontSize: 12.5,
        }}
      >
        К списку семей
      </Button>
    </Box>
  );
}
