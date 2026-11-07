import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Button,
  IconButton,
  Slide,
  Stack,
  Typography,
  alpha,
  Divider,
  Tooltip,
  TextField,
  CircularProgress,
  Portal,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DialogActionButton, {
  DialogActionsBar,
} from "../../../components/Dialog/DialogActionButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FeedIcon from "@mui/icons-material/Feed";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { GlobalStyles } from "@mui/material";
import { TextSelection, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { keymap } from "@milkdown/prose/keymap";
import { lift } from "@milkdown/prose/commands";
import { prosePluginsCtx } from "@milkdown/core";

import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewCtx,
  serializerCtx,
  parserCtx,
  editorViewOptionsCtx,
  commandsCtx,
  remarkStringifyOptionsCtx,
} from "@milkdown/core";
import { nord } from "@milkdown/theme-nord";
import { commonmark } from "@milkdown/preset-commonmark";
import { history } from "@milkdown/plugin-history";
import {
  createBioSpellController,
  createBioSpellPlugin,
} from "./bioSpellcheck";
import {
  bioMarksPlugins,
  bioMarksRemarkPlugin,
  withBioMarkdownHandlers,
} from "./bioMarks";
import { BIO_HIGHLIGHT_COLORS } from "../../../theme/bioHighlightColors";
import {
  BIO_SIZE_MAX,
  BIO_SIZE_MIN,
  bioPercentStyle,
  bioSizeLabel,
  bioSizeStyle,
  buildBioSizeTitle,
  maxPercentFor,
  percentOfBioSize,
  percentToBioSize,
  readBioSize,
  rubberband,
  snapBioPercent,
  stepBioPercent,
  stepPresetFromPercent,
} from "./bioImageSize";
import { gfm } from "@milkdown/kit/preset/gfm";
import { block } from "@milkdown/plugin-block";
import AddColumnRowRightIcon from "../../../components/svg/AddColumnRowRightIcon";
import TrashFillIcon from "../../../components/svg/TrashFillIcon";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SubtitlesOutlinedIcon from "@mui/icons-material/SubtitlesOutlined";
import PhotoSizeSelectSmallIcon from "@mui/icons-material/PhotoSizeSelectSmall";

function findImageAtPos(doc, pos) {
  const node = doc.nodeAt(pos);
  if (node?.type.name === "image") return { pos, node };
  const $pos = doc.resolve(pos);
  if ($pos.nodeAfter?.type.name === "image") {
    return { pos, node: $pos.nodeAfter };
  }
  return null;
}

function isSingleImageParagraph(doc, imagePos) {
  const $pos = doc.resolve(imagePos);
  const parent = $pos.parent;
  if (parent.type.name !== "paragraph") return false;
  let imageCount = 0;
  parent.forEach((child) => {
    if (child.type.name === "image") imageCount += 1;
  });
  return imageCount === 1;
}

const bioImagePluginKey = new PluginKey("bio-image-enhance");

function createBioImagePlugin() {
  return new Plugin({
    key: bioImagePluginKey,
    props: {
      decorations(state) {
        const decos = [];
        state.doc.descendants((node, pos) => {
          if (node.type.name !== "image") return;
          decos.push(
            Decoration.node(pos, pos + node.nodeSize, {
              style: bioSizeStyle(readBioSize(node.attrs.title)),
            }),
          );
          const alt = node.attrs.alt?.trim();
          if (alt && alt !== "img") {
            decos.push(
              Decoration.widget(
                pos + node.nodeSize,
                () => {
                  const el = document.createElement("div");
                  el.className = "bio-caption-widget";
                  el.textContent = alt;
                  el.contentEditable = "false";
                  return el;
                },
                { side: 1, key: `bio-cap-${pos}` },
              ),
            );
          }
        });
        return DecorationSet.create(state.doc, decos);
      },
    },
  });
}

function collectBioSearchMatches(doc, query) {
  const q = query?.trim().toLowerCase();
  if (!q) return [];
  const matches = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text.toLowerCase();
    let index = text.indexOf(q);
    while (index !== -1) {
      matches.push({ from: pos + index, to: pos + index + q.length });
      index = text.indexOf(q, index + q.length);
    }
  });
  return matches;
}

const bioSearchPluginKey = new PluginKey("bio-search");

// Подсветка поиска в редакторе идёт через decorations ProseMirror:
// правка текста при этом не ломает разметку документа, как это сделал
// бы прямой обход DOM.
function createBioSearchPlugin(onCountChange) {
  return new Plugin({
    key: bioSearchPluginKey,
    state: {
      init: () => ({ query: "", active: 0, matches: [] }),
      apply(tr, value, _old, state) {
        const meta = tr.getMeta(bioSearchPluginKey);
        if (meta) {
          const query = meta.query?.trim() ?? "";
          return {
            query,
            active: meta.active ?? 0,
            matches: collectBioSearchMatches(state.doc, query),
          };
        }
        if (value.query && tr.docChanged) {
          return {
            ...value,
            matches: collectBioSearchMatches(state.doc, value.query),
          };
        }
        return value;
      },
    },
    props: {
      decorations(state) {
        const value = bioSearchPluginKey.getState(state);
        if (!value?.matches.length) return null;
        return DecorationSet.create(
          state.doc,
          value.matches.map((match, index) =>
            Decoration.inline(match.from, match.to, {
              class:
                index === value.active
                  ? "bio-search-hit bio-search-hit-active"
                  : "bio-search-hit",
              "data-bio-search-index": String(index),
            }),
          ),
        );
      },
    },
    view: () => ({
      update(view, prevState) {
        if (view.state.doc.eq(prevState.doc)) return;
        const value = bioSearchPluginKey.getState(view.state);
        if (value?.query) onCountChange?.(value.matches.length);
      },
    }),
  });
}

const BIO_RESIZE_HINT_KEY = "genealogy.bio.resizeHint.v1";

const BIO_RESIZE_HINT_TEXT =
  "Тяните за уголок — шаг 5 %. Стрелки: тот же шаг, Shift+стрелки — типовые размеры.";

