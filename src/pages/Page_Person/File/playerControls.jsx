import { useState, useEffect, useRef } from "react";
import { Box, Slider, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  PauseRounded,
  PlayArrowRounded,
  Replay10Rounded,
  Forward10Rounded,
} from "@mui/icons-material";
import { RADIUS, MOTION } from "../../../theme/designTokens";
import { sliderSx } from "../../Page_Settings/settingsUi";
import {
  VolumeMuteIcon,
  VolumeLowIcon,
  VolumeWave1Icon,
  VolumeWave2Icon,
  VolumeWave3Icon,
} from "./VolumeIcons";

export const iconButtonSx = {
  border: 0,
  p: 0,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  bgcolor: "transparent",
  color: "text.primary",
  transition: `opacity ${MOTION.fast} ease, background-color ${MOTION.fast} ease, color ${MOTION.fast} ease, transform ${MOTION.fast} ${MOTION.easeOut}`,
  "&:focus-visible": {
    outline: "2px solid",
    outlineColor: "primary.main",
    outlineOffset: 2,
  },
};

export function formatDuration(value) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const total = Math.floor(value);
  const minute = Math.floor(total / 60);
  const secondLeft = total - minute * 60;
  return `${minute}:${secondLeft < 10 ? `0${secondLeft}` : secondLeft}`;
}

// Состояние воспроизведения общего для аудио и видео: у обоих одинаковый
// набор событий и жестов управления.
export function useMediaPlayback(mediaRef, src) {
  const lastVolumeRef = useRef(30);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(30);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    setCurrentTime(0);
    setDuration(0);

    const syncDuration = () => {
      if (Number.isFinite(media.duration)) setDuration(media.duration);
    };
    const syncTime = () => setCurrentTime(media.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    media.addEventListener("timeupdate", syncTime);
    media.addEventListener("loadedmetadata", syncDuration);
    media.addEventListener("durationchange", syncDuration);
    media.addEventListener("play", onPlay);
    media.addEventListener("pause", onPause);
    media.addEventListener("ended", onPause);

    syncDuration();

    // Выбор файла — жест пользователя, поэтому воспроизведение можно начать сразу
    media.play()?.catch(() => setIsPlaying(false));

    return () => {
      media.removeEventListener("timeupdate", syncTime);
      media.removeEventListener("loadedmetadata", syncDuration);
      media.removeEventListener("durationchange", syncDuration);
      media.removeEventListener("play", onPlay);
      media.removeEventListener("pause", onPause);
      media.removeEventListener("ended", onPause);
    };
  }, [src]);

  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) media.play().catch(() => {});
    else media.pause();
  };

  const seekTo = (value) => {
    const media = mediaRef.current;
    if (!media || !Number.isFinite(duration) || duration <= 0) return;
    const next = Math.min(duration, Math.max(0, value));
    media.currentTime = next;
    setCurrentTime(next);
  };

  const skipBackward = () => seekTo(currentTime - 10);
  const skipForward = () => seekTo(currentTime + 10);

  const applyVolume = (next) => {
    const clamped = Math.max(0, Math.min(100, next));
    if (clamped > 0) lastVolumeRef.current = clamped;
    setVolume(clamped);
  };

  const toggleMute = () =>
    applyVolume(volume > 0 ? 0 : lastVolumeRef.current || 30);

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlay,
    seekTo,
    skipBackward,
    skipForward,
    applyVolume,
    toggleMute,
  };
}

export function ProgressControls({ currentTime, duration, onSeek, sx, onDark }) {
  const timeRemaining = Math.max(0, duration - currentTime);

  const timeSx = {
    fontSize: 11,
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: "0.01em",
    fontVariantNumeric: "tabular-nums",
    color: onDark ? "rgba(255,255,255,0.82)" : "text.secondary",
    opacity: 0.9,
  };

  return (
    <>
      <Slider
        aria-label="Позиция воспроизведения"
        size="small"
        value={Math.min(currentTime, duration || 0)}
        min={0}
        step={0.1}
        max={duration || 0}
        disabled={!duration}
        onChange={(_, value) => onSeek(value)}
        sx={{
          ...sliderSx,
          mt: 1.5,
          px: 0,
          py: 1,
          "&.Mui-disabled": { color: "text.disabled" },
          // Рельс поверх затемнённого кадра: серая дорожка должна читаться
          ...(onDark && {
            "& .MuiSlider-rail": { bgcolor: "rgba(255,255,255,0.3)" },
          }),
          ...sx,
        }}
      />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mt: "-2px",
          px: "2px",
        }}
      >
        <Typography sx={timeSx}>{formatDuration(currentTime)}</Typography>
        <Typography sx={timeSx}>-{formatDuration(timeRemaining)}</Typography>
      </Box>
    </>
  );
}

