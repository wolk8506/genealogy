import { Typography, Stack, Box, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PersonAvatar from "../../../components/PersonAvatar";
import { useNavigate } from "react-router-dom";

export const RenderPersonItem = ({ onClick, p }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const name =
    [p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") ||
    "Без имени";
  const initials =
    (p.firstName?.[0] || "") +
    (p.lastName?.[0] || (p.maidenName?.[0] ? p.maidenName?.[1] : ""));

  return (
    <Box
      key={p.id}
      onClick={() => {
        navigate(`/person/${p.id}`);
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
        overflow: "hidden",
        bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff",
          borderColor: theme.palette.primary.main,
          boxShadow: isDark
            ? "0 8px 24px rgba(0,0,0,0.4)"
            : "0 8px 24px rgba(0,0,0,0.08)",
          transform: "translateY(-2px)",
        },
        "&:active": {
          transform: "translateY(0)",
        },
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ overflow: "hidden", flex: 1 }}
        >
          {/* Аватар */}
          <Box
            sx={{
              p: "2px",
              borderRadius: "50%",
              border: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            <PersonAvatar personId={p.id} initials={initials} size={42} />
          </Box>

          {/* Текстовая информация */}
          <Stack spacing={0.2} sx={{ overflow: "hidden" }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "0.95rem",
                color: "text.primary",
              }}
            >
              {name}
            </Typography>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  letterSpacing: "0.5px",
                  fontSize: "0.7rem",
                  opacity: 0.8,
                }}
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
                sx={{
                  color: "text.disabled",
                  fontSize: "0.7rem",
                }}
              >
                {p.generation} пок.
              </Typography>
              {/* СТЕПЕНЬ РОДСТВА (Бейдж справа) */}
              {p.kinship && (
                <Box
                  sx={{
                    ml: 1,
                    px: 1,
                    py: 0.3,
                    borderRadius: "6px",
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    whiteSpace: "nowrap",
                    // Динамический цвет в зависимости от родства
                    bgcolor: (theme) =>
                      p.kinship === "Общие родители"
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.action.disabled, 0.1),
                    color: (theme) =>
                      p.kinship === "Общие родители"
                        ? theme.palette.primary.main
                        : theme.palette.text.secondary,
                    border: "1px solid",
                    borderColor: (theme) =>
                      p.kinship === "Общие родители"
                        ? alpha(theme.palette.primary.main, 0.2)
                        : "transparent",
                  }}
                >
                  {p.kinship}
                </Box>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
};
