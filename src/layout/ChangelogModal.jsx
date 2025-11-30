import { useEffect, useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Button,
} from "@mui/material";

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
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>История версий</DialogTitle>
      <DialogContent dividers>
        <Typography
          component="pre"
          sx={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}
        >
          {text}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}
