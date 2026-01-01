import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import MuiAccordion from "@mui/material/Accordion";
import MuiAccordionSummary, {
  accordionSummaryClasses,
} from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Константа для дополнительного смещения скролла
const SCROLL_OFFSET = 40;

// Styled components
const BaseAccordion = styled((props) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  "&:not(:last-child)": { borderBottom: 0 },
  "&::before": { display: "none" },
}));

const BaseAccordionSummary = styled((props) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: "0.9rem" }} />}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "dark" ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.03)",
  flexDirection: "row-reverse",
  [`& .${accordionSummaryClasses.expandIconWrapper}.${accordionSummaryClasses.expanded}`]:
    {
      transform: "rotate(90deg)",
    },
  [`& .${accordionSummaryClasses.content}`]: {
    marginLeft: theme.spacing(1),
  },
}));

const BaseAccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: "1px solid rgba(0,0,0,.125)",
}));

export default function UserGuideModal() {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState([]);
  const [expanded, setExpanded] = useState("panel1");

  // Anchor refs for each section (DOM elements above each accordion)
  const anchorRefs = useRef([]);

  // Scroll container ref (DialogContent)
  const contentRef = useRef(null);

  useEffect(() => {
    // Инициализация загрузки данных и открытия модального окна
    window.userGuideAPI.onOpen(async () => {
      const content = await window.userGuideAPI.read();
      const rawSections = content.split(/^## /m).map((part, idx) => {
        if (idx === 0)
          return { title: "🧬 Genealogy Desktop App.", body: part.trim() };
        const lines = part.split("\n");
        const title = lines.shift();
        return { title, body: lines.join("\n").trim() };
      });

      const ready = rawSections.filter((s) => s.body && s.body.length > 0);
      setSections(ready);
      setExpanded("panel1");
      setOpen(true);
    });
  }, []);

  // Smooth scroll inside DialogContent to anchor with offset
  const scrollToAnchor = (index) => {
    const container = contentRef.current;
    const anchor = anchorRefs.current[index];
    if (!container || !anchor) return;

    const containerRect = container.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const currentScrollTop = container.scrollTop;

    // 1. Рассчитываем базовое смещение (позиция якоря относительно начала контейнера)
    const baseOffset = anchorRect.top - containerRect.top + currentScrollTop;

    // 2. Вычитаем дополнительное смещение (40px)
    const finalOffset = baseOffset - SCROLL_OFFSET;

    container.scrollTo({ top: finalOffset, behavior: "smooth" });
  };

  const handleChange = (panelId, index) => (event, newExpanded) => {
    setExpanded(newExpanded ? panelId : false);

    if (newExpanded) {
      // Задержка 400 мс для ожидания завершения анимации разворачивания аккордеона.
      setTimeout(() => {
        // Прокрутка после завершения анимации
        scrollToAnchor(index);

        // Дополнительный вызов на следующем кадре для надежности
        requestAnimationFrame(() => scrollToAnchor(index));
      }, 400);
    }
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullScreen>
      <DialogTitle>
        🧬 Genealogy Desktop App. 📖 Инструкция пользователя
      </DialogTitle>

      <DialogContent dividers ref={contentRef}>
        {sections.map((sec, i) => {
          const panelId = `panelId${i + 1}`;
          return (
            <div key={panelId}>
              {/* Anchor just above the accordion */}
              <div
                ref={(el) => (anchorRefs.current[i] = el)}
                // top: -8 для точного позиционирования якоря
                style={{ position: "relative", top: -8 }}
              />
              <BaseAccordion
                sx={{ borderRadius: "15px" }}
                expanded={expanded === panelId}
                onChange={handleChange(panelId, i)}
              >
                <BaseAccordionSummary
                  sx={{
                    borderRadius: "15px",
                  }}
                  aria-controls={`${panelId}-content`}
                  id={`${panelId}-header`}
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    {sec.title}
                  </Typography>
                </BaseAccordionSummary>
                <BaseAccordionDetails>
                  <ReactMarkdown
                    children={sec.body}
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: (props) => (
                        <Typography variant="h5" gutterBottom {...props} />
                      ),
                      h2: (props) => (
                        <Typography variant="h6" gutterBottom {...props} />
                      ),
                      h3: (props) => (
                        <Typography
                          variant="subtitle1"
                          gutterBottom
                          {...props}
                        />
                      ),
                      p: (props) => (
                        <Typography variant="body1" paragraph {...props} />
                      ),
                      ul: (props) => (
                        <ul
                          style={{ marginTop: 8, marginBottom: 8 }}
                          {...props}
                        />
                      ),
                      ol: (props) => (
                        <ol
                          style={{ marginTop: 8, marginBottom: 8 }}
                          {...props}
                        />
                      ),
                      li: (props) => (
                        <li style={{ marginBottom: 4 }} {...props} />
                      ),
                      code: ({ inline, ...props }) =>
                        inline ? (
                          <code
                            style={{
                              background: "rgba(0,0,0,0.06)",
                              padding: "2px 4px",
                              borderRadius: 4,
                            }}
                            {...props}
                          />
                        ) : (
                          <pre
                            style={{
                              background: "rgba(0,0,0,0.06)",
                              padding: 12,
                              borderRadius: 8,
                              overflowX: "auto",
                            }}
                          >
                            <code {...props} />
                          </pre>
                        ),
                      table: (props) => (
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            margin: "8px 0",
                          }}
                          {...props}
                        />
                      ),
                      th: (props) => (
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "1px solid rgba(0,0,0,0.12)",
                            padding: "6px 8px",
                          }}
                          {...props}
                        />
                      ),
                      td: (props) => (
                        <td
                          style={{
                            borderBottom: "1px solid rgba(0,0,0,0.08)",
                            padding: "6px 8px",
                          }}
                          {...props}
                        />
                      ),
                    }}
                  />
                </BaseAccordionDetails>
              </BaseAccordion>
            </div>
          );
        })}
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setOpen(false)}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}
