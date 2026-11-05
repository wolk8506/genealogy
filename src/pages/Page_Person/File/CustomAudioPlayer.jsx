import React, { useState, useRef, useEffect } from "react";
import { Box, Typography, Slider } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  PauseRounded,
  PlayArrowRounded,
  Replay10Rounded,
  Forward10Rounded,
  GraphicEqRounded,
  HighlightOffRounded,
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

const iconButtonSx = {
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

export default function CustomAudioPlayer({ src, fileName, subtitle, onClose }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const audioRef = useRef(null);
  const lastVolumeRef = useRef(30);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(30);

  const formatDuration = (value) => {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const total = Math.floor(value);
    const minute = Math.floor(total / 60);
    const secondLeft = total - minute * 60;
    return `${minute}:${secondLeft < 10 ? `0${secondLeft}` : secondLeft}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(0);
    setDuration(0);

    const syncDuration = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const syncTime = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onPause);

    syncDuration();

    // Выбор файла — жест пользователя, поэтому воспроизведение можно начать сразу
    audio.play()?.catch(() => setIsPlaying(false));

    return () => {
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const seekTo = (value) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duration) || duration <= 0) return;
    const next = Math.min(duration, Math.max(0, value));
    audio.currentTime = next;
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

  const timeRemaining = Math.max(0, duration - currentTime);
  const hasExtension = Boolean(fileName?.includes("."));
  const extension = hasExtension ? fileName.split(".").pop().toUpperCase() : "";
  const displayName = hasExtension
    ? fileName.slice(0, -(extension.length + 1))
    : fileName;
  const metaLine = subtitle || (extension ? `Аудиозапись · ${extension}` : "Аудиозапись");

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

  const timeSx = {
    fontSize: 11,
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: "0.01em",
    fontVariantNumeric: "tabular-nums",
    color: "text.secondary",
    opacity: 0.9,
  };

  const capsuleSx = {
    display: "flex",
    alignItems: "center",
    borderRadius: `${RADIUS.pill}px`,
    bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
    border: `1px solid ${theme.palette.glass.border}`,
  };

  const skipSx = {
    ...iconButtonSx,
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: "50%",
    bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
    "&:hover": {
      bgcolor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.1)",
    },
    "&:active": { transform: "scale(0.92)" },
    "& svg": { fontSize: 26 },
  };

  return (
    <Box sx={{ width: "100%", position: "relative" }}>
      <audio ref={audioRef} src={src} />

      <Box
        sx={{
          position: "relative",
          p: 2,
          borderRadius: `${RADIUS.dialog}px`,
          bgcolor: theme.palette.glass.strong,
          color: "text.primary",
          border: `1px solid ${theme.palette.glass.border}`,
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          boxShadow: isDark
            ? "inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 60px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)"
            : "inset 0 1px 0 rgba(255,255,255,0.7), 0 24px 60px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)",
          "@keyframes playerIn": {
            from: { opacity: 0, transform: "translateY(12px) scale(0.97)" },
            to: { opacity: 1, transform: "none" },
          },
          animation: `playerIn 220ms ${MOTION.easeOut}`,
          "@media (prefers-reduced-motion: reduce)": {
            animation: "none",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: 1.5,
          }}
        >
          <Box
            component="button"
            type="button"
            aria-label="Закрыть плеер"
            title="Закрыть плеер"
            onClick={onClose}
            sx={{
              ...iconButtonSx,
              width: 28,
              height: 28,
              flexShrink: 0,
              borderRadius: "50%",
              opacity: 0.72,
              "&:hover": { opacity: 1, bgcolor: "action.hover" },
              "&:active": { transform: "scale(0.9)" },
              "& svg": { fontSize: 22 },
            }}
          >
            <HighlightOffRounded />
          </Box>

          <Box sx={{ ...capsuleSx, width: 180, height: 36, gap: 2, px: 2 }}>
            <Slider
              aria-label="Громкость"
              size="small"
              value={volume}
              min={0}
              max={100}
              step={1}
              onChange={(_, value) => applyVolume(value)}
              sx={{
                ...sliderSx,
                flex: 1,
                py: 0.5,
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
              onClick={toggleMute}
              sx={{
                ...iconButtonSx,
                width: 26,
                height: 26,
                flexShrink: 0,
                borderRadius: "50%",
                placeItems: "center start",
                opacity: 0.85,
                "&:hover": { opacity: 1 },
                "&:active": { transform: "scale(0.9)" },
              }}
            >
              <VolumeIcon />
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            position: "relative",
            height: 192,
            borderRadius: `${RADIUS.card}px`,
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            background: `linear-gradient(155deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)",
            "&::before": {
              content: '""',
              position: "absolute",
              top: "-35%",
              left: "-15%",
              width: "110%",
              height: "95%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(255,255,255,0) 62%)",
              filter: "blur(18px)",
              pointerEvents: "none",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.3) 100%)",
              pointerEvents: "none",
            },
          }}
        >
          <GraphicEqRounded
            sx={{
              position: "absolute",
              right: -34,
              bottom: -44,
              fontSize: 190,
              opacity: 0.12,
              zIndex: 0,
            }}
          />
          <GraphicEqRounded
            sx={{
              position: "relative",
              zIndex: 1,
              fontSize: 48,
              opacity: 0.94,
              filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.22))",
            }}
          />
        </Box>

        <Typography
          noWrap
          title={fileName}
          sx={{
            mt: 2,
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}
        >
          {displayName}
        </Typography>
        <Typography
          noWrap
          sx={{
            mt: "3px",
            fontSize: 14,
            lineHeight: 1.4,
            letterSpacing: "-0.005em",
            color: "text.secondary",
          }}
        >
          {metaLine}
        </Typography>

        <Slider
          aria-label="Позиция воспроизведения"
          size="small"
          value={Math.min(currentTime, duration || 0)}
          min={0}
          step={0.1}
          max={duration || 0}
          disabled={!duration}
          onChange={(_, value) => seekTo(value)}
          sx={{
            ...sliderSx,
            mt: 1.5,
            px: 0,
            py: 1,
            "&.Mui-disabled": { color: "text.disabled" },
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

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "18px",
            mt: 1.5,
          }}
        >
          <Box
            component="button"
            type="button"
            aria-label="Назад на 10 секунд"
            title="Назад на 10 секунд"
            onClick={skipBackward}
            sx={skipSx}
          >
            <Replay10Rounded />
          </Box>

          <Box
            component="button"
            type="button"
            aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
            title={isPlaying ? "Пауза" : "Воспроизвести"}
            onClick={togglePlay}
            sx={{
              ...iconButtonSx,
              width: 58,
              height: 58,
              flexShrink: 0,
              borderRadius: "50%",
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
            onClick={skipForward}
            sx={skipSx}
          >
            <Forward10Rounded />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
