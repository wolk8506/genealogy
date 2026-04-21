import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  Box,
  Button,
  IconButton,
  Slide,
  Stack,
  Typography,
  alpha,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import FeedIcon from "@mui/icons-material/Feed";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { GlobalStyles } from "@mui/material";
import { TextSelection } from "prosemirror-state";
import { keymap } from "@milkdown/prose/keymap";
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
} from "@milkdown/core";
import { nord } from "@milkdown/theme-nord";
import { commonmark } from "@milkdown/preset-commonmark";
import { history } from "@milkdown/plugin-history";
import { ButtonScrollTop } from "../../../components/ButtonScrollTop";
import { gfm } from "@milkdown/kit/preset/gfm";
import { block } from "@milkdown/plugin-block";
import AddColumnRowRightIcon from "../../../components/svg/AddColumnRowRightIcon";
import TrashFillIcon from "../../../components/svg/TrashFillIcon";

const MilkdownEditor = ({
  content,
  isEditing,
  personDir,
  personId,
  onSaveRef,
  execRef,
  setIsDirty,
  onImageClick,
  onImageAdded,
}) => {
  const editorRef = useRef(null);
  const isEditingRef = useRef(isEditing);
  const containerRef = useRef(null);

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
          });
          ctx.update(prosePluginsCtx, (prev) => [
            ...prev,
            keymap({
              Tab: (state, dispatch) => {
                return handleTabInTable(state, dispatch);
              },
            }),
          ]);
        })
        .config(nord)
        .use(commonmark)
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
      });
    };
    const handleImgClick = (e) => {
      if (e.target.tagName === "IMG") onImageClick(e.target.src);
    };
    container.addEventListener("click", handleImgClick);
    const observer = new MutationObserver(fixImages);
    observer.observe(container, { childList: true, subtree: true });
    fixImages();
    return () => {
      container.removeEventListener("click", handleImgClick);
      observer.disconnect();
    };
  }, [personDir, loading, onImageClick]);

  // Мониторинг изменений
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      editorRef.current?.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const isDirtyValue = view?.state?.history$?.done?.items?.length > 0;
        setIsDirty(!!isDirtyValue); // Гарантируем boolean
      });
    }, 300);
    return () => clearInterval(interval);
  }, [loading, setIsDirty]);

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
        if (file) {
          // Сообщаем BiographySection, что в папку упал новый файл
          onImageAdded?.(file);

          editorRef.current?.action((ctx) => {
            const view = ctx.get(editorViewCtx);
            const node = ctx.get(parserCtx)(`![img](${file})`).content
              .firstChild;
            view.dispatch(view.state.tr.replaceSelectionWith(node));
          });
        }
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
  }, [personId, loading, onSaveRef, execRef]);

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

        // ГЛАВНЫЙ ФИКС: Скрываем всё, что не является картинкой внутри такого параграфа
        "& .ProseMirror p:has(img) > *:not(img)": {
          display: "none !important",
        },

        // Дополнительно скрываем системные элементы ProseMirror
        "& img.ProseMirror-separator": {
          display: "none !important",
        },

        "& img": {
          display: "inline-block",
          width: "calc(33.33% - 12px)",
          minWidth: "220px", // Чуть увеличим для стабильности
          height: "250px",
          objectFit: "cover",
          borderRadius: "8px",
          cursor: "pointer",
          border: "1px solid #444",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          transition: "transform 0.2s, box-shadow 0.2s",

          "&:hover": {
            transform: "scale(1.05)",
            boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
            zIndex: 10,
          },
        },

        "& u": { textDecoration: "underline" },
        "& blockquote": { borderLeft: "4px solid #666", pl: 2, color: "#aaa" },
      }}
    >
      <Milkdown />
    </Box>
  );
};

