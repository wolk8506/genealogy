import {
  Badge,
  IconButton,
  Popover,
  Box,
  Typography,
  Button,
  alpha,
  Stack,
  useTheme,
  lighten,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CircleIcon from "@mui/icons-material/Circle";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useNotificationStore } from "../store/useNotificationStore";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import { formatNotificationDate } from "../utils/formatDate";
import TrashFillIcon from "../components/svg/TrashFillIcon";
import EventIcon from "@mui/icons-material/Event";
import InfoIcon from "@mui/icons-material/Info";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import PieChartIcon from "@mui/icons-material/PieChart";
import PermIdentityIcon from "@mui/icons-material/PermIdentity";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import { useFaceReviewStore } from "../store/useFaceReviewStore";

const notificationIcon = {
  trash: <TrashFillIcon />,
  people: <PermIdentityIcon />,
  photo: <PhotoLibraryIcon />,
  fact: <InfoIcon />,
  event: <EventIcon />,
  dangerZone: <WarningAmberIcon />,
  optimizationMaster: <AutoFixHighIcon />,
  dataManagement: <PieChartIcon />,
  faceReview: <FaceRetouchingNaturalIcon />,
};

const STATUS_CONFIG = {
  success: { color: "#4caf50" },
  error: { color: "#f44336" },
  info: { color: "#2196f3" },
  warning: { color: "#ff9800" },
};

