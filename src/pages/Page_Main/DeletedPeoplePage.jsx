import React, { useEffect, useState } from "react";
import {
  Stack,
  Typography,
  CircularProgress,
  Box,
  Grid,
  Tabs,
  Tab,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TrashFillIcon from "../../components/svg/TrashFillIcon";
import { PersonCard } from "./PersonCard";
import { ExternalEntityCard } from "../Page_External/ExternalEntityCard";
import { useNotificationStore } from "../../store/useNotificationStore";
import { usePeopleListStore } from "../../store/usePeopleListStore";
import { getExternalEntityLabel } from "../../utils/externalEntities";

export default function DeletedPeoplePage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "external" ? "external" : "people";

  const refreshArchiveStatus = usePeopleListStore(
    (state) => state.refreshArchiveStatus,
  );
  const [archivedPeople, setArchivedPeople] = useState([]);
  const [archivedExternal, setArchivedExternal] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [allExternal, setAllExternal] = useState([]);
  const [loading, setLoading] = useState(true);
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const loadData = async () => {
    setLoading(true);
    const [people, external] = await Promise.all([
      window.peopleAPI.getAll(),
      window.externalAPI.getAll(),
    ]);
    setAllPeople(people || []);
    setAllExternal(external || []);
    setArchivedPeople((people || []).filter((p) => p.archived));
    setArchivedExternal((external || []).filter((e) => e.archived));
    await refreshArchiveStatus();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (_, value) => {
    setSearchParams(value === "external" ? { tab: "external" } : {});
  };

  const handleRestorePerson = async (id) => {
    await window.peopleAPI.update(id, {
      archived: false,
      editedAt: new Date().toISOString(),
    });

    const restoredPerson = archivedPeople.find((p) => p.id === id);
    setArchivedPeople((prev) => prev.filter((p) => p.id !== id));
    await refreshArchiveStatus();

    const name =
      [restoredPerson?.firstName, restoredPerson?.lastName]
        .filter(Boolean)
        .join(" ") || `ID ${id}`;

    addNotification({
      timestamp: new Date().toISOString(),
      title: "Восстановление",
      message: `${name} успешно восстановлен в основное древо`,
      type: "success",
      category: "trash",
    });
  };

  const handleDeletePersonForever = async (id) => {
    if (!window.confirm("Удалить человека навсегда? Это действие необратимо."))
      return;

    const now = new Date().toISOString();
    let all = await window.peopleAPI.getAll();
    const person = all.find((p) => p.id === id);
    if (!person) return;

    if (person.father) {
      const father = all.find((p) => p.id === person.father);
      if (father) {
        father.children = (father.children || []).filter((cid) => cid !== id);
        father.editedAt = now;
      }
    }
    if (person.mother) {
      const mother = all.find((p) => p.id === person.mother);
      if (mother) {
        mother.children = (mother.children || []).filter((cid) => cid !== id);
        mother.editedAt = now;
      }
    }
    (person.children || []).forEach((cid) => {
      const child = all.find((p) => p.id === cid);
      if (child) {
        if (child.father === id) child.father = null;
        if (child.mother === id) child.mother = null;
        child.editedAt = now;
      }
    });
    (person.spouse || []).forEach((sid) => {
      const sp = all.find((p) => p.id === sid);
      if (sp) {
        sp.spouse = (sp.spouse || []).filter((s) => s !== id);
        sp.editedAt = now;
      }
    });
    (person.siblings || []).forEach((sid) => {
      const sib = all.find((p) => p.id === sid);
      if (sib) {
        sib.siblings = (sib.siblings || []).filter((s) => s !== id);
        sib.editedAt = now;
      }
    });

    await window.peopleAPI.saveAll(all);
    await window.peopleAPI.delete(id);

    setArchivedPeople((prev) => prev.filter((p) => p.id !== id));
    await refreshArchiveStatus();

    addNotification({
      timestamp: new Date().toISOString(),
      title: "Полное удаление",
      message: `Запись полностью удалена из базы`,
      type: "error",
      category: "trash",
    });
  };

  const handleRestoreExternal = async (id) => {
    await window.externalAPI.update(id, {
      archived: false,
      editedAt: new Date().toISOString(),
    });

    const restored = archivedExternal.find((e) => e.id === id);
    setArchivedExternal((prev) => prev.filter((e) => e.id !== id));
    await refreshArchiveStatus();

    addNotification({
      timestamp: new Date().toISOString(),
      title: "Восстановление",
      message: `«${getExternalEntityLabel(restored) || id}» возвращена в справочник`,
      type: "success",
      category: "trash",
      link: `/external?selected=${encodeURIComponent(id)}`,
    });
  };

  const handleDeleteExternalForever = async (id) => {
    if (
      !window.confirm(
        "Удалить запись справочника навсегда? Это действие необратимо.",
      )
    ) {
      return;
    }

    await window.externalAPI.delete(id);
    setArchivedExternal((prev) => prev.filter((e) => e.id !== id));
    await refreshArchiveStatus();

    addNotification({
      timestamp: new Date().toISOString(),
      title: "Полное удаление",
      message: "Запись справочника полностью удалена",
      type: "error",
      category: "trash",
    });
  };

  const totalCount = archivedPeople.length + archivedExternal.length;

  if (loading) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ height: "60vh" }}
      >
        <CircularProgress />
      </Stack>
    );
  }

  if (totalCount === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 10,
          px: 3,
          borderRadius: 4,
          bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.02),
          border: "2px dashed",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            p: 2,
            borderRadius: "50%",
            bgcolor: alpha(theme.palette.success.main, 0.1),
            mb: 2,
          }}
        >
          <TrashFillIcon
            sx={{
              fontSize: 50,
              width: "100px",
              height: "92px",
              color: "success.main",
              opacity: 0.5,
            }}
          />
        </Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: "text.secondary" }}
        >
          Корзина пуста
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.disabled",
            mt: 1,
            textAlign: "center",
            maxWidth: 360,
          }}
        >
          Здесь временно хранятся люди и записи справочника, которые вы
          переместили из основных списков.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography
        variant="h5"
        sx={{ mb: 2, fontWeight: 800, color: "error.main" }}
      >
        Корзина ({totalCount})
      </Typography>

      <Tabs
        value={tab}
        onChange={handleTabChange}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="people" label={`Люди (${archivedPeople.length})`} />
        <Tab
          value="external"
          label={`Справочник (${archivedExternal.length})`}
        />
      </Tabs>

      {tab === "people" && (
        <>
          {archivedPeople.length === 0 ? (
            <EmptyTabMessage text="В корзине нет удалённых людей." />
          ) : (
            <Grid container spacing={2} direction="column">
              {archivedPeople.map((person) => (
                <Grid key={person.id} size={{ xs: 12 }}>
                  <PersonCard
                    person={person}
                    isArchived
                    onRestore={handleRestorePerson}
                    onDeleteForever={handleDeletePersonForever}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {tab === "external" && (
        <>
          {archivedExternal.length === 0 ? (
            <EmptyTabMessage text="В корзине нет записей справочника." />
          ) : (
            <Grid container spacing={2} direction="column">
              {archivedExternal.map((entity) => (
                <Grid key={entity.id} size={{ xs: 12 }}>
                  <ExternalEntityCard
                    entity={entity}
                    allPeople={allPeople}
                    allExternal={allExternal}
                    isArchived
                    onRestore={handleRestoreExternal}
                    onDeleteForever={handleDeleteExternalForever}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}

function EmptyTabMessage({ text }) {
  return (
    <Box
      sx={{
        py: 6,
        textAlign: "center",
        color: "text.secondary",
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 3,
      }}
    >
      <DeleteOutlineIcon sx={{ fontSize: 40, opacity: 0.35, mb: 1 }} />
      <Typography variant="body2">{text}</Typography>
    </Box>
  );
}
