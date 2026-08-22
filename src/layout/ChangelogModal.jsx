import { useEffect, useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
} from "@mui/material";
import MarkdownViewer from "../components/MarkdownViewer";

export default function ChangelogModal() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    window.changelogAPI.onOpen(async () => {
      const content = await window.changelogAPI.read();
      setText(content);
      setOpen(true);
    });
  }, []);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: "15px" } }}
      fullWidth
    >
      <DialogTitle sx={{ textAlign: "center" }}>История версий</DialogTitle>
      <DialogContent dividers sx={{ maxHeight: "70vh", overflowY: "auto" }}>
        <MarkdownViewer content={text} />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => setOpen(false)}
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
