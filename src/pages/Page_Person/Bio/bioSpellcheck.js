import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const REFRESH_META = "bio-spell-refresh";
const MAX_WORDS = 4000;
const CHECK_DELAY = 500;

export const bioSpellPluginKey = new PluginKey("bio-spellcheck");

const WORD_SOURCE = "[\\p{L}]+(?:['’ʼ-][\\p{L}]+)*";
const WORD_RE = new RegExp(WORD_SOURCE, "gu");

// Слова в URL, почте и путях не проверяем: режем текст на токены
// по пробелам и пропускаем технические строки целиком.
function isTechnicalToken(token) {
  return (
    token.includes("://") ||
    token.includes("@") ||
    token.includes("/") ||
    token.includes("\\") ||
    /^www\./i.test(token)
  );
}

function isSkippedNode(node) {
  return node.marks.some((mark) => mark.type.name === "inlineCode");
}

function forEachWord(doc, callback) {
  doc.descendants((node, pos, parent) => {
    if (!node.isText || !node.text) return;
    if (parent?.type?.name === "code_block") return;
    if (isSkippedNode(node)) return;

    const text = node.text;
    for (const token of text.matchAll(/\S+/g)) {
      const value = token[0];
      if (!value || isTechnicalToken(value)) continue;
      for (const match of value.matchAll(WORD_RE)) {
        const word = match[0];
        if (word.length < 2) continue;
        const from = pos + token.index + match.index;
        callback(word, from, from + word.length);
      }
    }
  });
}

function collectWords(doc) {
  const words = new Set();
  forEachWord(doc, (word) => {
    if (words.size < MAX_WORDS && shouldCheckWord(word)) {
      words.add(word.toLowerCase());
    }
  });
  return [...words];
}

function isCapitalized(word) {
  const first = word[0];
  if (!first) return false;
  return first !== first.toLocaleLowerCase() && first === first.toLocaleUpperCase();
}

// В биографии много имён, фамилий, топонимов и аббревиатур, которых нет
// в словаре. Слова с заглавной буквы не проверяем: иначе подчёркнутым
// оказывается почти каждое имя. Опечатки в обычных словах ловятся.
function shouldCheckWord(word) {
  return word.length > 1 && !isCapitalized(word);
}

export function createBioSpellController({ isEditing }) {
  let view = null;
  let enabled = false;
  let activeCode = null;
  let misspelled = new Set();
  let cache = new Map();
  let timer = null;
  let settingsGeneration = 0;
  let disposed = false;
  let unsubscribe = null;

  const refreshDecorations = () => {
    if (!view || view.isDestroyed) return;
    view.dispatch(view.state.tr.setMeta(REFRESH_META, true));
  };

  const schedule = (delay = CHECK_DELAY) => {
    if (!enabled || !isEditing()) return;
    clearTimeout(timer);
    timer = setTimeout(runCheck, delay);
  };

  async function runCheck() {
    if (!view || !enabled || !isEditing()) return;
    const generation = settingsGeneration;
    const words = collectWords(view.state.doc);
    const unknown = words.filter((word) => !cache.has(word));

    if (unknown.length) {
      try {
        const result = await window.spellcheckAPI?.check(unknown);
        if (generation !== settingsGeneration || disposed) return;
        if (result?.ready === false) return;
        const wrong = new Set(
          (result?.misspelled || []).map((word) => word.toLowerCase()),
        );
        for (const word of unknown) cache.set(word, !wrong.has(word));
      } catch {
        return;
      }
    }

    if (generation !== settingsGeneration || disposed) return;
    misspelled = new Set(words.filter((word) => cache.get(word) === false));
    refreshDecorations();
  }

  async function reloadSettings() {
    if (disposed) return;
    const generation = ++settingsGeneration;
    try {
      const state = await window.spellcheckAPI?.getState?.();
      if (generation !== settingsGeneration || disposed) return;
      const nextEnabled = Boolean(state?.enabled && state?.installed);
      const nextCode = state?.active || null;
      if (nextEnabled !== enabled || nextCode !== activeCode) {
        enabled = nextEnabled;
        activeCode = nextCode;
        cache = new Map();
        misspelled = new Set();
        refreshDecorations();
      }
      if (enabled) schedule(0);
    } catch {
      enabled = false;
      misspelled = new Set();
      refreshDecorations();
    }
  }

  const controller = {
    attach(nextView) {
      view = nextView;
      unsubscribe = window.spellcheckAPI?.onChange?.(() => {
        void reloadSettings();
      });
      void reloadSettings();
    },

    detach() {
      disposed = true;
      clearTimeout(timer);
      unsubscribe?.();
      unsubscribe = null;
      view = null;
    },

    schedule,

    buildDecorations(doc) {
      if (!enabled || !misspelled.size) return DecorationSet.empty;
      const decorations = [];
      forEachWord(doc, (word, from, to) => {
        if (shouldCheckWord(word) && misspelled.has(word.toLowerCase())) {
          decorations.push(
            Decoration.inline(from, to, { class: "bio-spell-error" }),
          );
        }
      });
      return DecorationSet.create(doc, decorations);
    },

    getWordAtCoords(left, top) {
      if (!view || !enabled || !isEditing()) return null;
      const range = document.caretRangeFromPoint?.(left, top);
      const node = range?.startContainer;
      if (!node || node.nodeType !== Node.TEXT_NODE) return null;
      if (!view.dom.contains(node)) return null;
      if (node.parentElement?.closest("code")) return null;
      if (node.parentElement?.closest(".ProseMirror") === null) return null;

      const text = node.nodeValue || "";
      const offset = Math.min(range.startOffset, text.length);
      for (const match of text.matchAll(WORD_RE)) {
        const start = match.index;
        const end = start + match[0].length;
        if (offset < start || offset > end) continue;
        const word = match[0];
        if (!shouldCheckWord(word) || !misspelled.has(word.toLowerCase())) {
          return null;
        }
        const from = view.posAtDOM(node, start);
        return { word, from, to: from + word.length };
      }
      return null;
    },

    replaceWord(from, to, word) {
      if (!view) return;
      view.dispatch(view.state.tr.insertText(word, from, to));
      view.focus();
    },

    async addWord(word) {
      const normalized = String(word || "").trim();
      if (!normalized) return;
      try {
        await window.spellcheckAPI?.addWord?.(normalized);
      } catch {
        return;
      }
      cache.set(normalized.toLowerCase(), true);
      misspelled.delete(normalized.toLowerCase());
      refreshDecorations();
    },
  };

  return controller;
}

export function createBioSpellPlugin(controller) {
  return new Plugin({
    key: bioSpellPluginKey,
    state: {
      init: () => DecorationSet.empty,
      apply(transaction, previous, _oldState, newState) {
        if (transaction.getMeta(REFRESH_META)) {
          return controller.buildDecorations(newState.doc);
        }
        return previous.map(transaction.mapping, transaction.doc);
      },
    },
    props: {
      decorations(state) {
        return bioSpellPluginKey.getState(state);
      },
    },
    view(editorView) {
      controller.attach(editorView);
      return {
        update(nextView, previousState) {
          if (nextView.state.doc !== previousState.doc) controller.schedule();
        },
        destroy() {
          controller.detach();
        },
      };
    },
  });
}
