import React, { useEffect, useState } from "react";
import {
  Stack,
  Divider,
  Box,
  IconButton,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { RenderSectionChildren } from "./RenderSectionChildren";
import { RenderPersonItem } from "../info/RenderPersonItem";

export const RenderSectionFamilies = ({ people = [], soloChildren = [] }) => {
  const [index, setIndex] = useState(0);
  const theme = useTheme();

  // --- ПОДГОТОВКА СПИСКА ---
  const renderList = [];
  if (soloChildren.length > 0)
    renderList.push({ type: "solo_children", data: soloChildren || [] });
  people.forEach((fam) => {
    if (fam.partner) renderList.push({ type: "family", data: fam });
  });
  // renderList.push({ type: "empty_spouse_slot" });

  const totalItems = renderList.length;
  // Индекс мог остаться от прошлой персоны или от большего числа семей.
  const safeIndex = Math.min(index, Math.max(totalItems - 1, 0));
  const visibleItems = renderList.slice(safeIndex, safeIndex + 2);

  useEffect(() => {
    setIndex((prev) => Math.min(prev, Math.max(totalItems - 1, 0)));
  }, [totalItems]);

  // --- ЛОГИКА ПОДСВЕТКИ (ТВОЯ РАБОЧАЯ ВЕРСИЯ) ---

  const handleNext = () =>
    safeIndex < totalItems - 1 && setIndex(safeIndex + 1);
  const handlePrev = () => safeIndex > 0 && setIndex(safeIndex - 1);

  return (
    <Box sx={{ width: "100%", position: "relative", mt: 2 }}>
      {/* Слайдер (Next/Prev) */}
      {totalItems > 2 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            width: 1,
            mb: 1,
            pr: 1,
            position: "absolute",
            right: 0,

            // px: 2,
            top: "12px"
          }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: alpha(theme.palette.text.primary, 0.05),
              px: 2,
              height: 30,
              borderRadius: "999px",
              backdropFilter: "blur(4px)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {safeIndex + 1}—{Math.min(safeIndex + 2, totalItems)} из {totalItems}
            </Typography>
          </Box>
          <Stack
            direction="row"
            sx={{
              bgcolor: alpha(theme.palette.text.primary, 0.05),
              borderRadius: "999px",
              height: 30,
              backdropFilter: "blur(4px)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <IconButton
              size="small"
              onClick={handlePrev}
              disabled={safeIndex === 0}
            >
              <ArrowBackIosNewIcon fontSize="inherit" />
            </IconButton>
            <Divider orientation="vertical" variant="middle" flexItem />
            <IconButton
              size="small"
              onClick={handleNext}
              disabled={safeIndex >= totalItems - 2}
            >
              <ArrowForwardIosIcon fontSize="inherit" />
            </IconButton>
          </Stack>
        </Stack>
      )}

      <Stack
        direction="row"
        spacing={2}
        sx={{
          justifyContent: "center",
          alignItems: "flex-start"
        }}>
        {visibleItems.map((item) => {
          // Базовый стиль колонки (теперь без подсветки границ всей колонки)
          const columnStyle = {
            flex: "0 0 360px",
            borderRadius: 4,
          };

          if (item.type === "solo_children") {
            return (
              <Stack
                key="solo-group"
                sx={[{
                  alignItems: "center"
                }, ...(Array.isArray(columnStyle) ? columnStyle : [columnStyle])]}>
                <Divider
                  orientation="vertical"
                  sx={{ height: renderList.length > 1 ? 124 : 0 }}
                />

                <Box sx={{ width: "100%" }}>
                  <RenderSectionChildren
                    people={item.data}
                    title={
                      people.length > 1 ? "Ребенок вне брака" : "Дети вне брака"
                    }
                    row={people.length < 1 && soloChildren.length > 1 ? 2 : 1}
                  />
                </Box>
              </Stack>
            );
          }

          if (item.type === "family") {
            const fam = item.data;

            return (
              <Stack
                key={fam.partner.id}
                sx={{
                  alignItems: "center",
                  ...columnStyle,

                  // Ширина подстраивается
                  width: people.length === 1 ? "760px" : "360px",

                  // transition: "all 0.3s ease",
                  alignItems: "center"
                }}>
                {/* <Divider orientation="vertical" sx={{ height: 30 }} /> */}
                <Divider
                  orientation="vertical"
                  sx={{
                    height: "60px",
                    "& .MuiDivider-wrapper": {
                      padding: "0 8px",
                      textTransform: "uppercase",
                      color: "text.disabled",
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    // sx={{ mb: 1 }}
                    spacing={1}
                    sx={{
                      alignItems: "center"
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "16px",
                        padding: "0 8px",
                        textTransform: "uppercase",
                        color: "text.disabled",
                      }}
                    >
                      {fam.partner.gender === "male" ? "Супруг" : "Супруга"}
                    </Typography>
                  </Stack>
                </Divider>
                {/* Секция супруга (не светится) */}

                <Box sx={{ width: "360px", px: 1 }}>
                  <RenderPersonItem p={fam.partner} link={true} />
                </Box>

                {/* Секция детей (СВЕТИТСЯ ТОЛЬКО ОНА) */}
                {}
                <Box sx={{ width: "100%" }}>
                  <Box>
                    <RenderSectionChildren
                      title={
                        fam.children.length > 1
                          ? `Дети (${fam.children.length})`
                          : "Ребенок"
                      }
                      people={fam.children}
                      row={
                        soloChildren.length === 0 &&
                        people.length === 1 &&
                        fam.children.length > 1
                          ? 2
                          : 1
                      }
                    />
                  </Box>
                </Box>
              </Stack>
            );
          }

          return null;
        })}
      </Stack>
    </Box>
  );
};
