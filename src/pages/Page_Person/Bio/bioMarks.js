import { $command, $markSchema, $remark, $useKeymap } from "@milkdown/kit/utils";
import { commandsCtx } from "@milkdown/core";
import { toggleMark } from "@milkdown/prose/commands";
import {
  DEFAULT_BIO_HIGHLIGHT_COLOR,
  normalizeBioHighlightColor,
} from "../../../theme/bioHighlightColors";

// Подчёркивание и маркер хранятся в bio.md как обычный inline HTML:
//   <u>текст</u>
//   <mark data-bio-color="orange">текст</mark>
// Поэтому файл остаётся читаемым в любом Markdown-редакторе,
// а цвет задаётся смысловым именем, а не hex-значением.

const UNDERLINE_OPEN = /^<u(?:\s[^>]*)?>$/i;
const UNDERLINE_CLOSE = /^<\/u\s*>$/i;
const MARK_OPEN = /^<mark(?:\s[^>]*)?>$/i;
const MARK_CLOSE = /^<\/mark\s*>$/i;

function getMarkColor(tag) {
  const match = tag.match(/data-bio-color\s*=\s*["']?([a-z-]+)/i);
  return normalizeBioHighlightColor(match?.[1]);
}

function makeMarkNode(frame) {
  return {
    type: frame.type,
    children: frame.children,
    ...(frame.color ? { color: frame.color } : {}),
  };
}

// Remark отдаёт inline HTML отдельными узлами: <u>, текст, </u>.
// Собираем их в собственные mdast-узлы, которые затем превращаются
// в ProseMirror-марки через parseMarkdown.
function rebuildBioMarkNodes(children) {
  const output = [];
  const stack = [];

  const target = () => (stack.length ? stack[stack.length - 1].children : output);

  const close = (tag, fallbackNode) => {
    let index = -1;
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      if (stack[i].tag === tag) {
        index = i;
        break;
      }
    }

    if (index === -1) {
      target().push(fallbackNode);
      return;
    }

    // Незакрытые вложенные теги закрываем в порядке вложенности.
    while (stack.length - 1 > index) {
      const frame = stack.pop();
      target().push(makeMarkNode(frame));
    }

    const frame = stack.pop();
    target().push(makeMarkNode(frame));
  };

  for (const child of children) {
    if (child.children) {
      child.children = rebuildBioMarkNodes(child.children);
    }

    if (child.type !== "html") {
      target().push(child);
      continue;
    }

    const value = String(child.value || "").trim();

    if (UNDERLINE_OPEN.test(value)) {
      stack.push({ tag: "u", type: "bioUnderline", children: [] });
      continue;
    }

    if (MARK_OPEN.test(value)) {
      stack.push({
        tag: "mark",
        type: "bioHighlight",
        color: getMarkColor(value),
        children: [],
      });
      continue;
    }

    if (UNDERLINE_CLOSE.test(value)) {
      close("u", child);
      continue;
    }

    if (MARK_CLOSE.test(value)) {
      close("mark", child);
      continue;
    }

    target().push(child);
  }

  while (stack.length) {
    const frame = stack.pop();
    target().push(makeMarkNode(frame));
  }

  return output;
}

export const bioUnderlineSchema = $markSchema("underline", () => ({
  priority: 80,
  parseDOM: [
    { tag: "u" },
    {
      style: "text-decoration",
      getAttrs: (value) => /underline/i.test(value) && null,
    },
  ],
  toDOM: () => ["u", 0],
  parseMarkdown: {
    match: (node) => node.type === "bioUnderline",
    runner: (state, node, markType) => {
      state.openMark(markType);
      state.next(node.children);
      state.closeMark(markType);
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === "underline",
    runner: (state, mark) => {
      state.withMark(mark, "bioUnderline");
    },
  },
}));

export const bioHighlightSchema = $markSchema("highlight", () => ({
  priority: 30,
  attrs: { color: { default: DEFAULT_BIO_HIGHLIGHT_COLOR } },
  parseDOM: [
    {
      tag: "mark",
      getAttrs: (dom) => ({
        color: normalizeBioHighlightColor(dom.getAttribute("data-bio-color")),
      }),
    },
  ],
  toDOM: (mark) => [
    "mark",
    { "data-bio-color": normalizeBioHighlightColor(mark.attrs.color) },
    0,
  ],
  parseMarkdown: {
    match: (node) => node.type === "bioHighlight",
    runner: (state, node, markType) => {
      state.openMark(markType, {
        color: normalizeBioHighlightColor(node.color),
      });
      state.next(node.children);
      state.closeMark(markType);
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === "highlight",
    runner: (state, mark) => {
      state.withMark(mark, "bioHighlight", undefined, {
        color: normalizeBioHighlightColor(mark.attrs.color),
      });
    },
  },
}));

export const toggleBioUnderlineCommand = $command(
  "ToggleBioUnderline",
  (ctx) => () => toggleMark(bioUnderlineSchema.type(ctx)),
);

// Кнопка маркера: выделение есть — снимаем, нет — ставим активный цвет.
export const toggleBioHighlightCommand = $command(
  "ToggleBioHighlight",
  (ctx) => (color = DEFAULT_BIO_HIGHLIGHT_COLOR) => {
    const markType = bioHighlightSchema.type(ctx);
    const mark = markType.create({
      color: normalizeBioHighlightColor(color),
    });

    return (state, dispatch) => {
      const { empty, $cursor, ranges } = state.selection;

      if (empty) {
        if (!dispatch) return true;
        const marks = state.storedMarks || $cursor?.marks() || [];
        const hasHighlight = markType.isInSet(marks);
        dispatch(
          hasHighlight
            ? state.tr.removeStoredMark(markType)
            : state.tr.addStoredMark(mark),
        );
        return true;
      }

      const hasHighlight = ranges.some((range) =>
        state.doc.rangeHasMark(range.$from.pos, range.$to.pos, markType),
      );

      if (!dispatch) return true;
      const tr = state.tr;
      if (hasHighlight) {
        ranges.forEach((range) => {
          tr.removeMark(range.$from.pos, range.$to.pos, markType);
        });
      } else {
        ranges.forEach((range) => {
          tr.addMark(range.$from.pos, range.$to.pos, mark);
        });
      }
      dispatch(tr.scrollIntoView());
      return true;
    };
  },
);

// Выбор цвета в палитре всегда ставит выбранный оттенок,
// даже если у выделения уже был маркер другого цвета.
export const setBioHighlightCommand = $command(
  "SetBioHighlight",
  (ctx) => (color = DEFAULT_BIO_HIGHLIGHT_COLOR) => {
    const markType = bioHighlightSchema.type(ctx);
    const mark = markType.create({
      color: normalizeBioHighlightColor(color),
    });

    return (state, dispatch) => {
      if (!dispatch) return true;
      const { empty, $cursor, ranges } = state.selection;

      if (empty) {
        const marks = (state.storedMarks || $cursor?.marks() || []).filter(
          (item) => item.type !== markType,
        );
        dispatch(state.tr.setStoredMarks([...marks, mark]));
        return true;
      }

      const tr = state.tr;
      ranges.forEach((range) => {
        tr.removeMark(range.$from.pos, range.$to.pos, markType);
        tr.addMark(range.$from.pos, range.$to.pos, mark);
      });
      dispatch(tr.scrollIntoView());
      return true;
    };
  },
);

export const bioMarksKeymap = $useKeymap("bioMarksKeymap", {
  ToggleUnderline: {
    shortcuts: "Mod-u",
    command: (ctx) => {
      const commands = ctx.get(commandsCtx);
      return () => commands.call(toggleBioUnderlineCommand.key);
    },
  },
});

// Единая точка подключения к редактору.
export const bioMarksPlugins = [
  bioUnderlineSchema,
  bioHighlightSchema,
  toggleBioUnderlineCommand,
  toggleBioHighlightCommand,
  setBioHighlightCommand,
  bioMarksKeymap,
];

export const bioMarksRemarkPlugin = $remark(
  "bioMarksRemark",
  () => () => (tree) => {
    tree.children = rebuildBioMarkNodes(tree.children);
  },
);

export function withBioMarkdownHandlers(options) {
  return {
    ...options,
    handlers: {
      ...options?.handlers,
      bioUnderline: (node, _parent, state, info) => {
        const exit = state.enter("bioUnderline");
        const tracker = state.createTracker(info);
        let value = tracker.move("<u>");
        value += tracker.move(
          state.containerPhrasing(node, {
            before: value,
            after: "</u>",
            ...tracker.current(),
          }),
        );
        value += tracker.move("</u>");
        exit();
        return value;
      },
      bioHighlight: (node, _parent, state, info) => {
        const color = normalizeBioHighlightColor(node.color);
        const openTag = `<mark data-bio-color="${color}">`;
        const exit = state.enter("bioHighlight");
        const tracker = state.createTracker(info);
        let value = tracker.move(openTag);
        value += tracker.move(
          state.containerPhrasing(node, {
            before: value,
            after: "</mark>",
            ...tracker.current(),
          }),
        );
        value += tracker.move("</mark>");
        exit();
        return value;
      },
    },
  };
}


