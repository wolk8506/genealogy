import React, { useState, useRef, useEffect } from "react";
import { styled, useTheme } from "@mui/material/styles";
import { Box, Typography, Slider, IconButton, Stack } from "@mui/material";
import {
  PauseRounded,
  PlayArrowRounded,
  FastForwardRounded,
  FastRewindRounded,
  VolumeUpRounded,
  VolumeDownRounded,
  GraphicEq as GraphicEqIcon, // Иконка для обложки по умолчанию
} from "@mui/icons-material";

// Стилизованные компоненты
const Widget = styled("div")(({ theme }) => ({
  padding: 16,
  borderRadius: 16,
  width: 343,
  maxWidth: "100%",
  margin: "auto",
  position: "relative",
  zIndex: 1,
  // Адаптация цвета под светлую/темную тему
  backgroundColor:
    theme.palette.mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)",
  backdropFilter: "blur(40px)",
  boxShadow: theme.shadows[4],
}));

const CoverImage = styled("div")(({ theme }) => ({
  width: 100,
  height: 100,
  objectFit: "cover",
  overflow: "hidden",
  flexShrink: 0,
  borderRadius: 8,
  backgroundColor:
    theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.text.secondary,
  "& > img": {
    width: "100%",
  },
}));

const TinyText = styled(Typography)({
  fontSize: "0.75rem",
  opacity: 0.5,
  fontWeight: 500,
  letterSpacing: 0.2,
});