export const NotificationBell = () => {
  const theme = useTheme();
  const {
    notifications,
    hasNew,
    markAsSeen,
    clearNewStatus,
    removeNotification,
    clearAll,
  } = useNotificationStore();

  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const openReview = useFaceReviewStore((s) => s.openReview);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    markAsSeen();
  };

  const handleClose = () => {
    setAnchorEl(null);
    clearNewStatus();
  };

  const buttonName = (data) => {
    if (typeof data !== "string") return "Детали ▸";
    if (data.includes("/person/")) return "К человеку ▸";
    if (data.includes("/external/")) return "В справочник ▸";
    if (data.includes("/trash")) return "Корзина ▸";
    return "Детали ▸";
  };

  return (
    <>
      <Box
        sx={{
          WebkitAppRegion: "no-drag",
          ml: 2,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 7,
          height: 34,
          color: "text.secondary",
        }}
      >
        <IconButton onClick={handleOpen} sx={{ p: 1 }}>
          <Badge variant="dot" invisible={!hasNew} color="warning">
            <NotificationsIcon sx={{ color: "white", fontSize: 18 }} />
          </Badge>
        </IconButton>
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        elevation={0} // Убираем тень самого поповера
        PaperProps={{
          sx: {
            width: 360,
            mt: 1.5,
            bgcolor: "transparent", // Убираем общий фон
            boxShadow: "none",
            backgroundImage: "none",
            border: "none",
            overflow: "visible",

            // ТРЕУГОЛЬНИК (Хвостик)
            "&::before": {
              content: '""',
              display: "block",
              position: "absolute",
              top: -7,
              left: "calc(50% - 7px)",
              width: 14,
              height: 14,
              bgcolor: lighten(theme.palette.background.paper, 0.1),
              borderLeft: "1px solid",
              borderTop: "1px solid",
              borderColor: "divider",
              transform: "rotate(45deg)",
              zIndex: 100,
            },
          },
        }}
      >
        {/* ШАПКА */}
        <Box
          sx={{
            p: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: lighten(theme.palette.background.paper, 0.1),
            borderRadius: "16px",
            border: "1px solid",
            borderColor: "divider",
            position: "relative",
            zIndex: notifications.length + 10,
            width: 340,
            mr: "auto",
            ml: "auto",

            // Небольшой хак: закрашиваем "вход" треугольника основным цветом
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: "20%",
              right: "20%",
              height: "10px",
              bgcolor: lighten(theme.palette.background.paper, 0.1),
              zIndex: -1,
            },
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Центр уведомлений ({notifications.length})
          </Typography>
          {notifications.length > 0 && (
            <Button
              size="small"
              startIcon={<DeleteSweepIcon />}
              onClick={clearAll}
              sx={{
                textTransform: "none",
                color: "text.secondary",
                "&:hover": { color: "error.main" },
              }}
            >
              Очистить
            </Button>
          )}
        </Box>

        {/* СПИСОК КАРТОЧЕК */}
        <Box
          sx={{
            maxHeight: 480,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            // px: 0.5,
            pb: 3, // Запас для видимости стопки внизу
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
            mb: 2,
            width: 356,
            mr: "auto",
            ml: "auto",
          }}
        >
          <AnimatePresence initial={false}>
            {notifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    mt: 1.5,
                    textAlign: "center",
                    bgcolor: lighten(theme.palette.background.paper, 0.1),
                    borderRadius: 5,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" color="text.disabled">
                    Нет новых уведомлений
                  </Typography>
                </Box>
              </motion.div>
            ) : (
              notifications.map((note, index) => {
                const status = STATUS_CONFIG[note.type] || STATUS_CONFIG.info;

                return (
                  <motion.div
                    key={note.id} // Важно: key должен быть уникальным ID уведомления
                    layout // Позволяет другим карточкам плавно съезжаться
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      scale: 1.1,
                      transition: { duration: 0.3, ease: "easeOut" },
                    }}
                    style={{ originX: 0.5, originY: 0.5 }} // Центр трансформации
                  >
                    <Box
                      sx={{
                        // Мы убираем жесткий position: sticky здесь,
                        // так как анимация layout может конфликтовать с ним.
                        // Если "стопка" критична, можно вернуть, но для списка лучше обычный поток.
                        mt: index === 0 ? 1.5 : 0,
                        p: 1.5,
                        mx: 1,
                        borderRadius: 5,
                        bgcolor: lighten(theme.palette.background.paper, 0.1),
                        border: "1px solid",
                        borderColor: note.isNew
                          ? alpha(status.color, 0.5)
                          : "divider",
                        transition:
                          "background-color 0.2s ease, transform 0.2s ease",
                        position: "relative",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          bgcolor: lighten(
                            theme.palette.background.paper,
                            0.08,
                          ),
                          "& .button": { opacity: 1 },
                        },
                      }}
                    >
                      {/* КНОПКА УДАЛЕНИЯ */}
                      <IconButton
                        className="button"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(note.id);
                        }}
                        sx={{
                          position: "absolute",
                          top: -6,
                          left: -6,
                          opacity: 0,
                          transition: "opacity 0.2s ease",
                          color: "text.disabled",
                          p: 0.5,
                          bgcolor: lighten(
                            theme.palette.background.paper,
                            0.15,
                          ),
                          zIndex: 10,
                          "&:hover": {
                            bgcolor: lighten(
                              theme.palette.background.paper,
                              0.2,
                            ),
                          },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>

                      {(note.link || note.category === "faceReview") && (
                        <Button
                          className="button"
                          size="small"
                          onClick={() => {
                            if (note.category === "faceReview") {
                              openReview();
                            } else {
                              navigate(note.link);
                            }
                            handleClose();
                          }}
                          sx={{
                            color: status.color,
                            opacity: 0,
                            py: 0,
                            transition: "opacity 0.2s ease",
                            textTransform: "none",
                            fontWeight: 700,
                            position: "absolute",
                            bottom: 6,
                            right: 12,
                            bgcolor: lighten(
                              theme.palette.background.paper,
                              0.15,
                            ),
                          }}
                        >
                          {note.category === "faceReview"
                            ? "Проверить ▸"
                            : buttonName(note.link)}
                        </Button>
                      )}

                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mr: 1.5,
                            borderRadius: 2,
                            bgcolor: "divider",
                          }}
                        >
                          {notificationIcon[note.category]}
                        </Box>
                        <Stack spacing={1}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ width: "280px" }} // Небольшой отступ слева для заголовка, чтобы не наезжал на крестик
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              {note.isNew && (
                                <CircleIcon
                                  sx={{
                                    fontSize: 10,
                                    color: status.color,
                                    opacity: 0.8,
                                  }}
                                />
                              )}
                              <Typography
                                variant="caption"
                                sx={{
                                  color: status.color,
                                  fontWeight: 700,
                                  fontSize: "13px",
                                }}
                              >
                                {note.title}
                              </Typography>
                            </Stack>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.disabled", fontWeight: 600 }}
                            >
                              {formatNotificationDate(note.timestamp)}
                            </Typography>
                          </Stack>

                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 400,
                              fontSize: "13px",
                            }}
                          >
                            {note.message}
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </Box>
      </Popover>
    </>
  );
};
