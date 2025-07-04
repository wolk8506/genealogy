import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  Button,
  Stack,
  ListItemButton,
} from "@mui/material";
import { useEffect, useState } from "react";
import PersonAvatar from "./PersonAvatar";

export default function ArchivedPeoplePage() {
  const [archived, setArchived] = useState([]);

  useEffect(() => {
    window.peopleAPI.getAll().then((data) => {
      setArchived(data.filter((p) => p.archived));
    });
  }, []);

  const handleRestore = async (id) => {
    await window.peopleAPI.update(id, { archived: false });
    const updated = await window.peopleAPI.getAll();
    setArchived(updated.filter((p) => p.archived));
  };

  const handleDelete = async (id) => {
    await window.peopleAPI.delete(id);
    const updated = await window.peopleAPI.getAll();
    setArchived(updated.filter((p) => p.archived));
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Архив</Typography>
      <List dense>
        {archived.map((person) => {
          const fullName = [person.firstName, person.lastName]
            .filter(Boolean)
            .join(" ");
          const initials =
            (person.firstName?.[0] || "") + (person.lastName?.[0] || "");

          return (
            <ListItem
              key={person.id}
              sx={{
                borderRadius: "15px",
                mx: 1, // горизонтальные отступы
                my: 0.5, // вертикальные отступы
              }}
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    color="success"
                    onClick={() => handleRestore(person.id)}
                  >
                    Восстановить
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleDelete(person.id)}
                  >
                    Удалить навсегда
                  </Button>
                </Stack>
              }
            >
              <ListItemAvatar>
                <PersonAvatar foto={person.id} initials={initials} size={40} />
              </ListItemAvatar>
              <ListItemText
                primary={fullName || "Без имени"}
                secondary={`ID: ${person.id}`}
              />
            </ListItem>
          );
        })}
      </List>
    </Stack>
  );
}
