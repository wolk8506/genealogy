import { Box, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { styled, useTheme } from "@mui/material/styles";

import Divider from "@mui/material/Divider";
import ButtonConteiner from "../components/ButtonConteiner";

export default function NavigationButtons() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const canGoBack = window.history.state?.idx > 0;
  const canGoForward = window.history.state?.idx < window.history.length - 1;

  return (
    <ButtonConteiner>
      <IconButton
        sx={{
          color: "white",
          p: 0.5,
        }}
        color={isDark ? "primary" : "default"}
        onClick={() => canGoBack && navigate(-1)}
        disabled={!canGoBack}
        size="small"
      >
        <NavigateBeforeIcon />
      </IconButton>
      <Divider orientation="vertical" variant="middle" flexItem />
      <IconButton
        sx={{ color: "white", p: 0.5 }}
        color={isDark ? "primary" : "default"}
        onClick={() => canGoForward && navigate(1)}
        disabled={!canGoForward}
        size="small"
      >
        <NavigateNextIcon />
      </IconButton>
    </ButtonConteiner>
  );
}
