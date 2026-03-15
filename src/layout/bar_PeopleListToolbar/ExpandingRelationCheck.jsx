import React from "react";
import { Box, IconButton, styled, Typography, Tooltip } from "@mui/material";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";

const StyledContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$active",
})(({ theme, $active }) => ({
  display: "flex",
  alignItems: "center",
  borderRadius: 20,
  border: "1px solid",
  borderColor: theme.palette.divider,
  transition: "all 0.3s ease",
  height: 40,
  paddingRight: $active ? 12 : 0,
  cursor: "pointer",
  // backgroundColor: $active ? "rgba(25, 118, 210, 0.15)" : "transparent",
  "&:hover": {
    // borderColor: theme.palette.primary.main,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
}));

export default function ExpandingRelationCheck({ checked, onChange }) {
  const handleToggle = () => {
    onChange(!checked);
  };

  return (
    <Tooltip
      title={
        checked ? "Скрыть родственные связи" : "Показать родственные связи"
      }
    >
      <StyledContainer $active={checked} onClick={handleToggle}>
        <IconButton
          size="small"
          sx={{
            color: checked ? "primary.main" : "white",
            p: "9px",
            transition: "transform 0.3s ease",
            transform: checked ? "scale(1.1)" : "scale(1)",
          }}
        >
          <FamilyRestroomIcon fontSize="small" />
        </IconButton>

        {checked && (
          <Typography
            variant="caption"
            sx={{
              color: "white",
              whiteSpace: "nowrap",
              ml: 0.5,
              fontWeight: 700,
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Связи
          </Typography>
        )}
      </StyledContainer>
    </Tooltip>
  );
}
