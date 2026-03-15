import React from "react";
import { Box, IconButton, styled, Typography, Tooltip } from "@mui/material";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import NorthIcon from "@mui/icons-material/North"; // Стрелка вверх (ASC)
import SouthIcon from "@mui/icons-material/South"; // Стрелка вниз (DESC)
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

const StyledContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$sortOrder",
})(({ theme, $sortOrder }) => ({
  display: "flex",
  alignItems: "center",
  borderRadius: 20,
  border: "1px solid",
  borderColor: theme.palette.divider,
  transition: "all 0.3s ease",
  height: 40,
  // В обоих случаях контейнер будет немного расширен для текста и стрелки
  //   paddingRight: 12,
  cursor: "pointer",
  overflow: "hidden",
  backgroundColor:
    $sortOrder === "desc" ? "rgba(255,255,255,0.08)" : "transparent",
  "&:hover": {
    // borderColor: theme.palette.primary.main,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
}));

export default function ExpandingSortButton({ sortOrder, onToggle }) {
  const isDesc = sortOrder === "desc";

  return (
    <Tooltip
      title={
        isDesc
          ? "Сортировка поколений: По убыванию"
          : "Сортировка поколений: По возрастанию"
      }
    >
      <StyledContainer $sortOrder={sortOrder} onClick={onToggle}>
        <IconButton size="small" sx={{ color: "white", p: "9px" }}>
          <SupervisorAccountIcon
            fontSize="small"
            color={isDesc ? "primary" : "inherit"}
          />
          {isDesc ? (
            <KeyboardArrowDownIcon sx={{ fontSize: "0.8rem" }} />
          ) : (
            <KeyboardArrowUpIcon sx={{ fontSize: "0.8rem" }} />
          )}
        </IconButton>
      </StyledContainer>
    </Tooltip>
  );
}
