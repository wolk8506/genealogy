import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Typography, Button, Stack, Divider, Box } from "@mui/material";
import PersonAvatar from "./PersonAvatar";
import PhotoGallery from "./PhotoGallery";
import BiographySection from "./BiographySection";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import AvatarEditorDialog from "./AvatarEditorDialog";
import PersonEditDialog from "./PersonEditDialog";
import FamilyTree from "./FamilyTree";
import { buildDescendantTree } from "./utils/buildDescendantTree";
import { buildAncestorTree } from "./utils/buildAncestorTree";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import * as htmlToImage from "html-to-image";
import { useSnackbar } from "notistack";
import CreateIcon from "@mui/icons-material/Create";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

export default function PersonPage() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [allPeople, setAllPeople] = useState([]);
  // const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshPhotos, setRefreshPhotos] = useState(0);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [treeMode, setTreeMode] = useState("descendants");
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    const numericId = parseInt(id, 10);

    Promise.all([
      window.peopleAPI.getById(numericId),
      window.peopleAPI.getAll(),
    ]).then(([personData, people]) => {
      setPerson(personData);
      setAllPeople(people || []);
    });
  }, [id]);

  if (!person) return <Typography>Человек не найден</Typography>;

  const initials = (person.firstName?.[0] || "") + (person.lastName?.[0] || "");

  const findById = (id) => allPeople.find((p) => p.id === id);

  const children = person.children?.map(findById).filter(Boolean);
  const spouses = allPeople.filter((p) => (p.spouse || []).includes(person.id));
  const father = person.father ? findById(person.father) : null;
  const mother = person.mother ? findById(person.mother) : null;
  const siblings = person.siblings?.map(findById).filter(Boolean);

  const renderPersonItem = (p) => {
    const name =
      [p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") ||
      "Без имени";
    const initials =
      (p.firstName?.[0] || "") +
      (p.lastName?.[0] || (p.maidenName?.[0] ? p.maidenName?.[1] : ""));

    return (
      <Box
        key={p.id}
        onClick={() => navigate(`/person/${p.id}`)}
        sx={{
          cursor: "pointer",
          border: "1px solid",
          borderColor: theme.palette.divider,
          borderRadius: 2,
          p: 1,
          width: "100%",
          transition: "background-color 0.2s",
          "&:hover": {
            backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
          },
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <PersonAvatar personId={p.id} initials={initials} size={40} />
          <Stack>
            <Typography variant="subtitle1">{name}</Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {p.id}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    );
  };

  // ------------------------

  const renderSection = (title, people) => {
    if (!people || people.length === 0) return null;

    return (
      <>
        <Divider />
        <Typography variant="h6">{title}</Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 2,
          }}
        >
          {people.map(renderPersonItem)}
        </Box>
      </>
    );
  };

  // ------------------------

  const handleSave = async () => {
    const updated = await window.peopleAPI.getById(person.id);
    setPerson(updated);
  };

  const handleExport = async () => {
    const treeElement = document.getElementById("tree-wrapper");
    if (!treeElement) return;

    enqueueSnackbar("📸 Экспорт в PNG начался...", { variant: "info" });

    try {
      const blob = await htmlToImage.toBlob(treeElement);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "family-tree.png";
      link.click();
      URL.revokeObjectURL(url);

      enqueueSnackbar("Изображение готово для сохранения ✅", {
        variant: "success",
      });
    } catch (err) {
      console.error("Ошибка при экспорте дерева:", err);
      enqueueSnackbar("Ошибка при экспорте дерева 😞", { variant: "error" });
    }
  };

  return (
    <Stack spacing={2}>
      <Button component={RouterLink} to={-1} size="small">
        ← Назад
      </Button>

      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          onClick={() => setAvatarEditorOpen(true)}
          sx={{ cursor: "pointer" }}
        >
          <PersonAvatar
            personId={person.id}
            initials={initials}
            size={160}
            refresh={refreshPhotos} // 👈 передаём сюда
          />
        </Box>
        <AvatarEditorDialog
          open={avatarEditorOpen}
          onClose={() => setAvatarEditorOpen(false)}
          personId={person.id}
          onSaved={() => setRefreshPhotos((r) => r + 1)} // 👈 триггерим обновление
        />

        <Stack spacing={0.5}>
          <Typography variant="h5">
            {[person.firstName, person.lastName].filter(Boolean).join(" ") ||
              "Без имени"}
          </Typography>
          {person.maidenName && (
            <Typography variant="body2" color="text.secondary">
              Девичья фамилия: {person.maidenName}
            </Typography>
          )}
          {(person.birthday || person.died) && (
            <Typography variant="body2" color="text.secondary">
              {person.birthday ? `📅 ${person.birthday}` : ""}
              {person.died ? ` – ✝ ${person.died}` : ""}
            </Typography>
          )}
          <Typography variant="caption" color="text.disabled">
            ID: {person.id}
          </Typography>
          <Button
            onClick={() => setEditOpen(true)}
            variant="outlined"
            size="small"
          >
            <CreateIcon sx={{ marginRight: 1 }} /> Редактировать
          </Button>

          <PersonEditDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            person={person}
            allPeople={allPeople}
            onSave={handleSave}
          />
        </Stack>
      </Stack>

      <Divider />
      {renderSection("Родители", [father, mother].filter(Boolean))}
      {renderSection(person.gender === "male" ? "Супруга" : "Супруг", spouses)}
      {renderSection("Братья и сёстры", siblings)}
      {renderSection("Дети", children)}

      <Divider />

      <BiographySection personId={person.id} />

      <Divider />

      <PhotoGallery
        personId={person.id}
        allPeople={allPeople}
        // refresh={refreshPhotos}
      />

      <Divider />

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">Семейное древо</Typography>

        <Box display="flex" gap={1}>
          <ToggleButtonGroup
            value={treeMode}
            exclusive
            onChange={(e, val) => val && setTreeMode(val)}
            size="small"
          >
            <ToggleButton value="descendants">Потомки</ToggleButton>
            <ToggleButton value="ancestors">Предки</ToggleButton>
          </ToggleButtonGroup>

          <Button onClick={handleExport} variant="outlined" size="small">
            <PhotoCameraIcon sx={{ marginRight: 1 }} />в PNG
          </Button>
        </Box>
      </Box>

      <FamilyTree
        mode={treeMode}
        data={
          treeMode === "descendants"
            ? buildDescendantTree(person.id, allPeople)
            : buildAncestorTree(person.id, allPeople)
        }
      />
    </Stack>
  );
}