export default function CustomAudioPlayer({ src, fileName }) {
  const theme = useTheme();
  const audioRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(30); // Громкость по умолчанию 30%

  // Форматирование времени (0:00)
  const formatDuration = (value) => {
    if (isNaN(value) || value === Infinity) return "0:00";
    const minute = Math.floor(value / 60);
    const secondLeft = Math.floor(value - minute * 60);
    return `${minute}:${secondLeft < 10 ? `0${secondLeft}` : secondLeft}`;
  };

  //   useEffect(() => {
  //     const audio = audioRef.current;
  //     if (!audio) return;

  //     const updateTime = () => setCurrentTime(audio.currentTime);
  //     const updateDuration = () => setDuration(audio.duration);
  //     const onEnded = () => setIsPlaying(false);

  //     audio.addEventListener("timeupdate", updateTime);
  //     audio.addEventListener("loadedmetadata", updateDuration);
  //     audio.addEventListener("ended", onEnded);

  //     // Устанавливаем начальную громкость
  //     audio.volume = volume / 100;

  //     return () => {
  //       audio.removeEventListener("timeupdate", updateTime);
  //       audio.removeEventListener("loadedmetadata", updateDuration);
  //       audio.removeEventListener("ended", onEnded);
  //     };
  //   }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Сбрасываем прогресс при смене трека
    setCurrentTime(0);

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", onEnded);

    // Устанавливаем громкость
    audio.volume = volume / 100;

    // АВТОЗАПУСК: когда src меняется, пытаемся начать воспроизведение
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          // Автоплей может быть заблокирован, если не было взаимодействия с DOM,
          // или если файл еще не прогрузился. Просто логируем это.
          console.log("Автозапуск ожидается или прерван:", error);
          setIsPlaying(false);
        });
    }

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]); // <-- Добавляем src сюда, чтобы эффект срабатывал при каждом новом файле

  const togglePlay = () => {
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (_, newValue) => {
    audioRef.current.currentTime = newValue;
    setCurrentTime(newValue);
  };

  const handleVolumeChange = (_, newValue) => {
    setVolume(newValue);
    audioRef.current.volume = newValue / 100;
  };

  // Перемотка назад на 10 сек
  const skipBackward = () => {
    const newTime = Math.max(0, currentTime - 10);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Перемотка вперед на 10 сек
  const skipForward = () => {
    const newTime = Math.min(duration, currentTime + 10);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Вычисляем оставшееся время
  const timeRemaining = Math.max(0, duration - currentTime);

  // Общие цвета для контролов в зависимости от темы
  const controlColor =
    theme.palette.mode === "dark" ? "#fff" : "rgba(0,0,0,0.87)";
  const inactiveColor =
    theme.palette.mode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

  return (
    <Box
      sx={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <audio ref={audioRef} src={src} />
      <Widget>
        {/* Блок с обложкой и названием */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <CoverImage>
            <GraphicEqIcon sx={{ fontSize: 40 }} />
          </CoverImage>

          <Box sx={{ ml: 1.5, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontWeight: 500 }}
            >
              Аудиозапись
            </Typography>
            <Typography noWrap fontWeight="bold">
              {fileName}
            </Typography>
            <Typography
              noWrap
              variant="caption"
              sx={{ letterSpacing: -0.25, color: "text.secondary" }}
            >
              Локальный файл
            </Typography>
          </Box>
        </Box>

        {/* Главный ползунок времени */}
        <Slider
          aria-label="time-indicator"
          size="small"
          value={currentTime}
          min={0}
          step={1}
          max={duration || 50}
          onChange={handleSliderChange}
          sx={{
            color: controlColor,
            height: 4,
            mt: 2,
            "& .MuiSlider-thumb": {
              width: 8,
              height: 8,
              transition: "0.3s cubic-bezier(.47,1.64,.41,.8)",
              "&::before": {
                boxShadow: "0 2px 12px 0 rgba(0,0,0,0.4)",
              },
              "&:hover, &.Mui-focusVisible": {
                boxShadow: `0px 0px 0px 8px ${
                  theme.palette.mode === "dark"
                    ? "rgb(255 255 255 / 16%)"
                    : "rgb(0 0 0 / 16%)"
                }`,
              },
              "&.Mui-active": {
                width: 20,
                height: 20,
              },
            },
            "& .MuiSlider-rail": {
              opacity: 0.28,
            },
          }}
        />

        {/* Тексты времени под ползунком */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mt: -2,
          }}
        >
          <TinyText>{formatDuration(currentTime)}</TinyText>
          <TinyText>-{formatDuration(timeRemaining)}</TinyText>
        </Box>

        {/* Кнопки управления воспроизведением */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mt: -1,
            "& svg": { color: controlColor },
          }}
        >
          <IconButton aria-label="rewind" onClick={skipBackward}>
            <FastRewindRounded fontSize="large" />
          </IconButton>

          <IconButton
            aria-label={isPlaying ? "pause" : "play"}
            onClick={togglePlay}
          >
            {isPlaying ? (
              <PauseRounded sx={{ fontSize: "3rem" }} />
            ) : (
              <PlayArrowRounded sx={{ fontSize: "3rem" }} />
            )}
          </IconButton>

          <IconButton aria-label="fast forward" onClick={skipForward}>
            <FastForwardRounded fontSize="large" />
          </IconButton>
        </Box>

        {/* Регулятор громкости */}
        <Stack
          spacing={2}
          direction="row"
          alignItems="center"
          sx={{
            mb: 1,
            px: 1,
            "& > svg": { color: inactiveColor },
          }}
        >
          <VolumeDownRounded
            onClick={() => setVolume(0)}
            sx={{ cursor: "pointer" }}
          />
          <Slider
            aria-label="Volume"
            value={volume}
            onChange={handleVolumeChange}
            sx={{
              color: controlColor,
              "& .MuiSlider-track": {
                border: "none",
              },
              "& .MuiSlider-thumb": {
                width: 24,
                height: 24,
                backgroundColor: "#fff",
                "&::before": {
                  boxShadow: "0 4px 8px rgba(0,0,0,0.4)",
                },
                "&:hover, &.Mui-focusVisible, &.Mui-active": {
                  boxShadow: "none",
                },
              },
            }}
          />
          <VolumeUpRounded
            onClick={() => setVolume(100)}
            sx={{ cursor: "pointer" }}
          />
        </Stack>
      </Widget>
    </Box>
  );
}
