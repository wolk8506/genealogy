import { Box } from "@mui/material";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewOptionsCtx,
} from "@milkdown/core";
import { nord } from "@milkdown/theme-nord";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";

const defaultMilkdownSx = {
  "& table": {
    width: "100%",
    borderCollapse: "collapse",
    my: 2,
    borderRadius: "8px",
    border: "1px solid",
    borderColor: "divider",
    "& th, & td": {
      border: "1px solid",
      borderColor: "divider",
      p: 1,
    },
    "& th": { bgcolor: "action.hover" },
  },
  "& .milkdown": {
    backgroundColor: "transparent",
    color: (theme) => (theme.palette.mode === "dark" ? "#e0e0e0" : "#1a1a1a"),
  },
  "& .milkdown .editor": {
    minHeight: "auto",
    outline: "none",
    color: (theme) => (theme.palette.mode === "dark" ? "#e0e0e0" : "#1a1a1a"),
    fontSize: "1.05rem",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  "& .ProseMirror h1, & .ProseMirror h2, & .ProseMirror h3": {
    textIndent: "1rem",
  },
  "& .ProseMirror p": {
    marginBottom: 0,
    marginTop: 0,
    minHeight: "1.2em",
    textAlign: "justify",
    textIndent: "2rem",
  },
  "& .ProseMirror li p": {
    textIndent: 0,
  },
  "& .ProseMirror ul, & .ProseMirror ol": {
    pl: 3,
    my: 1,
  },
  "& blockquote": {
    borderLeft: "4px solid",
    borderColor: "divider",
    pl: 2,
    color: "text.secondary",
    textIndent: 0,
  },
  "& code": {
    fontFamily: "monospace",
    fontSize: "0.9em",
    bgcolor: "action.hover",
    px: 0.5,
    py: 0.25,
    borderRadius: 1,
  },
  "& pre": {
    bgcolor: "action.hover",
    p: 2,
    borderRadius: 2,
    overflowX: "auto",
    textIndent: 0,
    "& code": { bgcolor: "transparent", p: 0 },
  },
  "& hr": {
    my: 2,
    borderColor: "divider",
  },
};

const appleHelpSx = {
  "& .milkdown": {
    backgroundColor: "transparent",
    color: (theme) => (theme.palette.mode === "dark" ? "#f5f5f7" : "#1d1d1f"),
  },
  "& .milkdown .editor": {
    minHeight: "auto",
    outline: "none",
    color: (theme) => (theme.palette.mode === "dark" ? "#f5f5f7" : "#1d1d1f"),
    fontSize: "1.03rem",
    lineHeight: 1.62,
    letterSpacing: "0.002em",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif',
  },
  "& .ProseMirror h1, & .ProseMirror h2": {
    marginTop: "2rem",
    marginBottom: "0.9rem",
    fontSize: "1.5rem",
    lineHeight: 1.25,
    letterSpacing: "-0.02em",
  },
  "& .ProseMirror h3": {
    marginTop: "1.5rem",
    marginBottom: "0.7rem",
    fontSize: "1.12rem",
    lineHeight: 1.3,
    letterSpacing: "-0.01em",
  },
  "& .ProseMirror p": {
    marginBottom: "0.72rem",
    marginTop: 0,
    minHeight: "1.2em",
    textAlign: "left",
    textIndent: 0,
  },
  "& .ProseMirror p > em:only-child": {
    display: "block",
    marginTop: "-0.1rem",
    marginBottom: "0.15rem",
    fontSize: "0.86rem",
    lineHeight: 1.35,
    fontStyle: "normal",
    color: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.64)"
        : "rgba(29,29,31,0.58)",
  },
  "& .ProseMirror li p": {
    marginBottom: "0.22rem",
  },
  "& .ProseMirror ul, & .ProseMirror ol": {
    pl: 2.5,
    my: 1.1,
  },
  "& .ProseMirror li": {
    marginBottom: "0.25rem",
  },
  "& .ProseMirror a": {
    color: (theme) => (theme.palette.mode === "dark" ? "#4da3ff" : "#0066cc"),
    textDecoration: "none",
  },
  "& .ProseMirror a:hover": {
    textDecoration: "underline",
  },
  "& table": {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    my: 2.2,
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid",
    borderColor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.16)"
        : "rgba(29,29,31,0.12)",
    "& th, & td": {
      borderBottom: "1px solid",
      borderColor: (theme) =>
        theme.palette.mode === "dark"
          ? "rgba(255,255,255,0.12)"
          : "rgba(29,29,31,0.08)",
      p: "10px 12px",
      textAlign: "left",
    },
    "& tr:last-child td": {
      borderBottom: "none",
    },
    "& th": {
      bgcolor: (theme) =>
        theme.palette.mode === "dark"
          ? "rgba(255,255,255,0.08)"
          : "rgba(29,29,31,0.04)",
      fontWeight: 600,
    },
  },
  "& hr": {
    my: 2.6,
    borderColor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.14)"
        : "rgba(29,29,31,0.14)",
  },
  "& blockquote": {
    margin: "1.2rem 0",
    borderLeft: "3px solid",
    borderColor: (theme) =>
      theme.palette.mode === "dark" ? "rgba(77,163,255,0.65)" : "#0066cc",
    pl: 1.7,
    py: 0.4,
    color: "text.secondary",
    textIndent: 0,
  },
  "& code": {
    fontFamily:
      '"SF Mono", SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: "0.86em",
    bgcolor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.12)"
        : "rgba(29,29,31,0.08)",
    px: 0.5,
    py: 0.2,
    borderRadius: "6px",
  },
  "& pre": {
    bgcolor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.08)"
        : "rgba(29,29,31,0.05)",
    p: 2,
    borderRadius: "12px",
    overflowX: "auto",
    textIndent: 0,
    "& code": { bgcolor: "transparent", p: 0 },
  },
  "& .ProseMirror img": {
    width: "100%",
    maxWidth: "94%",
    display: "block",
    margin: "1.35rem auto 0.52rem",
    borderRadius: "12px",
    border: "1px solid",
    borderColor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.15)"
        : "rgba(29,29,31,0.14)",
    backgroundColor: (theme) =>
      theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f5f5f7",
    boxShadow: (theme) =>
      theme.palette.mode === "dark"
        ? "0 8px 24px rgba(0,0,0,0.35)"
        : "0 8px 24px rgba(15,15,20,0.1)",
  },
};

function MilkdownReadonly({ content }) {
  useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, content || " ");
          ctx.set(editorViewOptionsCtx, {
            editable: () => false,
          });
        })
        .config(nord)
        .use(commonmark)
        .use(gfm),
    [content],
  );

  return <Milkdown />;
}

export default function MarkdownViewer({ content, sx, variant = "default" }) {
  const viewerKey = content?.length ?? 0;
  const variantSx = variant === "apple-help" ? appleHelpSx : defaultMilkdownSx;

  return (
    <Box sx={{ ...variantSx, ...sx }}>
      <MilkdownProvider key={viewerKey}>
        <MilkdownReadonly content={content} />
      </MilkdownProvider>
    </Box>
  );
}

export function parseMarkdownSections(markdown) {
  return markdown
    .split(/^## /m)
    .map((part, idx) => {
      if (idx === 0) {
        const body = part.trim();
        if (!body) return null;
        return { title: "Введение", body };
      }

      const lines = part.split("\n");
      const title = lines.shift()?.trim() ?? "";
      return { title, body: lines.join("\n").trim() };
    })
    .filter((section) => section && section.body.length > 0);
}
