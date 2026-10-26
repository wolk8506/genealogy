import React from "react";
import { Box, IconButton, styled, Typography, Tooltip } from "@mui/material";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { toolbarPillBg, toolbarPillHoverBg, toolbarPillSx } from "../toolbarStyles";

const StyledContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$sortOrder",
})(({ theme, $sortOrder }) => ({
  ...toolbarPillSx,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 56,
  transition: "all 0.3s ease",
  cursor: "pointer",
  overflow: "hidden",
  backgroundColor: $sortOrder === "desc" ? toolbarPillHoverBg : toolbarPillBg,
  "& > .MuiIconButton-root": {
    width: "auto",
    height: 36,
    p: 0,
    px: 1,
    gap: 0.25,
  },
  "& .MuiIconButton-root:hover": {
    backgroundColor: "transparent",
  },
  "&:hover": {
    backgroundColor: toolbarPillHoverBg,
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
        <IconButton size="small" sx={{ color: "text.primary", p: 1 }}>
          <SupervisorAccountIcon
            color={isDesc ? "primary" : "inherit"}
            fontSize="small"
          />
          {isDesc ? (
            <KeyboardArrowDownIcon sx={{ fontSize: "1rem" }} />
          ) : (
            <KeyboardArrowUpIcon sx={{ fontSize: "1rem" }} />
          )}
        </IconButton>
      </StyledContainer>
    </Tooltip>
  );
}
