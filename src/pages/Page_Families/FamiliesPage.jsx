// pages/Page_Families/FamiliesPage.jsx
// Страница «Семьи»: каталог + детальный вид.
// Данные приходят из MainLayout (семьи вычисляются из people и нигде не хранятся).
// Поиск, сортировка и правая панель живут в хедере приложения.

import React, { useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Box } from "@mui/material";
import FamiliesCatalog from "./catalog/FamiliesCatalog";
import FamilyDetail from "./detail/FamilyDetail";
import {
  FamiliesError,
  FamiliesLoading,
  FamilyNotFound,
} from "./FamiliesStates";
import { familyPageSx } from "./familyTheme";
import { findFamily, resolveFamilyForPerson } from "../../utils/families/resolveFamily";
import { toId } from "../../utils/families/familyLabels";

const EMPTY_VIEW = {
  families: [],
  byPerson: new Map(),
  byId: new Map(),
  childrenOf: new Map(),
};

export default function FamiliesPage({
  view,
  loading = false,
  error = false,
  onRetry,
  selectedPersonId,
  onSelectPerson,
  onOpenFamily,
  search = "",
  sort = "date",
}) {
  const { familyKey } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState(null);

  const derived = view || EMPTY_VIEW;

  const family = useMemo(
    () => (familyKey ? findFamily(derived.families, familyKey) : null),
    [derived, familyKey],
  );

  const personId = toId(searchParams.get("person"));

  // ?person= на каталоге — сразу открыть его союз.
  const personFamily = useMemo(() => {
    if (!personId || familyKey) return null;
    return resolveFamilyForPerson(derived.families, derived.byPerson, personId);
  }, [personId, familyKey, derived]);

  useEffect(() => {
    if (loading || familyKey || !personId) return;

    if (personFamily) {
      navigate(`/families/${personFamily.key}?person=${personId}`, {
        replace: true,
      });
      return;
    }

    // Человек есть, но союза нет — показываем каталог и мягко объясняем.
    if (derived.byId.has(personId)) {
      setNotice(
        "У этого человека пока нет семьи: не указаны супруги и общие дети.",
      );
    }

    const next = new URLSearchParams(searchParams);
    next.delete("person");
    setSearchParams(next, { replace: true });
  }, [
    loading,
    familyKey,
    personId,
    personFamily,
    derived,
    navigate,
    searchParams,
    setSearchParams,
  ]);

  let content;

  if (loading) {
    content = <FamiliesLoading />;
  } else if (error) {
    content = <FamiliesError onRetry={onRetry} />;
  } else if (familyKey && !family) {
    content = <FamilyNotFound onBack={() => navigate("/families")} />;
  } else if (family) {
    content = (
      <FamilyDetail
        family={family}
        byId={derived.byId}
        byPerson={derived.byPerson}
        selectedPersonId={selectedPersonId}
        onSelectPerson={onSelectPerson}
        onBack={() => navigate("/families")}
      />
    );
  } else if (personFamily) {
    // Кадр до редиректа: не мигаем каталогом.
    content = <FamiliesLoading />;
  } else {
    content = (
      <FamiliesCatalog
        families={derived.families}
        search={search}
        sort={sort}
        notice={notice}
        onDismissNotice={() => setNotice(null)}
        onOpenFamily={onOpenFamily}
        onGoPeople={() => navigate("/")}
      />
    );
  }

  return (
    <Box
      sx={[
        familyPageSx,
        {
          p: { xs: 1.5, md: 1 },
          minHeight: "calc(100vh - 50px)",
          boxSizing: "border-box",
        },
      ]}
    >
      {content}
    </Box>
  );
}