export default function BiographySection({
  personId,
  activeElement,
  isEditing,
  setIsEditing,
  execRef,
  requestToggleRef,
  setActiveElement, // <--- ВАЖНО: прокиньте этот сеттер из PersonPage/MainLayout
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [bio, setBio] = useState(null);
  const [personDir, setPersonDir] = useState("");
  const [previewImg, setPreviewImg] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [sessionImages, setSessionImages] = useState([]);

  const saveRef = useRef(null);
  const [contextMenu, setContextMenu] = React.useState(null);

  const handleContextMenu = (event) => {
    // Находим, кликнули ли мы по таблице
    const table = event.target.closest("table");
    if (table && isEditing) {
      event.preventDefault();
      setContextMenu(
        contextMenu === null
          ? { mouseX: event.clientX + 2, mouseY: event.clientY - 6 }
          : null,
      );
    }
  };

  const handleCloseMenu = () => setContextMenu(null);

  // Очищаем список при входе в режим редактирования
  useEffect(() => {
    if (isEditing) setSessionImages([]);
  }, [isEditing]);

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
      };
    }
    return () => {
      if (requestToggleRef) requestToggleRef.current = null;
    };
  }, [isEditing, isDirty, setIsEditing, requestToggleRef]);

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

  const handleSaveAndExecute = async () => {
    const markdown = saveRef.current?.();
    if (typeof markdown === "string") {
      await window.bioAPI.save(personId, markdown);
      setIsDirty(false);
      setBio(markdown);
      setSessionImages([]); // Очищаем, так как файлы теперь "закреплены" в MD
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
      <GlobalStyles styles={(theme) => ({})} />
      <Box
        sx={{ display: "flex", height: "100%", bgcolor: "background.default" }}
      >
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            // Используем стандартный фон темы для подложки
            bgcolor: "background.default",
            py: { xs: 2, md: 4 },
            px: { xs: 2, md: 0 },
          }}
        >
          <Box
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

              transition: "transform 0.3s ease, background-color 0.3s ease",
              "&:hover": {
                transform: "translateY(-2px)", // Легкий эффект парения при наведении
              },
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
                    setIsDirty={setIsDirty}
                    onImageClick={setPreviewImg}
                  />
                </MilkdownProvider>

                <Menu
                  open={contextMenu !== null}
                  onClose={handleCloseMenu}
                  anchorReference="anchorPosition"
                  anchorPosition={
                    contextMenu !== null
                      ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                      : undefined
                  }
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
                    onClick={() => {
                      execRef.current?.addRowBefore();
                      handleCloseMenu();
                    }}
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
                    onClick={() => {
                      execRef.current?.addRow();
                      handleCloseMenu();
                    }}
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
                    onClick={() => {
                      execRef.current?.addColBefore();
                      handleCloseMenu();
                    }}
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
                    onClick={() => {
                      execRef.current?.addCol();
                      handleCloseMenu();
                    }}
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
                    onClick={() => {
                      execRef.current?.deleteRow();
                      handleCloseMenu();
                    }}
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
                    onClick={() => {
                      execRef.current?.deleteCol();
                      handleCloseMenu();
                    }}
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
                    onClick={() => {
                      execRef.current?.deleteTable();
                      handleCloseMenu();
                    }}
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
                    onClick={() => {
                      execRef.current?.alignLeft();
                      handleCloseMenu();
                    }}
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
                    onClick={() => {
                      execRef.current?.alignCenter();
                      handleCloseMenu();
                    }}
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
                    onClick={() => {
                      execRef.current?.alignRight();
                      handleCloseMenu();
                    }}
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
              </Box>
            )}
            <ButtonScrollTop />
          </Box>
        </Box>
      </Box>

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
              borderRadius: "20px",
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

          <Stack gap={1} flexDirection={"row"} sx={{ mt: 1 }}>
            {/* ДЕСТРУКТИВНАЯ КНОПКА (Secondary/Destructive) */}
            <Button
              variant="text"
              // fullWidth
              onClick={handleDiscardAndExecute}
              sx={{
                height: 24,
                borderRadius: "6px",
                py: 1.2,
                px: 2,
                mr: "auto",
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#FF453A" : "#FF3B30", // macOS Red
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.08), // Легкий тинт вместо рамки
                "&:hover": {
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.15),
                },
              }}
            >
              Удалить
            </Button>

            {/* ОТМЕНА (Cancel) */}
            <Button
              variant="text"
              // fullWidth
              onClick={() => setConfirmOpen(false)}
              sx={{
                height: 24,
                borderRadius: "6px",
                py: 1.2,
                px: 3.6,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                color: "text.primary",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.05)",
                "&:hover": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
                },
              }}
            >
              Отменить
            </Button>

            {/* ГЛАВНАЯ КНОПКА (Default Action) */}
            <Button
              variant="contained"
              // fullWidth
              onClick={handleSaveAndExecute}
              disableElevation
              sx={{
                height: 24,
                borderRadius: "6px", // Системный радиус macOS
                py: 1.2,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                bgcolor: "#007AFF", // Фирменный Blue
                "&:hover": {
                  bgcolor: "#0062CC",
                },
              }}
            >
              Сохранить
            </Button>
          </Stack>
        </Box>
      </Dialog>

      {/* Модалка превью картинки */}
      <Dialog
        open={Boolean(previewImg)}
        onClose={() => setPreviewImg(null)}
        maxWidth="xl"
        // Делаем сам фон Backdrop (затемнение вокруг) очень плотным
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
            overflow: "hidden", // Убираем скроллы у самой бумаги
          },
        }}
      >
        <Box
          onClick={() => setPreviewImg(null)}
          sx={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "zoom-out", // Показывает, что клик уменьшит/закроет
            p: { xs: 1, md: 2 },
          }}
        >
          {/* Кнопка закрытия — более современная и заметная */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImg(null);
            }}
            sx={{
              position: "fixed", // Фиксируем относительно экрана, чтобы не прыгала
              top: 20,
              right: 20,
              color: "white",
              bgcolor: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              zIndex: 10,
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.2)",
                transform: "rotate(90deg)", // Легкая анимация для красоты
              },
              transition: "all 0.3s ease",
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box
            component="img"
            src={previewImg}
            alt="Preview"
            sx={{
              maxWidth: "95vw",
              maxHeight: "95vh",
              objectFit: "contain",
              borderRadius: "12px", // Мягкие углы у самого фото
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", // Тень под фото для объема
              // Плавное появление картинки
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
