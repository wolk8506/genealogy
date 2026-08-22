import React from "react";
import {
  ListItemAvatar,
  ListItemText,
  Typography,
  Stack,
  Button,
  ListItemButton,
  useTheme,
  Paper,
  Chip,
  alpha,
  Box,
} from "@mui/material";
import PetsIcon from "@mui/icons-material/Pets";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import HomeIcon from "@mui/icons-material/Home";
import CakeIcon from "@mui/icons-material/Cake";
import { Link } from "react-router-dom";
import ExternalEntityAvatar from "../../components/ExternalEntityAvatar";
import {
  findExternalById,
  getExternalEntityLabel,
  getEntityTypeLabel,
  getRelationTypeLabel,
  findPersonById,
} from "../../utils/externalEntities";

export function ExternalEntityCard({
  entity,
  allPeople = [],
  allExternal = [],
  onDelete,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isPet = entity.type === "pet";

  const relationSummary = (entity.relations || [])
    .slice(0, 2)
    .map((rel) => {
      const person = findPersonById(allPeople, rel.mainPersonId);
      const external = findExternalById(allExternal, rel.mainExternalEntityId);
      const targetName =
        rel.targetKind === "external"
          ? external
            ? getExternalEntityLabel(external)
            : `ID ${rel.mainExternalEntityId}`
          : person
            ? [person.firstName, person.lastName].filter(Boolean).join(" ")
            : `ID ${rel.mainPersonId}`;
      return `${getRelationTypeLabel(rel.relationType)}: ${targetName}`;
    })
    .join(" · ");

  const contactItems = [
    entity.type !== "pet" && entity.phone && { icon: <PhoneIcon fontSize="small" />, value: entity.phone },
    entity.type !== "pet" && entity.email && { icon: <EmailIcon fontSize="small" />, value: entity.email },
    entity.type !== "pet" && entity.address && { icon: <HomeIcon fontSize="small" />, value: entity.address },
    entity.birthday && { icon: <CakeIcon fontSize="small" />, value: entity.birthday },
  ].filter(Boolean);

  return (
    <>
      <ListItemButton
        component={Link}
        to={`/external/${entity.id}`}
        sx={{
          p: 0,
          borderRadius: "16px",
          width: "100%",
          display: "flex",
          border: "1px solid",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          transition: "transform 0.2s, box-shadow 0.2s",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: isDark
              ? "0 12px 24px rgba(0,0,0,0.4)"
              : "0 8px 16px rgba(0,0,0,0.05)",
            borderColor: "primary.main",
          },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            width: "100%",
            display: "flex",
            alignItems: "stretch",
            p: 1.5,
            borderRadius: "16px",
            bgcolor: isDark ? "rgba(42, 42, 42, 0.6)" : "#fff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
            <ListItemAvatar sx={{ minWidth: 64, mr: 0 }}>
              <ExternalEntityAvatar
                entityId={entity.id}
                entity={entity}
                size={56}
                sx={{ border: "2px solid rgba(255,255,255,0.25)" }}
              />
            </ListItemAvatar>
          </Box>

          <ListItemText
            primaryTypographyProps={{ component: "div" }}
            secondaryTypographyProps={{ component: "div" }}
            primary={
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                {isPet ? (
                  <PetsIcon sx={{ fontSize: 18, color: "secondary.main" }} />
                ) : (
                  <PersonOutlineIcon sx={{ fontSize: 18, color: "primary.main" }} />
                )}
                <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
                  {entity.name || "Без имени"}
                </Typography>
                <Chip
                  size="small"
                  label={getEntityTypeLabel(entity.type)}
                  sx={{ height: 20, fontSize: "10px" }}
                />
              </Stack>
            }
            secondary={
              <Stack spacing={0.75} mt={0.75}>
                <Typography
                  variant="caption"
                  component="span"
                  sx={{
                    px: 0.8,
                    py: 0.2,
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    border: "1px solid",
                    borderColor: "divider",
                    display: "inline-block",
                    width: "fit-content",
                  }}
                >
                  {entity.id}
                </Typography>
                {relationSummary && (
                  <Typography variant="caption" color="text.secondary">
                    {relationSummary}
                    {(entity.relations?.length || 0) > 2
                      ? ` (+${entity.relations.length - 2})`
                      : ""}
                  </Typography>
                )}
                {contactItems.length > 0 && (
                  <Stack spacing={0.4}>
                    {contactItems.map((item) => (
                      <Stack key={`${entity.id}-${item.value}`} direction="row" alignItems="center" spacing={0.75}>
                        <Box sx={{ color: "text.secondary", display: "flex", alignItems: "center" }}>{item.icon}</Box>
                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                          {item.value}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Stack>
            }
            sx={{ flex: 1, minWidth: 0 }}
          />

          <Box
            sx={{ ml: "auto", zIndex: 10, alignSelf: "center" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Button
              size="small"
              color="error"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(entity.id);
              }}
              startIcon={<DeleteOutlineIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: "10px",
                fontWeight: 700,
                opacity: 0.5,
                "&:hover": {
                  opacity: 1,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                },
              }}
            >
              Удалить
            </Button>
          </Box>
        </Paper>
      </ListItemButton>

    </>
  );
}
