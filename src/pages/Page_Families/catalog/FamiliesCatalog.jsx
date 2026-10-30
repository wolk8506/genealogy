// pages/Page_Families/catalog/FamiliesCatalog.jsx
// Каталог семей: сетка карточек. Поиск и сортировка — в хедере приложения.

import React, { useDeferredValue, useMemo } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Skeleton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import FamilyRestroomRoundedIcon from "@mui/icons-material/FamilyRestroomRounded";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import FamilyCard from "./FamilyCard";
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
  const theme = useTheme();

  const visible = useMemo(
    () => visibleFamilies(families, deferredQuery, sort),
    [families, deferredQuery, sort],
  );

  const isEmptyBase = families.length === 0;

  return (
    <Box>
      {/* <Typography sx={[titleSx, { mb: 2.5 }]}>Семьи</Typography> */}

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
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 110px)",
            px: 3,
            textAlign: "center",
            animation: "fadeIn 0.8s ease-out",
            "@keyframes fadeIn": {
              from: { opacity: 0, transform: "translateY(20px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Box
            sx={{
              p: { xs: 4, md: 6 },
              maxWidth: 500,
              borderRadius: "24px",
              bgcolor: alpha(theme.palette.background.paper, 0.4),
              border: "1px solid",
              borderColor: "divider",
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            <Stack spacing={3} alignItems="center">
              <Box sx={{ position: "relative" }}>
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    bgcolor: theme.palette.primary.main,
                    filter: "blur(25px)",
                    opacity: 0.15,
                    borderRadius: "50%",
                  }}
                />
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    border: "4px solid",
                    borderColor: "background.paper",
                    boxShadow: theme.shadows[4],
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: "primary.main",
                  }}
                >
                  <FamilyRestroomRoundedIcon sx={{ fontSize: 48 }} />
                </Avatar>
              </Box>

              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                  Семей пока нет
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "text.secondary",
                    maxWidth: 360,
                    mx: "auto",
                  }}
                >
                  Семьи появятся автоматически, когда у людей будут указаны
                  супруги или общие дети. Отдельно заводить семью не нужно.
                </Typography>
              </Box>

              <Button
                onClick={onGoPeople}
                variant="contained"
                size="large"
                startIcon={<PersonAddAlt1Icon />}
                sx={{
                  height: 32,
                  borderRadius: "999px",
                  px: 2,
                  py: 0,
                  textTransform: "none",
                  fontSize: "0.8125rem",
                  lineHeight: 1.2,
                  fontWeight: 700,
                  boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)",
                  "& .MuiButton-startIcon": {
                    mr: 0.5,
                    ml: 0,
                    "& > *:nth-of-type(1)": { fontSize: 16 },
                  },
                }}
              >
                К людям
              </Button>
            </Stack>
          </Box>
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
