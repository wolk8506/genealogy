import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, CircularProgress, CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { getPalette } from "../theme/palette";
import { parseGuide, searchGuide } from "./parseGuide";
import { SYSTEM_FONT, getHelpColors, isMac, useHelpThemeMode } from "./helpTheme";
import HelpSidebar, { TOOLBAR_HEIGHT } from "./HelpSidebar";
import HelpToolbar from "./HelpToolbar";
import { HelpGroup, HelpHome, HelpSearchResults, HelpTopic } from "./HelpPages";

const HOME = "home";

export default function HelpApp() {
  const mode = useHelpThemeMode();
  const colors = getHelpColors(mode);
  const theme = useMemo(
    () =>
      createTheme({
        palette: getPalette(mode),
        typography: { fontFamily: SYSTEM_FONT },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: { background: "transparent" },
              "*::-webkit-scrollbar": { width: "8px", height: "8px" },
              "*::-webkit-scrollbar-track": { background: "transparent" },
              "*::-webkit-scrollbar-thumb": {
                backgroundColor: mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                borderRadius: "8px",
                border: "2px solid transparent",
                backgroundClip: "content-box",
              },
            },
          },
        },
      }),
    [mode],
  );

  const [guide, setGuide] = useState(null);
  const [version, setVersion] = useState("");
  const [history, setHistory] = useState({ stack: [HOME], index: 0 });
  const [expanded, setExpanded] = useState(() => new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [query, setQuery] = useState("");
  const scrollRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    window.userGuideAPI
      .read()
      .then((markdown) => setGuide(parseGuide(markdown)))
      .catch(() => setGuide(parseGuide("# Руководство пользователя\n\nНе удалось загрузить руководство.")));
    window.appAPI
      ?.getVersion?.()
      .then((value) => setVersion(value || ""))
      .catch(() => {});
  }, []);

  const currentId = history.stack[history.index];
  const current = currentId === HOME ? null : guide?.byId.get(currentId);
  const searching = query.trim().length > 0;
  const results = useMemo(() => searchGuide(guide, query), [guide, query]);

  const navigate = useCallback(
    (id, { toggle = false } = {}) => {
      if (!guide || (id !== HOME && !guide.byId.has(id))) return;
      const node = guide.byId.get(id);
      setQuery("");
      setExpanded((prev) => {
        const next = new Set(prev);
        if (node?.parentId) next.add(node.parentId);
        if (node?.type === "group") {
          if (toggle && id === currentId && prev.has(id)) next.delete(id);
          else next.add(id);
        }
        return next;
      });
      setHistory((prev) => {
        if (prev.stack[prev.index] === id) return prev;
        const stack = [...prev.stack.slice(0, prev.index + 1), id];
        return { stack, index: stack.length - 1 };
      });
    },
    [guide, currentId],
  );

  const goBack = useCallback(() => {
    setQuery("");
    setHistory((prev) => ({ ...prev, index: Math.max(0, prev.index - 1) }));
  }, []);

  const goForward = useCallback(() => {
    setQuery("");
    setHistory((prev) => ({ ...prev, index: Math.min(prev.stack.length - 1, prev.index + 1) }));
  }, []);

  const toggleGroup = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const showContents = useCallback(() => {
    setSidebarOpen(true);
    if (guide) {
      setExpanded(new Set(guide.nodes.filter((node) => node.type === "group").map((node) => node.id)));
    }
  }, [guide]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [currentId, searching]);

  const pageTitle = searching
    ? "Результаты поиска"
    : current?.title || guide?.title || "Руководство пользователя";

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (mod && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (mod && event.key === "[") {
        event.preventDefault();
        goBack();
      } else if (mod && event.key === "]") {
        event.preventDefault();
        goForward();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goBack, goForward]);

  const handleContentClick = (event) => {
    const link = event.target.closest?.("a[href]");
    const href = link?.getAttribute("href");
    if (!href?.startsWith("#")) return;
    event.preventDefault();
    navigate(decodeURIComponent(href.slice(1)));
  };

  let page = null;
  if (!guide) {
    page = (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 12 }}>
        <CircularProgress size={28} />
      </Box>
    );
  } else if (searching) {
    page = <HelpSearchResults query={query} results={results} onNavigate={navigate} colors={colors} />;
  } else if (current?.type === "group") {
    page = <HelpGroup node={current} onNavigate={navigate} colors={colors} />;
  } else if (current) {
    page = <HelpTopic node={current} colors={colors} />;
  } else {
    page = (
      <HelpHome
        guide={guide}
        version={version}
        iconSrc="./app-icon.png"
        onNavigate={navigate}
        onShowSidebar={showContents}
        colors={colors}
      />
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          height: "100vh",
          fontFamily: SYSTEM_FONT,
          color: colors.text,
          bgcolor: isMac ? "transparent" : colors.content,
          userSelect: "none",
        }}
      >
        {sidebarOpen && guide && (
          <HelpSidebar
            guide={guide}
            currentId={searching ? null : currentId}
            expanded={expanded}
            onNavigate={navigate}
            onToggleGroup={toggleGroup}
            onHideSidebar={() => setSidebarOpen(false)}
            onOpenChangelog={() => window.userGuideAPI.openChangelog?.()}
            colors={colors}
          />
        )}

        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", bgcolor: colors.content }}>
          <HelpToolbar
            ref={searchRef}
            height={TOOLBAR_HEIGHT}
            title={pageTitle}
            sidebarOpen={sidebarOpen}
            canGoBack={history.index > 0}
            canGoForward={history.index < history.stack.length - 1}
            query={query}
            onQueryChange={setQuery}
            onBack={goBack}
            onForward={goForward}
            onHome={() => navigate(HOME)}
            onShowSidebar={() => setSidebarOpen(true)}
            colors={colors}
          />
          <Box
            ref={scrollRef}
            onClickCapture={handleContentClick}
            sx={{ flex: 1, overflowY: "auto", userSelect: "text" }}
          >
            <Box sx={{ maxWidth: 780, mx: "auto", px: { xs: 4, md: 7 }, pt: 5, pb: 10 }}>{page}</Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
