import React, { useState, useEffect } from "react";
import { Fab, Zoom, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

export const ButtonScrollTop = ({
  targetRef,
  scrollOffset,
  threshold = 400,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [internalShow, setInternalShow] = useState(false);

  useEffect(() => {
    // Если нам передают скролл извне (как в Virtuoso)
    if (scrollOffset !== undefined) {
      setInternalShow(scrollOffset > threshold);
      return;
    }

    // Если мы на обычной странице (PeopleListPage)
    const handleScroll = () => {
      // Проверяем скролл окна или документа
      const scrolled = window.scrollY || document.documentElement.scrollTop;
      setInternalShow(scrolled > threshold);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrollOffset, threshold]);

  const scrollToTop = () => {
    if (targetRef?.current?.scrollToIndex) {
      // Для Virtuoso
      targetRef.current.scrollToIndex({ index: 0, behavior: "smooth" });
    } else {
      // Для обычной страницы
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Zoom in={internalShow}>
      <Fab
        color="primary"
        size="small"
        onClick={scrollToTop}
        sx={{
          position: "fixed",
          color: "rgb(255,255,255,0.5)",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          // Стили Glass
          bgcolor: isDark
            ? alpha(theme.palette.divider, 0.1)
            : alpha(theme.palette.divider, 0.4),
          backdropFilter: "blur(8px)",
          "&:hover": {
            bgcolor: theme.palette.divider,
            transform: "scale(1.1)",
            color: "rgb(255,255,255,0.75)",
            boxShadow: isDark
              ? `0 0px 20px 0 rgba(255,255,255,0.15)`
              : `0 0px 20px 0 rgba(0,0,0,0.15)`,
          },
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Zoom>
  );
};
