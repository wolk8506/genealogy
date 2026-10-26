import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  Dialog,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
  TextField,
  InputAdornment,
  Stack,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import SearchIcon from "@mui/icons-material/Search";
import DialogActionButton from "../components/Dialog/DialogActionButton";
import MarkdownViewer, {
  parseMarkdownSections,
} from "../components/MarkdownViewer";

const SIDEBAR_WIDTH = 280;
const SCROLL_OFFSET = 18;

export default function UserGuideModal() {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState("");

  const contentRef = useRef(null);
  const sectionRefs = useRef([]);

  const openGuide = useCallback(async () => {
    try {
      const content = await window.userGuideAPI.read();
      const ready = parseMarkdownSections(content);
      setSections(ready);
      setActiveIndex(0);
      setQuery("");
      setOpen(true);
    } catch {
      // руководство недоступно — молча игнорируем
    }
  }, []);

  useEffect(() => {
    window.userGuideAPI.onOpen(openGuide);
    window.addEventListener("app:open-user-guide", openGuide);

    window.appAPI
      ?.getVersion?.()
      .then((v) => setVersion(v || ""))
      .catch(() => {});

    return () => {
      window.removeEventListener("app:open-user-guide", openGuide);
    };
  }, [openGuide]);

  const scrollToSection = useCallback((index) => {
    const container = contentRef.current;
    const sectionEl = sectionRefs.current[index];
    if (!container || !sectionEl) return;

    const containerRect = container.getBoundingClientRect();
    const sectionRect = sectionEl.getBoundingClientRect();
    const nextScrollTop =
      container.scrollTop +
      sectionRect.top -
      containerRect.top -
      SCROLL_OFFSET;

    container.scrollTo({ top: nextScrollTop, behavior: "smooth" });
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    if (!open || sections.length === 0) return;

    const container = contentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop + SCROLL_OFFSET + 8;
      let nextActive = 0;

      sectionRefs.current.forEach((sectionEl, index) => {
        if (sectionEl && sectionEl.offsetTop <= scrollTop) {
          nextActive = index;
        }
      });

      setActiveIndex(nextActive);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [open, sections]);

  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections.map((section, index) => ({ section, index }));
    return sections
      .map((section, index) => ({ section, index }))
      .filter(
        ({ section }) =>
          section.title.toLowerCase().includes(q) ||
          section.body.toLowerCase().includes(q),
      );
  }, [sections, query]);

  const activeTitle = sections[activeIndex]?.title || "Руководство";

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth={false}
      transitionDuration={{ enter: 180, exit: 140 }}
      PaperProps={{
        sx: {
          width: 1220,
          maxWidth: "94vw",
          height: "min(90vh, 920px)",
          borderRadius: "18px",
          backgroundImage: "none",
          bgcolor: (t) => (t.palette.mode === "dark" ? "#1d1d1f" : "#fbfbfd"),
          border: "1px solid",
          borderColor: (t) =>
            t.palette.mode === "dark"
              ? "rgba(255,255,255,0.11)"
              : "rgba(29,29,31,0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            borderRight: 1,
            borderColor: (t) =>
              t.palette.mode === "dark"
                ? "rgba(255,255,255,0.11)"
                : "rgba(29,29,31,0.08)",
            bgcolor: (t) =>
              t.palette.mode === "dark"
                ? "rgba(38,38,41,0.98)"
                : "rgba(244,244,246,0.98)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Box sx={{ px: 2.3, pt: 2.3, pb: 2 }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                  color: "primary.main",
                  flexShrink: 0,
                }}
              >
                <MenuBookOutlinedIcon sx={{ fontSize: 19 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{ fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.2 }}
                  noWrap
                >
                  Руководство
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  noWrap
                >
                  Genealogy
                </Typography>
              </Box>
            </Stack>

            <TextField
              fullWidth
              size="small"
              placeholder="Поиск по руководству"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 17, color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mt: 2,
                "& .MuiOutlinedInput-root": {
                  height: 36,
                  fontSize: "0.8rem",
                  borderRadius: "10px",
                  bgcolor: (t) =>
                    t.palette.mode === "dark"
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.05)",
                  "& fieldset": {
                    borderColor: (t) =>
                      t.palette.mode === "dark"
                        ? "rgba(255,255,255,0.16)"
                        : "rgba(0,0,0,0.1)",
                  },
                },
                "& .MuiInputBase-input": { py: 0 },
              }}
            />
          </Box>

          <List dense disablePadding sx={{ flex: 1, overflowY: "auto", pb: 2 }}>
            {visibleSections.length === 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", px: 2, py: 3, textAlign: "center" }}
              >
                Ничего не найдено
              </Typography>
            )}
            {visibleSections.map(({ section, index }) => (
              <ListItemButton
                key={section.title}
                selected={activeIndex === index}
                onClick={() => scrollToSection(index)}
                sx={{
                  mx: 1.5,
                  mb: 0.22,
                  borderRadius: "8px",
                  minHeight: 32,
                  "&.Mui-selected": {
                    bgcolor: (t) =>
                      t.palette.mode === "dark"
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(29,29,31,0.08)",
                    color: "text.primary",
                    "&:hover": {
                      bgcolor: (t) =>
                        t.palette.mode === "dark"
                          ? "rgba(255,255,255,0.14)"
                          : "rgba(29,29,31,0.1)",
                    },
                  },
                }}
              >
                <ListItemText
                  primary={section.title}
                  primaryTypographyProps={{
                    fontSize: "0.8rem",
                    fontWeight: activeIndex === index ? 600 : 500,
                    noWrap: true,
                  }}
                />
              </ListItemButton>
            ))}
          </List>

          <Box sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: "divider" }}>
            <Chip
              size="small"
              label={version ? `Версия ${version}` : "Genealogy"}
              sx={{
                height: 24,
                fontSize: "0.72rem",
                fontWeight: 600,
                bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
                color: "text.secondary",
              }}
            />
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              px: { xs: 3, sm: 4 },
              py: 1.5,
              borderBottom: 1,
              borderColor: (t) =>
                t.palette.mode === "dark"
                  ? "rgba(255,255,255,0.11)"
                  : "rgba(29,29,31,0.08)",
              bgcolor: (t) =>
                t.palette.mode === "dark"
                  ? "rgba(34,34,36,0.96)"
                  : "rgba(250,250,252,0.96)",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <MenuBookOutlinedIcon sx={{ fontSize: 17, color: "text.secondary" }} />
              <Typography
                sx={{
                  fontSize: "0.87rem",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                Руководство пользователя
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.74rem", letterSpacing: "0.01em" }}
                noWrap
              >
                {version ? `Genealogy ${version}` : "Genealogy"}
              </Typography>
            </Stack>
          </Box>

          <Box
            ref={contentRef}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              px: { xs: 3, sm: 6.8 },
              py: 4.2,
            }}
          >
            <Box sx={{ maxWidth: 830, mx: "auto" }}>
              {sections.map((section, index) => (
                <Box
                  key={section.title}
                  ref={(el) => {
                    sectionRefs.current[index] = el;
                  }}
                  id={`user-guide-section-${index}`}
                  sx={{ mb: index < sections.length - 1 ? 6 : 2 }}
                >
                  {index > 0 && <Divider sx={{ mb: 4.2 }} />}
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    letterSpacing="-0.024em"
                    gutterBottom
                    sx={{
                      textIndent: 0,
                      mb: 2,
                      fontSize: "2.15rem",
                      lineHeight: 1.12,
                    }}
                  >
                    {section.title}
                  </Typography>
                  <MarkdownViewer content={section.body} variant="apple-help" />
                </Box>
              ))}
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 3,
              py: 2,
              borderTop: 1,
              borderColor: "divider",
              backgroundImage: "none",
            }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                px: 2,
                py: 0.5,
                borderRadius: "999px",
                bgcolor: (t) =>
                  t.palette.mode === "dark"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(29,29,31,0.06)",
              }}
            >
              <Typography variant="body2" color="text.secondary" noWrap>
                {activeTitle}
              </Typography>
            </Box>
            <DialogActionButton
              tone="primary"
              onClick={() => setOpen(false)}
              sx={{ width: 110, flex: "0 0 110px" }}
            >
              Готово
            </DialogActionButton>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
