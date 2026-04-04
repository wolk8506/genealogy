import React from "react";
import {
  Stack,
  Divider,
  Box,
  Typography,
  alpha,
  useTheme,
  Paper,
  Tooltip,
} from "@mui/material";
import { RenderPersonItem } from "../info/RenderPersonItem";
import InfoIcon from "@mui/icons-material/Info";
import { EmptyPersonSlot } from "./EmptyPersonSlot"; // Убедитесь, что импорт есть

export const RenderSectionChildren = ({
  title = "Дети вне брака",
  people,
  onUnlink,
  onLink,
  activeDragType,
  onDragEnd,
  isDroppable, // ПРИНИМАЕМ ИЗ RenderSectionFamilies
  info = false,
  parentGender,
}) => {
  return (
    <Stack alignItems="center" sx={{ width: "100%" }}>
      <Divider
        orientation="vertical"
        sx={{
          height: "60px",
          "& .MuiDivider-wrapper": {
            padding: "0 8px",
          },
          textTransform: "uppercase",
          color: "text.disabled",
        }}
      >
        {title}
      </Divider>
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 2,
          p: 1,
          borderRadius: 5,
          bgcolor: (theme) => alpha(theme.palette.divider, 0.03),
          border: "1px dashed",
          borderColor: "divider",
          width: "100%",
          position: "relative",
        }}
      >
        {info && (
          <Tooltip
            title={
              parentGender === "male"
                ? "При удалении ребенка связь с Отцом остается"
                : "При удалении ребенка связь с Матерью остается"
            }
          >
            <InfoIcon
              sx={{
                fontSize: "1rem",
                position: "absolute",
                top: "-8px",
                right: 20,
                color: "primary.main",
              }}
            />
          </Tooltip>
        )}
        {/* Список детей */}
        {people.map((p) => (
          <Box key={p.id} sx={{ width: "340px" }}>
            <RenderPersonItem p={p} onUnlink={onUnlink} unlinkPosition="top" />
          </Box>
        ))}

        {/* СЛОТ: Добавить ребенка */}
        <Box sx={{ width: "340px" }}>
          <EmptyPersonSlot
            label="ребенка"
            acceptType="child"
            activeDragType={activeDragType}
            onDragEnd={onDragEnd}
            onDrop={onLink}
            isDroppable={isDroppable} // ПЕРЕДАЕМ В СЛОТ
          />
        </Box>
      </Paper>
    </Stack>
  );
};