const MilkdownEditor = ({
  content,
  isEditing,
  personDir,
  personId,
  onSaveRef,
  execRef,
  lastSavedRef,
  setIsDirty,
  onImageClick,
  onImageAdded,
  onRequestCaption,
  onRequestLink,
  searchQuery = "",
  searchMatchIndex = 0,
  onSearchMatchCountChange,
}) => {
  const editorRef = useRef(null);
  const isEditingRef = useRef(isEditing);
  const containerRef = useRef(null);

  const spellControllerRef = useRef(null);
  if (!spellControllerRef.current) {
    spellControllerRef.current = createBioSpellController({
      isEditing: () => isEditingRef.current,
    });
  }

  const searchCountRef = useRef(onSearchMatchCountChange);
  useEffect(() => {
    searchCountRef.current = onSearchMatchCountChange;
  }, [onSearchMatchCountChange]);

  // Синхронизация режима редактирования без пересоздания редактора
  useEffect(() => {
    isEditingRef.current = isEditing;
    editorRef.current?.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      if (view) {
        view.setProps({ editable: () => isEditingRef.current });
        // Принудительно обновляем состояние вида
        view.dispatch(view.state.tr.setMeta("refreshedatable", true));
      }
    });
  }, [isEditing]);

  const { loading } = useEditor(
    (root) => {
      const editor = Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, content || " ");
          ctx.set(editorViewOptionsCtx, {
            editable: () => isEditingRef.current,
            // Системный спеллчекер отключаем: в биографии работает свой словарь,
            // иначе macOS подчёркивает русские слова украинским словарём.
            attributes: { spellcheck: "false" },
          });
          ctx.update(remarkStringifyOptionsCtx, (prev) =>
            withBioMarkdownHandlers(prev),
          );
          ctx.update(prosePluginsCtx, (prev) => [
            ...prev,
            keymap({
              Tab: (state, dispatch) => {
                return handleTabInTable(state, dispatch);
              },
            }),
            createBioImagePlugin(),
            createBioSearchPlugin((count) => searchCountRef.current?.(count)),
            createBioSpellPlugin(spellControllerRef.current),
          ]);
        })
        .config(nord)
        .use(commonmark)
        .use(bioMarksRemarkPlugin)
        .use(bioMarksPlugins)
        .use(history)
        .use(gfm)
        .use(block); // возможно не нужен
      // .use(tooltip);

      // ВАЖНО: Привязываем созданный редактор к твоему рефу
      editorRef.current = editor;

      return editor;
    },
    [personId], // Если personId меняется, редактор пересоздастся, и реф обновится
  );

  // Фикс путей изображений (оставляем твой рабочий код)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || loading) return;
    const fixImages = () => {
      container.querySelectorAll("img").forEach((img) => {
        if (img.classList.contains("ProseMirror-separator")) return;

        const src = img.getAttribute("src");
        if (
          src &&
          !src.startsWith("http") &&
          !src.startsWith("file") &&
          personDir
        ) {
          const cleanDir = personDir.replace(/\\/g, "/");
          const cleanSrc = src.replace(/\\/g, "/");
          img.src = `${cleanDir}/${cleanSrc}`;
        }

        img.style.cssText = bioSizeStyle(readBioSize(img.getAttribute("title")));
      });
    };
    const handleImgClick = (e) => {
      if (e.target.tagName === "IMG" && !isEditingRef.current) {
        onImageClick(e.target.src);
      }
    };
    container.addEventListener("click", handleImgClick);
    const observer = new MutationObserver(fixImages);
    observer.observe(container, { childList: true, subtree: true });
    fixImages();
    return () => {
      container.removeEventListener("click", handleImgClick);
      observer.disconnect();
    };
  }, [personDir, loading, onImageClick, isEditing]);

  // Dirty-state: сравнение с последним сохранённым markdown
  useEffect(() => {
    if (loading || !lastSavedRef) return;

    let dispatchRestore = null;

    editorRef.current?.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const serializer = ctx.get(serializerCtx);

      const syncDirty = () => {
        const md = serializer(view.state.doc);
        setIsDirty(md !== lastSavedRef.current);
      };

      const originalDispatch = view.dispatch.bind(view);
      view.dispatch = (tr) => {
        originalDispatch(tr);
        if (tr.docChanged) {
          requestAnimationFrame(syncDirty);
        }
      };
      dispatchRestore = () => {
        view.dispatch = originalDispatch;
      };

      syncDirty();
    });

    return () => dispatchRestore?.();
  }, [loading, setIsDirty, lastSavedRef, content]);

  // Поиск по тексту биографии в режиме правки
  const runSearch = useCallback((query, active) => {
    let count = 0;
    editorRef.current?.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      view.dispatch(
        view.state.tr.setMeta(bioSearchPluginKey, { query, active }),
      );
      const state = bioSearchPluginKey.getState(view.state);
      count = state?.matches.length ?? 0;
      view.dom
        .querySelector(`[data-bio-search-index="${active}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return count;
  }, []);

  useEffect(() => {
    if (loading) return;
    searchCountRef.current?.(runSearch(searchQuery, searchMatchIndex));
  }, [loading, isEditing, searchQuery, searchMatchIndex, runSearch]);

  // Команды для кнопок
  useEffect(() => {
    if (loading) return;
    onSaveRef.current = () =>
      editorRef.current?.action((ctx) =>
        ctx.get(serializerCtx)(ctx.get(editorViewCtx).state.doc),
      );
    execRef.current = {
      exec: (key, payload) =>
        editorRef.current?.action((ctx) =>
          ctx.get(commandsCtx).call(key, payload),
        ),
      focus: () =>
        editorRef.current?.action((ctx) => ctx.get(editorViewCtx).focus()),
      getFormatState: () => {        let result = { block: "paragraph", marks: {} };
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state } = view;
          const { $from } = state.selection;

          let block = "paragraph";
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth);
            const name = node.type.name;
            if (name === "code_block") {
              block = "code";
              break;
            }
            if (name === "heading") {
              block = `h${node.attrs.level}`;
              break;
            }
            if (name === "blockquote") {
              block = "quote";
              break;
            }
            if (name === "bullet_list") {
              block = "bullet";
              break;
            }
            if (name === "ordered_list") {
              block = "ordered";
              break;
            }
          }

          const marks =
            state.storedMarks || state.selection.$from.marks() || [];
          const { from, to, empty } = state.selection;

          // Цвет маркера для палитры: у курсора берём активную марку,
          // у выделения — первый цвет внутри диапазона. Граница
          // выделения не считается: маркер до его начала не отмечаем.
          let highlight = null;
          if (empty) {
            highlight =
              marks.find((mark) => mark.type.name === "highlight")?.attrs
                .color || null;
          } else {
            state.doc.nodesBetween(from, to, (node) => {
              if (highlight) return false;
              const found = node.marks?.find(
                (mark) => mark.type.name === "highlight",
              );
              if (found) highlight = found.attrs.color;
              return true;
            });
          }

          result = {
            block,
            marks: {
              strong: marks.some((mark) => mark.type.name === "strong"),
              emphasis: marks.some((mark) => mark.type.name === "emphasis"),
              strikethrough: marks.some(
                (mark) => mark.type.name === "strike_through",
              ),
              underline: marks.some((mark) => mark.type.name === "underline"),
              highlight,
            },
          };
        });
        return result;
      },
      clearFormatting: () =>
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const commands = ctx.get(commandsCtx);
          const { state } = view;
          const { $from, from, to, empty } = state.selection;

          const tr = state.tr.removeMark(
            empty ? $from.start() : from,
            empty ? $from.end() : to,
          );
          if (tr.docChanged) view.dispatch(tr);

          commands.call("TurnIntoText");
          view.focus();
        }),
      setParagraph: () =>
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          ctx.get(commandsCtx).call("TurnIntoText");
          // Выходим из цитаты или списка, чтобы «Основной текст»
          // возвращал обычный абзац, а не абзац внутри обёртки.
          for (let depth = 0; depth < 6; depth += 1) {
            if (!lift(view.state, view.dispatch, view)) break;
          }
          view.focus();
        }),
      getSpellWordAt: (x, y) =>
        spellControllerRef.current?.getWordAtCoords(x, y) || null,
      replaceSpellWord: (from, to, word) =>
        spellControllerRef.current?.replaceWord(from, to, word),
      addSpellWord: (word) => spellControllerRef.current?.addWord(word),
      wrapInTag: (tag) =>
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state, dispatch } = view;
          const { from, to } = state.selection;
          if (from === to) return;
          const text = state.doc.textBetween(from, to);
          const newNode = ctx.get(parserCtx)(`<${tag}>${text}</${tag}>`);
          dispatch(state.tr.replaceSelectionWith(newNode.content.firstChild));
        }),
      insertImage: async () => {
        const file = await window.bioAPI.addImage(personId);
        if (!file) return;

        onImageAdded?.(file);
        const caption = (await onRequestCaption?.())?.trim();
        const alt = caption || "img";

        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const node = ctx
            .get(parserCtx)(`![${alt}](${file} "${buildBioSizeTitle("md")}")`)
            .content.firstChild;
          view.dispatch(view.state.tr.replaceSelectionWith(node));
        });
      },
      getImageInfoAtDom: (dom) => {
        let result = null;
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          let found = findImageAtPos(view.state.doc, view.posAtDOM(dom, 0));
          if (!found) {
            found = findImageAtPos(view.state.doc, view.posAtDOM(dom, -1));
          }
          if (!found) return;
          const { node, pos: imagePos } = found;
          result = {
            pos: imagePos,
            alt: node.attrs.alt || "",
            src: node.attrs.src || "",
            title: node.attrs.title || "",
            size: readBioSize(node.attrs.title),
            isSingle: isSingleImageParagraph(view.state.doc, imagePos),
          };
        });
        return result;
      },
      updateImageAtPos: (pos, { alt, size } = {}) => {
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const found = findImageAtPos(view.state.doc, pos);
          if (!found) return;
          const { node, pos: imagePos } = found;
          const attrs = { ...node.attrs };
          if (alt !== undefined) attrs.alt = alt.trim() || "img";
          if (size !== undefined) attrs.title = buildBioSizeTitle(size);
          view.dispatch(view.state.tr.setNodeMarkup(imagePos, undefined, attrs));
        });
      },
      deleteImageAtPos: (pos) => {
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const found = findImageAtPos(view.state.doc, pos);
          if (!found) return;
          view.dispatch(
            view.state.tr.delete(found.pos, found.pos + found.node.nodeSize),
          );
        });
      },
      insertLink: async () => {
        const linkData = await onRequestLink?.();
        if (!linkData?.url?.trim()) return;

        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state, dispatch } = view;
          const { from, to } = state.selection;
          const url = linkData.url.trim();
          const label =
            linkData.text?.trim() ||
            (from !== to ? state.doc.textBetween(from, to) : url);
          const node = ctx.get(parserCtx)(`[${label}](${url})`).content
            .firstChild;
          dispatch(state.tr.replaceSelectionWith(node));
        });
      },
      markSaved: (markdown) => {
        if (typeof markdown === "string" && lastSavedRef) {
          lastSavedRef.current = markdown;
        }
        setIsDirty(false);
      },
      search: (query, matchIndex = 0) => {
        let matchCount = 0;
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state, dispatch } = view;
          const q = query?.trim();
          if (!q) return;

          const matches = [];
          const needle = q.toLowerCase();
          state.doc.descendants((node, pos) => {
            if (!node.isText) return;
            const text = node.text;
            const lower = text.toLowerCase();
            let idx = 0;
            while ((idx = lower.indexOf(needle, idx)) !== -1) {
              matches.push({ from: pos + idx, to: pos + idx + q.length });
              idx += needle.length;
            }
          });

          matchCount = matches.length;
          if (matchCount === 0) return;

          const target = matches[matchIndex % matchCount];
          dispatch(
            state.tr
              .setSelection(
                TextSelection.create(state.doc, target.from, target.to),
              )
              .scrollIntoView(),
          );
        });
        return matchCount;
      },
      insertTable: () =>
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const parser = ctx.get(parserCtx);
          // GFM ожидает именно такой формат для парсинга таблицы
          const tableMarkdown =
            "| Название | Описание |\n| --- | --- |\n|  |  |";
          const tableNode = parser(tableMarkdown);
          if (tableNode) {
            view.dispatch(
              view.state.tr.replaceSelectionWith(tableNode.content.firstChild),
            );
          }
        }),

      addRow: () =>
        editorRef.current?.action((ctx) => {
          const commands = ctx.get(commandsCtx);
          commands.call("AddRowAfter");
        }),
      addRowBefore: () =>
        editorRef.current?.action((ctx) => {
          const commands = ctx.get(commandsCtx);
          commands.call("AddRowBefore");
        }),
      addCol: () =>
        editorRef.current?.action((ctx) => {
          const commands = ctx.get(commandsCtx);
          commands.call("AddColAfter");
        }),
      addColBefore: () =>
        editorRef.current?.action((ctx) => {
          const commands = ctx.get(commandsCtx);
          commands.call("AddColBefore");
        }),
      deleteTable: () =>
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          view.focus(); // Возвращаем фокус

          const { state, dispatch } = view;
          const { selection } = state;

          // Ищем ближайшего родителя-таблицу от текущего курсора
          let tablePos = -1;
          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.type.name === "table") {
              tablePos = pos;
              return false;
            }
          });

          if (tablePos !== -1) {
            // Нашли таблицу — удаляем весь этот узел
            const tr = state.tr.delete(
              tablePos,
              tablePos + state.doc.nodeAt(tablePos).nodeSize,
            );
            dispatch(tr);
          } else {
            // Фолбек: если ручной поиск не нашел, пробуем штатную команду
            ctx.get(commandsCtx).call("DeleteTable");
          }
        }),

      deleteRow: () =>
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state, dispatch } = view;
          const { selection } = state;

          // Находим таблицу и индекс строки
          let tablePos = -1;
          let rowIndex = -1;
          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.type.name === "table") {
              tablePos = pos;
              return false;
            }
          });

          if (tablePos === -1) return;

          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return;

          // Найдём строку, содержащую курсор
          let offset = 0;
          for (let i = 0; i < tableNode.childCount; i++) {
            const row = tableNode.child(i);
            const rowStart = tablePos + 1 + offset; // позиция начала этой строки в документе
            const rowEnd = rowStart + row.nodeSize;
            if (selection.from >= rowStart && selection.from <= rowEnd) {
              rowIndex = i;
              break;
            }
            offset += row.nodeSize;
          }

          if (rowIndex === -1) return;

          // Удаляем диапазон, соответствующий найденной строке
          let beforeOffset = 0;
          for (let i = 0; i < rowIndex; i++)
            beforeOffset += tableNode.child(i).nodeSize;
          const start = tablePos + 1 + beforeOffset;
          const rowNode = tableNode.child(rowIndex);
          const end = start + rowNode.nodeSize;

          const tr = state.tr.delete(start, end);
          dispatch(tr);
        }),

      deleteCol: () =>
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state, dispatch } = view;
          const { selection } = state;

          // Находим таблицу и индекс столбца (по позиции курсора)
          let tablePos = -1;
          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.type.name === "table") {
              tablePos = pos;
              return false;
            }
          });

          if (tablePos === -1) return;

          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return;

          // Определяем индекс столбца: смотрим на первую строку и находим, в какой ячейке курсор
          let colIndex = -1;
          // Найдём строку и внутри неё ячейку
          let found = false;
          let rowOffsets = []; // накопленные оффсеты строк
          let acc = 0;
          for (let r = 0; r < tableNode.childCount; r++) {
            rowOffsets.push(acc);
            acc += tableNode.child(r).nodeSize;
          }

          for (let r = 0; r < tableNode.childCount && !found; r++) {
            const row = tableNode.child(r);
            const rowStart = tablePos + 1 + rowOffsets[r];
            // Перебираем ячейки
            let cellOffset = 0;
            for (let c = 0; c < row.childCount; c++) {
              const cell = row.child(c);
              const cellStart = rowStart + 1 + cellOffset;
              const cellEnd = cellStart + cell.nodeSize;
              if (selection.from >= cellStart && selection.from <= cellEnd) {
                colIndex = c;
                found = true;
                break;
              }
              cellOffset += cell.nodeSize;
            }
          }

          if (colIndex === -1) return;

          // Удаляем ячейки в каждой строке, начиная с последней строки (чтобы позиции не смещались)
          let tr = state.tr;
          for (let r = tableNode.childCount - 1; r >= 0; r--) {
            const row = tableNode.child(r);
            // вычисляем позицию строки в документе
            let before = 0;
            for (let i = 0; i < r; i++) before += tableNode.child(i).nodeSize;
            const rowStart = tablePos + 1 + before;
            // вычисляем позицию ячейки внутри строки
            let cellBefore = 0;
            for (let c = 0; c < colIndex; c++)
              cellBefore += row.child(c).nodeSize;
            const cellStart = rowStart + 1 + cellBefore;
            const cellNode = row.child(colIndex);
            if (!cellNode) continue; // на случай неравного числа ячеек
            const cellEnd = cellStart + cellNode.nodeSize;
            tr = tr.delete(cellStart, cellEnd);
          }

          dispatch(tr);
        }),
      // вставьте внутрь объекта execRef.current
      // ВЫРАВНИВАНИЕ (Через прямую команду)
      // Не забудь: import { TextSelection } from "prosemirror-state";
      alignCenter: () =>
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          if (!view) return;
          const { state, dispatch } = view;
          const { from } = state.selection;

          // 1) найти таблицу под курсором
          let tablePos = -1;
          state.doc.nodesBetween(from, from, (node, pos) => {
            if (node.type.name === "table") {
              tablePos = pos;
              return false;
            }
            return true;
          });
          if (tablePos === -1) return;
          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return;

          // 2) вычислить индекс столбца, где курсор
          let colIndex = -1;
          let acc = 0;
          for (let r = 0; r < tableNode.childCount; r++) {
            const row = tableNode.child(r);
            let cellOffset = 0;
            for (let c = 0; c < row.childCount; c++) {
              const cell = row.child(c);
              const cellStart = tablePos + 1 + acc + 1 + cellOffset;
              const cellEnd = cellStart + cell.nodeSize;
              if (from >= cellStart && from <= cellEnd) {
                colIndex = c;
                break;
              }
              cellOffset += cell.nodeSize;
            }
            if (colIndex !== -1) break;
            acc += row.nodeSize;
          }
          if (colIndex === -1) return;

          // 3) найти позицию внутри заголовочной ячейки (row 0)
          const headerRow = tableNode.child(0);
          if (!headerRow) return;
          let headerCellOffset = 0;
          let headerCellStart = null;
          for (let c = 0; c < headerRow.childCount; c++) {
            const cell = headerRow.child(c);
            if (c === colIndex) {
              headerCellStart = tablePos + 1 + 1 + headerCellOffset; // позиция node start
              break;
            }
            headerCellOffset += cell.nodeSize;
          }
          if (headerCellStart == null) return;

          // 4) сохранить текущую селекцию
          const origSelection = state.selection;

          // 5) создать TextSelection внутри заголовочной ячейки (внутри параграфа)
          // позиция для установки курсора — headerCellStart + 1 (внутри содержимого ячейки)
          const targetPos = headerCellStart + 1;
          try {
            const trSel = state.tr.setSelection(
              TextSelection.create(state.doc, targetPos),
            );
            dispatch(trSel);

            // 6) вызвать команду SetAlign (плагин ожидает, что курсор в заголовке)
            try {
              ctx.get(commandsCtx).call("SetAlign", "center");
            } catch (e) {
              // запасной ключ, если в вашей версии плагина другая команда
              try {
                ctx.get(commandsCtx).call("ModifyTable", {
                  type: "setAlign",
                  index: colIndex,
                  align: "center",
                });
              } catch (err) {
                console.error("Не удалось вызвать команду выравнивания:", err);
              }
            }
          } finally {
            // 7) восстановить исходную селекцию (если документ не изменился, просто вернём курсор)
            // Если SetAlign сделал транзакцию, то восстановление может перезаписать её селекцию,
            // поэтому восстанавливаем только если документ не изменился; иначе оставляем как есть.
            const newState = view.state;
            if (newState.doc.eq(state.doc)) {
              const trRestore = newState.tr.setSelection(origSelection);
              dispatch(trRestore);
            } else {
              // документ изменился — оставляем селекцию там, где плагин её установил (обычно это нормально)
            }
          }
        }),

      alignLeft: () =>
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          if (!view) return;
          const { state, dispatch } = view;
          const { from } = state.selection;

          // найти таблицу
          let tablePos = -1;
          state.doc.nodesBetween(from, from, (node, pos) => {
            if (node.type.name === "table") {
              tablePos = pos;
              return false;
            }
            return true;
          });
          if (tablePos === -1) return;
          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return;

          // индекс столбца
          let colIndex = -1;
          let acc = 0;
          for (let r = 0; r < tableNode.childCount; r++) {
            const row = tableNode.child(r);
            let cellOffset = 0;
            for (let c = 0; c < row.childCount; c++) {
              const cell = row.child(c);
              const cellStart = tablePos + 1 + acc + 1 + cellOffset;
              const cellEnd = cellStart + cell.nodeSize;
              if (from >= cellStart && from <= cellEnd) {
                colIndex = c;
                break;
              }
              cellOffset += cell.nodeSize;
            }
            if (colIndex !== -1) break;
            acc += row.nodeSize;
          }
          if (colIndex === -1) return;

          // заголовочная ячейка
          const headerRow = tableNode.child(0);
          if (!headerRow) return;
          let headerCellOffset = 0;
          let headerCellStart = null;
          for (let c = 0; c < headerRow.childCount; c++) {
            const cell = headerRow.child(c);
            if (c === colIndex) {
              headerCellStart = tablePos + 1 + 1 + headerCellOffset;
              break;
            }
            headerCellOffset += cell.nodeSize;
          }
          if (headerCellStart == null) return;

          const origSelection = state.selection;
          const targetPos = headerCellStart + 1;
          try {
            const trSel = state.tr.setSelection(
              TextSelection.create(state.doc, targetPos),
            );
            dispatch(trSel);

            try {
              ctx.get(commandsCtx).call("SetAlign", "left");
            } catch (e) {
              ctx.get(commandsCtx).call("ModifyTable", {
                type: "setAlign",
                index: colIndex,
                align: "left",
              });
            }
          } finally {
            const newState = view.state;
            if (newState.doc.eq(state.doc)) {
              const trRestore = newState.tr.setSelection(origSelection);
              dispatch(trRestore);
            }
          }
        }),

      alignRight: () =>
        editorRef.current?.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          if (!view) return;
          const { state, dispatch } = view;
          const { from } = state.selection;

          // найти таблицу
          let tablePos = -1;
          state.doc.nodesBetween(from, from, (node, pos) => {
            if (node.type.name === "table") {
              tablePos = pos;
              return false;
            }
            return true;
          });
          if (tablePos === -1) return;
          const tableNode = state.doc.nodeAt(tablePos);
          if (!tableNode) return;

          // индекс столбца
          let colIndex = -1;
          let acc = 0;
          for (let r = 0; r < tableNode.childCount; r++) {
            const row = tableNode.child(r);
            let cellOffset = 0;
            for (let c = 0; c < row.childCount; c++) {
              const cell = row.child(c);
              const cellStart = tablePos + 1 + acc + 1 + cellOffset;
              const cellEnd = cellStart + cell.nodeSize;
              if (from >= cellStart && from <= cellEnd) {
                colIndex = c;
                break;
              }
              cellOffset += cell.nodeSize;
            }
            if (colIndex !== -1) break;
            acc += row.nodeSize;
          }
          if (colIndex === -1) return;

          // заголовочная ячейка
          const headerRow = tableNode.child(0);
          if (!headerRow) return;
          let headerCellOffset = 0;
          let headerCellStart = null;
          for (let c = 0; c < headerRow.childCount; c++) {
            const cell = headerRow.child(c);
            if (c === colIndex) {
              headerCellStart = tablePos + 1 + 1 + headerCellOffset;
              break;
            }
            headerCellOffset += cell.nodeSize;
          }
          if (headerCellStart == null) return;

          const origSelection = state.selection;
          const targetPos = headerCellStart + 1;
          try {
            const trSel = state.tr.setSelection(
              TextSelection.create(state.doc, targetPos),
            );
            dispatch(trSel);

            try {
              ctx.get(commandsCtx).call("SetAlign", "right");
            } catch (e) {
              ctx.get(commandsCtx).call("ModifyTable", {
                type: "setAlign",
                index: colIndex,
                align: "right",
              });
            }
          } finally {
            const newState = view.state;
            if (newState.doc.eq(state.doc)) {
              const trRestore = newState.tr.setSelection(origSelection);
              dispatch(trRestore);
            }
          }
        }),
    };
  }, [
    personId,
    loading,
    onSaveRef,
    execRef,
    lastSavedRef,
    setIsDirty,
    onRequestCaption,
    onRequestLink,
  ]);

  // Функция проверки и добавления строки

  const handleTabInTable = (state, dispatch) => {
    const { selection } = state;
    const { $from } = selection;

    // 1. Проверяем, в таблице ли мы (ищем родительский узел table_cell/header)
    let cellDepth = -1;
    for (let d = $from.depth; d > 0; d--) {
      if (["table_cell", "table_header"].includes($from.node(d).type.name)) {
        cellDepth = d;
        break;
      }
    }

    if (cellDepth === -1) return false;

    // 2. Находим таблицу и проверяем, последняя ли это ячейка
    const table = $from.node(cellDepth - 2); // table -> row -> cell
    const tablePos = $from.before(cellDepth - 2);
    const isLastRow =
      $from.after(cellDepth - 1) === tablePos + table.nodeSize - 1;
    const isLastCell =
      $from.after(cellDepth) === $from.after(cellDepth - 1) - 1;

    if (isLastRow && isLastCell) {
      if (dispatch) {
        const { schema, tr } = state;
        const currentRow = $from.node(cellDepth - 1);
        const colCount = currentRow.childCount;

        // Создаем новую строку с пустыми ячейками
        const cells = [];
        for (let i = 0; i < colCount; i++) {
          cells.push(schema.nodes.table_cell.createAndFill());
        }
        const newRow = schema.nodes.table_row.create(null, cells);

        // Вставляем строго ПЕРЕД закрывающим тегом таблицы
        const insertPos = tablePos + table.nodeSize - 1;
        const transaction = tr.insert(insertPos, newRow);

        // Магический расчет позиции:
        // Новая строка начинается там же, где раньше был конец таблицы
        const startOfNewRow = insertPos;
        // Ставим курсор внутрь первой ячейки новой строки (параграф внутри ячейки)
        const newSelectionPos = startOfNewRow + 2;

        dispatch(
          transaction
            .setSelection(
              TextSelection.create(transaction.doc, newSelectionPos),
            )
            .scrollIntoView(),
        );
      }
      return true;
    }

    return false;
  };

  return (
    <Box
      ref={containerRef}
      className={isEditing ? "bio-editing" : undefined}
      sx={{
        mt: 2,

        // СТИЛИ ТАБЛИЦЫ
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
          "& th": { bgcolor: "divider" },
        },
        //-----
        "& .milkdown": {
          backgroundColor: "transparent",
          color: (theme) =>
            theme.palette.mode === "dark" ? "#e0e0e0" : "#1a1a1a",
        },
        "& .milkdown .editor": {
          minHeight: "500px",
          outline: "none",
          pb: "100px",
          // color: "#eee",
          color: (theme) =>
            theme.palette.mode === "dark" ? "#e0e0e0" : "#1a1a1a",
          fontSize: "1.05rem",
          lineHeight: 1.7,
          // ВАЖНО: сохраняем переносы строк
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        },
        // Стилизация заголовков
        "& .ProseMirror h1": {
          textIndent: "2rem", // Можно в px (например, 25px) или rem
          // textAlign: "center",
        },
        "& .ProseMirror h2": {
          textIndent: "2rem", // Можно в px (например, 25px) или rem
          // textAlign: "center",
        },
        "& .ProseMirror h3": {
          textIndent: "2rem", // Можно в px (например, 25px) или rem
          // textAlign: "center",
        },
        // Стилизация параграфов (чтобы Enter создавал видимый отступ)
        "& .ProseMirror p": {
          marginBottom: 0, //для отступа между абзацами можно добавить "0.25em"
          marginTop: 0,
          minHeight: "1.2em", // <--- добавочка для стабильности пустых строк
          // ВЫРАВНИВАНИЕ ПО ШИРИНЕ
          textAlign: "justify",
          // ДОБАВЛЯЕМ ОТСТУП ПЕРВОЙ СТРОКИ
          textIndent: "2rem", // Можно в px (например, 25px) или rem
        },
        "& .ProseMirror .bio-spell-error": {
          textDecorationLine: "underline",
          textDecorationStyle: "wavy",
          textDecorationColor: "rgba(255, 68, 58, 0.50)",
          textDecorationThickness: "1px",
          textUnderlineOffset: "3px",
        },
        // КРАСИВЫЕ И УМЕНЬШЕННЫЕ СТИЛИ ДЛЯ РИСУНКА
        "& .ProseMirror p:has(img)": {
          textIndent: 0, // <--- ОБЯЗАТЕЛЬНО ОБНУЛЯЕМ ТУТ
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          justifyContent: "center",
          alignItems: "flex-start",
          // Убираем отступы, которые могут создавать фантомные блоки
          minHeight: "auto",
        },

        "& img.ProseMirror-separator": {
          display: "none !important",
        },

        "& .ProseMirror p:has(img) img": {
          display: "inline-block",
          objectFit: "cover",
          borderRadius: "8px",
          border: "1px solid #444",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          transition: "transform 0.2s, box-shadow 0.2s",
          verticalAlign: "top",
        },

        "& .ProseMirror p:has(img) img:not(.ProseMirror-separator)": {
          cursor: "pointer",
          "&:hover": {
            transform: "scale(1.03)",
            boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
            zIndex: 10,
          },
        },

        // В режиме правки картинка не должна уезжать из-под курсора,
        // иначе ручка угла дрожит при перетаскивании. Селектор повторяет
        // :not(.ProseMirror-separator) из базового правила — без него
        // детализация меньше и hover-увеличение всё равно побеждает.
        "&.bio-editing .ProseMirror p:has(img) img:not(.ProseMirror-separator):hover":
          {
            transform: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: "auto",
          },

        "& .bio-caption-widget": {
          flexBasis: "100%",
          textAlign: "center",
          fontSize: "0.85rem",
          lineHeight: 1.4,
          color: "text.secondary",
          mt: 0.5,
          mb: 1,
          pointerEvents: "none",
          userSelect: "none",
          textIndent: 0,
        },

        "& span.bio-search-hit": {
          bgcolor: (theme) => alpha(theme.palette.warning.main, 0.45),
          color: "inherit",
          borderRadius: "2px",
          px: "1px",
        },

        "& span.bio-search-hit.bio-search-hit-active": {
          bgcolor: (theme) => alpha(theme.palette.warning.main, 0.9),
          color: "#111111",
        },

        "& u": {
          textDecoration: "underline",
          textDecorationThickness: "1px",
          textUnderlineOffset: "2px",
        },
        "& mark[data-bio-color]": {
          color: "inherit",
          borderRadius: "3px",
          px: "1px",
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        },
        ...Object.fromEntries(
          BIO_HIGHLIGHT_COLORS.map((color) => [
            `& mark[data-bio-color="${color.id}"]`,
            {
              bgcolor: (theme) =>
                alpha(
                  color.hex,
                  theme.palette.mode === "dark" ? 0.34 : 0.4,
                ),
            },
          ]),
        ),
        "& blockquote": { borderLeft: "4px solid #666", pl: 2, color: "#aaa" },
      }}
    >
      <Milkdown />
    </Box>
  );
};


export default function BiographySection({
  personId,
  personName,
  activeElement,
  isEditing,
  setIsEditing,
  execRef,
  requestToggleRef,
  isNavVisible,
  setActiveElement,
  onDirtyChange,
  searchQuery = "",
  searchMatchIndex = 0,
  onSearchMatchCountChange,
}) {
  const [isDirty, setIsDirtyInternal] = useState(false);
  const setIsDirty = useCallback(
    (value) => {
      setIsDirtyInternal(value);
      onDirtyChange?.(value);
    },
    [onDirtyChange],
  );
  const [bio, setBio] = useState(null);
  const [personDir, setPersonDir] = useState("");
  const [previewImages, setPreviewImages] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [sessionImages, setSessionImages] = useState([]);
  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState("");
  const [expandedHeadingIds, setExpandedHeadingIds] = useState(() => new Set());

  // Дерево заголовков: H2 вкладывается в H1, H3 — в H2.
  const headingTree = useMemo(() => {
    const nodes = headings.map((heading) => ({
      ...heading,
      children: [],
      parentId: null,
    }));
    const roots = [];
    const stack = [];
    const byId = new Map();

    for (const node of nodes) {
      while (stack.length && stack[stack.length - 1].level >= node.level) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];
      if (parent) {
        node.parentId = parent.id;
        parent.children.push(node);
      } else {
        roots.push(node);
      }

      stack.push(node);
      byId.set(node.id, node);
    }

    return { roots, byId };
  }, [headings]);

  // Подпункты по умолчанию свёрнуты: показываем только корневые заголовки.
  const visibleHeadings = useMemo(() => {
    const result = [];

    const walk = (nodes) => {
      for (const node of nodes) {
        result.push(node);
        if (node.children.length > 0 && expandedHeadingIds.has(node.id)) {
          walk(node.children);
        }
      }
    };

    walk(headingTree.roots);
    return result;
  }, [headingTree, expandedHeadingIds]);

  const toggleHeading = useCallback((id) => {
    setExpandedHeadingIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Убираем из состояния заголовки, которых больше нет в тексте.
  useEffect(() => {
    setExpandedHeadingIds((previous) => {
      if (previous.size === 0) return previous;
      const next = new Set(
        [...previous].filter((id) => headingTree.byId.has(id)),
      );
      return next.size === previous.size ? previous : next;
    });
  }, [headingTree]);

  // При переходе к вложенному заголовку раскрываем его родителей.
  useEffect(() => {
    if (!activeHeadingId) return;

    const ancestorIds = [];
    let node = headingTree.byId.get(activeHeadingId);
    while (node?.parentId) {
      ancestorIds.push(node.parentId);
      node = headingTree.byId.get(node.parentId);
    }
    if (ancestorIds.length === 0) return;

    setExpandedHeadingIds((previous) => {
      let changed = false;
      const next = new Set(previous);
      for (const id of ancestorIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [activeHeadingId, headingTree]);

  const saveRef = useRef(null);
  const lastSavedRef = useRef("");
  const contentScrollRef = useRef(null);
  const articleRef = useRef(null);
  const promptResolverRef = useRef(null);
  const menuScrollYRef = useRef(0);
  const [contextMenu, setContextMenu] = React.useState(null);
  const [imageMenu, setImageMenu] = useState(null);
  const [spellMenu, setSpellMenu] = useState(null);
  const [promptState, setPromptState] = useState(null);
  const [promptValues, setPromptValues] = useState({ text: "", url: "" });
  const [activeImage, setActiveImage] = useState(null);
  const [resizeValue, setResizeValue] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHint, setResizeHint] = useState(false);
  const [resizeHintSeen, setResizeHintSeen] = useState(() => {
    try {
      return localStorage.getItem(BIO_RESIZE_HINT_KEY) === "1";
    } catch {
      return true;
    }
  });
  const [resizeHandleFocused, setResizeHandleFocused] = useState(false);
  const activeImageRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const resizeDragRef = useRef(null);

  const collectHeadings = useCallback(() => {
    const root = articleRef.current;
    if (!root) {
      setHeadings([]);
      return;
    }

    const nodes = Array.from(
      root.querySelectorAll(".ProseMirror h1, .ProseMirror h2, .ProseMirror h3"),
    );
    const items = nodes
      .map((node, index) => {
        const text = node.textContent?.trim();
        if (!text) return null;

        const id = `bio-heading-${index}`;
        const level =
          node.tagName === "H1" ? 1 : node.tagName === "H2" ? 2 : 3;

        return {
          id,
          text,
          level,
          sourceIndex: index,
        };
      })
      .filter(Boolean);

    setHeadings(items);
  }, []);

  const handleScrollToHeading = useCallback((sourceIndex) => {
    const root = articleRef.current;
    const scroller = contentScrollRef.current;
    if (!root) return;

    const nodes = Array.from(
      root.querySelectorAll(".ProseMirror h1, .ProseMirror h2, .ProseMirror h3"),
    );
    const target = nodes[sourceIndex];
    if (!target) return;

    const hasInnerScroll =
      Boolean(scroller) && scroller.scrollHeight > scroller.clientHeight + 1;

    if (hasInnerScroll) {
      const scrollerRect = scroller.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetTop =
        scroller.scrollTop + (targetRect.top - scrollerRect.top) - 24;

      scroller.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
      return;
    }

    const targetTop = target.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }, []);

  const handleContextMenu = (event) => {
    const img = event.target.closest("img");
    if (
      img &&
      isEditing &&
      !img.classList.contains("ProseMirror-separator")
    ) {
      event.preventDefault();
      menuScrollYRef.current = window.scrollY;
      const info = execRef.current?.getImageInfoAtDom?.(img);
      if (info) {
        setSpellMenu(null);
        setContextMenu(null);
        setImageMenu({
          mouseX: event.clientX + 2,
          mouseY: event.clientY - 6,
          ...info,
        });
      }
      return;
    }

    const spellHit = isEditing
      ? execRef.current?.getSpellWordAt?.(event.clientX, event.clientY)
      : null;
    if (spellHit) {
      event.preventDefault();
      menuScrollYRef.current = window.scrollY;
      const { word, from, to } = spellHit;
      setImageMenu(null);
      setContextMenu(null);
      setSpellMenu({
        mouseX: event.clientX + 2,
        mouseY: event.clientY - 6,
        word,
        from,
        to,
        suggestions: null,
      });
      window.spellcheckAPI
        ?.suggest?.(word)
        .then((suggestions) => {
          setSpellMenu((prev) =>
            prev && prev.from === from && prev.to === to
              ? {
                  ...prev,
                  suggestions: Array.isArray(suggestions) ? suggestions : [],
                }
              : prev,
          );
        })
        .catch(() => {
          setSpellMenu((prev) =>
            prev ? { ...prev, suggestions: [] } : prev,
          );
        });
      return;
    }

    setSpellMenu(null);
    setImageMenu(null);
    const table = event.target.closest("table");
    if (table && isEditing) {
      event.preventDefault();
      menuScrollYRef.current = window.scrollY;
      setContextMenu(
        contextMenu === null
          ? { mouseX: event.clientX + 2, mouseY: event.clientY - 6 }
          : null,
      );
    }
  };

  const preserveViewportScroll = useCallback((action) => {
    const windowY = menuScrollYRef.current;
    action();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: windowY, left: 0, behavior: "instant" });
      });
    });
  }, []);

  const bioContextMenuProps = {
    disableAutoFocus: true,
    disableEnforceFocus: true,
    disableRestoreFocus: true,
    disableScrollLock: true,
    MenuListProps: { autoFocusItem: false, dense: true },
  };

  const handleCloseMenu = () =>
    preserveViewportScroll(() => setContextMenu(null));
  const handleCloseImageMenu = () =>
    preserveViewportScroll(() => setImageMenu(null));
  const handleCloseSpellMenu = () =>
    preserveViewportScroll(() => setSpellMenu(null));

  const runTableMenuAction = (action) =>
    preserveViewportScroll(() => {
      action?.();
      setContextMenu(null);
    });

  const handleEditImageCaption = async () => {
    if (!imageMenu) return;
    const { pos, alt } = imageMenu;
    handleCloseImageMenu();
    const result = await requestPrompt({
      type: "caption",
      title: "Подпись к фото",
      initial: {
        text: alt === "img" ? "" : alt,
      },
    });
    if (result !== null) {
      preserveViewportScroll(() => {
        execRef.current?.updateImageAtPos?.(pos, {
          alt: result.text?.trim() || "img",
        });
      });
    }
  };

  const handleDeleteImage = () => {
    if (!imageMenu) return;
    const { pos } = imageMenu;
    handleCloseImageMenu();
    preserveViewportScroll(() => {
      execRef.current?.deleteImageAtPos?.(pos);
    });
  };

  const handleSetImageSize = (size) => {
    if (!imageMenu) return;
    const { pos } = imageMenu;
    handleCloseImageMenu();
    preserveViewportScroll(() => {
      execRef.current?.updateImageAtPos?.(pos, { size });
    });
    setActiveImage((prev) =>
      prev && prev.name === String(imageMenu.src || "").split("/").pop()
        ? { ...prev, size }
        : prev,
    );
  };

  // ——— Размер картинки перетаскиванием за угол ———

  // ProseMirror пересобирает DOM картинки при смене размера, поэтому
  // элемент не держим в ссылке, а каждый раз находим по имени файла.
  const findImageElement = (entry) => {
    if (!entry) return null;
    const images = document.querySelectorAll(
      ".ProseMirror img:not(.ProseMirror-separator)",
    );
    for (const img of images) {
      const name = String(img.getAttribute("src") || "").split("/").pop();
      if (name === entry.name) return img;
    }
    return null;
  };

  const positionResizeHandle = useCallback(() => {
    const handle = resizeHandleRef.current;
    const entry = activeImageRef.current;
    if (!handle || !entry) return;
    const img = findImageElement(entry);
    if (!img) {
      setActiveImage(null);
      return;
    }
    const rect = img.getBoundingClientRect();
    const next = `translate3d(${rect.right}px, ${rect.bottom}px, 0)`;
    if (handle.style.transform !== next) handle.style.transform = next;
  }, []);

  const resizeGeometryOf = (img) => {
    // Проценты считаются от ширины абзаца-контейнера, как и в CSS.
    const basis = img.parentElement?.clientWidth || 0;
    return { basis, cap: maxPercentFor(img.naturalWidth, basis) };
  };

  const dismissResizeHint = useCallback(() => {
    setResizeHint(false);
    setResizeHintSeen(true);
    try {
      localStorage.setItem(BIO_RESIZE_HINT_KEY, "1");
    } catch {
      /* приватный режим — подсказка просто будет появляться снова */
    }
  }, []);

  useEffect(() => {
    if (!resizeHint) return undefined;
    const timer = setTimeout(dismissResizeHint, 9000);
    return () => clearTimeout(timer);
  }, [resizeHint, dismissResizeHint]);

  // Картинка «активна», пока на неё кликнули в режиме правки: у неё
  // появляется ручка угла. Клик мимо картинки или выход из правки её снимают.
  const handleBioPointerDown = (event) => {
    if (!isEditing) return;
    // Портал с ручкой — потомок этого Box в дереве React, поэтому клик
    // по ручке не должен сбрасывать выбор картинки.
    if (event.target?.closest?.("[data-bio-resize-ui]")) return;
    const img = event.target?.closest?.("img");
    if (!img || img.classList.contains("ProseMirror-separator")) {
      setActiveImage(null);
      return;
    }
    const info = execRef.current?.getImageInfoAtDom?.(img);
    if (!info) {
      setActiveImage(null);
      return;
    }
    setActiveImage({
      name: String(info.src || "").split("/").pop(),
      size: info.size,
      isSingle: info.isSingle,
    });
    if (info.isSingle && !resizeHintSeen) setResizeHint(true);
  };

  useEffect(() => {
    activeImageRef.current = activeImage;
    setResizeValue(null);
    if (!activeImage) setResizeHint(false);
  }, [activeImage]);

  useEffect(() => {
    if (!isEditing) setActiveImage(null);
  }, [isEditing]);

  // Ручка лежит в портале, поэтому её позиция — снимок уголка картинки.
  // Обновляем каждый кадр, пока картинка выбрана: перетаскивание, набор
  // текста, рефлоу строки и наведение мыши двигают уголок независимо друг
  // от друга, и по событиям (MutationObserver, scroll) не поймаешь все.
  useEffect(() => {
    if (!activeImage) return undefined;
    let frame = requestAnimationFrame(function tick() {
      positionResizeHandle();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeImage, positionResizeHandle]);

  const commitResize = (entry, value) => {
    const img = findImageElement(entry);
    if (!img) return;
    // Позиция в документе после правок съезжает, поэтому спрашиваем
    // редактор, где картинка лежит сейчас.
    const info = execRef.current?.getImageInfoAtDom?.(img);
    if (!info || info.size === value) return;
    execRef.current?.updateImageAtPos?.(info.pos, { size: value });
    setActiveImage((prev) => (prev ? { ...prev, size: value } : prev));
  };

  const onResizePointerDown = (event) => {
    const entry = activeImageRef.current;
    const img = findImageElement(entry);
    if (!img) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus?.({ preventScroll: true });
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dismissResizeHint();
    const { basis, cap } = resizeGeometryOf(img);
    const rendered = img.getBoundingClientRect().width;
    resizeDragRef.current = {
      pointerId: event.pointerId,
      img,
      startX: event.clientX,
      startY: event.clientY,
      basis,
      cap,
      startPercent: basis
        ? ((rendered + 12) / basis) * 100
        : percentOfBioSize(entry.size),
      value: entry.size,
      shown: entry.size,
    };
    setResizeValue(entry.size);
    setIsResizing(true);
  };

  const onResizePointerMove = (event) => {
    const drag = resizeDragRef.current;
    if (!drag || !drag.img.isConnected) return;
    if (event.pointerId !== drag.pointerId) return;
    // Мышь без зажатой кнопки — это обычное наведение, а не перетаскивание:
    // если состояние жеста почему-то осталось, менять размер нельзя.
    if (event.pointerType === "mouse" && event.buttons === 0) return;
    // Угол тянем по диагонали, поэтому считаем среднее смещение по осям.
    const pull =
      (event.clientX - drag.startX + (event.clientY - drag.startY)) / 2;
    const raw = drag.startPercent + (drag.basis ? (pull / drag.basis) * 100 : 0);
    const snapped = snapBioPercent(raw, drag.cap);
    const overshoot = Math.max(0, Math.min(raw, BIO_SIZE_MAX) - drag.cap);
    drag.img.style.cssText = bioPercentStyle(
      Math.min(
        BIO_SIZE_MAX,
        percentOfBioSize(snapped) + rubberband(overshoot, drag.cap),
      ),
    );
    drag.value = snapped;
    if (snapped !== drag.shown) {
      drag.shown = snapped;
      setResizeValue(snapped);
    }
  };

  const finishResizeDrag = () => {
    const drag = resizeDragRef.current;
    if (!drag) return;
    resizeDragRef.current = null;
    setIsResizing(false);
    if (drag.img.isConnected) drag.img.style.cssText = bioSizeStyle(drag.value);
    commitResize(activeImageRef.current, drag.value);
  };

  const onResizeKeyDown = (event) => {
    const entry = activeImageRef.current;
    const img = findImageElement(entry);
    if (!img) return;
    const directions = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    };
    const direction = directions[event.key];
    const { basis, cap } = resizeGeometryOf(img);
    const current = percentOfBioSize(resizeValue ?? entry.size);
    let target = null;
    if (direction) {
      target = event.shiftKey
        ? percentOfBioSize(stepPresetFromPercent(current, direction))
        : stepBioPercent(current, direction, cap);
    } else if (event.key === "Home") {
      target = BIO_SIZE_MIN;
    } else if (event.key === "End") {
      target = cap;
    } else if (event.key === "Escape") {
      event.preventDefault();
      setActiveImage(null);
      return;
    }
    if (target === null) return;
    event.preventDefault();
    dismissResizeHint();
    // Шаг уже ведёт по точкам сетки, поэтому заново не примагничиваем:
    // иначе стрелка из «Средний (33 %)» прыгает обратно в свою детенту.
    const value = percentToBioSize(target);
    img.style.cssText = bioSizeStyle(value);
    setResizeValue(value);
    commitResize(entry, value);
  };

  const resizeBubbleValue = resizeValue ?? activeImage?.size;
  // Подсказка и пузырёк значения делят один уголок: пока подсказка видна,
  // пузырёк не показываем — иначе они сливаются в одну плашку.
  const showResizeBubble = Boolean(
    activeImage?.isSingle && !resizeHint && (isResizing || resizeHandleFocused),
  );

  // Очищаем список при входе в режим редактирования
  useEffect(() => {
    if (isEditing) setSessionImages([]);
  }, [isEditing]);

  const requestPrompt = useCallback((config) => {
    return new Promise((resolve) => {
      promptResolverRef.current = resolve;
      setPromptValues(config.initial || { text: "", url: "" });
      setPromptState(config);
    });
  }, []);

  const closePrompt = useCallback((value) => {
    promptResolverRef.current?.(value);
    promptResolverRef.current = null;
    setPromptState(null);
    setPromptValues({ text: "", url: "" });
  }, []);

  const onRequestCaption = useCallback(
    () =>
      requestPrompt({
        type: "caption",
        title: "Подпись к фото",
        initial: { text: "" },
      }).then((result) => result?.text ?? ""),
    [requestPrompt],
  );

  const onRequestLink = useCallback(
    () =>
      requestPrompt({
        type: "link",
        title: "Вставить ссылку",
        initial: { text: "", url: "https://" },
      }),
    [requestPrompt],
  );

  const handleSaveOnly = useCallback(async () => {
    const markdown = saveRef.current?.();
    if (typeof markdown !== "string") return;
    await window.bioAPI.save(personId, markdown);
    lastSavedRef.current = markdown;
    execRef.current?.markSaved?.(markdown);
    setBio(markdown);
    setSessionImages([]);
  }, [personId, execRef]);

  const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const resolveBioImageRelPath = (src) => {
    if (!src) return null;
    const normalized = src.replace(/\\/g, "/");
    const idx = normalized.indexOf("bio_images/");
    if (idx >= 0) return normalized.slice(idx);
    return null;
  };

  const embedImagesInClone = useCallback(async (clone) => {
    const imgs = [...clone.querySelectorAll("img")];
    await Promise.all(
      imgs.map(async (img) => {
        const src = img.getAttribute("src");
        if (!src || src.startsWith("data:")) return;
        const relPath = resolveBioImageRelPath(src);
        if (!relPath) return;
        try {
          const blob = await window.bioAPI.readImage(personId, relPath);
          img.src = await blobToDataUrl(blob);
        } catch (err) {
          console.warn("Не удалось встроить изображение для PDF:", relPath, err);
        }
      }),
    );
  }, [personId]);

  const buildPrintHtml = useCallback(async () => {
    const prose = articleRef.current?.querySelector(".ProseMirror");
    if (!prose) return "";
    const clone = prose.cloneNode(true);
    clone.querySelectorAll("img").forEach((img) => {
      const alt = img.getAttribute("alt")?.trim();
      if (!alt || alt === "img" || img.closest("figure")) return;
      const figure = document.createElement("figure");
      img.parentNode.insertBefore(figure, img);
      figure.appendChild(img);
      const cap = document.createElement("figcaption");
      cap.textContent = alt;
      figure.appendChild(cap);
    });
    await embedImagesInClone(clone);
    const escapeHtml = (s) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const title = escapeHtml(personName?.trim() || "Биография");
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; line-height: 1.7; margin: 40px; }
    h1, h2, h3 { page-break-after: avoid; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; }
    figure { margin: 16px 0; text-align: center; }
    figcaption { font-size: 0.9em; color: #555; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ccc; padding: 8px; }
    blockquote { border-left: 4px solid #999; padding-left: 16px; color: #444; }
    a { color: #0088FF; }
    u { text-decoration: underline; text-underline-offset: 2px; }
    mark[data-bio-color] {
      color: inherit;
      padding: 0 1px;
      border-radius: 3px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    ${BIO_HIGHLIGHT_COLORS.map(
      (color) =>
        `mark[data-bio-color="${color.id}"] { background-color: ${color.hex}66; }`,
    ).join("\n    ")}
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${clone.innerHTML}
</body>
</html>`;
  }, [personName, embedImagesInClone]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleExportPdf = useCallback(async () => {
    try {
      const html = await buildPrintHtml();
      if (!html) return;
      const safeName = (personName || "biography").replace(
        /[^\p{L}\d_-]+/gu,
        "_",
      );
      await window.bioAPI.exportPdf({
        html,
        defaultName: `${safeName}_bio.pdf`,
      });
    } catch (err) {
      console.error("Ошибка экспорта PDF:", err);
      window.alert("Не удалось экспортировать PDF. Попробуйте ещё раз.");
    }
  }, [buildPrintHtml, personName]);

  const openImagePreview = useCallback((src) => {
    const root = articleRef.current;
    const imgs = root
      ? Array.from(root.querySelectorAll(".ProseMirror img, .milkdown img"))
      : [];
    const urls = [...new Set(imgs.map((img) => img.src).filter(Boolean))];
    const idx = urls.indexOf(src);
    setPreviewImages(urls.length > 0 ? urls : [src]);
    setPreviewIndex(idx >= 0 ? idx : 0);
  }, []);

  const closeImagePreview = useCallback(() => {
    setPreviewImages([]);
    setPreviewIndex(0);
  }, []);

  const goPreviewImage = useCallback(
    (delta) => {
      setPreviewIndex(
        (prev) => (prev + delta + previewImages.length) % previewImages.length,
      );
    },
    [previewImages.length],
  );

  // Регистрация методов в рефе для MainLayout
  useEffect(() => {
    if (requestToggleRef) {
      requestToggleRef.current = {
        toggle: () => {
          if (isEditing && isDirty) {
            setPendingAction("toggleEdit");
            setConfirmOpen(true);
          } else {
            setIsEditing(!isEditing);
          }
        },
        checkDirty: () => isDirty,
        askSave: (action) => {
          setPendingAction(action);
          setConfirmOpen(true);
        },
        save: handleSaveOnly,
        print: handlePrint,
        exportPdf: handleExportPdf,
      };
    }
    return () => {
      if (requestToggleRef) requestToggleRef.current = null;
    };
  }, [
    isEditing,
    isDirty,
    setIsEditing,
    requestToggleRef,
    handleSaveOnly,
    handlePrint,
    handleExportPdf,
  ]);

  useEffect(() => {
    if (!isEditing || activeElement !== "bio") return;
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveOnly();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditing, activeElement, handleSaveOnly]);

  useEffect(() => {
    if (previewImages.length === 0) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeImagePreview();
      if (e.key === "ArrowLeft") goPreviewImage(-1);
      if (e.key === "ArrowRight") goPreviewImage(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewImages.length, closeImagePreview, goPreviewImage]);

  useEffect(() => {
    if (bio !== null) {
      lastSavedRef.current = bio || "";
      setIsDirty(false);
    }
  }, [bio, personId, setIsDirty]);

  // Подсветкой и счётчиком совпадений занимается редактор (см. MilkdownEditor),
  // здесь только сброс счётчика, когда биография скрыта.
  useEffect(() => {
    if (activeElement !== "bio") onSearchMatchCountChange?.(0);
  }, [activeElement, onSearchMatchCountChange]);

  // Загрузка данных и CLEANUP
  useEffect(() => {
    if (personId && activeElement === "bio") {
      window.bioAPI.load(personId).then(setBio);
      window.bioAPI.getFullImagePath(personId, "").then(setPersonDir);
    }

    // ЭТОТ КЛИНИНГ ЗАКРЫВАЕТ РЕДАКТИРОВАНИЕ ПРИ УХОДЕ
    return () => {
      setIsEditing(false);
    };
  }, [personId, activeElement, setIsEditing]);

  useEffect(() => {
    if (activeElement !== "bio") return;
    const root = articleRef.current;
    if (!root) return;

    const update = () => collectHeadings();
    const timerId = window.setTimeout(update, 0);
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(update);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      window.clearTimeout(timerId);
      observer.disconnect();
    };
  }, [activeElement, bio, isEditing, collectHeadings]);

  useEffect(() => {
    const scroller = contentScrollRef.current;
    if (!scroller || headings.length === 0) {
      setActiveHeadingId("");
      return;
    }

    const hasInnerScroll = scroller.scrollHeight > scroller.clientHeight + 1;

    const syncActiveHeading = () => {
      const root = articleRef.current;
      if (!root) return;
      const marker = hasInnerScroll ? scroller.scrollTop + 80 : window.scrollY + 120;
      let currentId = headings[0]?.id || "";
      const nodes = Array.from(
        root.querySelectorAll(".ProseMirror h1, .ProseMirror h2, .ProseMirror h3"),
      );

      for (const heading of headings) {
        const node = nodes[heading.sourceIndex];
        if (!node) continue;
        const relativeTop = hasInnerScroll
          ? scroller.scrollTop +
            (node.getBoundingClientRect().top -
              scroller.getBoundingClientRect().top)
          : node.getBoundingClientRect().top + window.scrollY;

        if (relativeTop <= marker) {
          currentId = heading.id;
        } else {
          break;
        }
      }

      setActiveHeadingId(currentId);
    };

    syncActiveHeading();
    if (hasInnerScroll) {
      scroller.addEventListener("scroll", syncActiveHeading, { passive: true });
    } else {
      window.addEventListener("scroll", syncActiveHeading, { passive: true });
    }

    return () => {
      if (hasInnerScroll) {
        scroller.removeEventListener("scroll", syncActiveHeading);
      } else {
        window.removeEventListener("scroll", syncActiveHeading);
      }
    };
  }, [headings]);

  const handleSaveAndExecute = async () => {
    const markdown = saveRef.current?.();
    if (typeof markdown === "string") {
      await window.bioAPI.save(personId, markdown);
      lastSavedRef.current = markdown;
      execRef.current?.markSaved?.(markdown);
      setBio(markdown);
      setSessionImages([]);
      executePending();
    }
  };

  const handleDiscardAndExecute = async () => {
    // Если были добавлены изображения, удаляем их физически из папки
    if (sessionImages.length > 0) {
      await window.bioAPI.deleteImages(personId, sessionImages);
    }

    setIsDirty(false);
    setSessionImages([]);
    executePending();
  };

  const executePending = () => {
    // 1. Если просто переключали кнопку "Карандаш"
    if (pendingAction === "toggleEdit") {
      setIsEditing(false);
    }

    // 2. Если переключали вкладку (например, changeTab:photo)
    if (
      typeof pendingAction === "string" &&
      pendingAction.startsWith("changeTab:")
    ) {
      const [, newTab] = pendingAction.split(":");
      setIsEditing(false);
      if (setActiveElement) setActiveElement(newTab);
    }

    // 3. Если уходили по ссылке в меню (например, navigate:/settings)
    if (
      typeof pendingAction === "string" &&
      pendingAction.startsWith("navigate:")
    ) {
      const [, path] = pendingAction.split(":");
      setIsEditing(false);
      window.location.hash = path; // Или используйте навигацию из пропсов
    }

    setConfirmOpen(false);
    setPendingAction(null);
  };

  return (
    <>
      <GlobalStyles
        styles={{
          "@media print": {
            "body *": { visibility: "hidden" },
            "#bio-print-root, #bio-print-root *": { visibility: "visible" },
            "#bio-print-root": {
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              boxShadow: "none !important",
              border: "none !important",
            },
          },
        }}
      />
      <Box
        sx={{
          display: "flex",
          bgcolor: "transparent",
          gap: { xs: 0, lg: 2 },
          alignItems: "flex-start",
        }}
      >
        <Box
          sx={{
            width: { xs: 0, lg: isNavVisible ? 320 : 0 },
            opacity: { xs: 0, lg: isNavVisible ? 1 : 0 },
            transform: { xs: "translateX(-16px)", lg: isNavVisible ? "translateX(0)" : "translateX(-16px)" },
            transition:
              "width 260ms ease, opacity 220ms ease, transform 260ms ease",
            overflow: "visible",
            flexShrink: 0,
            height: "auto",
            display: { xs: "none", lg: "block" },
            mt: 4,
            ml: 1,
            position: "sticky",
            top: "82px",
            alignSelf: "flex-start",
            
          }}
        >
          <Box
            sx={{
              height: "calc(100dvh - 120px)",
              overflowY: "auto",
              border: "1px solid",
              // borderColor: "divider",
              // borderRadius: "16px",
              borderRadius: "24px",
              // bgcolor: "background.paper",
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "#1a1a1a" // Глубокий темный (чуть темнее прошлого, для благородства)
                  : "#ffffff",
              p: 1,
              borderColor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.05)" // Почти невидимая в темноте
                  : "rgba(0, 0, 0, 0.08)",
            }}
          >
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 800,
                  px: 1,
                  color: "text.secondary",
                  letterSpacing: 0.8,
                }}
              >
                Навигация по заголовкам
              </Typography>

              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {headings.length === 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ px: 1, py: 0.5 }}
                  >
                    Добавьте заголовки H1–H3 в биографии
                  </Typography>
                )}

                {visibleHeadings.map((heading) => {
                  const hasChildren = heading.children.length > 0;
                  const isExpanded = expandedHeadingIds.has(heading.id);
                  const isActive = activeHeadingId === heading.id;

                  return (
                    <Box
                      key={heading.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.25,
                      }}
                    >
                      <Button
                        variant={isActive ? "contained" : "text"}
                        color={isActive ? "primary" : "inherit"}
                        onClick={() =>
                          handleScrollToHeading(heading.sourceIndex)
                        }
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          justifyContent: "flex-start",
                          textAlign: "left",
                          textTransform: "none",
                          borderRadius: "8px",
                          px: 1.2,
                          py: 0.75,
                          fontWeight:
                            heading.level === 1
                              ? 700
                              : heading.level === 2
                                ? 600
                                : 500,
                          pl:
                            heading.level === 1
                              ? 1.2
                              : heading.level === 2
                                ? 2.8
                                : 4.2,
                          fontSize:
                            heading.level === 3 ? "0.85rem" : undefined,
                          color: isActive
                            ? "primary.contrastText"
                            : "text.primary",
                        }}
                      >
                        {heading.text}
                      </Button>

                      {hasChildren ? (
                        <Tooltip
                          title={
                            isExpanded
                              ? "Свернуть подпункты"
                              : "Развернуть подпункты"
                          }
                        >
                          <IconButton
                            size="small"
                            aria-label={
                              isExpanded
                                ? "Свернуть подпункты"
                                : "Развернуть подпункты"
                            }
                            aria-expanded={isExpanded}
                            onClick={() => toggleHeading(heading.id)}
                            sx={{
                              width: 28,
                              height: 28,
                              flexShrink: 0,
                              mr: 0.25,
                              color: "text.secondary",
                            }}
                          >
                            <ExpandMoreIcon
                              sx={{
                                fontSize: 18,
                                transform: isExpanded
                                  ? "rotate(0deg)"
                                  : "rotate(-90deg)",
                                transition: "transform 160ms ease",
                              }}
                            />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Box
                          aria-hidden
                          sx={{ width: 28, flexShrink: 0, mr: 0.25 }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Stack>
          </Box>
        </Box>

        <Box
          ref={contentScrollRef}
          sx={{
            flex: 1,
            overflowY: "visible",
            transform: { lg: isNavVisible ? "translateX(0)" : "translateX(-8px)" },
            transition: "transform 260ms ease",
            // Используем стандартный фон темы для подложки
            bgcolor: "transparent",
            py: { xs: 2, md: 4 },
            px: { xs: 2, md: 0 },
          }}
        >
          <Box
            id="bio-print-root"
            ref={articleRef}
            sx={{
              maxWidth: "900px",
              mx: "auto",
              // Адаптивные отступы
              p: { xs: 2, md: 5 },

              // ЦВЕТ ЛИСТА
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "#1a1a1a" // Глубокий темный (чуть темнее прошлого, для благородства)
                  : "#ffffff",

              minHeight: "100vh",
              borderRadius: "24px",
              border: "1px solid",

              // ЦВЕТ ГРАНИЦЫ
              borderColor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.05)" // Почти невидимая в темноте
                  : "rgba(0, 0, 0, 0.08)",

              // ОБЪЕМНЫЕ ТЕНИ
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? `
          0 20px 40px rgba(0,0,0,0.8), 
          inset 0 0 0 1px rgba(255,255,255,0.05)
        ` // Внешняя тень + внутренний тонкий контур для объема
                  : "0 10px 40px rgba(0,0,0,0.06)",

              // ИСПРАВЛЕНИЕ ЦВЕТА ТЕКСТА
              color: (theme) =>
                theme.palette.mode === "dark" ? "#e0e0e0" : "#1a1a1a", // Насыщенный черный для светлой темы

              transition: "background-color 0.3s ease",
              ...(isEditing && {
                "&:hover": {
                  transform: "translateY(-2px)",
                },
              }),
            }}
          >
            {activeElement === "bio" && bio === "" && !isEditing && (
              <Box
                sx={{
                  textAlign: "center",
                  py: 15,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  "& .milkdown": {
                    color: (theme) =>
                      theme.palette.mode === "light"
                        ? "#1a1a1a !important"
                        : "inherit",
                    fontSize: "1.1rem",
                    lineHeight: 1.7,
                  },
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    borderRadius: "50%",
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                  }}
                >
                  <FeedIcon
                    sx={{ fontSize: 80, color: "text.disabled", opacity: 0.2 }}
                  />
                </Box>
                <Typography
                  variant="h6"
                  sx={{ color: "text.secondary", fontWeight: 500 }}
                >
                  Биография пока не заполнена
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => setIsEditing(true)}
                  sx={{
                    mt: 1,
                    borderRadius: "12px",
                    px: 3,
                    textTransform: "none",
                  }}
                >
                  Начать писать
                </Button>
              </Box>
            )}

            {activeElement === "bio" && bio !== null && (
              <Box
                onContextMenu={handleContextMenu}
                onPointerDownCapture={handleBioPointerDown}
                sx={{ position: "relative" }}
              >
                <MilkdownProvider key={personId + (isEditing ? "_ed" : "_vw")}>
                  <MilkdownEditor
                    onImageAdded={(file) =>
                      setSessionImages((prev) => [...prev, file])
                    }
                    content={bio || " "}
                    isEditing={isEditing}
                    personDir={personDir}
                    personId={personId}
                    onSaveRef={saveRef}
                    execRef={execRef}
                    lastSavedRef={lastSavedRef}
                    setIsDirty={setIsDirty}
                    onImageClick={openImagePreview}
                    onRequestCaption={onRequestCaption}
                    onRequestLink={onRequestLink}
                    searchQuery={searchQuery}
                    searchMatchIndex={searchMatchIndex}
                    onSearchMatchCountChange={onSearchMatchCountChange}
                  />
                </MilkdownProvider>

                {isEditing && activeImage?.isSingle && (
                  <Portal>
                    <Box
                      ref={resizeHandleRef}
                      data-bio-resize-ui=""
                      sx={{
                        position: "fixed",
                        left: 0,
                        top: 0,
                        width: 0,
                        height: 0,
                        zIndex: 1300,
                        pointerEvents: "none",
                      }}
                    >
                      <Box
                        component="span"
                        role="slider"
                        tabIndex={0}
                        aria-label="Размер изображения"
                        aria-valuemin={BIO_SIZE_MIN}
                        aria-valuemax={BIO_SIZE_MAX}
                        aria-valuenow={percentOfBioSize(resizeBubbleValue)}
                        aria-valuetext={bioSizeLabel(resizeBubbleValue)}
                        title={BIO_RESIZE_HINT_TEXT}
                        onPointerDown={onResizePointerDown}
                        onPointerMove={onResizePointerMove}
                        onPointerUp={finishResizeDrag}
                        onPointerCancel={finishResizeDrag}
                        onKeyDown={onResizeKeyDown}
                        onFocus={() => setResizeHandleFocused(true)}
                        onBlur={() => setResizeHandleFocused(false)}
                        sx={{
                          position: "absolute",
                          left: -7,
                          top: -7,
                          width: 14,
                          height: 14,
                          boxSizing: "border-box",
                          borderRadius: "50%",
                          bgcolor: "background.paper",
                          border: "2px solid",
                          borderColor: "primary.main",
                          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.35)",
                          cursor: "nwse-resize",
                          pointerEvents: "auto",
                          touchAction: "none",
                          transform: isResizing ? "scale(1.18)" : "scale(1)",
                          transition: "transform 140ms cubic-bezier(0.32, 0.72, 0, 1)",
                          "&::after": {
                            content: '""',
                            position: "absolute",
                            inset: "-10px",
                            borderRadius: "50%",
                          },
                          "&:focus-visible": {
                            outline: "none",
                            boxShadow: (theme) =>
                              `0 0 0 4px ${alpha(theme.palette.primary.main, 0.35)}`,
                          },
                        }}
                      />

                      {showResizeBubble && (
                        <Box
                          sx={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            transform:
                              "translate(calc(-100% - 14px), calc(-50% - 2px))",
                            transformOrigin: "right center",
                            transition:
                              "opacity 140ms ease-out, transform 140ms cubic-bezier(0.32, 0.72, 0, 1)",
                            "@starting-style": {
                              opacity: 0,
                              transform:
                                "translate(calc(-100% - 8px), calc(-50% - 2px)) scale(0.94)",
                            },
                            px: 1,
                            py: 0.4,
                            borderRadius: "7px",
                            bgcolor: (theme) =>
                              alpha(theme.palette.common.black, 0.72),
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: 1.35,
                            whiteSpace: "nowrap",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {bioSizeLabel(resizeBubbleValue)}
                        </Box>
                      )}

                      {resizeHint && (
                        <Box
                          sx={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: 250,
                            transform:
                              "translate(calc(-100% - 14px), calc(-100% - 14px))",
                            transformOrigin: "right bottom",
                            transition:
                              "opacity 180ms ease-out, transform 180ms cubic-bezier(0.32, 0.72, 0, 1)",
                            "@starting-style": {
                              opacity: 0,
                              transform:
                                "translate(calc(-100% - 8px), calc(-100% - 10px)) scale(0.96)",
                            },
                            px: 1.25,
                            py: 1,
                            borderRadius: "10px",
                            bgcolor: (theme) =>
                              alpha(theme.palette.common.black, 0.78),
                            backdropFilter: "blur(10px)",
                            color: "#fff",
                            fontSize: 12.5,
                            lineHeight: 1.45,
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                          }}
                        >
                          {BIO_RESIZE_HINT_TEXT}
                        </Box>
                      )}
                    </Box>
                  </Portal>
                )}

                {!isEditing && bio?.includes("bio_images") && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", textAlign: "center", mt: 2, opacity: 0.7 }}
                  >
                    Клик по фото — увеличить
                  </Typography>
                )}

                <Menu
                  open={spellMenu !== null}
                  onClose={handleCloseSpellMenu}
                  anchorReference="anchorPosition"
                  anchorPosition={
                    spellMenu !== null
                      ? { top: spellMenu.mouseY, left: spellMenu.mouseX }
                      : undefined
                  }
                  {...bioContextMenuProps}
                  PaperProps={{
                    sx: {
                      bgcolor: "transparent",
                      backgroundImage: "none",
                      boxShadow: 24,
                      borderRadius: "12px",
                      minWidth: 200,
                      fontSize: "13px",
                      px: "6px",
                      border: "1px solid",
                      borderColor: "divider",
                      backdropFilter: "blur(6px)",
                    },
                  }}
                >
                  {spellMenu?.suggestions === null && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 1.5,
                        py: 1,
                      }}
                    >
                      <CircularProgress size={14} />
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "13px", color: "text.secondary" }}
                      >
                        Поиск вариантов…
                      </Typography>
                    </Box>
                  )}
                  {spellMenu?.suggestions?.length === 0 && (
                    <MenuItem disabled sx={{ px: 1, borderRadius: "8px" }}>
                      <ListItemText
                        primary="Нет вариантов"
                        primaryTypographyProps={{ fontSize: "13px" }}
                      />
                    </MenuItem>
                  )}
                  {spellMenu?.suggestions?.map((suggestion) => (
                    <MenuItem
                      key={suggestion}
                      onClick={() => {
                        execRef.current?.replaceSpellWord?.(
                          spellMenu.from,
                          spellMenu.to,
                          suggestion,
                        );
                        handleCloseSpellMenu();
                      }}
                      sx={{ px: 1, borderRadius: "8px" }}
                    >
                      <ListItemText
                        primary={suggestion}
                        primaryTypographyProps={{ fontSize: "13px" }}
                      />
                    </MenuItem>
                  ))}
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem
                    onClick={async () => {
                      await execRef.current?.addSpellWord?.(spellMenu.word);
                      handleCloseSpellMenu();
                    }}
                    sx={{ px: 1, borderRadius: "8px" }}
                  >
                    <ListItemText
                      primary={`Добавить «${spellMenu?.word || ""}» в словарь`}
                      primaryTypographyProps={{ fontSize: "13px" }}
                    />
                  </MenuItem>
                </Menu>

                <Menu
                  open={contextMenu !== null}
                  onClose={handleCloseMenu}
                  anchorReference="anchorPosition"
                  anchorPosition={
                    contextMenu !== null
                      ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                      : undefined
                  }
                  {...bioContextMenuProps}
                  PaperProps={{
                    sx: {
                      // bgcolor: "background.paper",
                      // bgcolor: "rgba(0,0,0,0)",

                      bgcolor: "transparent",
                      backgroundImage: "none",
                      boxShadow: 24,
                      borderRadius: "12px",
                      minWidth: 200,
                      fontSize: "13px",
                      px: "6px",
                      border: "1px solid",
                      borderColor: "divider",
                      backdropFilter: "blur(6px)",
                    },
                  }}
                >
                  <MenuItem
                    onClick={() =>
                      runTableMenuAction(() => execRef.current?.addRowBefore())
                    }
                    sx={{
                      px: 1,
                      borderRadius: "8px",
                    }}
                  >
                    <ListItemIcon>
                      <AddColumnRowRightIcon
                        fontSize="small"
                        sx={{ rotate: "180deg", fontSize: "13px" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{
                        fontSize: "13px",
                        lineHeight: "1.2",
                      }}
                    >
                      Добавить строку выше
                    </ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() =>
                      runTableMenuAction(() => execRef.current?.addRow())
                    }
                    sx={{ px: 1, borderRadius: "8px" }}
                  >
                    <ListItemIcon>
                      <AddColumnRowRightIcon
                        fontSize="small"
                        sx={{ fontSize: "13px" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{
                        fontSize: "13px",
                        lineHeight: "1.2",
                      }}
                    >
                      Добавить строку ниже
                    </ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() =>
                      runTableMenuAction(() => execRef.current?.addColBefore())
                    }
                    sx={{ px: 1, borderRadius: "8px" }}
                  >
                    <ListItemIcon>
                      <AddColumnRowRightIcon
                        fontSize="small"
                        sx={{ rotate: "90deg", fontSize: "13px" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{
                        fontSize: "13px",
                        lineHeight: "1.2",
                      }}
                    >
                      Добавить столбец слева
                    </ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() =>
                      runTableMenuAction(() => execRef.current?.addCol())
                    }
                    sx={{ px: 1, borderRadius: "8px" }}
                  >
                    <ListItemIcon>
                      <AddColumnRowRightIcon
                        fontSize="small"
                        sx={{ rotate: "270deg", fontSize: "13px" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{
                        fontSize: "13px",
                        lineHeight: "1.2",
                      }}
                    >
                      Добавить столбец справа
                    </ListItemText>
                  </MenuItem>

                  <Divider />

                  <MenuItem
                    onClick={() =>
                      runTableMenuAction(() => execRef.current?.deleteRow())
                    }
                    sx={{ px: 1, borderRadius: "8px" }}
                  >
                    <ListItemIcon>
                      <TrashFillIcon
                        fontSize="small"
                        sx={{ fontSize: "13px" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{
                        fontSize: "13px",
                        lineHeight: "1.2",
                      }}
                    >
                      Удалить строку
                    </ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() =>
                      runTableMenuAction(() => execRef.current?.deleteCol())
                    }
                    sx={{ px: 1, borderRadius: "8px" }}
                  >
                    <ListItemIcon>
                      <TrashFillIcon
                        fontSize="small"
                        sx={{ fontSize: "13px" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{
                        fontSize: "13px",
                        lineHeight: "1.2",
                      }}
                    >
                      Удалить столбец
                    </ListItemText>
                  </MenuItem>

                  <Divider />

                  <MenuItem
                    onClick={() =>
                      runTableMenuAction(() => execRef.current?.deleteTable())
                    }
                    sx={{ color: "error.main", px: 1, borderRadius: "8px" }}
                  >
                    <ListItemIcon>
                      <TrashFillIcon
                        fontSize="small"
                        color="error"
                        sx={{ fontSize: "13px" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{
                        fontSize: "13px",
                        lineHeight: "1.2",
                      }}
                    >
                      Удалить всю таблицу
                    </ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() =>
                      runTableMenuAction(() => execRef.current?.alignLeft())
                    }
                    sx={{ px: 1, borderRadius: "8px" }}
                  >
                    <ListItemIcon>
                      <FormatAlignLeftIcon
                        fontSize="small"
                        sx={{ fontSize: "13px" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{
                        fontSize: "13px",
                        lineHeight: "1.2",
                      }}
                    >
                      Столбец по левому краю
                    </ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() =>
                      runTableMenuAction(() => execRef.current?.alignCenter())
                    }
                    sx={{ px: 1, borderRadius: "8px" }}
                  >
                    <ListItemIcon>
                      <FormatAlignCenterIcon
                        fontSize="small"
                        sx={{ fontSize: "13px" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{
                        fontSize: "13px",
                        lineHeight: "1.2",
                      }}
                    >
                      Столбец по центру
                    </ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() =>
                      runTableMenuAction(() => execRef.current?.alignRight())
                    }
                    sx={{ px: 1, borderRadius: "8px" }}
                  >
                    <ListItemIcon>
                      <FormatAlignRightIcon
                        fontSize="small"
                        sx={{ fontSize: "13px" }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{
                        fontSize: "13px",
                        lineHeight: "1.2",
                      }}
                    >
                      Столбец по правому краю
                    </ListItemText>
                  </MenuItem>
                </Menu>

                <Menu
                  open={imageMenu !== null}
                  onClose={handleCloseImageMenu}
                  anchorReference="anchorPosition"
                  anchorPosition={
                    imageMenu !== null
                      ? { top: imageMenu.mouseY, left: imageMenu.mouseX }
                      : undefined
                  }
                  {...bioContextMenuProps}
                  PaperProps={{
                    sx: {
                      bgcolor: "transparent",
                      backgroundImage: "none",
                      boxShadow: 24,
                      borderRadius: "12px",
                      minWidth: 220,
                      fontSize: "13px",
                      px: "6px",
                      border: "1px solid",
                      borderColor: "divider",
                      backdropFilter: "blur(6px)",
                    },
                  }}
                >
                  <MenuItem
                    onClick={handleEditImageCaption}
                    sx={{ px: 1, borderRadius: "8px" }}
                  >
                    <ListItemIcon>
                      <SubtitlesOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Изменить подпись" />
                  </MenuItem>

                  {imageMenu?.isSingle && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <MenuItem disabled sx={{ opacity: 0.7, py: 0.5, minHeight: 28 }}>
                        <ListItemIcon>
                          <PhotoSizeSelectSmallIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Размер"
                          secondary={bioSizeLabel(imageMenu?.size)}
                          sx={{
                            "& .MuiListItemText-secondary": { fontSize: 11.5 },
                          }}
                        />
                      </MenuItem>
                      {[
                        { id: "sm", label: "Маленький (25%)" },
                        { id: "md", label: "Средний (33%)" },
                        { id: "lg", label: "Большой (50%)" },
                        { id: "full", label: "На всю ширину" },
                      ].map(({ id, label }) => (
                        <MenuItem
                          key={id}
                          selected={imageMenu?.size === id}
                          onClick={() => handleSetImageSize(id)}
                          sx={{ pl: 4, py: 0.75, borderRadius: "8px" }}
                        >
                          <ListItemText primary={label} />
                        </MenuItem>
                      ))}
                    </>
                  )}

                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem
                    onClick={handleDeleteImage}
                    sx={{ color: "error.main", px: 1, borderRadius: "8px" }}
                  >
                    <ListItemIcon>
                      <DeleteOutlineIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText primary="Удалить фото" />
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Dialog
        open={Boolean(promptState)}
        onClose={() => closePrompt(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{promptState?.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {promptState?.type === "link" && (
              <TextField
                autoFocus
                label="Текст ссылки"
                fullWidth
                value={promptValues.text}
                onChange={(e) =>
                  setPromptValues((prev) => ({ ...prev, text: e.target.value }))
                }
              />
            )}
            <TextField
              autoFocus={promptState?.type !== "link"}
              label={promptState?.type === "link" ? "URL" : "Подпись (необязательно)"}
              fullWidth
              value={promptState?.type === "link" ? promptValues.url : promptValues.text}
              placeholder={promptState?.type === "caption" ? "Например: Свадьба, 1962 г." : undefined}
              onChange={(e) =>
                setPromptValues((prev) =>
                  promptState?.type === "link"
                    ? { ...prev, url: e.target.value }
                    : { ...prev, text: e.target.value },
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  closePrompt(
                    promptState?.type === "link"
                      ? { text: promptValues.text, url: promptValues.url }
                      : { text: promptValues.text },
                  );
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActionsBar sx={{ px: 3 }}>
          <DialogActionButton onClick={() => closePrompt(null)}>
            Отмена
          </DialogActionButton>
          <DialogActionButton
            tone="primary"
            onClick={() =>
              closePrompt(
                promptState?.type === "link"
                  ? { text: promptValues.text, url: promptValues.url }
                  : { text: promptValues.text },
              )
            }
          >
            {promptState?.type === "link" ? "Вставить" : "OK"}
          </DialogActionButton>
        </DialogActionsBar>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        TransitionComponent={Slide}
        TransitionProps={{ direction: "down" }}
        PaperProps={{
          sx: {
            // Адаптивный фон: в темной теме чуть прозрачный для блюра, в светлой — белый
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? alpha(theme.palette.background.paper, 0.8)
                : theme.palette.background.paper,
            width: 500,
            backdropFilter: "blur(16px)",
            backgroundImage: "none",
            borderRadius: "24px", // Увеличил до 24px для единства стиля
            border: "1px solid",
            borderColor: "divider", // Системный цвет границы (адаптивный)
            boxShadow: (theme) => theme.shadows[24],
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ p: 4, minWidth: 320, textAlign: "center" }}>
          {/* Иконка */}
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "16px",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2.5,
            }}
          >
            <EditIcon sx={{ color: "primary.main", fontSize: 32 }} />
          </Box>

          <Typography
            variant="h6"
            sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}
          >
            Вы хотите оставить эти новые правки?
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mb: 4, px: 2 }}
          >
            Вы можете сохранить изменения или удалить эти изменения немедленно.
            Это действие нельзя отменить.
          </Typography>

          <DialogActionsBar sx={{ px: 0, pt: 0, pb: 0, mt: 1 }}>
            <DialogActionButton tone="danger" onClick={handleDiscardAndExecute}>
              Удалить
            </DialogActionButton>
            <DialogActionButton onClick={() => setConfirmOpen(false)}>
              Отменить
            </DialogActionButton>
            <DialogActionButton tone="primary" onClick={handleSaveAndExecute}>
              Сохранить
            </DialogActionButton>
          </DialogActionsBar>
        </Box>
      </Dialog>

      {/* Модалка превью картинки */}
      <Dialog
        open={previewImages.length > 0}
        onClose={closeImagePreview}
        maxWidth="xl"
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              backdropFilter: "blur(8px)",
            },
          },
        }}
        PaperProps={{
          sx: {
            bgcolor: "transparent",
            boxShadow: "none",
            overflow: "hidden",
          },
        }}
      >
        {/* --- ВЕРХНЕЕ УПРАВЛЕНИЕ (В СТИЛЕ PHOTOVIEWER) --- */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            position: "fixed",
            WebkitAppRegion: "no-drag", // Гарантирует обработку кликов во frameless-окне
            top: 10,
            right: 10,
            zIndex: 1400,
            opacity: 0.3,
            transition: "opacity 0.3s ease-in-out",
            "&:hover": {
              opacity: 1,
            },
          }}
        >
          <Box
            sx={{
              backdropFilter: "blur(4px)",
              display: "inline-flex",
              alignItems: "center",
              bgcolor: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "999px",
              height: 34,
              px: 0.5,
              color: "text.secondary",
              fontSize: 20,
            }}
          >
            {previewImages.length > 1 && (
              <>
                <Tooltip title="Предыдущее (←)">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      goPreviewImage(-1);
                    }}
                    size="small"
                    sx={{ color: "#fff", p: 1 }}
                  >
                    <ChevronLeftIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
                <Typography
                  variant="caption"
                  sx={{ color: "#fff", px: 0.5, userSelect: "none" }}
                >
                  {previewIndex + 1} / {previewImages.length}
                </Typography>
                <Tooltip title="Следующее (→)">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      goPreviewImage(1);
                    }}
                    size="small"
                    sx={{ color: "#fff", p: 1 }}
                  >
                    <ChevronRightIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title="Закрыть (Esc)">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  closeImagePreview();
                }}
                size="small"
                sx={{
                  color: "#fff",
                  p: 1,
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>

        <Box
          onClick={closeImagePreview}
          sx={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "zoom-out",
            p: { xs: 1, md: 0 },
          }}
        >
          <Box
            component="img"
            src={previewImages[previewIndex]}
            alt="Preview"
            sx={{
              maxWidth: "95vw",
              maxHeight: "95vh",
              objectFit: "contain",
              borderRadius: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              animation: "fadeIn 0.3s ease-out",
              "@keyframes fadeIn": {
                from: { opacity: 0, transform: "scale(0.95)" },
                to: { opacity: 1, transform: "scale(1)" },
              },
            }}
          />
        </Box>
      </Dialog>
    </>
  );
}
