// pages/Page_Families/panel/FamilySummary.jsx
// Режим «Семья» в правой панели: союз, участники и дети.
// Стилистика — как у вкладки «Связи» на главной.

import React from "react";
import { Box, Chip, IconButton, Stack, Typography, useTheme } from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ChildCareRoundedIcon from "@mui/icons-material/ChildCareRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import PersonAvatar from "../../../components/PersonAvatar";
import {
  groupSx,
  RowDivider,
  RowIcon,
  SettingsRow,
  sectionLabelSx,
} from "../../Page_Settings/settingsUi";
import { toneColor } from "../familyTheme";
import {
  formatYears,
  personInitials,
  personName,
  toId,
  unionMetaLine,
  unionStatusMeta,
  unionTitle,
} from "../../../utils/families/familyLabels";
import { resolveFamilyForPerson } from "../../../utils/families/resolveFamily";

function Section({ title, children }) {
  return (
    <Box>
      <Typography sx={sectionLabelSx}>{title}</Typography>
      <Box sx={groupSx}>
        <Stack divider={<RowDivider />}>{children}</Stack>
      </Box>
    </Box>
  );
}

function PersonRow({ person, onClick, trailing }) {
  return (
    <SettingsRow
      icon={
        <PersonAvatar
          personId={person.id}
          initials={personInitials(person)}
          size={32}
        />
      }
      title={personName(person)}
      subtitle={formatYears(person) || undefined}
      onClick={onClick ? () => onClick(toId(person.id)) : undefined}
      trailing={
        trailing || (
          <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
        )
      }
    />
  );
}

/** Кнопка перехода к собственной семье ребёнка. */
function ChildFamilyButton({ family, onOpenFamily }) {
  return (
    <IconButton
      size="small"
      title="Открыть семью"
      aria-label="Открыть семью"
      onClick={(event) => {
        event.stopPropagation();
        onOpenFamily?.(family.key);
      }}
      sx={{ color: "text.secondary", p: 0.5 }}
    >
      <AccountTreeRoundedIcon sx={{ fontSize: 16 }} />
    </IconButton>
  );
}

export default function FamilySummary({
  family,
  families = [],
  byPerson,
  onSelectPerson,
  onOpenFamily,
}) {
  const theme = useTheme();
  const meta = unionStatusMeta(family.status);
  const color = meta ? toneColor(theme, meta.tone) : theme.palette.text.secondary;
  const outside = family.outsideChildren || [];
  const childTitle = family.children.length === 1 ? "Ребёнок" : "Дети";

  const familyForChild = (childId) =>
    resolveFamilyForPerson(families, byPerson, childId);

  const childTrailing = (child) => {
    const childFamily = familyForChild(child.id);
    const canOpen = childFamily && childFamily.key !== family.key;

    return (
      <Stack direction="row" spacing={0.25} alignItems="center">
        {canOpen && (
          <ChildFamilyButton
            family={childFamily}
            onOpenFamily={(key) => onOpenFamily?.(key, toId(child.id))}
          />
        )}
        <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
      </Stack>
    );
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        sx={{ px: 0.25, pt: 0.25 }}
      >
        <RowIcon bg="indigo">
          <FavoriteRoundedIcon sx={{ fontSize: 18 }} />
        </RowIcon>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: "-0.015em",
            }}
          >
            {unionTitle(family)}
          </Typography>
          <Typography
            noWrap
            sx={{ fontSize: 11.5, color: "text.secondary", lineHeight: 1.4 }}
          >
            {unionMetaLine(family, { withChildren: false }) ||
              "дата и место не указаны"}
          </Typography>
        </Box>
      </Stack>

      {(meta || family.isSingle) && (
        <Box sx={{ mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {meta && (
            <Chip
              size="small"
              label={meta.label}
              sx={{
                height: 19,
                fontSize: "0.66rem",
                fontWeight: 600,
                color,
                backgroundColor: `${color}1F`,
                "& .MuiChip-label": { px: 0.8 },
              }}
            />
          )}
          {family.isSingle && (
            <Chip
              size="small"
              label="неполная"
              sx={{
                height: 19,
                fontSize: "0.66rem",
                "& .MuiChip-label": { px: 0.8 },
              }}
            />
          )}
        </Box>
      )}

      <Stack spacing={2} sx={{ mt: 2 }}>
        <Section title={family.isSingle ? "Родитель" : "Супруги"}>
          {family.partners.map((partner) => (
            <PersonRow
              key={partner.id}
              person={partner}
              onClick={onSelectPerson}
            />
          ))}
        </Section>

        {family.children.length > 0 && (
          <Section title={childTitle}>
            {family.children.map((child) => (
              <PersonRow
                key={child.id}
                person={child}
                onClick={onSelectPerson}
                trailing={childTrailing(child)}
              />
            ))}
          </Section>
        )}

        {outside.length > 0 && (
          <Section title="Дети вне союза">
            {outside.map(({ person }) => (
              <PersonRow
                key={person.id}
                person={person}
                onClick={onSelectPerson}
                trailing={childTrailing(person)}
              />
            ))}
          </Section>
        )}

        {family.unionEvents.length > 0 && (
          <Section title="События союза">
            {family.unionEvents.map((event, index) => (
              <SettingsRow
                key={`${event.type}-${index}`}
                icon={
                  <RowIcon bg="orange">
                    <EventRoundedIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title={event.type}
                subtitle={
                  [event.date, event.place].filter(Boolean).join(" · ") ||
                  "дата не указана"
                }
              />
            ))}
          </Section>
        )}
      </Stack>

      <Box sx={{ mt: 2, px: 0.5 }}>
        <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
          Союз собирается автоматически из связей и событий людей. Отдельного
          редактора семьи нет.
        </Typography>
      </Box>
    </Box>
  );
}
