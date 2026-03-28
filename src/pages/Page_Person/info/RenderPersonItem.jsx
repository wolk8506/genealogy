import { Typography, Stack, Box, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PersonAvatar from "../../../components/PersonAvatar";
import { useNavigate } from "react-router-dom";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { IconButton, Tooltip } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import Person2Icon from "@mui/icons-material/Person2";

export const RenderPersonItem = ({
  p,
  onUnlink,
  unlinkPosition = "top", // "top" для детей/супругов, "bottom" для родителей
  onClick,
  link = false,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const name =
    [p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") ||
    "Без имени";
  const initials =
    (p.firstName?.[0] || "") +
    (p.lastName?.[0] || (p.maidenName?.[0] ? p.maidenName?.[1] : ""));

  const handleUnlink = (e) => {
    e.stopPropagation(); // Чтобы не срабатывал переход по клику на карточку
    if (onUnlink) onUnlink(p.id);
  };

  // Стили для кнопки в зависимости от позиции
  const unlinkButtonStyles = {
    position: "absolute",
    zIndex: 10,
    left: "50%",
    transform: "translateX(-50%)",
    opacity: 0,
    transition: "all 0.2s ease",
    bgcolor: theme.palette.error.main,
    color: "#fff",
    padding: "4px",
    "&:hover": {
      bgcolor: theme.palette.error.dark,
      transform: "translateX(-50%) scale(1.1)",
    },
    // Позиционирование
    ...(unlinkPosition === "bottom"
      ? { bottom: "-12px" } // Для родителей — внизу
      : { top: "-12px" }), // Для остальных — вверху
  };

  return (
    <Box
      onClick={() => {
        if (link) navigate(`/person/${p.id}`);
        if (onClick) onClick();
      }}
      sx={{
        cursor: "pointer",
        border: "1.5px solid",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
        borderRadius: 4,
        p: "10px 16px",
        width: "100%",
        minWidth: "320px",
        position: "relative",
        // Убираем overflow: hidden, чтобы кнопки-бейжди могли выступать за края
        bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff",
          borderColor: theme.palette.primary.main,
          boxShadow: isDark
            ? "0 8px 24px rgba(0,0,0,0.4)"
            : "0 8px 24px rgba(0,0,0,0.08)",
          // transform: "translateY(-2px)",
          // Показываем кнопку при наведении на всю карточку
          "& .unlink-button": {
            opacity: 1,
            transform: "translateX(-50%) translateY(0)",
          },
        },
      }}
      // onClick={() => onClick?.()}
    >
      {p.gender === "female" ? (
        <Person2Icon
          sx={{
            position: "absolute",
            right: 0,
            bottom: 0,
            fontSize: "50px",
            color: "primary.main",
            opacity: 0.05,
            pointerEvents: "none",
          }}
        />
      ) : (
        <PersonIcon
          sx={{
            position: "absolute",
            right: 0,
            bottom: 0,
            fontSize: "50px",
            color: "primary.main",
            opacity: 0.05,
            pointerEvents: "none",
          }}
        />
      )}
      {/* Кнопка разрыва связи */}
      {onUnlink && (
        <Tooltip title="Разорвать связь" placement="top">
          <IconButton
            className="unlink-button"
            size="small"
            onClick={handleUnlink}
            sx={unlinkButtonStyles}
          >
            <LinkOffIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </Tooltip>
      )}
      <Stack direction="row" spacing={2} alignItems="center">
        <PersonAvatar personId={p.id} initials={initials} size={42} />

        <Stack spacing={0.2} sx={{ overflow: "hidden", flex: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: "0.95rem",
            }}
          >
            {name}
          </Typography>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontSize: "0.7rem" }}
            >
              ID: {p.id}
            </Typography>
            <Box
              sx={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                bgcolor: "divider",
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: "text.disabled", fontSize: "0.7rem" }}
            >
              {p.generation} пок.
            </Typography>

            {p.kinship && (
              <Box
                sx={{
                  ml: "auto",
                  px: 1,
                  borderRadius: "6px",
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  border: "1px solid",
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                }}
              >
                {p.kinship}
              </Box>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
};
