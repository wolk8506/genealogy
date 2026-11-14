// pages/Page_GenealogyTree/GenealogyTreePage.jsx
// Страница «Генеалогическое дерево»: модель, раскладка и состояние из URL.

import React, { useMemo } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import GenealogyTreeCanvas from "./GenealogyTreeCanvas";
import { DEFAULT_TREE_MODE } from "./treeModes";
import {
  buildFamilyGraph,
  buildTreeLayout,
  collectPathIds,
} from "./treeModel";

export default function GenealogyTreePage({
  allPeople,
  loading,
  error,
  onRetry,
  mode = DEFAULT_TREE_MODE,
  personId,
  rootPersonId,
  onSelectPerson,
  onChooseRoot,
}) {
  const graph = useMemo(() => buildFamilyGraph(allPeople || []), [allPeople]);

  const layout = useMemo(
    () => buildTreeLayout(graph, rootPersonId, mode),
    [graph, rootPersonId, mode],
  );

  const highlightIds = useMemo(
    () => collectPathIds(graph, personId),
    [graph, personId],
  );

  if (loading) {
    return (
      <Box
        sx={{
          height: "calc(100vh - 50px)",
          width: "100%",
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error || !layout) {
    return (
      <Box
        sx={{
          height: "calc(100vh - 50px)",
          width: "100%",
          display: "grid",
          placeItems: "center",
          px: 3,
        }}
      >
        <Stack
          spacing={1.5}
          sx={{
            alignItems: "center",
            maxWidth: 380
          }}>
          <AccountTreeIcon sx={{ fontSize: 48, color: "text.disabled" }} />
          <Typography sx={{ fontWeight: 700, textAlign: "center" }}>
            {error ? "Не удалось загрузить данные" : "Нет данных для дерева"}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              textAlign: "center"
            }}>
            {error
              ? "Проверьте хранилище и попробуйте ещё раз."
              : "Добавьте людей и связи между ними — дерево построится автоматически."}
          </Typography>
          {error && onRetry && (
            <Button variant="outlined" size="small" onClick={onRetry}>
              Повторить
            </Button>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "calc(100vh - 50px)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <GenealogyTreeCanvas
        layout={layout}
        mode={mode}
        selectedPersonId={personId}
        rootPersonId={rootPersonId}
        highlightIds={highlightIds}
        onSelectPerson={onSelectPerson}
        onChooseRoot={onChooseRoot}
      />
    </Box>
  );
}
