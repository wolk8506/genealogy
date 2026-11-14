// pages/Page_GenealogyTree/treeModes.js
// Значения режимов дерева. Хранятся в URL (?mode=…).

export const TREE_MODE_VALUES = [
  "ancestors",
  "descendants",
  "full",
  "radial",
  "fan",
];

export const DEFAULT_TREE_MODE = "ancestors";

export const normalizeTreeMode = (value) =>
  TREE_MODE_VALUES.includes(value) ? value : DEFAULT_TREE_MODE;
