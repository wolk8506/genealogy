import { Box, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { styled, useTheme } from "@mui/material/styles";

import Divider from "@mui/material/Divider";

export default function NavigationButtons() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const canGoBack = window.history.state?.idx > 0;
  const canGoForward = window.history.state?.idx < window.history.length - 1;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid",
        // borderRadius: "15px",
        borderColor: "divider",
        borderRadius: 7,
        // bgcolor: "background.paper",
        color: "text.secondary",
        "& svg": {
          m: 1,
        },
      }}
    >
      <IconButton
        color={isDark ? "primary" : "default"}
        onClick={() => canGoBack && navigate(-1)}
        disabled={!canGoBack}
        size="small"
      >
        <ArrowBackIosIcon fontSize="inherit" />
      </IconButton>
      <Divider orientation="vertical" variant="middle" flexItem />
      <IconButton
        color={isDark ? "primary" : "default"}
        onClick={() => canGoForward && navigate(1)}
        disabled={!canGoForward}
        size="small"
      >
        <ArrowForwardIosIcon fontSize="inherit" />
      </IconButton>
    </Box>
  );
}