export function TransportControls({
  isPlaying,
  onTogglePlay,
  onSkipBackward,
  onSkipForward,
  sx,
  onDark,
}) {
  const theme = useTheme();
  const isDark = onDark || theme.palette.mode === "dark";

  const skipSx = {
    ...iconButtonSx,
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: "50%",
    color: onDark ? "#fff" : "text.primary",
    bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
    "&:hover": {
      bgcolor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.1)",
    },
    "&:active": { transform: "scale(0.92)" },
    "& svg": { fontSize: 26 },
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "18px",
        mt: 1.5,
        ...sx,
      }}
    >
      <Box
        component="button"
        type="button"
        aria-label="Назад на 10 секунд"
        title="Назад на 10 секунд"
        onClick={onSkipBackward}
        sx={skipSx}
      >
        <Replay10Rounded />
      </Box>

      <Box
        component="button"
        type="button"
        aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
        title={isPlaying ? "Пауза" : "Воспроизвести"}
        onClick={onTogglePlay}
        sx={{
          ...iconButtonSx,
          width: 58,
          height: 58,
          flexShrink: 0,
          borderRadius: "50%",
          color: onDark ? "#fff" : "text.primary",
          "&:hover": { opacity: 0.75 },
          "&:active": { transform: "scale(0.94)" },
          "& svg": { fontSize: 50 },
        }}
      >
        {isPlaying ? <PauseRounded /> : <PlayArrowRounded />}
      </Box>

      <Box
        component="button"
        type="button"
        aria-label="Вперёд на 10 секунд"
        title="Вперёд на 10 секунд"
        onClick={onSkipForward}
        sx={skipSx}
      >
        <Forward10Rounded />
      </Box>
    </Box>
  );
}

export function VolumeCapsule({ volume, onVolume, onToggleMute, sx, onDark }) {
  const theme = useTheme();
  const isDark = onDark || theme.palette.mode === "dark";

  const VolumeIcon =
    volume === 0
      ? VolumeMuteIcon
      : volume <= 25
        ? VolumeLowIcon
        : volume <= 50
          ? VolumeWave1Icon
          : volume <= 75
            ? VolumeWave2Icon
            : VolumeWave3Icon;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        borderRadius: `${RADIUS.pill}px`,
        bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
        border: `1px solid ${
          onDark ? "rgba(255,255,255,0.18)" : theme.palette.glass.border
        }`,
        width: 180,
        height: 36,
        gap: 2,
        px: 2,
        ...sx,
      }}
    >
      <Slider
        aria-label="Громкость"
        size="small"
        value={volume}
        min={0}
        max={100}
        step={1}
        onChange={(_, value) => onVolume(value)}
        sx={{
          ...sliderSx,
          flex: 1,
          py: 0.5,
          ...(onDark && {
            "& .MuiSlider-rail": { bgcolor: "rgba(255,255,255,0.3)" },
          }),
          "& .MuiSlider-thumb": {
            ...sliderSx["& .MuiSlider-thumb"],
            // Невидимая область захвата MUI шире ползунка и перекрывает
            // соседнюю кнопку звука при громкости 100
            "&::after": { display: "none" },
          },
        }}
      />

      <Box
        component="button"
        type="button"
        aria-label={volume > 0 ? "Выключить звук" : "Включить звук"}
        title={volume > 0 ? "Выключить звук" : "Включить звук"}
        onClick={onToggleMute}
        sx={{
          ...iconButtonSx,
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: "50%",
          placeItems: "center start",
          color: onDark ? "#fff" : "text.primary",
          opacity: 0.85,
          "&:hover": { opacity: 1 },
          "&:active": { transform: "scale(0.9)" },
        }}
      >
        <VolumeIcon />
      </Box>
    </Box>
  );
}
