import {
  Badge,
  IconButton,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  Button,
  alpha,
  Stack,
  Divider,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"; // Корзина
import CircleIcon from "@mui/icons-material/Circle"; // Точка индикатора
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useNotificationStore } from "../store/useNotificationStore";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const STATUS_CONFIG = {
  success: { color: "#4caf50" },
  error: { color: "#f44336" },
  info: { color: "#2196f3" },
  warning: { color: "#ff9800" },
};

export const NotificationBell = () => {
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

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    markAsSeen();
  };

  const handleClose = () => {
    setAnchorEl(null);
    clearNewStatus();
  };
  const buttonName = (data) => {
    if (data.includes("/person/")) return "Перейти к человеку →";
    else if (data.includes("/archive")) return "Перейти в архив →";
    else return "Смотреть детали →";
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
          // gap: 1,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 7,
          height: 34,
          color: "text.secondary",
          fontSize: 20,
        }}
      >
        <IconButton
          onClick={handleOpen}
          sx={{
            p: 1,
            // bgcolor: alpha("#fff", 0.05),
            //   border: "1px solid",
            //   borderColor: "divider",
            //   "&:hover": { bgcolor: alpha("#fff", 0.1) },
          }}
        >
          <Badge variant="dot" invisible={!hasNew} color="warning">
            <NotificationsIcon sx={{ color: "white", fontSize: 18 }} />
          </Badge>
        </IconButton>
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 380,
            mt: 2,
            borderRadius: "16px",
            overflow: "hidden",
            bgcolor: "background.paper",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            border: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: alpha("#fff", 0.02),
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
                borderRadius: "8px",
              }}
            >
              Удалить все
            </Button>
          )}
        </Box>
        <Divider />

        <List sx={{ p: 0, maxHeight: 480, overflowY: "auto" }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.disabled">
                Список пуст
              </Typography>
            </Box>
          ) : (
            notifications.map((note) => {
              const status = STATUS_CONFIG[note.type] || STATUS_CONFIG.info;

              return (
                <ListItem
                  key={note.id}
                  disablePadding
                  sx={{
                    flexDirection: "column",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    transition: "background 0.3s ease",
                    // Легкий слой цвета для непрочитанных
                    bgcolor: note.isNew
                      ? alpha("#ffc107", 0.06)
                      : "transparent",
                    "&:hover": {
                      bgcolor: note.isNew
                        ? alpha("#ffc107", 0.1)
                        : alpha("#fff", 0.02),
                    },
                  }}
                >
                  <Box sx={{ p: 2, width: "100%" }}>
                    <Stack spacing={0.8}>
                      {/* Верхняя строка: Индикатор + Тип + Время */}
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          {note.isNew && (
                            <CircleIcon
                              sx={{ fontSize: 8, color: "#ffc107" }}
                            />
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              color: status.color,
                              fontWeight: 900,
                              textTransform: "uppercase",
                              letterSpacing: 0.8,
                            }}
                          >
                            {note.title}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.disabled">
                          {new Date(note.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </Stack>

                      {/* Текст сообщения */}
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.primary",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.5,
                          fontSize: "0.85rem",
                          maxHeight: "150px",
                          overflowY: "auto",
                          pr: 1,
                          "&::-webkit-scrollbar": { width: "3px" },
                          "&::-webkit-scrollbar-thumb": {
                            bgcolor: alpha(status.color, 0.2),
                            borderRadius: "3px",
                          },
                        }}
                      >
                        {note.message}
                      </Typography>

                      {/* Нижняя строка: Кнопка перехода + Корзина */}
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mt: 0.5 }}
                      >
                        <Box>
                          {note.link && (
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => {
                                navigate(note.link);
                                handleClose();
                              }}
                              sx={{
                                color: status.color,
                                p: 0,
                                fontSize: "0.75rem",
                                textTransform: "none",
                                fontWeight: 700,
                                "&:hover": {
                                  bgcolor: "transparent",
                                  textDecoration: "underline",
                                },
                              }}
                            >
                              {buttonName(note.link)}
                            </Button>
                          )}
                        </Box>

                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(note.id);
                          }}
                          sx={{
                            color: "text.disabled",
                            "&:hover": {
                              color: "error.main",
                              bgcolor: alpha("#f44336", 0.1),
                            },
                            transition: "0.2s",
                          }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Box>
                </ListItem>
              );
            })
          )}
        </List>
      </Popover>
    </>
  );
};
