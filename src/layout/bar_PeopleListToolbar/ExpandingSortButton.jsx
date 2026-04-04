import React from "react";
import { Box, IconButton, styled, Typography, Tooltip } from "@mui/material";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
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
  height: 34,
  cursor: "pointer",
  overflow: "hidden",
  backgroundColor:
    $sortOrder === "desc" ? "rgba(255,255,255,0.08)" : "transparent",
  "&:hover": {
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
        <IconButton size="small" sx={{ color: "white", p: 1 }}>
          <SupervisorAccountIcon color={isDesc ? "primary" : "inherit"} />
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
