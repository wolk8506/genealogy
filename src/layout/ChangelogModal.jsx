import { useCallback, useEffect, useState } from "react";
import { Dialog, Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import MarkdownViewer from "../components/MarkdownViewer";
import DialogActionButton from "../components/Dialog/DialogActionButton";

export default function ChangelogModal() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [version, setVersion] = useState("");

  const openChangelog = useCallback(async () => {
    try {
      const content = await window.changelogAPI.read();
      setText(content);
      setOpen(true);
    } catch {
      // changelog недоступен — молча игнорируем
    }
  }, []);

  useEffect(() => {
    window.changelogAPI.onOpen(openChangelog);
    window.addEventListener("app:open-changelog", openChangelog);

    window.appAPI
      ?.getVersion?.()
      .then((v) => setVersion(v || ""))
      .catch(() => {});

    return () => {
      window.removeEventListener("app:open-changelog", openChangelog);
    };
  }, [openChangelog]);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth={false}
      transitionDuration={{ enter: 180, exit: 140 }}
      PaperProps={{
        sx: {
          width: 760,
          maxWidth: "94vw",
          height: "min(86vh, 860px)",
          borderRadius: "24px",
          backgroundImage: "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        },
      }}
    >
      <Box
        sx={{
          p: { xs: 3, sm: 5 },
          pb: 30,
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          История версий
        </Typography>
        <MarkdownViewer content={text} />
      </Box>

      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          pb: 2,
          pt: 0,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          backgroundImage: (t) =>
            `linear-gradient(to top, ${alpha(t.palette.background.paper, 0.7)} 0%, ${alpha(t.palette.background.paper, 0.35)} 55%, ${alpha(t.palette.background.paper, 0)} 100%)`,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            px: 2.5,
            py: 0.75,
            borderRadius: "999px",
            bgcolor: "action.hover",
          }}
        >
          <Typography variant="body2" color="text.secondary" noWrap>
            {version ? `Текущая версия ${version}` : "История версий"}
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
    </Dialog>
  );
}
