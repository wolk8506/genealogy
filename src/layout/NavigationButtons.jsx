import { Box, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

export default function NavigationButtons() {
  const navigate = useNavigate();

  const canGoBack = window.history.state?.idx > 0;
  const canGoForward = window.history.state?.idx < window.history.length - 1;

  return (
    <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
      <IconButton
        onClick={() => canGoBack && navigate(-1)}
        disabled={!canGoBack}
      >
        <ArrowBackIosIcon />
      </IconButton>

      <IconButton
        onClick={() => canGoForward && navigate(1)}
        disabled={!canGoForward}
      >
        <ArrowForwardIosIcon />
      </IconButton>
    </Box>
  );
}
