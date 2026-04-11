import React, { useState } from "react";
import {
  Dialog,
  Box,
  IconButton,
  Typography,
  Stack,
  Tooltip,
  Divider,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import InfoIcon from "@mui/icons-material/Info";
import DownloadIcon from "@mui/icons-material/Download";

const PhotoFullscreenViewer = ({
  open,
  index,
  photos,
  photoPaths,
  thumbPaths,
  direction,
  hideLabels,
  onClose,
  onNext,
  onPrev,
  onToggleMaximize,
  currentPhotoInfo,
  onDownload,
}) => {
  const [showInfo, setShowInfo] = useState(true);

  const photo = photos[index];
  const displaySrc = photoPaths[photo?.id] || thumbPaths[photo?.id];
  const isHighRes = !!photoPaths[photo?.id];

  // Функция для парсинга текста и оборачивания тегов в стилизованные span
  const renderTextWithTags = (text) => {
    if (!text) return "";

    // Регулярка для поиска тегов
    const parts = text.split(/(#[\p{L}\d_]+)/gu);

    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        return (
          <Box
            key={i}
            component="span"
            sx={{
              display: "inline-block",
              bgcolor: "#0d47a1", // blue.900
              color: "#fff",
              px: 0.7,
              mx: 0.3,
              borderRadius: "4px",
              fontSize: "0.85em",
              fontWeight: 600,
              lineHeight: 1.2,
              verticalAlign: "middle",
            }}
          >
            {part}
          </Box>
        );
      }
      return part;
    });
  };

  if (!photo) return null;

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { bgcolor: "#000", backgroundImage: "none" } }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          bgcolor: "#000",
        }}
      >
        {/* --- СЧЕТЧИК --- */}
        {!hideLabels && (
          <Box
            sx={{
              position: "absolute",
              display: "flex",
              alignItems: "center",
              top: 10,
              left: 90,
              zIndex: 15,
              bgcolor: "rgba(0,0,0,0.5)",
              color: "#fff",
              px: 2,
              // py: 0.5,
              height: 34,
              borderRadius: "20px",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: "bold" }}>
              {index + 1} / {photos.length}
            </Typography>
          </Box>
        )}

        {/* --- ВЕРХНЕЕ УПРАВЛЕНИЕ --- */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            position: "absolute",
            WebkitAppRegion: "no-drag",
            top: 10,
            right: 10,
            zIndex: 15,
            // Начальное состояние: почти прозрачный
            opacity: 0.2,
            transition: "opacity 0.3s ease-in-out",
            // Состояние при наведении на весь блок Stack
            "&:hover": {
              opacity: 1,
            },
          }}
        >
          <Box
            sx={{
              backdropFilter: "blur(4px)",
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 7,
              height: 34,
              color: "text.secondary",
              fontSize: 20,
            }}
          >
            <Tooltip title="Скачать">
              <IconButton
                onClick={() => onDownload?.(photo)}
                size="small"
                sx={{ color: "white", p: 1 }}
              >
                <DownloadIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>

            <Tooltip title={showInfo ? "Скрыть описание" : "Показать описание"}>
              <IconButton
                onClick={() => setShowInfo(!showInfo)}
                size="small"
                sx={{
                  color: showInfo ? "primary.main" : "#fff",
                  p: 1,
                }}
              >
                <InfoIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip
              title={
                hideLabels ? "Выйти из полноэкранного режима" : "На весь экран"
              }
            >
              <IconButton
                onClick={onToggleMaximize}
                size="small"
                sx={{
                  color: "#fff",
                  p: 1,
                }}
              >
                {hideLabels ? (
                  <FullscreenExitIcon fontSize="inherit" />
                ) : (
                  <FullscreenIcon fontSize="inherit" />
                )}
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" variant="middle" flexItem />
            <Tooltip title={"Закрыть"}>
              <IconButton
                onClick={onClose}
                size="small"
                sx={{
                  color: "#fff",
                  p: 1,
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>

        {/* --- ИЗОБРАЖЕНИЕ (СЛАЙДЕР) --- */}
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={index}
            src={displaySrc}
            custom={direction}
            variants={{
              enter: (direction) => ({
                x: direction > 0 ? "100%" : "-100%",
                opacity: 0,
                scale: 0.95,
              }),
              center: {
                x: 0,
                opacity: 1,
                scale: 1,
                zIndex: 1,
              },
              exit: (direction) => ({
                x: direction < 0 ? "100%" : "-100%",
                opacity: 0,
                scale: 0.95,
                zIndex: 0,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "tween", ease: [0.4, 0.0, 0.2, 1], duration: 0.4 },
              opacity: { duration: 0.25 },
              scale: { duration: 0.4 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.x < -100 || velocity.x < -500) onNext();
              else if (offset.x > 100 || velocity.x > 500) onPrev();
            }}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              position: "absolute",
              willChange: "transform, opacity",
              filter: isHighRes ? "none" : "blur(10px)",
              transition: "filter 0.5s ease-out",
            }}
          />
        </AnimatePresence>

        {/* --- ИНФОРМАЦИОННАЯ ПАНЕЛЬ --- */}
        <AnimatePresence>
          {showInfo && currentPhotoInfo && (
            <motion.div
              key={`info-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                position: "absolute",
                bottom: 30,
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "rgba(0, 0, 0, 0.85)", // Чуть плотнее фон для читаемости тегов
                padding: "15px 25px",
                borderRadius: "16px",
                textAlign: "center",
                color: "#fff",
                zIndex: 10,
                backdropFilter: "blur(8px)",
                maxWidth: "85%",
                pointerEvents: "auto", // Изменил на auto, если захотите сделать теги кликабельными
                border: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <Typography
                variant="h6"
                sx={{ lineHeight: 1.2, mb: 1, fontWeight: 700 }}
              >
                {currentPhotoInfo.title || ""}
              </Typography>

              {/* ОПИСАНИЕ С ПОДСВЕТКОЙ ТЕГОВ */}
              <Typography
                variant="body2"
                sx={{ opacity: 0.9, mb: 2, lineHeight: 1.6 }}
              >
                {renderTextWithTags(currentPhotoInfo.description)}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  borderTop: "1px solid rgba(255,255,255,0.2)",
                  pt: 1.5,
                  fontSize: "0.75rem",
                  letterSpacing: "0.03em",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {currentPhotoInfo.ownerText} |{" "}
                {currentPhotoInfo.datePhoto &&
                  `📅 ${currentPhotoInfo.datePhoto} | `}
                🏷️ На фото: {currentPhotoInfo.peopleText || "—"}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  borderTop: "1px solid rgba(255,255,255,0.2)",
                  pt: 1.5,
                  fontSize: "0.75rem",
                  letterSpacing: "0.03em",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {currentPhotoInfo.locationName &&
                  `📍 ${currentPhotoInfo.locationName}`}
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- НАВИГАЦИЯ (СТРЕЛКИ) --- */}
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          disabled={index === 0}
          sx={{
            position: "absolute",
            left: 20,
            zIndex: 2,
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.1)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            "&.Mui-disabled": { color: "rgba(255,255,255,0.1)" },
          }}
        >
          <ArrowBackIosNewIcon fontSize="large" />
        </IconButton>

        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          disabled={index === photos.length - 1}
          sx={{
            position: "absolute",
            right: 20,
            zIndex: 2,
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.1)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            "&.Mui-disabled": { color: "rgba(255,255,255,0.1)" },
          }}
        >
          <ArrowForwardIosIcon fontSize="large" />
        </IconButton>
      </Box>
    </Dialog>
  );
};

export default PhotoFullscreenViewer;
