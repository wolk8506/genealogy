import { useEffect } from "react";

export default function useDialogSaveHotkey({
  open,
  onSave,
  disabled = false,
}) {
  useEffect(() => {
    if (!open || typeof onSave !== "function") return;

    const onKeyDown = (event) => {
      const isSaveCombo =
        (event.ctrlKey || event.metaKey) &&
        String(event.key || "").toLowerCase() === "s";

      if (!isSaveCombo || event.repeat) return;

      event.preventDefault();
      if (!disabled) {
        onSave();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onSave, disabled]);
}
