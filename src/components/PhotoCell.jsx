import React, { useState } from "react";
import {
  Typography,
  IconButton,
  Box,
  Card,
  CardActionArea,
  CardMedia,
  Fade,
  styled,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

// Стилизованный оверлей с поддержкой скругления
const StyledOverlay = styled(Box)(({ theme }) => ({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  padding: theme.spacing(2),
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(0.5px)",
  color: "#fff",
  zIndex: 2,
  borderRadius: "inherit", // Наследует скругление от CardActionArea
}));

const ActionButtons = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 8,
  left: 0,
  right: 0,
  padding: theme.spacing(0, 1),
  display: "flex",
  justifyContent: "space-between",
  zIndex: 10,
  pointerEvents: "none",
  "& .MuiIconButton-root": {
    pointerEvents: "auto",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(8px)",
    color: "#fff",
    "&:hover": {
      backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
  },
}));

const PhotoCell = React.memo(
  ({
    photo,
    path,
    onDownload,
    onEdit,
    onDelete,
    onOpen,
    rowHeight,
    isDark,
    personId,
    allPeople = [],
  }) => {
    const [hover, setHover] = useState(false);

    const peopleText = (photo.people || [])
      .map((id) => {
        const person = allPeople.find((p) => p.id === id);
        return person
          ? `${person.firstName || ""} ${person.lastName || ""}`.trim()
          : `ID ${id}`;
      })
      .join(", ");

    return (
      <Card
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        sx={{
          width: "100%",
          height: rowHeight,
          borderRadius: "12px", // Фиксированное скругление
          position: "relative",
          overflow: "hidden", // КРИТИЧНО: обрезает всё, что выходит за границы
          bgcolor: isDark ? "#1e1e1e" : "#f0f0f0",
          boxShadow: hover ? 6 : 1,
          transition: "all 0.3s ease",
          border: isDark ? "1px solid #333" : "1px solid #e0e0e0",
          "&:hover": {
            transform: "translateY(-4px)",
          },
        }}
      >
        <CardActionArea
          onContextMenu={(e) => {
            e.preventDefault();
            window.contextAPI?.showPhotoMenu?.(
              photo,
              { x: e.clientX, y: e.clientY },
              "full",
              personId,
            );
          }}
          onClick={() => onOpen(photo)}
          sx={{
            height: "100%",
            borderRadius: "inherit", // Чтобы ripple не вылетал за края
            overflow: "hidden",
          }}
        >
          {path ? (
            <CardMedia
              component="img"
              image={path}
              alt={photo.title}
              sx={{
                height: "100%",
                width: "100%",
                objectFit: "cover",
                transition: "transform 0.5s ease",
                transform: hover ? "scale(1.05)" : "scale(1)",
              }}
            />
          ) : (
            <Box
              sx={{
                display: "flex",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Загрузка...
              </Typography>
            </Box>
          )}

          <Fade in={hover}>
            <StyledOverlay>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.2 }}
              >
                {photo.title || ""}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  opacity: 0.8,
                  fontSize: "0.7rem",
                }}
              >
                {photo.description || ""}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  //   color: "#90caf9",
                  fontWeight: 500,
                  fontSize: "0.65rem",
                }}
              >
                🏷️ {peopleText || "—"}
              </Typography>
            </StyledOverlay>
          </Fade>
        </CardActionArea>

        {/* Кнопки */}
        <ActionButtons sx={{ opacity: hover ? 1 : 0, transition: "0.2s" }}>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(photo);
              }}
            >
              <DownloadIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(photo);
              }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {personId === photo.owner && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(photo);
              }}
              sx={{
                "&:hover": { bgcolor: "rgba(211, 47, 47, 0.8) !important" },
              }}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </ActionButtons>

        {/* Дата (исчезает при наведении, чтобы не мешать тексту) */}
        {!hover && (
          <Box
            sx={{
              position: "absolute",
              bottom: 8,
              right: 8,
              bgcolor: "rgba(0, 0, 0, 0.5)",
              color: "orange",
              px: 0.8,
              py: 0.2,
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: 0.4,
              backdropFilter: "blur(4px)",
              // zIndex: 3,
            }}
          >
            <CalendarTodayIcon sx={{ fontSize: 14 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
              {photo.datePhoto || "—"}
            </Typography>
          </Box>
        )}
      </Card>
    );
  },
);

export default PhotoCell;
