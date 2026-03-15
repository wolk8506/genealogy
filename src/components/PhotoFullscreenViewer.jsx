import React from "react";
import { Dialog, Box, IconButton, Typography, Stack } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

const PhotoFullscreenViewer = ({
  open,
  index,
  photos, // Массив объектов фото
  photoPaths, // Это теперь буфер .full
  thumbPaths, // Это новый пропс .thumbs
  direction,
  hideLabels,
  onClose,
  onNext,
  onPrev,
  onToggleMaximize,
  currentPhotoInfo, // Тот самый объект с текстом, который мы подготовили через useMemo
}) => {
  const photo = photos[index];

  // Логика: если есть Full — берем его, если нет — берем Thumb
  const displaySrc = photoPaths[photo?.id] || thumbPaths[photo?.id];
  const isHighRes = !!photoPaths[photo?.id];

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { bgcolor: "#000" } }}
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
        }}
      >
        {/* Счетчик */}
        {!hideLabels && (
          <Box
            sx={{
              position: "absolute",
              top: 20,
              left: 20,
              zIndex: 15,
              bgcolor: "rgba(0,0,0,0.5)",
              color: "#fff",
              px: 2,
              py: 0.5,
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

        {/* Управление */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ position: "absolute", top: 10, right: 10, zIndex: 15 }}
        >
          <IconButton
            onClick={onToggleMaximize}
            sx={{ color: "#fff", bgcolor: "rgba(0,0,0,0.3)" }}
          >
            {hideLabels ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
          <IconButton
            onClick={onClose}
            sx={{ color: "#fff", bgcolor: "rgba(0,0,0,0.3)" }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>

        {/* Слайдер */}
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={index}
            src={displaySrc}
            custom={direction}
            variants={{
              enter: (direction) => ({
                x: direction > 0 ? "100%" : "-100%",
                opacity: 0,
                scale: 0.95, // Добавляем легкое масштабирование для глубины
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
              // Переходим на более предсказуемый ease
              x: { type: "tween", ease: [0.4, 0.0, 0.2, 1], duration: 0.4 },
              opacity: { duration: 0.25 },
              scale: { duration: 0.4 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6} // Делаем drag более "резиновым"
            onDragEnd={(e, { offset, velocity }) => {
              // Добавляем проверку скорости (velocity), чтобы листалось легче
              const swipe = Math.abs(offset.x) * velocity.x;
              if (offset.x < -100 || velocity.x < -500) onNext();
              else if (offset.x > 100 || velocity.x > 500) onPrev();
            }}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              position: "absolute",
              willChange: "transform, opacity", // Подсказываем браузеру вынести в GPU
              filter: isHighRes ? "none" : "blur(10px)",
              // Чтобы блюр не тормозил анимацию, применяем его только когда картинка "в центре"
              transition: "filter 0.5s ease-out",
            }}
          />
        </AnimatePresence>

        {/* Информация */}
        {!hideLabels && currentPhotoInfo && (
          <motion.div
            key={`info-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: "absolute",
              bottom: 30,
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              padding: "15px 25px",
              borderRadius: "12px",
              textAlign: "center",
              color: "#fff",
              zIndex: 10,
              backdropFilter: "blur(5px)",
              maxWidth: "80%",
              pointerEvents: "none",
            }}
          >
            <Typography variant="h6">{currentPhotoInfo.title}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
              {currentPhotoInfo.description}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                borderTop: "1px solid rgba(255,255,255,0.2)",
                pt: 1,
              }}
            >
              {currentPhotoInfo.ownerText} |{" "}
              {currentPhotoInfo.datePhoto &&
                `📅 ${currentPhotoInfo.datePhoto} | `}{" "}
              🏷️ На фото: {currentPhotoInfo.peopleText || "—"}
            </Typography>
          </motion.div>
        )}

        {/* Навигация */}
        <IconButton
          onClick={onPrev}
          disabled={index === 0}
          sx={{
            position: "absolute",
            left: 20,
            zIndex: 2,
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.1)",
          }}
        >
          <ArrowBackIosNewIcon fontSize="large" />
        </IconButton>
        <IconButton
          onClick={onNext}
          disabled={index === photos.length - 1}
          sx={{
            position: "absolute",
            right: 20,
            zIndex: 2,
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.1)",
          }}
        >
          <ArrowForwardIosIcon fontSize="large" />
        </IconButton>
      </Box>
    </Dialog>
  );
};

export default PhotoFullscreenViewer;
