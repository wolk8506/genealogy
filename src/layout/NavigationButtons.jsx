import { Box, Divider, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

import ToolbarButtonGroup from "../components/ToolbarButtonGroup";
import { useToolbarButtonGroupHitSx } from "../components/ToolbarCapsuleContext";
import { TOOLBAR_CAPSULE, TOOLBAR_HIT } from "./toolbarTokens";

function NavHitWrap({ children }) {
  const hitSx = useToolbarButtonGroupHitSx(false);
  return (
    <Box
      sx={{
        ...hitSx,
        p: 0,
        "& .MuiIconButton-root": {
          width: TOOLBAR_HIT.minWidth,
          height: TOOLBAR_HIT.height,
          p: 0,
          borderRadius: TOOLBAR_HIT.radiusPx,
          color: "inherit",
        },
        "& .MuiIconButton-root:hover": {
          backgroundColor: "transparent",
        },
      }}
    >
      {children}
    </Box>
  );
}

export default function NavigationButtons() {
  const navigate = useNavigate();

  const canGoBack = window.history.state?.idx > 0;
  const canGoForward = window.history.state?.idx < window.history.length - 1;

  return (
    <ToolbarButtonGroup gap={TOOLBAR_CAPSULE.gapSegmentsPx}>
      <NavHitWrap>
        <IconButton
          onClick={() => canGoBack && navigate(-1)}
          disabled={!canGoBack}
          size="small"
          aria-label="Назад"
        >
          <NavigateBeforeIcon sx={{ fontSize: TOOLBAR_HIT.iconSize }} />
        </IconButton>
      </NavHitWrap>

      <Divider
        orientation="vertical"
        flexItem
        aria-hidden
        sx={{
          alignSelf: "center",
          height: 18,
          mx: 0.25,
          borderColor: "divider",
          pointerEvents: "none",
        }}
      />

      <NavHitWrap>
        <IconButton
          onClick={() => canGoForward && navigate(1)}
          disabled={!canGoForward}
          size="small"
          aria-label="Вперёд"
        >
          <NavigateNextIcon sx={{ fontSize: TOOLBAR_HIT.iconSize }} />
        </IconButton>
      </NavHitWrap>
    </ToolbarButtonGroup>
  );
}
