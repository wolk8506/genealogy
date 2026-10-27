import { Box, ButtonBase, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { isMac } from "./helpTheme";
import { ToolbarIconButton, SidebarIcon } from "./HelpToolbar";

export const SIDEBAR_WIDTH = 248;
export const TOOLBAR_HEIGHT = 52;

function SidebarRow({ title, depth, selected, hasChildren, expanded, onClick, onToggle, colors }) {
  return (
    <Box sx={{ position: "relative", mx: 1.25, mb: "2px" }}>
      {hasChildren && (
        <ButtonBase
          aria-label={expanded ? "Свернуть" : "Развернуть"}
          onClick={onToggle}
          sx={{
            position: "absolute",
            left: 0,
            top: 5,
            width: 16,
            height: 18,
            borderRadius: "4px",
            color: colors.secondary,
            zIndex: 1,
          }}
        >
          <ChevronRightRoundedIcon
            sx={{
              fontSize: 16,
              transition: "transform 160ms ease",
              transform: expanded ? "rotate(90deg)" : "none",
            }}
          />
        </ButtonBase>
      )}
      <ButtonBase
        onClick={onClick}
        sx={{
          display: "block",
          width: "100%",
          textAlign: "left",
          pl: `${16 + depth * 12}px`,
          pr: 1,
          py: "5px",
          borderRadius: "6px",
          color: colors.text,
          bgcolor: selected ? colors.selected : "transparent",
          "&:hover": { bgcolor: selected ? colors.selected : colors.hover },
        }}
      >
        <Typography sx={{ fontSize: 13, lineHeight: 1.3, fontFamily: "inherit" }}>
          {title}
        </Typography>
      </ButtonBase>
    </Box>
  );
}

export default function HelpSidebar({
  guide,
  currentId,
  expanded,
  onNavigate,
  onToggleGroup,
  onHideSidebar,
  onOpenChangelog,
  colors,
}) {
  return (
    <Box
      component="nav"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        bgcolor: colors.sidebar,
        borderRight: `1px solid ${colors.divider}`,
      }}
    >
      <Box
        sx={{
          height: TOOLBAR_HEIGHT,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: isMac ? "flex-end" : "flex-start",
          px: 1.5,
          WebkitAppRegion: "drag",
        }}
      >
        <ToolbarIconButton title="Скрыть боковое меню" onClick={onHideSidebar} colors={colors}>
          <SidebarIcon />
        </ToolbarIconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", pt: 0.5, pb: 2 }}>
        <SidebarRow
          title="Добро пожаловать!"
          depth={0}
          selected={currentId === "home"}
          onClick={() => onNavigate("home")}
          colors={colors}
        />
        {guide.nodes.map((node) => {
          const isGroup = node.type === "group";
          const isOpen = isGroup && expanded.has(node.id);
          return (
            <Box key={node.id}>
              <SidebarRow
                title={node.title}
                depth={0}
                selected={currentId === node.id}
                hasChildren={isGroup}
                expanded={isOpen}
                onClick={() => onNavigate(node.id, { toggle: isGroup })}
                onToggle={() => onToggleGroup(node.id)}
                colors={colors}
              />
              {isOpen &&
                node.children.map((child) => (
                  <SidebarRow
                    key={child.id}
                    title={child.title}
                    depth={1}
                    selected={currentId === child.id}
                    onClick={() => onNavigate(child.id)}
                    colors={colors}
                  />
                ))}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ flexShrink: 0, py: 1.75, textAlign: "center" }}>
        <ButtonBase
          onClick={onOpenChangelog}
          sx={{ fontSize: 12, color: colors.link, fontFamily: "inherit", borderRadius: "4px", px: 0.5 }}
        >
          История версий
        </ButtonBase>
      </Box>
    </Box>
  );
}
