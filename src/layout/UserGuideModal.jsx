import { useEffect, useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogActions,
  DialogTitle,
  Button,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
} from "@mui/material";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import MarkdownViewer, {
  parseMarkdownSections,
} from "../components/MarkdownViewer";

const SIDEBAR_WIDTH = 280;
const SCROLL_OFFSET = 16;

export default function UserGuideModal() {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const contentRef = useRef(null);
  const sectionRefs = useRef([]);

  useEffect(() => {
    window.userGuideAPI.onOpen(async () => {
      const content = await window.userGuideAPI.read();
      const ready = parseMarkdownSections(content);
      setSections(ready);
      setActiveIndex(0);
      setOpen(true);
    });
  }, []);

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
    return () => container.removeEventListener("scroll", handleScroll);
  }, [open, sections]);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      fullScreen
      PaperProps={{
        sx: {
          borderRadius: 0,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          py: 1.5,
          height: 50,
        }}
      >
        <MenuBookOutlinedIcon color="primary" />
        <Typography component="span" variant="h6" fontWeight={700}>
          Инструкция пользователя
        </Typography>
      </DialogTitle>

      <Box
        sx={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            borderRight: 1,
            borderColor: "divider",
            bgcolor: "action.hover",
            overflowY: "auto",
          }}
        >
          <Typography
            variant="overline"
            sx={{
              display: "block",
              px: 2,
              pt: 2,
              pb: 1,
              color: "text.secondary",
            }}
          >
            Разделы
          </Typography>
          <List dense disablePadding sx={{ pb: 2 }}>
            {sections.map((section, index) => (
              <ListItemButton
                key={section.title}
                selected={activeIndex === index}
                onClick={() => scrollToSection(index)}
                sx={{
                  mx: 1,
                  mb: 0.5,
                  borderRadius: "12px",
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": { bgcolor: "primary.dark" },
                  },
                }}
              >
                <ListItemText
                  primary={section.title}
                  primaryTypographyProps={{
                    fontSize: "0.95rem",
                    fontWeight: activeIndex === index ? 700 : 500,
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>

        <Box
          ref={contentRef}
          sx={{
            flex: 1,
            overflowY: "auto",
            px: { xs: 2, sm: 4 },
            py: 3,
          }}
        >
          {sections.map((section, index) => (
            <Box
              key={section.title}
              ref={(el) => {
                sectionRefs.current[index] = el;
              }}
              id={`user-guide-section-${index}`}
              sx={{ mb: index < sections.length - 1 ? 6 : 2 }}
            >
              {index > 0 && <Divider sx={{ mb: 3 }} />}
              <Typography
                variant="h5"
                fontWeight={700}
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

      <DialogActions
        sx={{ borderTop: 1, borderColor: "divider", px: 3, py: 1.5 }}
      >
        <Button
          onClick={() => setOpen(false)}
          variant="outlined"
          sx={{
            height: 24,
            borderRadius: "6px",
            px: 3,
            py: 1,
            boxShadow: "none",
            fontWeight: "bold",
          }}
        >
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
}
