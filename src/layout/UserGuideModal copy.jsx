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

const SIDEBAR_WIDTH = 260;
const SCROLL_OFFSET = 16;

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
          width: 1120,
          maxWidth: "94vw",
          height: "min(88vh, 900px)",
          borderRadius: "24px",
          backgroundImage: "none",
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
            borderColor: "divider",
            bgcolor: (t) => alpha(t.palette.background.default, 0.65),
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
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
                  height: 34,
                  fontSize: "0.8rem",
                  borderRadius: "9px",
                  bgcolor: (t) =>
                    alpha(t.palette.mode === "dark" ? "#ffffff" : "#000000", 0.05),
                  "& fieldset": { border: "none" },
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
                  mb: 0.25,
                  borderRadius: "9px",
                  minHeight: 34,
                  "&.Mui-selected": {
                    bgcolor: (t) => alpha(t.palette.text.primary, 0.08),
                    color: "primary.main",
                    "&:hover": {
                      bgcolor: (t) => alpha(t.palette.text.primary, 0.1),
                    },
                  },
                }}
              >
                <ListItemText
                  primary={section.title}
                  primaryTypographyProps={{
                    fontSize: "0.8rem",
                    fontWeight: activeIndex === index ? 700 : 500,
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
            ref={contentRef}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              px: { xs: 3, sm: 6 },
              py: 4,
            }}
          >
            <Box sx={{ maxWidth: 780, mx: "auto" }}>
              {sections.map((section, index) => (
                <Box
                  key={section.title}
                  ref={(el) => {
                    sectionRefs.current[index] = el;
                  }}
                  id={`user-guide-section-${index}`}
                  sx={{ mb: index < sections.length - 1 ? 6 : 2 }}
                >
                  {index > 0 && <Divider sx={{ mb: 4 }} />}
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    letterSpacing="-0.02em"
                    gutterBottom
                    sx={{ textIndent: 0, mb: 2 }}
                  >
                    {section.title}
                  </Typography>
                  <MarkdownViewer content={section.body} />
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
              backgroundImage: (t) =>
                `linear-gradient(to top, ${alpha(t.palette.background.paper, 0.7)} 0%, ${alpha(t.palette.background.paper, 0.35)} 55%, ${alpha(t.palette.background.paper, 0)} 100%)`,
            }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                px: 2,
                py: 0.5,
                borderRadius: "999px",
                bgcolor: "action.hover",
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
