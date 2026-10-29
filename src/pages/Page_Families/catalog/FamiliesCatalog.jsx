// pages/Page_Families/catalog/FamiliesCatalog.jsx
// Каталог семей: сетка карточек. Поиск и сортировка — в хедере приложения.

import React, { useDeferredValue, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import FamilyRestroomRoundedIcon from "@mui/icons-material/FamilyRestroomRounded";
import FamilyCard from "./FamilyCard";
import { CountBadge } from "../../Page_Settings/settingsUi";
import { familyGlassSx, RADII, titleSx } from "../familyTheme";
import { visibleFamilies } from "../../../utils/families/sortFamilies";

const gridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(312px, 1fr))",
  gap: 1.75,
};

export function FamiliesSkeleton() {
  return (
    <Box>
      <Skeleton variant="rounded" width={220} height={44} sx={{ mb: 2.5 }} />
      <Box sx={gridSx}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            height={96}
            sx={{ borderRadius: `${RADII.section}px` }}
          />
        ))}
      </Box>
    </Box>
  );
}

export default function FamiliesCatalog({
  families = [],
  search = "",
  sort = "date",
  notice = null,
  onDismissNotice,
  onOpenFamily,
  onGoPeople,
}) {
  const deferredQuery = useDeferredValue(search);

  const visible = useMemo(
    () => visibleFamilies(families, deferredQuery, sort),
    [families, deferredQuery, sort],
  );

  const isEmptyBase = families.length === 0;

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="flex-end"
        justifyContent="space-between"
        sx={{ mb: 2.5, gap: 2, flexWrap: "wrap" }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Typography sx={titleSx}>Семьи</Typography>
            <CountBadge value={families.length} />
          </Stack>
          <Typography
            sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5 }}
          >
            Собираются автоматически из связей и событий людей
          </Typography>
        </Box>
      </Stack>

      {notice && (
        <Alert
          severity="info"
          onClose={onDismissNotice}
          sx={{ mb: 2, borderRadius: `${RADII.card}px` }}
        >
          {notice}
        </Alert>
      )}

      {isEmptyBase ? (
        <Box
          sx={[
            familyGlassSx,
            {
              borderRadius: `${RADII.section}px`,
              p: 6,
              textAlign: "center",
            },
          ]}
        >
          <FamilyRestroomRoundedIcon
            sx={{ fontSize: 44, color: "text.disabled" }}
          />
          <Typography sx={{ fontSize: 15, fontWeight: 600, mt: 1 }}>
            Семей пока нет
          </Typography>
          <Typography
            sx={{
              fontSize: 12.5,
              color: "text.secondary",
              mt: 0.5,
              maxWidth: 460,
              mx: "auto",
            }}
          >
            Семьи появятся автоматически, когда у людей будут указаны супруги
            или общие дети. Отдельно заводить семью не нужно.
          </Typography>
          <Button
            onClick={onGoPeople}
            variant="contained"
            disableElevation
            sx={{
              mt: 2,
              textTransform: "none",
              borderRadius: "10px",
              fontSize: 12.5,
            }}
          >
            К людям
          </Button>
        </Box>
      ) : visible.length === 0 ? (
        <Box
          sx={[
            familyGlassSx,
            {
              borderRadius: `${RADII.section}px`,
              p: 4,
              textAlign: "center",
            },
          ]}
        >
          <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
            Ничего не найдено
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}>
            Попробуйте изменить запрос в поиске сверху — он ищет по именам,
            месту и году.
          </Typography>
        </Box>
      ) : (
        <Box sx={gridSx}>
          {visible.map((family) => (
            <FamilyCard
              key={family.key}
              family={family}
              onOpen={onOpenFamily}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
