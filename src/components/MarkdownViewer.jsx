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

const milkdownSx = {
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

export default function MarkdownViewer({ content, sx }) {
  const viewerKey = content?.length ?? 0;

  return (
    <Box sx={{ ...milkdownSx, ...sx }}>
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
