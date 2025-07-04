import React, { useEffect, useState } from "react";
import {
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  CircularProgress,
  TextField,
  Stack,
  Divider,
  Button,
  ListItemButton,
} from "@mui/material";
import { Link } from "react-router-dom";

function PersonAvatar({ foto, initials }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (foto) {
      window.avatarAPI.getPath(foto).then(setSrc);
    }
  }, [foto]);

  return (
    <Avatar src={src || undefined}>
      {!src && initials?.slice(0, 2).toUpperCase()}
    </Avatar>
  );
}

export default function PeopleListPage() {
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    window.peopleAPI.getAll().then((data) => {
      setPeople(data || []);
    });
  }, []);

  if (!people.length) return <CircularProgress />;

  const filtered = people
    .filter((p) => !p.archived)
    .filter((p) => {
      const fullName = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase();
      return (
        fullName.includes(search.toLowerCase()) || String(p.id).includes(search)
      );
    });

  const grouped = filtered.reduce((acc, person) => {
    const gen = person.generation ?? "Без поколения";
    if (!acc[gen]) acc[gen] = [];
    acc[gen].push(person);
    return acc;
  }, {});

  const sortedGenerations = Object.keys(grouped).sort((a, b) => a - b);

  const handleArchive = async (id) => {
    await window.peopleAPI.update(id, { archived: true });
    const updated = await window.peopleAPI.getAll();
    setPeople(updated);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Список людей</Typography>
      <TextField
        label="Поиск по имени или ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {sortedGenerations.map((gen) => (
        <div key={gen}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Поколение {gen}</Typography>
          <List dense>
            {grouped[gen].map((person) => {
              const fullName = [person.firstName, person.lastName]
                .filter(Boolean)
                .join(" ");
              const initials =
                (person.firstName?.[0] || "") + (person.lastName?.[0] || "");

              return (
                <ListItem
                  key={person.id}
                  disablePadding
                  sx={{
                    borderRadius: "15px",
                    mx: 1, // горизонтальные отступы
                    my: 0.5, // вертикальные отступы
                  }}
                >
                  <ListItemButton
                    component={Link}
                    to={`/person/${person.id}`}
                    sx={{
                      borderRadius: "15px",
                      // mx: 1, // горизонтальные отступы
                      // my: 0.5, // вертикальные отступы
                    }}
                  >
                    <ListItemAvatar>
                      <PersonAvatar foto={person.id} initials={initials} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={fullName || "Без имени"}
                      secondary={`ID: ${person.id}`}
                      primaryTypographyProps={{ color: "text.primary" }}
                    />
                  </ListItemButton>

                  <Button
                    size="small"
                    color="warning"
                    onClick={(e) => {
                      e.stopPropagation(); // теперь точно работает
                      handleArchive(person.id);
                    }}
                    sx={{ ml: 1 }}
                  >
                    Архивировать
                  </Button>
                </ListItem>
              );
            })}
          </List>
        </div>
      ))}
    </Stack>
  );
}
