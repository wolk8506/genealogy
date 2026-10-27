import { forwardRef } from "react";
import { Box, ButtonBase, InputBase, Tooltip, Typography } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { isMac } from "./helpTheme";

export function SidebarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1.75" y="3" width="14.5" height="12" rx="2.6" stroke="currentColor" strokeWidth="1.3" />
      <line x1="6.6" y1="3.4" x2="6.6" y2="14.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function ToolbarIconButton({ title, onClick, disabled, children, colors, sx }) {
  return (
    <Tooltip title={title} enterDelay={600} disableInteractive>
      <span style={{ display: "inline-flex", WebkitAppRegion: "no-drag" }}>
        <ButtonBase
          aria-label={title}
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            color: colors.text,
            bgcolor: colors.control,
            transition: "background-color 120ms ease",
            "&:hover": { bgcolor: colors.controlHover },
            "&.Mui-disabled": { opacity: 0.35 },
            "& svg": { fontSize: 20 },
            ...sx,
          }}
        >
          {children}
        </ButtonBase>
      </span>
    </Tooltip>
  );
}

function NavButton({ title, onClick, disabled, children, colors }) {
  return (
    <Tooltip title={title} enterDelay={600} disableInteractive>
      <span style={{ display: "inline-flex" }}>
        <ButtonBase
          aria-label={title}
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: 32,
            height: 30,
            color: colors.text,
            "&:hover": { bgcolor: colors.controlHover },
            "&.Mui-disabled": { opacity: 0.35 },
            "& svg": { fontSize: 22 },
          }}
        >
          {children}
        </ButtonBase>
      </span>
    </Tooltip>
  );
}

const HelpToolbar = forwardRef(function HelpToolbar(
  {
    title,
    sidebarOpen,
    canGoBack,
    canGoForward,
    query,
    onQueryChange,
    onBack,
    onForward,
    onHome,
    onShowSidebar,
    colors,
    height,
  },
  searchRef,
) {
  return (
    <Box
      sx={{
        height,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        pl: !sidebarOpen && isMac ? "86px" : 2,
        pr: 2,
        borderBottom: `1px solid ${colors.divider}`,
        bgcolor: colors.content,
        WebkitAppRegion: "drag",
      }}
    >
      {!sidebarOpen && (
        <ToolbarIconButton title="Показать боковое меню" onClick={onShowSidebar} colors={colors}>
          <SidebarIcon />
        </ToolbarIconButton>
      )}

      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          borderRadius: "999px",
          overflow: "hidden",
          bgcolor: colors.control,
          WebkitAppRegion: "no-drag",
          "& > span + span": { borderLeft: `1px solid ${colors.divider}` },
        }}
      >
        <NavButton title="Назад" onClick={onBack} disabled={!canGoBack} colors={colors}>
          <ChevronLeftRoundedIcon />
        </NavButton>
        <NavButton title="Вперёд" onClick={onForward} disabled={!canGoForward} colors={colors}>
          <ChevronRightRoundedIcon />
        </NavButton>
      </Box>

      <ToolbarIconButton title="Домой" onClick={onHome} colors={colors}>
        <HomeOutlinedIcon />
      </ToolbarIconButton>

      <Typography
        noWrap
        sx={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, fontFamily: "inherit", color: colors.text }}
      >
        {title}
      </Typography>

      <Box
        sx={{
          width: 230,
          height: 30,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1.25,
          borderRadius: "999px",
          bgcolor: colors.control,
          color: colors.secondary,
          WebkitAppRegion: "no-drag",
          "&:focus-within": { boxShadow: `0 0 0 3px ${colors.link}40` },
        }}
      >
        <SearchRoundedIcon sx={{ fontSize: 17 }} />
        <InputBase
          inputRef={searchRef}
          value={query}
          placeholder="Поиск"
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onQueryChange("");
          }}
          sx={{
            flex: 1,
            fontSize: 13,
            fontFamily: "inherit",
            color: colors.text,
            "& input::placeholder": { color: colors.secondary, opacity: 1 },
          }}
        />
        {query && (
          <ButtonBase
            aria-label="Очистить"
            onClick={() => onQueryChange("")}
            sx={{ borderRadius: "50%", color: colors.secondary }}
          >
            <CloseRoundedIcon sx={{ fontSize: 15 }} />
          </ButtonBase>
        )}
      </Box>
    </Box>
  );
});

export default HelpToolbar;
